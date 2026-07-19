import os
import re
import time
import threading
import logging
import hashlib
import hmac
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional, Tuple
from functools import lru_cache

import requests
from flask import Flask, jsonify, make_response, request, send_from_directory
from flask_cors import CORS

import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool

from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configure CORS for frontend access
# In production, restrict to your Render URL
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://vinschool-lms-dashboard.onrender.com", "http://localhost:5000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Configuration
class Config:
    DEFAULT_COURSE_ID = 32140
    LMS_BASE_URL = "https://lms.vinschool.edu.vn"
    REQUEST_TIMEOUT = 10
    PER_PAGE = 100
    CACHE_TTL = 300  # seconds (5 minutes)
    OVERVIEW_CACHE_TTL = 0  # overview data should reflect recent Canvas/manual changes
    MAX_CACHE_SIZE = 1000  # Maximum number of cached items
    
    # Get debug mode from environment variable (default to False for safety)
    DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"

# Apply configuration
app.config["DEBUG"] = Config.DEBUG

ALLOWED_ITEM_TYPES = frozenset({"Quiz", "Assignment", "File", "Page"})

# Detection: does the module name even mention weeks?
WEEK_KEYWORD = re.compile(r"(?:tuần|week)", re.IGNORECASE)
# Characters that separate week-number tokens inside a contiguous week expression
WEEK_SEPARATORS = frozenset("-–+&,/")

# In-memory cache: key -> {"data": ..., "ts": float}
# NOTE: Cache keys MUST include user-specific identifiers to prevent data leaks
_cache: Dict[str, Dict[str, Any]] = {}
_cache_lock = threading.Lock()

# Tokens are NEVER stored server-side. They are only read from the per-request
# `Authorization` header (sent by the frontend) or the optional API_TOKEN env var.


def cache_get(key: str) -> Optional[Any]:
    """Return cached value if it exists and hasn't expired, else None."""
    with _cache_lock:
        entry = _cache.get(key)
        if entry and time.time() - entry["ts"] < Config.CACHE_TTL:
            return entry["data"]
        return None


def cache_get_ttl(key: str, ttl: int) -> Optional[Any]:
    """Return cached value with a custom TTL."""
    with _cache_lock:
        entry = _cache.get(key)
        if entry and time.time() - entry["ts"] < ttl:
            return entry["data"]
        return None


def cache_set(key: str, data: Any) -> None:
    """Store a value in the cache with the current timestamp.
    
    Implements FIFO eviction if cache size exceeds MAX_CACHE_SIZE.
    Note: This is a simple FIFO eviction, not true LRU, due to Python dict
    insertion order preservation in Python 3.7+.
    """
    with _cache_lock:
        # Enforce cache size limit using FIFO eviction
        if len(_cache) >= Config.MAX_CACHE_SIZE:
            # Remove oldest 20% of entries (FIFO eviction)
            keys_to_remove = list(_cache.keys())[:int(Config.MAX_CACHE_SIZE * 0.2)]
            for old_key in keys_to_remove:
                del _cache[old_key]
            logger.info(f"Cache evicted {len(keys_to_remove)} entries")
        
        _cache[key] = {"data": data, "ts": time.time()}


@app.get("/")
def index():
    return no_store_response(send_from_directory(".", "index.html"))


@app.get("/script.js")
def script():
    return no_store_response(send_from_directory(".", "script.js"))


@app.get("/style.css")
def styles():
    return no_store_response(send_from_directory(".", "style.css"))


def no_store_response(response):
    response = make_response(response)
    response.headers["Cache-Control"] = "no-store, max-age=0"
    return response


def token_hash(headers: Dict[str, str]) -> str:
    """Generate a hash from the authorization token for cache key namespacing.
    
    This ensures cache entries are user-specific and prevents data leaks between users.
    Uses full SHA256 hash to eliminate collision risk.
    """
    token = headers.get("Authorization", "")
    if token.startswith("Bearer "):
        token = token[7:]
    return hashlib.sha256(token.encode()).hexdigest()


def get_canvas_headers() -> Optional[Dict[str, str]]:
    """Get Canvas API headers.
    
    Priority:
    1. Authorization header from the incoming request (frontend-sent token)
    2. API_TOKEN environment variable (legacy/fallback)
    
    Returns:
        Headers dict or None if no token available
    """
    # Check if the incoming request has an Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]  # Strip "Bearer "
        if token:
            return {"Authorization": f"Bearer {token}"}
    
    # Fallback: environment variable
    token = os.getenv("API_TOKEN")
    if token:
        return {"Authorization": f"Bearer {token}"}
    
    return None


