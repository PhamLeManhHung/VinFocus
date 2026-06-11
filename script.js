const itemList = document.getElementById("item_list");
const searchInput = document.getElementById("search_input");
const coursePills = document.getElementById("course_pills");
const unfinishedOnly = document.getElementById("unfinished_only");
const hubTitle = document.getElementById("hub_title");
const prevWeekBtn = document.getElementById("prev_week");
const nextWeekBtn = document.getElementById("next_week");
const weekLabel = document.getElementById("week_label");

const TYPE_ORDER = ["Quiz", "Assignment", "File"];
const TYPE_LABELS = {
  Quiz: "Quizzes",
  Assignment: "Assignments",
  File: "Files",
};

const SUBJECT_LABELS = {
  MATHS: "Math",
  PHY: "Physics",
  CHEM: "Chemistry",
  BIO: "Biology",
  IT: "IT",
  TECH: "Tech",
  GEO: "Geography",
  HIS: "History",
  CIVIC: "CLISE",
  GCED: "GCED",
  CLISE: "Life Skills",
  NV: "Literature",
  LOCE: "Local Ed",
  CAREER: "Career",
  VNS: "Vietnamese",
  ESL: "English",
};

const HIDDEN_SUBJECTS = new Set(["MUS", "PE", "ART"]);

let items = [];
let courses = [];
let subjectCounts = new Map();
let availableWeeks = [];
let selectedCourseId = null;
let currentWeek = Number(localStorage.getItem("selectedWeek")) || 36;

function courseSubjectKey(course) {
  const parts = (course.course_code || "").split("-");
  return parts[0] === "THCS.OP" && parts.length >= 3 ? parts[1] : null;
}

function isCourseHidden(course) {
  const key = courseSubjectKey(course);
  return key !== null && HIDDEN_SUBJECTS.has(key);
}

function courseTeacherCode(course) {
  const parts = (course.name || "").split("-");
  return parts.length >= 3 ? parts[2] : null;
}

function rebuildSubjectCounts() {
  subjectCounts = new Map();
  for (const course of courses) {
    const key = courseSubjectKey(course);
    if (key) {
      subjectCounts.set(key, (subjectCounts.get(key) || 0) + 1);
    }
  }
}

