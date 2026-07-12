import os
import re
import time
import threading
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional, Tuple

import requests
from flask import Flask, jsonify, send_from_directory

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration
class Config:
    DEFAULT_COURSE_ID = 32140
    LMS_BASE_URL = "https://lms.vinschool.edu.vn"
    REQUEST_TIMEOUT = 10
    PER_PAGE = 100
    CACHE_TTL = 300  # seconds (5 minutes)
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
_cache: Dict[str, Dict[str, Any]] = {}
_cache_lock = threading.Lock()


def cache_get(key: str) -> Optional[Any]:
    """Return cached value if it exists and hasn't expired, else None."""
    with _cache_lock:
        entry = _cache.get(key)
        if entry and time.time() - entry["ts"] < Config.CACHE_TTL:
            return entry["data"]
        return None


def cache_set(key: str, data: Any) -> None:
    """Store a value in the cache with the current timestamp.
    
    Implements LRU eviction if cache size exceeds MAX_CACHE_SIZE.
    """
    with _cache_lock:
        # Enforce cache size limit using simple LRU eviction
        if len(_cache) >= Config.MAX_CACHE_SIZE:
            # Remove oldest entries (simple FIFO eviction)
            keys_to_remove = list(_cache.keys())[:int(Config.MAX_CACHE_SIZE * 0.2)]
            for old_key in keys_to_remove:
                del _cache[old_key]
            logger.info(f"Cache evicted {len(keys_to_remove)} entries")
        
        _cache[key] = {"data": data, "ts": time.time()}


@app.get("/")
def index():
    return send_from_directory(".", "index.html")


@app.get("/script.js")
def script():
    return send_from_directory(".", "script.js")


@app.get("/style.css")
def styles():
    return send_from_directory(".", "style.css")


def get_canvas_headers():
    token = os.getenv("API_TOKEN")
    if not token:
        return None
    return {"Authorization": f"Bearer {token}"}


def require_headers():
    headers = get_canvas_headers()
    if not headers:
        return None, (jsonify({"error": "Missing API_TOKEN environment variable"}), 500)
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
    """Fetch all active courses from Canvas."""
    cached = cache_get("courses")
    if cached is not None:
        logger.info("Returning cached courses")
        return cached, None

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

    cache_set("courses", courses)
    logger.info(f"Cached {len(courses)} courses")
    return courses, None


def get_course_name(course_id: int, headers: Dict[str, str]) -> str:
    """Fetch the name of a specific course."""
    cache_key = f"course_name:{course_id}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    data, response = canvas_get(course_api_url(course_id), headers)
    name = (data.get("name") if response is None else None) or f"Course {course_id}"
    cache_set(cache_key, name)
    return name


def get_course_modules(course_id: int, headers: Dict[str, str]) -> Tuple[Optional[List[Dict]], Optional[requests.Response]]:
    """Fetch all modules for a specific course."""
    cache_key = f"modules:{course_id}"
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
    cache_key = f"items:{course_id}:{module_id}"
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


def format_module_item(course_id: int, course_name: str, module: Dict[str, Any], item: Dict[str, Any]) -> Dict[str, Any]:
    """Format a module item into a consistent structure for the frontend."""
    completion = item.get("completion_requirement") or {}

    return {
        "course_id": course_id,
        "course_name": course_name,
        "module": module["name"],
        "title": item.get("title"),
        "type": item.get("type"),
        "completed": completion.get("completed", False),
        "module_item_id": item.get("id"),
        "url": item_url(course_id, item),
    }


def is_incomplete(item: Dict[str, Any]) -> bool:
    """Check if a Canvas item is incomplete."""
    completion = item.get("completion_requirement")
    return bool(completion) and completion.get("completed") is False


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
        unfinished_only: If True, only return incomplete items
        
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
        if module_weeks:
            weeks.update(module_weeks)
        else:
            has_general = True

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


if __name__ == "__main__":
    logger.info(f"Starting Lock In in {'DEBUG' if Config.DEBUG else 'PRODUCTION'} mode")
    app.run(debug=Config.DEBUG)