def require_headers():
    headers = get_canvas_headers()
    if not headers:
        return None, (jsonify({"error": "Missing API token. Please set your Canvas API token in the app."}), 401)
    return headers, None


def api_error(message: str, response: requests.Response) -> Tuple[Dict, int]:
    """Create a standardized API error response.
    
    Logs the error details server-side but doesn't expose sensitive information to the client.
    """
    logger.error(f"API error: {message} - Status: {response.status_code} - URL: {response.url}")
    return jsonify({
        "error": message,
        "status_code": response.status_code,
    }), response.status_code


def course_api_url(course_id: int) -> str:
    """Generate the Canvas API URL for a specific course."""
    return f"{Config.LMS_BASE_URL}/api/v1/courses/{course_id}"


def canvas_get(url: str, headers: Dict[str, str], params: Optional[Dict] = None) -> Tuple[Optional[Dict], Optional[requests.Response]]:
    """Make a GET request to the Canvas API.
    
    Returns:
        Tuple of (data, error_response). If successful, data contains the JSON response
        and error_response is None. If failed, data is None and error_response contains
        the response object.
    """
    try:
        response = requests.get(
            url,
            headers=headers,
            params=params,
            timeout=Config.REQUEST_TIMEOUT,
        )

        if response.status_code != 200:
            logger.warning(f"Canvas API request failed: {response.status_code} for {url}")
            return None, response

        return response.json(), None
    except requests.exceptions.Timeout:
        logger.error(f"Canvas API request timeout: {url}")
        return None, None
    except requests.exceptions.RequestException as e:
        logger.error(f"Canvas API request error: {e} for {url}")
        return None, None


def extract_weeks(module_name: Optional[str]) -> List[int]:
    """Extract all week numbers from a Canvas module name.
    
    Uses a small parser that:
    1. Looks for the keyword (tuần or week) at the start of a phrase
    2. Collects the contiguous week-number expression following it
    3. Stops at the first unrelated word or punctuation
    4. Interprets ranges (-, –) and lists (+, &, ,, /)
    
    Returns a sorted list of unique week numbers, or [] if no week info found.
    """
    if not module_name:
        return []

    # Normalize: strip leading emoji/common symbols that might precede the keyword
    # (the keyword can appear after emoji or decorative characters)
    name = module_name.strip()
    if not name:
        return []

    # Locate the week keyword
    match = WEEK_KEYWORD.search(name)
    if not match:
        logger.debug(f"No week keyword found in module: {module_name!r}")
        return []

    # Extract the substring starting at the keyword
    start = match.start()
    tail = name[start:]

    # Build a token sequence from the tail:
    # We want to collect: numbers, and allowed separators (-, +, &, ,, /)
    # Stop at the first unrelated token (a word, parenthesis, period, etc.)
    tokens = []
    i = len(match.group())  # skip past the keyword itself
    while i < len(tail):
        ch = tail[i]
        # Skip whitespace between tokens
        if ch.isspace():
            i += 1
            continue

        # Number: collect consecutive digits
        if ch.isdigit():
            j = i
            while j < len(tail) and tail[j].isdigit():
                j += 1
            tokens.append(("num", tail[i:j]))
            i = j
            continue

        # Separator characters
        if ch in WEEK_SEPARATORS:
            tokens.append(("sep", ch))
            i += 1
            continue

        # Anything else terminates the week expression
        break

    if not tokens:
        logger.debug(f"Keyword found but no numbers in module: {module_name!r}")
        return []

    # Parse tokens into week numbers
    weeks: List[int] = []
    i = 0
    while i < len(tokens):
        typ, val = tokens[i]
        if typ != "num":
            i += 1
            continue

        num = int(val)
        # Look ahead for a range
        if i + 2 < len(tokens) and tokens[i + 1][0] == "sep" and tokens[i + 1][1] in "-–" and tokens[i + 2][0] == "num":
            end_num = int(tokens[i + 2][1])
            if num < end_num:
                weeks.extend(range(num, end_num + 1))
            else:
                weeks.append(num)
                weeks.append(end_num)
            i += 3
        else:
            weeks.append(num)
            i += 1

    return sorted(set(weeks))


