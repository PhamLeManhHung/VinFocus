import os
import re

import requests
from flask import Flask, jsonify, send_from_directory

app = Flask(__name__)

DEFAULT_COURSE_ID = 32140
LMS_BASE_URL = "https://lms.vinschool.edu.vn"
REQUEST_TIMEOUT = 10
PER_PAGE = 100

ALLOWED_ITEM_TYPES = frozenset({"Quiz", "Assignment", "File"})
WEEK_PATTERN = re.compile(r"TUẦN\s*(\d+)", re.IGNORECASE)


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


def api_error(message, response):
    return jsonify({
        "error": message,
        "details": response.text,
    }), response.status_code


def course_api_url(course_id):
    return f"{LMS_BASE_URL}/api/v1/courses/{course_id}"


def canvas_get(url, headers, params=None):
    response = requests.get(
        url,
        headers=headers,
        params=params,
        timeout=REQUEST_TIMEOUT,
    )

    if response.status_code != 200:
        return None, response

    return response.json(), None


def extract_week_number(module_name):
    match = WEEK_PATTERN.search(module_name or "")
    return int(match.group(1)) if match else None


def get_courses(headers):
    data, response = canvas_get(
        f"{LMS_BASE_URL}/api/v1/courses",
        headers,
        params={"enrollment_state": "active", "per_page": PER_PAGE},
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

    return courses, None


def get_course_name(course_id, headers):
    data, response = canvas_get(course_api_url(course_id), headers)
    if response is not None:
        return f"Course {course_id}"
    return data.get("name") or f"Course {course_id}"


def get_course_modules(course_id, headers):
    return canvas_get(
        f"{course_api_url(course_id)}/modules",
        headers,
        params={"per_page": PER_PAGE},
    )


def get_week_modules(course_id, week, headers):
    modules, response = get_course_modules(course_id, headers)
    if response is not None:
        return None, response

    week_modules = [
        module
        for module in modules
        if extract_week_number(module.get("name")) == week
    ]

    return week_modules, None


def get_module_items(course_id, module_id, headers):
    return canvas_get(
        f"{course_api_url(course_id)}/modules/{module_id}/items",
        headers,
        params={"per_page": PER_PAGE},
    )


def item_url(course_id, item):
    item_type = item.get("type")
    content_id = item.get("content_id")

    if item_type == "Quiz" and content_id:
        return f"{LMS_BASE_URL}/courses/{course_id}/quizzes/{content_id}"

    if item_type == "Assignment" and content_id:
        return f"{LMS_BASE_URL}/courses/{course_id}/assignments/{content_id}"

    return item.get("html_url")


def format_module_item(course_id, course_name, module, item):
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


def is_incomplete(item):
    completion = item.get("completion_requirement")
    return bool(completion) and completion.get("completed") is False


def get_week_items(course_id, week, headers, unfinished_only=False):
    week_modules, response = get_week_modules(course_id, week, headers)
    if response is not None:
        return None, None, response

    course_name = get_course_name(course_id, headers)
    items = []

    for module in week_modules:
        module_items, items_response = get_module_items(course_id, module["id"], headers)

        if items_response is not None:
            continue

        for item in module_items:
            if item.get("type") not in ALLOWED_ITEM_TYPES:
                continue
            if unfinished_only and not is_incomplete(item):
                continue
            items.append(format_module_item(course_id, course_name, module, item))

    return items, course_name, None


@app.get("/api/courses")
def list_courses():
    headers, error = require_headers()
    if error:
        return error

    courses, response = get_courses(headers)
    if response is not None:
        return api_error("Failed to fetch courses", response)

    return jsonify({
        "course_count": len(courses),
        "courses": courses,
    })


@app.get("/api/courses/<int:course_id>/weeks")
def list_course_weeks(course_id):
    headers, error = require_headers()
    if error:
        return error

    modules, response = get_course_modules(course_id, headers)
    if response is not None:
        return api_error("Failed to fetch modules", response)

    weeks = sorted({
        week
        for module in modules
        if (week := extract_week_number(module.get("name"))) is not None
    })

    return jsonify({
        "course_id": course_id,
        "week_count": len(weeks),
        "weeks": weeks,
    })


@app.get("/api/courses/<int:course_id>/week/<int:week>")
def get_course_week(course_id, week):
    headers, error = require_headers()
    if error:
        return error

    items, course_name, response = get_week_items(course_id, week, headers)
    if response is not None:
        return api_error("Failed to fetch modules", response)

    return jsonify({
        "course_id": course_id,
        "course_name": course_name,
        "week": week,
        "item_count": len(items),
        "items": items,
    })


@app.get("/api/courses/<int:course_id>/week/<int:week>/unfinished")
def get_course_week_unfinished(course_id, week):
    headers, error = require_headers()
    if error:
        return error

    items, course_name, response = get_week_items(
        course_id, week, headers, unfinished_only=True
    )
    if response is not None:
        return api_error("Failed to fetch modules", response)

    return jsonify({
        "course_id": course_id,
        "course_name": course_name,
        "week": week,
        "item_count": len(items),
        "items": items,
    })


@app.get("/api/week/<int:week>")
def get_week_legacy(week):
    return _legacy_week_response(week, unfinished_only=False)


@app.get("/api/todo/<int:week>")
def get_todo_legacy(week):
    return _legacy_week_response(week, unfinished_only=True, todo_key=True)


def _legacy_week_response(week, unfinished_only=False, todo_key=False):
    headers, error = require_headers()
    if error:
        return error

    items, course_name, response = get_week_items(
        DEFAULT_COURSE_ID, week, headers, unfinished_only=unfinished_only
    )
    if response is not None:
        return api_error("Failed to fetch modules", response)

    payload = {
        "course_id": DEFAULT_COURSE_ID,
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
    app.run(debug=True)