function courseShortLabel(course) {
  const subjectKey = courseSubjectKey(course);
  const subject = subjectKey
    ? SUBJECT_LABELS[subjectKey] || subjectKey
    : (course.name || "").split("-")[1]?.trim().slice(0, 14) || `Course ${course.id}`;

  if ((subjectCounts.get(subjectKey) || 0) > 1) {
    const teacher = courseTeacherCode(course);
    if (teacher) {
      return `${subject} · ${teacher.slice(0, 6)}`;
    }
  }

  return subject;
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

function showMessage(text) {
  itemList.innerHTML = "";
  const message = document.createElement("p");
  message.className = "empty_message";
  message.textContent = text;
  itemList.appendChild(message);
}

function itemMatchesSearch(item, query) {
  if (!query) {
    return true;
  }

  return [item.title, item.module, item.type, item.course_name]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function createItemRow(item) {
  const row = document.createElement("div");
  row.className = "item_row";

  const content = document.createElement("div");
  content.className = "item_content";

  const title = document.createElement("h3");
  title.className = "item_title";

  if (item.url) {
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = item.title;
    title.appendChild(link);
  } else {
    title.textContent = item.title;
  }

  const meta = document.createElement("p");
  meta.className = "item_meta";
  meta.textContent = item.module;

  const badge = document.createElement("span");
  badge.className = `status_badge ${item.completed ? "status_done" : "status_open"}`;
  badge.textContent = item.completed ? "Done" : "Unfinished";

  content.append(title, meta);
  row.append(content, badge);
  return row;
}

function renderItems() {
  const searchQuery = searchInput.value.trim().toLowerCase();
  const visibleItems = items.filter((item) => itemMatchesSearch(item, searchQuery));

  if (items.length === 0) {
    showMessage("No items for this week.");
    return;
  }

  if (visibleItems.length === 0) {
    showMessage("No items match your search.");
    return;
  }

  itemList.replaceChildren();

  for (const type of TYPE_ORDER) {
    const typeItems = visibleItems.filter((item) => item.type === type);
    if (typeItems.length === 0) {
      continue;
    }

    const section = document.createElement("section");
    section.className = "type_section";

    const heading = document.createElement("h3");
    heading.className = "type_heading";
    heading.textContent = `${TYPE_LABELS[type]} (${typeItems.length})`;

    const list = document.createElement("div");
    list.className = "type_list";
    list.append(...typeItems.map(createItemRow));

    section.append(heading, list);
    itemList.append(section);
  }
}

function renderCoursePills() {
  coursePills.replaceChildren(
    ...courses.map((course) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "course_pill";
      button.textContent = courseShortLabel(course);
      button.title = course.name || course.course_code || "";
      button.setAttribute("aria-pressed", String(course.id === selectedCourseId));

      if (course.id === selectedCourseId) {
        button.classList.add("course_pill_active");
      }

      button.addEventListener("click", () => selectCourse(course.id));
      return button;
    })
  );
}

function updateWeekNav() {
  const weekIndex = availableWeeks.indexOf(currentWeek);

  weekLabel.textContent = currentWeek ? `Week ${currentWeek}` : "Week —";
  prevWeekBtn.disabled = weekIndex <= 0;
  nextWeekBtn.disabled = weekIndex < 0 || weekIndex >= availableWeeks.length - 1;
}

function weekApiPath(courseId, week) {
  const suffix = unfinishedOnly.checked ? "/unfinished" : "";
  return `/api/courses/${courseId}/week/${week}${suffix}`;
}

function updateHubTitle() {
  const course = courses.find((entry) => entry.id === selectedCourseId);
  const courseLabel = course ? courseShortLabel(course) : "Course";
  const scope = unfinishedOnly.checked ? "unfinished" : "items";
  hubTitle.textContent = `${courseLabel} · Week ${currentWeek} · ${items.length} ${scope}`;
}

async function loadCourses() {
  showMessage("Loading courses...");

  const data = await fetchJson("/api/courses");
  courses = data.courses.filter((course) => !isCourseHidden(course));

  if (courses.length === 0) {
    showMessage("No active courses found.");
    return;
  }

  rebuildSubjectCounts();
  courses.sort((a, b) => courseShortLabel(a).localeCompare(courseShortLabel(b)));

  const savedCourseId = Number(localStorage.getItem("selectedCourseId"));
  selectedCourseId = courses.find((course) => course.id === savedCourseId)?.id ?? courses[0].id;

  renderCoursePills();
  await loadWeeks();
  await loadItems();
}

async function loadWeeks() {
  if (!selectedCourseId) {
    return;
  }

  try {
    const data = await fetchJson(`/api/courses/${selectedCourseId}/weeks`);
    availableWeeks = data.weeks;

    if (availableWeeks.length > 0 && !availableWeeks.includes(currentWeek)) {
      currentWeek = availableWeeks.at(-1);
      localStorage.setItem("selectedWeek", String(currentWeek));
    }
  } catch {
    availableWeeks = [];
  }

  updateWeekNav();
}

async function loadItems() {
  if (!selectedCourseId || !currentWeek) {
    return;
  }

  showMessage("Loading items...");

  try {
    const data = await fetchJson(weekApiPath(selectedCourseId, currentWeek));
    items = data.items;
    updateHubTitle();
    updateWeekNav();
    renderItems();
  } catch (error) {
    showMessage(error.message);
  }
}

async function selectCourse(courseId) {
  selectedCourseId = courseId;
  localStorage.setItem("selectedCourseId", String(courseId));
  renderCoursePills();
  await loadWeeks();
  await loadItems();
}

function changeWeek(delta) {
  const weekIndex = availableWeeks.indexOf(currentWeek);
  const nextIndex = weekIndex + delta;

  if (weekIndex < 0 || nextIndex < 0 || nextIndex >= availableWeeks.length) {
    return;
  }

  currentWeek = availableWeeks[nextIndex];
  localStorage.setItem("selectedWeek", String(currentWeek));
  loadItems();
}

loadCourses().catch((error) => showMessage(error.message));

prevWeekBtn.addEventListener("click", () => changeWeek(-1));
nextWeekBtn.addEventListener("click", () => changeWeek(1));
unfinishedOnly.addEventListener("change", loadItems);
searchInput.addEventListener("input", renderItems);
document.querySelector(".icon").addEventListener("click", () => searchInput.focus());