def get_courses(headers: Dict[str, str]) -> Tuple[Optional[List[Dict]], Optional[requests.Response]]:
    """Fetch all active courses from Canvas.
    
    NOTE: Courses are NOT cached globally because they are user-specific.
    Each user has different course access in Canvas, so caching would cause
    data leaks between users. This is intentionally not cached.
    """
    logger.info("Fetching courses from Canvas API")
    data, response = canvas_get(
        f"{Config.LMS_BASE_URL}/api/v1/courses",
        headers,
        params={"enrollment_state": "active", "per_page": Config.PER_PAGE},
    )
    if response is not None:
        return None, response

    courses = [
        {
            "id": course["id"],
            "name": course.get("name"),
            "course_code": course.get("course_code"),
        }
        for course in data
    ]

    logger.info(f"Fetched {len(courses)} courses (not cached - user-specific)")
    return courses, None


def get_course_name(course_id: int, headers: Dict[str, str]) -> str:
    """Fetch the name of a specific course."""
    cache_key = f"course_name:{token_hash(headers)}:{course_id}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    data, response = canvas_get(course_api_url(course_id), headers)
    if response is not None or data is None:
        name = f"Course {course_id}"
    else:
        name = data.get("name") or f"Course {course_id}"
    cache_set(cache_key, name)
    return name


def get_course_modules(course_id: int, headers: Dict[str, str]) -> Tuple[Optional[List[Dict]], Optional[requests.Response]]:
    """Fetch all modules for a specific course."""
    cache_key = f"modules:{token_hash(headers)}:{course_id}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached, None

    data, response = canvas_get(
        f"{course_api_url(course_id)}/modules",
        headers,
        params={"per_page": Config.PER_PAGE},
    )
    if response is not None:
        return None, response

    cache_set(cache_key, data)
    return data, None


def get_week_modules(course_id: int, week: int, headers: Dict[str, str]) -> Tuple[Optional[List[Dict]], Optional[requests.Response]]:
    """Fetch modules for a specific week in a course.
    
    For week > 0: includes modules whose extracted weeks contain the requested week.
    For week == 0: includes modules with no week information (General category).
    """
    modules, response = get_course_modules(course_id, headers)
    if response is not None:
        return None, response

    if week == 0:
        # General: modules with no week information
        week_modules = [
            module
            for module in modules
            if not extract_weeks(module.get("name"))
        ]
    else:
        week_modules = [
            module
            for module in modules
            if week in extract_weeks(module.get("name"))
        ]

    return week_modules, None


def get_module_items(course_id: int, module_id: int, headers: Dict[str, str]) -> Tuple[Optional[List[Dict]], Optional[requests.Response]]:
    """Fetch all items for a specific module."""
    cache_key = f"items:{token_hash(headers)}:{course_id}:{module_id}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached, None

    data, response = canvas_get(
        f"{course_api_url(course_id)}/modules/{module_id}/items",
        headers,
        params={"per_page": Config.PER_PAGE},
    )
    if response is not None:
        return None, response

    cache_set(cache_key, data)
    return data, None


def item_url(course_id: int, item: Dict[str, Any]) -> Optional[str]:
    """Generate the direct URL for a Canvas item."""
    item_type = item.get("type")
    content_id = item.get("content_id")

    if item_type == "Quiz" and content_id:
        return f"{Config.LMS_BASE_URL}/courses/{course_id}/quizzes/{content_id}"

    if item_type == "Assignment" and content_id:
        return f"{Config.LMS_BASE_URL}/courses/{course_id}/assignments/{content_id}"

    return item.get("html_url")


def get_item_completion(item: Dict[str, Any]) -> Tuple[bool, bool]:
    """Determine completion status of a Canvas module item.
    
    Returns:
        Tuple of (is_completed, has_tracking).
        - is_completed: True if item has completion tracking and is completed
                        False if item has completion tracking and is not completed
                        None if item has no completion tracking (unknown)
        - has_tracking: True if Canvas reports a completion_requirement for this item
    """
    completion = item.get("completion_requirement")
    if not completion:
        return (None, False)
    return (completion.get("completed", False), True)


