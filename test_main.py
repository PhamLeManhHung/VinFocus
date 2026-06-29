import json
import pytest
from unittest.mock import patch, MagicMock
from main import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear the in-memory cache before each test to prevent test pollution."""
    from main import _cache
    _cache.clear()
    yield
    _cache.clear()


def mock_response(status_code=200, json_data=None, text=""):
    mock = MagicMock()
    mock.status_code = status_code
    mock.json.return_value = json_data or {}
    mock.text = text
    return mock


class TestListCourses:
    @patch("main.get_canvas_headers")
    @patch("main.canvas_get")
    def test_list_courses_success(self, mock_canvas_get, mock_get_headers, client):
        mock_get_headers.return_value = {"Authorization": "Bearer test"}
        mock_canvas_get.return_value = (
            [
                {"id": 1, "name": "Course 1", "course_code": "CODE1"},
                {"id": 2, "name": "Course 2", "course_code": "CODE2"},
            ],
            None,
        )

        response = client.get("/api/courses")
        assert response.status_code == 200
        data = response.get_json()
        assert data["course_count"] == 2
        assert len(data["courses"]) == 2

    @patch("main.get_canvas_headers")
    def test_list_courses_missing_token(self, mock_get_headers, client):
        mock_get_headers.return_value = None

        response = client.get("/api/courses")
        assert response.status_code == 500
        data = response.get_json()
        assert "error" in data

    @patch("main.get_canvas_headers")
    @patch("main.canvas_get")
    def test_list_courses_api_failure(self, mock_canvas_get, mock_get_headers, client):
        mock_get_headers.return_value = {"Authorization": "Bearer test"}
        error_response = MagicMock()
        error_response.status_code = 500
        error_response.text = "Server error"
        mock_canvas_get.return_value = (None, error_response)

        response = client.get("/api/courses")
        assert response.status_code == 500
        data = response.get_json()
        assert "error" in data


class TestListCourseWeeks:
    @patch("main.get_canvas_headers")
    @patch("main.canvas_get")
    def test_list_weeks_success(self, mock_canvas_get, mock_get_headers, client):
        mock_get_headers.return_value = {"Authorization": "Bearer test"}
        mock_canvas_get.return_value = (
            [
                {"id": 1, "name": "TUẦN 36"},
                {"id": 2, "name": "TUẦN 37"},
                {"id": 3, "name": "TUẦN 38"},
            ],
            None,
        )

        response = client.get("/api/courses/1/weeks")
        assert response.status_code == 200
        data = response.get_json()
        assert data["weeks"] == [36, 37, 38]
        assert data["week_count"] == 3

    @patch("main.get_canvas_headers")
    @patch("main.canvas_get")
    def test_list_weeks_with_non_week_modules(self, mock_canvas_get, mock_get_headers, client):
        mock_get_headers.return_value = {"Authorization": "Bearer test"}
        mock_canvas_get.return_value = (
            [
                {"id": 1, "name": "TUẦN 36"},
                {"id": 2, "name": "General"},
                {"id": 3, "name": "TUẦN 37"},
            ],
            None,
        )

        response = client.get("/api/courses/1/weeks")
        assert response.status_code == 200
        data = response.get_json()
        assert data["weeks"] == [36, 37]

    @patch("main.get_canvas_headers")
    def test_list_weeks_missing_token(self, mock_get_headers, client):
        mock_get_headers.return_value = None

        response = client.get("/api/courses/1/weeks")
        assert response.status_code == 500


class TestGetCourseWeek:
    @patch("main.get_canvas_headers")
    @patch("main.get_week_items")
    def test_get_week_success(self, mock_get_week_items, mock_get_headers, client):
        mock_get_headers.return_value = {"Authorization": "Bearer test"}
        mock_get_week_items.return_value = (
            [
                {
                    "course_id": 1,
                    "course_name": "Test Course",
                    "module": "TUẦN 36",
                    "title": "Quiz 1",
                    "type": "Quiz",
                    "completed": False,
                    "url": "http://example.com/quiz/1",
                }
            ],
            "Test Course",
            None,
        )

        response = client.get("/api/courses/1/week/36")
        assert response.status_code == 200
        data = response.get_json()
        assert data["week"] == 36
        assert data["item_count"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == "Quiz 1"

    @patch("main.get_canvas_headers")
    @patch("main.get_week_items")
    def test_get_week_unfinished(self, mock_get_week_items, mock_get_headers, client):
        mock_get_headers.return_value = {"Authorization": "Bearer test"}
        mock_get_week_items.return_value = (
            [
                {
                    "course_id": 1,
                    "course_name": "Test Course",
                    "module": "TUẦN 36",
                    "title": "Assignment 1",
                    "type": "Assignment",
                    "completed": False,
                    "url": "http://example.com/assignment/1",
                }
            ],
            "Test Course",
            None,
        )

        response = client.get("/api/courses/1/week/36/unfinished")
        assert response.status_code == 200
        data = response.get_json()
        assert data["item_count"] == 1

    @patch("main.get_canvas_headers")
    @patch("main.get_week_items")
    def test_get_week_api_failure(self, mock_get_week_items, mock_get_headers, client):
        mock_get_headers.return_value = {"Authorization": "Bearer test"}
        mock_get_week_items.return_value = (None, None, MagicMock(status_code=500, text="Error"))

        response = client.get("/api/courses/1/week/36")
        assert response.status_code == 500
        data = response.get_json()
        assert "error" in data

    @patch("main.get_canvas_headers")
    def test_get_week_missing_token(self, mock_get_headers, client):
        mock_get_headers.return_value = None

        response = client.get("/api/courses/1/week/36")
        assert response.status_code == 500


class TestLegacyRoutes:
    @patch("main.get_canvas_headers")
    @patch("main.get_week_items")
    def test_legacy_week_route(self, mock_get_week_items, mock_get_headers, client):
        mock_get_headers.return_value = {"Authorization": "Bearer test"}
        mock_get_week_items.return_value = (
            [{"title": "Legacy Item", "type": "Quiz"}],
            "Course Name",
            None,
        )

        response = client.get("/api/week/36")
        assert response.status_code == 200
        data = response.get_json()
        assert "items" in data
        assert data["item_count"] == 1

    @patch("main.get_canvas_headers")
    @patch("main.get_week_items")
    def test_legacy_todo_route(self, mock_get_week_items, mock_get_headers, client):
        mock_get_headers.return_value = {"Authorization": "Bearer test"}
        mock_get_week_items.return_value = (
            [{"title": "Todo Item", "type": "Assignment"}],
            "Course Name",
            None,
        )

        response = client.get("/api/todo/36")
        assert response.status_code == 200
        data = response.get_json()
        assert "todo" in data
        assert data["todo_count"] == 1