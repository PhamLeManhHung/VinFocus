# Lock In

Lock In is a personal information hub for Vinschool's Canvas LMS. It aggregates course modules and items into a cleaner interface so you can browse what exists — without trying to predict what you should do on a given day.

## Why I Built This

The school's LMS works, but it is not always the fastest place to see what quizzes, assignments, and files exist for a given week. I wanted a focused view of Canvas data across courses.

The dashboard does not schedule daily work. Teachers may assign things verbally, lessons can span multiple weeks, and the LMS does not contain enough information to infer daily priorities accurately. Instead, Lock In helps answer questions like:

- What quizzes exist for this week?
- What assignments exist for this week?
- What files/resources exist for this week?
- What items are still unfinished in Canvas?
- What modules belong to each week?

I decide what to work on.

## Features

- Lists active Canvas courses from your account.
- Browses modules filtered by week number (e.g. `TUẦN 36`).
- Shows quizzes, assignments, and files grouped by type.
- Links each item back to the original Canvas page.
- Filters to unfinished items using Canvas completion requirements.
- Includes search, loading, empty, and error states.

## Tech Stack

- Python
- Flask
- Requests
- HTML
- CSS
- JavaScript

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/courses` | Active courses for the authenticated user |
| `GET /api/courses/<course_id>/weeks` | Week numbers found in module names |
| `GET /api/courses/<course_id>/week/<week>` | Quizzes, assignments, and files for a week |
| `GET /api/courses/<course_id>/week/<week>/unfinished` | Same items, filtered to incomplete Canvas work |

Legacy Math-only routes still exist for compatibility:

- `GET /api/week/<week>`
- `GET /api/todo/<week>`

## How It Works

The Flask server in `main.py` proxies Canvas API requests using an `API_TOKEN` environment variable. Helper functions fetch courses, modules, and module items, then format them into consistent JSON for the frontend.

The frontend in `script.js` loads courses, lets you pick a course and week, and renders items grouped by type.

## Running Locally

1. Install dependencies:

```bash
pip install flask requests
```

2. Set your Canvas API token:

```bash
export API_TOKEN="your_token_here"
```

3. Start the app:

```bash
python main.py
```

4. Open `http://127.0.0.1:5000` in your browser.

## Architecture Notes

- Small helper functions (`get_courses`, `get_week_modules`, `get_module_items`, etc.)
- Course-aware API routes for multi-subject support
- No scheduling or prediction logic
- Correctness and maintainability over premature optimization

## Future Plans

- Support all enrolled courses (initial multi-course API is in place)
- Optional display of pages and discussions
- Basic caching when loading many courses
- Backend tests for API routes

## Notes

This project needs a valid Canvas API token to load real data. Keep the token private and do not commit it to the repository.