def format_module_item(course_id: int, course_name: str, module: Dict[str, Any], item: Dict[str, Any]) -> Dict[str, Any]:
    """Format a module item into a consistent structure for the frontend."""
    is_completed, has_tracking = get_item_completion(item)

    return {
        "course_id": course_id,
        "course_name": course_name,
        "module": module.get("name", "Unnamed Module"),
        "title": item.get("title", "Untitled"),
        "type": item.get("type", "Unknown"),
        "completed": is_completed,
        "has_tracking": has_tracking,
        "module_item_id": item.get("id"),
        "url": item_url(course_id, item),
    }


def is_incomplete(item: Dict[str, Any]) -> bool:
    """Check if a Canvas item is incomplete (explicitly tracked and not completed).
    
    Items without completion tracking return False (they are "unknown", not "incomplete").
    """
    completion = item.get("completion_requirement")
    if not completion:
        return False
    return completion.get("completed") is False


def fetch_items_for_module(course_id: int, module: Dict[str, Any], headers: Dict[str, str]) -> Tuple[Dict[str, Any], Optional[List[Dict]]]:
    """Fetch and return (module, items_list) for a single module. Returns None items on error."""
    module_items, error = get_module_items(course_id, module["id"], headers)
    if error is not None:
        return module, None
    return module, module_items


def get_week_items(
    course_id: int,
    week: int,
    headers: Dict[str, str],
    unfinished_only: bool = False
) -> Tuple[Optional[List[Dict]], Optional[str], Optional[requests.Response]]:
    """Fetch all items for a specific week in a course.
    
    Args:
        course_id: The Canvas course ID
        week: The week number to fetch
        headers: Authentication headers
        unfinished_only: If True, only return explicitly-incomplete items (not unknown)
        
    Returns:
        Tuple of (items, course_name, error_response)
    """
    week_modules, response = get_week_modules(course_id, week, headers)
    if response is not None:
        return None, None, response

    course_name = get_course_name(course_id, headers)
    items = []

    # Fetch all module items in parallel
    if week_modules:
        with ThreadPoolExecutor(max_workers=min(len(week_modules), 8) or 1) as executor:
            futures = {
                executor.submit(fetch_items_for_module, course_id, module, headers): module
                for module in week_modules
            }

            # Collect results; preserve module order for deterministic output
            results = {}
            for future in as_completed(futures):
                module, module_items = future.result()
                results[module["id"]] = (module, module_items)

        for module in week_modules:
            _module, module_items = results[module["id"]]
            if module_items is None:
                continue

            for item in module_items:
                if item.get("type") not in ALLOWED_ITEM_TYPES:
                    continue
                if unfinished_only and not is_incomplete(item):
                    continue
                items.append(format_module_item(course_id, course_name, _module, item))

    logger.info(f"Found {len(items)} items for course {course_id}, week {week}")
    return items, course_name, None


def get_all_course_items(
    course_id: int,
    headers: Dict[str, str]
) -> Tuple[Optional[Dict[int, List[Dict]]], Optional[requests.Response]]:
    """Fetch ALL items for a course, grouped by week number.
    
    This is the workhorse for the overview endpoint. It:
    1. Fetches all modules once
    2. Fetches all module items in parallel
    3. Groups items by the week numbers extracted from module names
    
    Returns:
        Tuple of (week_groups, error_response) where week_groups is a dict
        mapping week number -> list of formatted items.
        Module items without week info are grouped under week 0 (General).
    """
    modules, response = get_course_modules(course_id, headers)
    if response is not None:
        return None, response

    course_name = get_course_name(course_id, headers)

    # Build week-to-modules mapping
    week_modules: Dict[int, List[Dict]] = {}
    for module in modules:
        weeks = extract_weeks(module.get("name"))
        if not weeks:
            # No week info -> General category (week 0)
            week_modules.setdefault(0, []).append(module)
        else:
            for w in weeks:
                if 0 <= w <= 100:
                    week_modules.setdefault(w, []).append(module)

    # Fetch all module items in parallel across ALL modules
    all_module_ids = list(set(m["id"] for mod_list in week_modules.values() for m in mod_list))
    
    module_items_map: Dict[int, Optional[List[Dict]]] = {}
    if all_module_ids:
        with ThreadPoolExecutor(max_workers=min(len(all_module_ids), 8) or 1) as executor:
            futures = {
                executor.submit(get_module_items, course_id, mod_id, headers): mod_id
                for mod_id in all_module_ids
            }
            for future in as_completed(futures):
                mod_id = futures[future]
                try:
                    items, error = future.result()
                    module_items_map[mod_id] = items if error is None else None
                except Exception:
                    module_items_map[mod_id] = None

    # Group items by week
    week_groups: Dict[int, List[Dict]] = {}
    for week, mod_list in week_modules.items():
        items_for_week: List[Dict] = []
        for module in mod_list:
            module_items = module_items_map.get(module["id"])
            if module_items is None:
                continue
            for item in module_items:
                if item.get("type") not in ALLOWED_ITEM_TYPES:
                    continue
                items_for_week.append(format_module_item(course_id, course_name, module, item))
        week_groups[week] = items_for_week

    return week_groups, None


