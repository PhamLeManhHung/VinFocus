# VinFocus

VinFocus is a personal information hub for Vinschool's Canvas LMS, designed for Vinschool students. It aggregates course modules and items into a cleaner interface so you can browse what exists — without trying to predict what you should do on a given day.

## Why I Built This

The school's LMS works, but it is not always the fastest place to see what quizzes, assignments, and files exist for a given week. I wanted a focused view of Canvas data across courses.

The dashboard does not schedule daily work. Teachers may assign things verbally, lessons can span multiple weeks, and the LMS does not contain enough information to infer daily priorities accurately. Instead, VinFocus helps answer questions like:

- What quizzes exist for this week?
- What assignments exist for this week?
- What files/resources exist for this week?
- What items are still unfinished in Canvas?
- What modules belong to each week?

I decide what to work on.

## Features

- **Course browser** — Lists active Canvas courses from your account as clickable pills.
- **Week navigation** — Browse modules filtered by week number (e.g. `TUẦN 36`). Use arrow keys or the prev/next buttons.
- **General (Week 0)** — Modules without week information are grouped under a "General" category.
- **Item grouping** — Shows quizzes, assignments, and files grouped by type with counts.
- **Unfinished filter** — Filters to incomplete items using Canvas completion requirements.
- **Search** — Real-time search across item titles, module names, types, and course names.
- **Item importance** — Items matching keywords like `HKII`, `HKI`, `hệ số 1`, etc. are visually highlighted.
- **Skeleton loading** — Placeholder UI while items are being fetched.
- **Timetable view** — A weekly timetable with subject labels, room info, and edit mode. Highlights the current period and next period. Mobile view supports "Today" and "Full Week" toggles.
- **Bilingual UI** — Full English and Vietnamese translations. Switch via the language selector in the top-right corner.
- **Dark/Light theme** — Toggle between dark and light themes. Persisted to localStorage.
- **Keyboard navigation** — Left/right arrow keys navigate between weeks (when no input is focused).

## Tech Stack

- **Python** — Backend logic and API
- **Flask** — Web framework
- **Requests** — HTTP client for Canvas API
- **pytest** — Testing framework
- **HTML / CSS / JavaScript** — Frontend

## API Endpoints

### Course-aware routes (current)

| Endpoint | Description |
|----------|-------------|
| `GET /api/courses` | Active courses for the authenticated user. Returns `{ course_count, courses: [{ id, name, course_code }] }`. |
| `GET /api/courses/<course_id>/weeks` | Week numbers found in module names. Week `0` is included if any modules have no week information. Returns `{ course_id, week_count, weeks: [int] }`. |
| `GET /api/courses/<course_id>/week/<week>` | Quizzes, assignments, and files for a week. Returns `{ course_id, course_name, week, item_count, items: [...] }`. |
| `GET /api/courses/<course_id>/week/<week>/unfinished` | Same items, filtered to incomplete Canvas work. Same response shape. |

### Legacy routes (backward compatibility)

These routes use a hardcoded default course ID (`32140`) and exist for older clients:

| Endpoint | Description |
|----------|-------------|
| `GET /api/week/<week>` | Items for a week in the default course. Returns `{ course_id, course_name, week, item_count, items }`. |
| `GET /api/todo/<week>` | Unfinished items for a week in the default course. Returns `{ course_id, course_name, week, todo_count, todo }`. |

### Item response shape

Each item in the `items` array has the following fields:

```json
{
  "course_id": 123,
  "course_name": "Course Name",
  "module": "TUẦN 36",
  "title": "Quiz 1",
  "type": "Quiz",
  "completed": false,
  "module_item_id": 456,
  "url": "https://lms.vinschool.edu.vn/courses/123/quizzes/789"
}
```

Allowed item types: `Quiz`, `Assignment`, `File`, `Page`.

## How It Works

The Flask server in `main.py` proxies Canvas API requests. When you open the app for the first time, a setup wizard guides you through generating and pasting your Canvas API token. The token is sent with every request via the `Authorization` header, so no environment variable is needed for end users.

Helper functions fetch courses, modules, and module items, then format them into consistent JSON for the frontend.

The frontend in `script.js` loads courses, lets you pick a course and week, and renders items grouped by type. The timetable is stored locally in the browser's `localStorage` and is fully editable.

### Architecture notes

- **Caching** — In-memory cache with a 5-minute TTL and LRU eviction (max 1000 entries). Thread-safe with a lock.
- **Concurrency** — Module items are fetched in parallel using `ThreadPoolExecutor` (up to 8 workers).
- **Logging** — Structured logging with timestamps, log levels, and module names.
- **Week parsing** — A custom parser extracts week numbers from module names. Supports Vietnamese (`tuần`) and English (`week`) keywords, ranges (`-`, `–`), lists (`+`, `&`, `,`, `/`), and mixed formats.
- **Course code parsing** — Course codes like `THCS.OP-MATHS-TEACHER` are parsed to extract subject keys for labeling and filtering. Hidden subjects (`MUS`, `PE`, `ART`) are excluded from the course list.

## Running Locally

1. Install dependencies:

```bash
pip install flask requests
```

For testing:

```bash
pip install pytest
```

2. Start the app:

```bash
python main.py
```

3. Open `http://127.0.0.1:5000` in your browser.

4. On first launch, a setup wizard will appear. Follow the 6-step guide to generate and paste your Canvas API token. The token is stored in your browser and sent with each request — no server-side setup required.

> **Note:** Each token lasts up to 3 months. You'll need to repeat the setup about 3 times per school year. The app will warn you a week before the token expires.

## Running Tests

```bash
pytest test_main.py -v
```

The test suite covers:

- **Unit tests** for the `extract_weeks()` parser (single weeks, ranges, multi-week lists, edge cases, non-week modules).
- **Integration tests** for all API endpoints (success, missing token, API failure, week 0/general, range expansion, legacy routes).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_TOKEN` | — | Canvas API token (optional — can be set via the UI wizard instead) |
| `FLASK_DEBUG` | `"false"` | Enable Flask debug mode |

## Future Plans

- Support all enrolled courses (initial multi-course API is in place)
- Optional display of pages and discussions
- Basic caching when loading many courses
- Backend tests for API routes

## Notes

This project needs a valid Canvas API token to load real data. Keep the token private and do not commit it to the repository.