# ─── Token Management Endpoints ─────────────────────────────────


@app.post("/api/validate-token")
def validate_token():
    """Validate a Canvas API token by making a test call to the Canvas API.
    
    Expects JSON body: { "token": "..." }
    Returns: { "valid": true/false, "message": "..." }
    The token is used only for this validation request and is never stored
    server-side. The frontend is responsible for persisting it in localStorage.
    """
    data = request.get_json(silent=True)
    if not data or not data.get("token"):
        return jsonify({"valid": False, "message": "No token provided."}), 400
    
    token = data["token"].strip()
    if not token:
        return jsonify({"valid": False, "message": "Token is empty."}), 400
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try fetching courses to see if the token works. The token is used only
    # for this single request and is discarded immediately afterward.
    try:
        response = requests.get(
            f"{Config.LMS_BASE_URL}/api/v1/courses",
            headers=headers,
            params={"per_page": 1},
            timeout=Config.REQUEST_TIMEOUT,
        )
        
        if response.status_code == 200:
            return jsonify({
                "valid": True,
                "message": "Token is valid.",
            })
        elif response.status_code == 401:
            return jsonify({
                "valid": False,
                "message": "Token is invalid or expired. Please check your token and try again.",
            })
        else:
            return jsonify({
                "valid": False,
                "message": f"Canvas API returned status {response.status_code}. Please try again later.",
            })
    except requests.exceptions.Timeout:
        return jsonify({
            "valid": False,
            "message": "Connection timed out. Please check your internet connection.",
        })
    except requests.exceptions.RequestException as e:
        return jsonify({
            "valid": False,
            "message": f"Connection error: {str(e)}",
        })


# ─── API Routes ────────────────────────────────────────────────


@app.get("/api/courses")
def list_courses():
    """List all active courses for the authenticated user."""
    headers, error = require_headers()
    if error:
        return error

    courses, response = get_courses(headers)
    if response is not None:
        return api_error("Failed to fetch courses", response)

    logger.info(f"Returning {len(courses)} courses")
    return jsonify({
        "course_count": len(courses),
        "courses": courses,
    })


@app.get("/api/courses/<int:course_id>/weeks")
def list_course_weeks(course_id: int):
    """List all week numbers found in module names for a course."""
    headers, error = require_headers()
    if error:
        return error

    modules, response = get_course_modules(course_id, headers)
    if response is not None:
        return api_error("Failed to fetch modules", response)

    # Collect all week numbers from extract_weeks (ranges already expanded)
    # If any module has no week information, include week 0 (General)
    weeks = set()
    has_general = False
    for module in modules:
        module_weeks = extract_weeks(module.get("name"))
        if not module_weeks:
            # Module has no week information at all
            has_general = True
        else:
            # Validate week numbers (reasonable bounds: 0-100)
            validated_weeks = [w for w in module_weeks if 0 <= w <= 100]
            if validated_weeks:
                weeks.update(validated_weeks)
            # If all week numbers were invalid (>100), don't count as general

    result = sorted(weeks)
    if has_general:
        result = [0] + result

    logger.info(f"Found {len(result)} weeks for course {course_id}")
    return jsonify({
        "course_id": course_id,
        "week_count": len(result),
        "weeks": result,
    })


@app.get("/api/courses/<int:course_id>/week/<int:week>")
def get_course_week(course_id: int, week: int):
    """Get all items (quizzes, assignments, files) for a specific week."""
    headers, error = require_headers()
    if error:
        return error

    items, course_name, response = get_week_items(course_id, week, headers)
    if response is not None:
        return api_error("Failed to fetch modules", response)

    logger.info(f"Returning {len(items)} items for course {course_id}, week {week}")
    return jsonify({
        "course_id": course_id,
        "course_name": course_name,
        "week": week,
        "item_count": len(items),
        "items": items,
    })


@app.get("/api/courses/<int:course_id>/week/<int:week>/unfinished")
def get_course_week_unfinished(course_id: int, week: int):
    """Get unfinished items for a specific week."""
    headers, error = require_headers()
    if error:
        return error

    items, course_name, response = get_week_items(
        course_id, week, headers, unfinished_only=True
    )
    if response is not None:
        return api_error("Failed to fetch modules", response)

    logger.info(f"Returning {len(items)} unfinished items for course {course_id}, week {week}")
    return jsonify({
        "course_id": course_id,
        "course_name": course_name,
        "week": week,
        "item_count": len(items),
        "items": items,
    })


@app.get("/api/courses/<int:course_id>/overview")
def get_course_overview(course_id: int):
    """Get overview data for a course: all weeks with their item counts and completion stats.
    
    This is a dedicated, efficient endpoint that fetches ALL course data in one pass,
    replacing the previous approach of making N*2 individual week requests.
    """
    headers, error = require_headers()
    if error:
        return error

    course_name = get_course_name(course_id, headers)
    
    week_groups, response = get_all_course_items(course_id, headers)
    if response is not None:
        return api_error("Failed to fetch course items for overview", response)

    # Build overview summary for each week
    week_summaries = []
    for week in sorted(week_groups.keys()):
        items_list = week_groups[week]
        total = len(items_list)
        done = sum(1 for item in items_list if item["completed"] is True)
        unfinished = sum(1 for item in items_list if item["completed"] is False)
        unknown = sum(1 for item in items_list if item["completed"] is None)
        
        # Count by type
        type_counts = {}
        for item in items_list:
            item_type = item["type"]
            type_counts[item_type] = type_counts.get(item_type, 0) + 1

        week_summaries.append({
            "week": week,
            "total": total,
            "done": done,
            "unfinished": unfinished,
            "unknown": unknown,
            "type_counts": type_counts,
            "items": [
                {
                    "course_id": item["course_id"],
                    "module_item_id": item.get("module_item_id"),
                    "completed": item["completed"],
                }
                for item in items_list
            ],
        })

    # Build course-wide totals
    total_all = sum(ws["total"] for ws in week_summaries)
    total_done = sum(ws["done"] for ws in week_summaries)
    total_unfinished = sum(ws["unfinished"] for ws in week_summaries)
    total_unknown = sum(ws["unknown"] for ws in week_summaries)

    response_data = {
        "course_id": course_id,
        "course_name": course_name,
        "week_count": len(week_summaries),
        "weeks": week_summaries,
        "totals": {
            "total": total_all,
            "done": total_done,
            "unfinished": total_unfinished,
            "unknown": total_unknown,
        },
    }

    logger.info(f"Returning overview for course {course_id}: {len(week_summaries)} weeks, {total_all} items")
    return jsonify(response_data)


@app.get("/api/week/<int:week>")
def get_week_legacy(week: int):
    """Legacy route for backward compatibility."""
    return _legacy_week_response(week, unfinished_only=False)


@app.get("/api/todo/<int:week>")
def get_todo_legacy(week: int):
    """Legacy route for backward compatibility."""
    return _legacy_week_response(week, unfinished_only=True, todo_key=True)


def _legacy_week_response(week: int, unfinished_only: bool = False, todo_key: bool = False):
    """Handle legacy week/todo API routes."""
    headers, error = require_headers()
    if error:
        return error

    items, course_name, response = get_week_items(
        Config.DEFAULT_COURSE_ID, week, headers, unfinished_only=unfinished_only
    )
    if response is not None:
        return api_error("Failed to fetch modules", response)

    payload = {
        "course_id": Config.DEFAULT_COURSE_ID,
        "course_name": course_name,
        "week": week,
    }

    if todo_key:
        payload["todo_count"] = len(items)
        payload["todo"] = items
    else:
        payload["item_count"] = len(items)
        payload["items"] = items

    return jsonify(payload)


# ─── Feedback Database ─────────────────────────────────────────

DATABASE_URL = os.getenv("DATABASE_URL")

# Database connection pool (initialized on startup)
_db_pool: Optional[SimpleConnectionPool] = None

def init_db_pool() -> None:
    """Initialize database connection pool."""
    global _db_pool
    if not DATABASE_URL:
        logger.warning("DATABASE_URL not set - feedback features will be disabled")
        return
    
    try:
        _db_pool = SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=DATABASE_URL,
            cursor_factory=RealDictCursor
        )
        logger.info("Database connection pool initialized")
    except Exception as e:
        logger.error(f"Failed to initialize database pool: {e}")
        _db_pool = None

def get_db():
    """Get a database connection from the pool."""
    if _db_pool is None:
        raise RuntimeError("Database pool not initialized")
    return _db_pool.getconn()


def init_db() -> None:
    """Initialize the feedback database, creating the table if it doesn't exist."""
    if _db_pool is None:
        logger.warning("Skipping database initialization - DATABASE_URL not configured")
        return
    
    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id SERIAL PRIMARY KEY,
                rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                usage_type TEXT NOT NULL,
                recommend TEXT NOT NULL,
                improvement TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        logger.info("Feedback database initialized")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        conn.rollback()
    finally:
        cur.close()
        _db_pool.putconn(conn)


@app.post("/api/feedback")
def submit_feedback():
    """Submit user feedback.
    
    Expects JSON body: { "rating": int, "usage_type": str, "recommend": str, "improvement": str }
    Returns: { "success": true/false, "message": "..." }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"success": False, "message": "No data provided."}), 400

    rating = data.get("rating")
    usage_type = data.get("usage_type")
    recommend = data.get("recommend")
    improvement = data.get("improvement", "")

    # Validate required fields
    if not isinstance(rating, int) or rating < 1 or rating > 5:
        return jsonify({"success": False, "message": "Rating must be an integer between 1 and 5."}), 400

    allowed_usage = ["quizzes_assignments", "timetable", "unfinished", "other"]
    if usage_type not in allowed_usage:
        return jsonify({"success": False, "message": f"Usage type must be one of: {', '.join(allowed_usage)}."}), 400

    allowed_recommend = ["yes", "maybe", "no"]
    if recommend not in allowed_recommend:
        return jsonify({"success": False, "message": f"Recommend must be one of: {', '.join(allowed_recommend)}."}), 400

    if not isinstance(improvement, str):
        improvement = ""

    if _db_pool is None:
        return jsonify({"success": False, "message": "Database not configured."}), 503
    
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()

        cur.execute(
            """
            INSERT INTO feedback
            (rating, usage_type, recommend, improvement)
            VALUES (%s, %s, %s, %s)
            """,
            (rating, usage_type, recommend, improvement)
        )

        conn.commit()

        logger.info(f"Feedback saved: rating={rating}, usage={usage_type}, recommend={recommend}")
        return jsonify({"success": True, "message": "Thank you for your feedback!"})
    except Exception as e:
        logger.error(f"Failed to save feedback: {e}")
        if conn:
            conn.rollback()
        return jsonify({"success": False, "message": "An error occurred while saving feedback."}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            _db_pool.putconn(conn)

@app.get("/api/feedback")
def get_feedback():
    """Get all feedback submissions.
    
    Requires admin API key for authentication.
    """
    # Check admin API key (use constant-time comparison to prevent timing attacks)
    import hmac
    admin_key = request.headers.get("X-Admin-Key")
    expected_key = os.getenv("ADMIN_API_KEY", "")
    if not admin_key or not hmac.compare_digest(admin_key, expected_key):
        logger.warning("Unauthorized attempt to access feedback endpoint")
        return jsonify({"error": "Unauthorized. Admin access required."}), 401
    
    if _db_pool is None:
        return jsonify({"error": "Database not configured"}), 503
    
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()

        cur.execute("""
            SELECT *
            FROM feedback
            ORDER BY id DESC
        """)

        rows = cur.fetchall()

        return jsonify(rows)

    except Exception as e:
        logger.error(f"Failed to fetch feedback: {e}")
        return jsonify({"error": "Failed to fetch feedback"}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            _db_pool.putconn(conn)


# ─── Health Check ───────────────────────────────────────────────

@app.get("/health")
def health_check():
    """Health check endpoint for Render monitoring."""
    return jsonify({
        "status": "healthy",
        "service": "VinFocus",
        "database": "configured" if _db_pool is not None else "not configured"
    }), 200


# ─── Startup ────────────────────────────────────────────────────

init_db_pool()
init_db()

if __name__ == "__main__":
    logger.info(f"Starting VinFocus in {'DEBUG' if Config.DEBUG else 'PRODUCTION'} mode")
    app.run(debug=Config.DEBUG, host="0.0.0.0", port=int(os.getenv("PORT", 5000)))
