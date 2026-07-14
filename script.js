const itemList = document.getElementById("item_list");
const searchInput = document.getElementById("search_input");
const coursePills = document.getElementById("course_pills");
const unfinishedOnly = document.getElementById("unfinished_only");
const hubTitle = document.getElementById("hub_title");
const prevWeekBtn = document.getElementById("prev_week");
const nextWeekBtn = document.getElementById("next_week");
const weekInput = document.getElementById("week_input");
const viewTabs = document.querySelectorAll(".view_tab");
const themeToggle = document.getElementById("theme_toggle");
const workView = document.getElementById("work_view");
const timetableView = document.getElementById("timetable_view");
const aboutView = document.getElementById("about_view");
const timetableGrid = document.getElementById("timetable_grid");
const timetableMobile = document.getElementById("timetable_mobile");
const languageSelector = document.getElementById("language_selector");
const tagline = document.getElementById("tagline");
const timetableTitle = document.getElementById("timetable_title");
const timetableNote = document.getElementById("timetable_note");
const timetableHeader = document.querySelector(".timetable_header");

const VINFOCUS_SCRIPT_VERSION = "2.0-fixed";
console.log("[VinFocus] Script loaded, version:", VINFOCUS_SCRIPT_VERSION);
const DEBUG = true;
function debugLog(...args) {
  if (DEBUG) console.log("[VinFocus Debug]", ...args);
}

// Token management
function getToken() {
  const token = localStorage.getItem("api_token") || "";
  debugLog("getToken():", token ? token.slice(0, 10) + "..." : "(empty)");
  return token;
}

function saveToken(token) {
  debugLog("saveToken called, token:", token ? token.slice(0, 10) + "..." : "(empty)");
  localStorage.setItem("api_token", token);
  localStorage.setItem("api_token_saved_at", String(Date.now()));
  debugLog("saveToken: localStorage now has api_token =", (localStorage.getItem("api_token") || "").slice(0, 10) + "...");
}

function clearToken() {
  debugLog("clearToken called");
  localStorage.removeItem("api_token");
  localStorage.removeItem("api_token_saved_at");
  debugLog("clearToken: api_token in localStorage =", localStorage.getItem("api_token"));
}

function getTokenAgeDays() {
  const savedAt = localStorage.getItem("api_token_saved_at");
  if (!savedAt) return null;
  return (Date.now() - Number(savedAt)) / (1000 * 60 * 60 * 24);
}

// Language state management
let currentLanguage = localStorage.getItem("language") || "en";

function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem("language", lang);
  languageSelector.value = lang;
  renderAll();
}

function t(key) {
  return TRANSLATIONS[currentLanguage]?.[key] ?? key;
}

function getSubjectLabel(subjectId) {
  return SUBJECT_LABELS[currentLanguage]?.[subjectId] ?? subjectId;
}

// Translation dictionaries
const TRANSLATIONS = {
  en: {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    today: "Today",
    free: "Free",
    done: "Done",
    unfinished: "Unfinished",
    loadingCourses: "Loading courses...",
    loadingItems: "Loading items...",
    noActiveCourses: "No active courses found.",
    noItemsWeek: "No items for this week.",
    noItemsMatch: "No items match your search.",
    time: "Time",
    period1: "Period 1",
    period2: "Period 2",
    period3: "Period 3",
    period4: "Period 4",
    period5: "Period 5",
    period6: "Period 6",
    period7: "Period 7",
    breaktime: "Breaktime",
    lunchBreak: "Lunch Break",
    work: "Work",
    timetable: "Timetable",
    about: "About",
    aboutTitle: "About VinFocus",
    aboutWhatTitle: "What is VinFocus?",
    aboutWhatDesc: "VinFocus is a personal dashboard for vinschool's Canvas LMS. It organizes quizzes, assignments, files, and course modules into a cleaner, easier-to-navigate interface so students can quickly find what they need.",
    aboutWhyTitle: "Why I built it",
    aboutWhyDesc: "Vinschool LMS contains all the necessary information, but finding it often requires opening multiple pages and searching through long module lists. I built VinFocus to make course information easier to access, helping students spend less time navigating and more time studying.",
    aboutHowTitle: "How to use it",
    aboutHow1: "Browse your active Canvas courses.",
    aboutHow2: "Navigate between weeks to view related modules and resources.",
    aboutHow3: "Search across courses, modules, quizzes, assignments, and files.",
    aboutHow4: "Filter unfinished items based on Canvas completion status.",
    aboutHow5: "View and manage your weekly timetable.",
    aboutHow6: "Switch between English and Vietnamese.",
    aboutHow7: "Toggle between dark and light themes.",
    aboutHow8: "For general modules that don't have a week number, go to Week 0.",
    week: "Week",
    general: "General",
    searchPlaceholder: "Search items",
    unfinishedLabel: "Unfinished",
    tagline: "Canvas information hub — browse courses, weeks, and resources.",
    timetableTitle: "Weekly Timetable",
    timetableNote: "Manual schedule stored locally in this app.",
    items: "items",
    noClassesAdded: "No classes added yet.",
    weekendNoClasses: "No classes, it's the weekend.",
    setupTitle: "Welcome to VinFocus",
    setupSubtitle: "Set up your Canvas API token to get started.",
    setupStep: "Step",
    setupOf: "of",
    setupNext: "Next",
    setupPrev: "Back",
    setupFinish: "Finish",
    setupSkip: "I already have a token",
    setupTokenLabel: "Paste your API token here",
    setupTokenPlaceholder: "Paste your Canvas API token...",
    setupValidate: "Validate & Save",
    setupValidating: "Validating...",
    setupSuccess: "Token saved successfully!",
    setupError: "Invalid token. Please check and try again.",
    setupTokenHelp: "Don't have a token yet? Follow the steps below.",
    setupSecurityTitle: "⚠️ Security Notice",
    setupSecurityDesc: "Your Canvas API token is like a password. It grants full access to your Canvas account. VinFocus only uses this token to read your course data. It is never sent to any third party. • Never share your token with anyone • Never commit it to public code repositories • It is stored only in your browser's local storage (not on any server) • You can revoke it anytime from your Canvas Account Settings.",
    setupStep1Title: "Log in to Vinschool Canvas",
    setupStep1Desc: "Go to lms.vinschool.edu.vn and log in with your school account.",
    setupStep2Title: "Open Account Settings",
    setupStep2Desc: 'Click the "Tài Khoản" (Account) button at the top-left corner, then select "Cài Đặt" (Settings).',
    setupStep3Title: "Find Approved Integrations",
    setupStep3Desc: 'Scroll down to the "Tích Hợp Được Phê Duyệt" (Approved Integrations) section.',
    setupStep4Title: "Create a New Access Token",
    setupStep4Desc: 'Click the "Thẻ Truy Cập Mới" (New Access Token) button.',
    setupStep5Title: "Fill in Token Details",
    setupStep5Desc: 'Set "Mục Đích" (Purpose) to "VinFocus" and select the latest possible date for "Ngày Hết Hạn" (Expiration Date).',
    setupStep5Note: "Each token lasts up to 3 months. You'll need to repeat this process about 3 times per school year.",
    setupStep6Title: "Copy and Paste Your Token",
    setupStep6Desc: "Copy the generated API key and paste it into the field below.",
    setupScreenshot: "Screenshot coming soon",
    tokenExpiresSoon: "Your API token will expire in {days} days.",
    tokenExpired: "Your API token has expired. Please update it.",
    tokenExpiresToday: "Your API token expires today!",
    tokenSettings: "API Token Settings",
    tokenUpdate: "Update Token",
    tokenClose: "Close",
    tokenAge: "Token age: {days} days",
    tokenValid: "Token is active",
    footerMadeBy: "Made by Pham Le Manh Hung",
    footerFeedback: "I appreciate any reviews or feedbacks towards this project.",
    footerCopyright: "© 2026 VinFocus",
    settingsTitle: "Settings",
    settingsApiToken: "API Token Settings",
    settingsFeedback: "Send Feedback",
    feedbackTitle: "Send Feedback",
    feedbackRating: "How useful has VinFocus been?",
    feedbackUsage: "What do you use it for most?",
    feedbackUsageQuizzes: "Finding quizzes, assignments and more",
    feedbackUsageTimetable: "Timetable",
    feedbackUsageUnfinished: "Unfinished work",
    feedbackUsageOther: "Other",
    feedbackRecommend: "Would you recommend VinFocus to another student?",
    feedbackRecommendYes: "Yes",
    feedbackRecommendMaybe: "Maybe",
    feedbackRecommendNo: "No",
    feedbackImprove: "What's one thing you'd improve?",
    feedbackImprovePlaceholder: "Type your suggestion...",
    feedbackSubmit: "Submit Feedback",
    feedbackSubmitting: "Submitting...",
    feedbackSuccess: "Thank you for your feedback!",
    feedbackError: "Something went wrong. Please try again.",
  },
  vi: {
    monday: "Thứ Hai",
    tuesday: "Thứ Ba",
    wednesday: "Thứ Tư",
    thursday: "Thứ Năm",
    friday: "Thứ Sáu",
    today: "Hôm Nay",
    free: "Trống",
    done: "Hoàn Thành",
    unfinished: "Chưa Hoàn Thành",
    loadingCourses: "Đang tải khóa học...",
    loadingItems: "Đang tải mục...",
    noActiveCourses: "Không tìm thấy khóa học hoạt động.",
    noItemsWeek: "Không có mục nào trong tuần này.",
    noItemsMatch: "Không tìm thấy mục phù hợp.",
    time: "Thời Gian",
    period1: "Tiết 1",
    period2: "Tiết 2",
    period3: "Tiết 3",
    period4: "Tiết 4",
    period5: "Tiết 5",
    period6: "Tiết 6",
    period7: "Tiết 7",
    breaktime: "Giờ ra chơi",
    lunchBreak: "Nghỉ trưa",
    work: "Làm Việc",
    timetable: "Thời Khóa Biểu",
    about: "Giới Thiệu",
    aboutTitle: "Giới Thiệu VinFocus",
    aboutWhatTitle: "VinFocus là gì?",
    aboutWhatDesc: "VinFocus là một bảng điều khiển cá nhân cho Canvas LMS của vinschool. Nó sắp xếp các bài kiểm tra, bài tập, tệp tin và các module khóa học vào một giao diện sạch hơn, dễ điều hướng hơn, giúp học sinh nhanh chóng tìm thấy những gì cần thiết.",
    aboutWhyTitle: "Tại sao mình xây dựng nó",
    aboutWhyDesc: "Vinschool LMS chứa tất cả thông tin cần thiết, nhưng việc tìm kiếm thường đòi hỏi phải mở nhiều trang và tìm kiếm qua danh sách module dài. Mình xây dựng VinFocus để giúp việc truy cập thông tin khóa học dễ dàng hơn, giúp học sinh dành ít thời gian điều hướng hơn và nhiều thời gian học tập hơn.",
    aboutHowTitle: "Cách sử dụng",
    aboutHow1: "Duyệt các khóa học Canvas đang hoạt động của bạn.",
    aboutHow2: "Điều hướng giữa các tuần để xem module và tài nguyên liên quan.",
    aboutHow3: "Tìm kiếm qua các khóa học, module, bài kiểm tra, bài tập và tệp tin.",
    aboutHow4: "Lọc các mục chưa hoàn thành dựa trên trạng thái hoàn thành của Canvas.",
    aboutHow5: "Xem và quản lý thời khóa biểu hàng tuần của bạn.",
    aboutHow6: "Chuyển đổi giữa Tiếng Anh và Tiếng Việt.",
    aboutHow7: "Chuyển đổi giữa chủ đề tối và sáng.",
    aboutHow8: "Đối với các học phần chung không có số tuần, hãy chuyển đến Tuần 0.",
    week: "Tuần",
    general: "Chung",
    searchPlaceholder: "Tìm kiếm mục",
    unfinishedLabel: "Chưa Hoàn Thành",
    tagline: "Trung tâm thông tin Canvas — duyệt khóa học, tuần và tài nguyên.",
    timetableTitle: "Thời Khóa Biểu Tuần",
    timetableNote: "Lịch học được lưu cục bộ trong ứng dụng này.",
    items: "bài",
    noClassesAdded: "Chưa có lớp học nào được thêm.",
    weekendNoClasses: "Không có tiết học nào, hôm nay là cuối tuần.",
    setupTitle: "Chào mừng đến với VinFocus",
    setupSubtitle: "Thiết lập mã API Canvas để bắt đầu.",
    setupStep: "Bước",
    setupOf: "trên",
    setupNext: "Tiếp theo",
    setupPrev: "Quay lại",
    setupFinish: "Hoàn tất",
    setupSkip: "Tôi đã có mã",
    setupTokenLabel: "Dán mã API của bạn vào đây",
    setupTokenPlaceholder: "Dán mã Canvas API...",
    setupValidate: "Xác thực & Lưu",
    setupValidating: "Đang xác thực...",
    setupSuccess: "Đã lưu mã thành công!",
    setupError: "Mã không hợp lệ. Vui lòng kiểm tra lại.",
    setupTokenHelp: "Chưa có mã? Làm theo các bước dưới đây.",
    setupSecurityTitle: "⚠️ Lưu ý Bảo Mật",
    setupSecurityDesc: "Mã API Canvas của bạn giống như mật khẩu. Nó cấp quyền truy cập đầy đủ vào tài khoản Canvas của bạn. VinFocus chỉ sử dụng mã này để đọc dữ liệu khóa học của bạn. Mã không bao giờ được gửi cho bên thứ ba.\n\n• Không bao giờ chia sẻ mã của bạn với bất kỳ ai\n• Không bao giờ đưa nó vào kho mã nguồn công cộng\n• Mã chỉ được lưu trữ trong trình duyệt của bạn (không trên máy chủ nào)\n• Bạn có thể thu hồi mã bất cứ lúc nào từ Cài Đặt Tài Khoản Canvas.\n\n",
    setupStep1Title: "Đăng nhập vào Vinschool Canvas",
    setupStep1Desc: "Truy cập lms.vinschool.edu.vn và đăng nhập bằng tài khoản trường của bạn.",
    setupStep2Title: "Mở Cài Đặt Tài Khoản",
    setupStep2Desc: 'Nhấn nút "Tài Khoản" ở góc trên bên trái, sau đó chọn "Cài Đặt".',
    setupStep3Title: "Tìm Tích Hợp Được Phê Duyệt",
    setupStep3Desc: 'Cuộn xuống phần "Tích Hợp Được Phê Duyệt".',
    setupStep4Title: "Tạo Thẻ Truy Cập Mới",
    setupStep4Desc: 'Nhấn nút "Thẻ Truy Cập Mới".',
    setupStep5Title: "Điền Thông Tin Token",
    setupStep5Desc: 'Đặt "Mục Đích" là "VinFocus" và chọn ngày xa nhất có thể cho "Ngày Hết Hạn".',
    setupStep5Note: "Mỗi token có thời hạn tối đa 3 tháng. Bạn sẽ cần làm lại quy trình này khoảng 3 lần mỗi năm học.",
    setupStep6Title: "Sao Chép và Dán Token",
    setupStep6Desc: "Sao chép mã API được tạo và dán vào ô bên dưới.",
    setupScreenshot: "Ảnh chụp màn hình sẽ được cập nhật sau",
    tokenExpiresSoon: "Mã API của bạn sẽ hết hạn trong {days} ngày.",
    tokenExpired: "Mã API của bạn đã hết hạn. Vui lòng cập nhật.",
    tokenExpiresToday: "Mã API của bạn hết hạn hôm nay!",
    tokenSettings: "Cài Đặt Mã API",
    tokenUpdate: "Cập Nhật Mã",
    tokenClose: "Đóng",
    tokenAge: "Tuổi mã: {days} ngày",
    tokenValid: "Mã API đang hoạt động",
    footerMadeBy: "Được tạo bởi Phạm Lê Mạnh Hùng",
    footerFeedback: "Mình rất trân trọng mọi đánh giá và phản hồi về dự án này.",
    footerCopyright: "© 2026 VinFocus",
    settingsTitle: "Cài Đặt",
    settingsApiToken: "Cài Đặt Mã API",
    settingsFeedback: "Gửi Phản Hồi",
    feedbackTitle: "Gửi Phản Hồi",
    feedbackRating: "VinFocus hữu ích như thế nào?",
    feedbackUsage: "Bạn sử dụng VinFocus nhiều nhất để làm gì?",
    feedbackUsageQuizzes: "Tìm bài kiểm tra, bài tập và hơn thế nữa",
    feedbackUsageTimetable: "Thời khóa biểu",
    feedbackUsageUnfinished: "Công việc chưa hoàn thành",
    feedbackUsageOther: "Khác",
    feedbackRecommend: "Bạn có giới thiệu VinFocus cho học sinh khác không?",
    feedbackRecommendYes: "Có",
    feedbackRecommendMaybe: "Có thể",
    feedbackRecommendNo: "Không",
    feedbackImprove: "Một điều bạn muốn cải thiện?",
    feedbackImprovePlaceholder: "Nhập gợi ý của bạn...",
    feedbackSubmit: "Gửi Phản Hồi",
    feedbackSubmitting: "Đang gửi...",
    feedbackSuccess: "Cảm ơn bạn đã phản hồi!",
    feedbackError: "Đã xảy ra lỗi. Vui lòng thử lại.",
  },
};

// Subject labels with bilingual support
const SUBJECT_LABELS = {
  en: {
    MATHS: "Math",
    PHY: "Physics",
    CHEM: "Chemistry",
    BIO: "Biology",
    IT: "ICT",
    TECH: "Tech",
    GEO: "Geography",
    HIS: "History",
    CIVIC: "Civics",
    GCED: "GCED",
    CLISE: "CLISE",
    NV: "Literature",
    LOCE: "Local Studies",
    CAREER: "Career",
    VNS: "VNH",
    "ESL (GVVN)": "ESL (GVVN)",
    "ESL (GVNN)": "ESL (GVNN)",
    MUS: "Music",
    PE: "Sports",
    ART: "Art",
  },
  vi: {
    MATHS: "Toán",
    PHY: "Vật Lý",
    CHEM: "Hóa Học",
    BIO: "Sinh Học",
    IT: "Tin Học",
    TECH: "Công Nghệ",
    GEO: "Địa Lý",
    HIS: "Lịch Sử",
    CIVIC: "GDCD",
    GCED: "GCED",
    CLISE: "CLISE",
    NV: "Ngữ Văn",
    LOCE: "NDĐP",
    CAREER: "HĐTN-HN",
    VNS: "VNH",
    "ESL (GVVN)": "ESL (GVVN)",
    "ESL (GVNN)": "ESL (GVNN)",
    MUS: "Âm Nhạc",
    PE: "Thể Chất",
    ART: "Mỹ Thuật",
  },
};

const HIDDEN_SUBJECTS = new Set(["MUS", "PE", "ART"]);

const DEFAULT_TIMETABLE = {
  monday: [
    { period: "p1", subject: "GEO" },
    { period: "p2", subject: "PHY" },
    { period: "p3", subject: "ESL (GVNN)" },
    { period: "p4", subject: "ESL (GVNN)" },
    { period: "p5", subject: "MUS" },
    { period: "p6", subject: "NV" },
    { period: "p7", subject: "VNS" },
  ],
  tuesday: [
    { period: "p1", subject: "ESL (GVVN)" },
    { period: "p2", subject: "ESL (GVVN)" },
    { period: "p3", subject: "MATHS" },
    { period: "p4", subject: "MATHS" },
    { period: "p5", subject: "PHY" },
    { period: "p6", subject: "PE" },
    { period: "p7", subject: "CLISE" },
  ],
  wednesday: [
    { period: "p1", subject: "ESL (GVVN)" },
    { period: "p2", subject: "ESL (GVVN)" },
    { period: "p3", subject: "NV" },
    { period: "p4", subject: "GCED" },
    { period: "p5", subject: "ESL (GVNN)" },
    { period: "p6", subject: "MATHS" },
    { period: "p7", subject: "MATHS" },
  ],
  thursday: [
    { period: "p1", subject: "PE" },
    { period: "p2", subject: "NV" },
    { period: "p3", subject: "NV" },
    { period: "p4", subject: "MATHS" },
    { period: "p5", subject: "PHY" },
    { period: "p6", subject: "ESL (GVNN)" },
    { period: "p7", subject: "ESL (GVNN)" },
  ],
  friday: [
    { period: "p1", subject: "GCED" },
    { period: "p2", subject: "PHY" },
    { period: "p3", subject: "PHY" },
    { period: "p4", subject: "HIS" },
    { period: "p5", subject: "ESL (GVVN)" },
    { period: "p6", subject: "IT" },
    { period: "p7", subject: "IT" },
  ],
};

function loadTimetable() {
  try {
    const stored = localStorage.getItem("timetable");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore parse errors
  }
  return JSON.parse(JSON.stringify(DEFAULT_TIMETABLE));
}

function saveTimetable(timetable) {
  localStorage.setItem("timetable", JSON.stringify(timetable));
}

let TIMETABLE = loadTimetable();
let timetableEditMode = false;

const TIMETABLE_DAYS = [
  { key: "monday", labelKey: "monday", index: 1 },
  { key: "tuesday", labelKey: "tuesday", index: 2 },
  { key: "wednesday", labelKey: "wednesday", index: 3 },
  { key: "thursday", labelKey: "thursday", index: 4 },
  { key: "friday", labelKey: "friday", index: 5 },
];

const TIMETABLE_PERIODS = [
  { key: "p1", labelKey: "period1", start: "08:00am", end: "08:45am", type: "class" },
  { key: "p2", labelKey: "period2", start: "08:50am", end: "09:35am", type: "class" },
  { key: "break1", labelKey: "breaktime", start: "09:35am", end: "09:55am", type: "break" },
  { key: "p3", labelKey: "period3", start: "09:55am", end: "10:40am", type: "class" },
  { key: "p4", labelKey: "period4", start: "10:45am", end: "11:30am", type: "class" },
  { key: "p5", labelKey: "period5", start: "11:35am", end: "12:20pm", type: "class" },
  { key: "lunch", labelKey: "lunchBreak", start: "12:20pm", end: "01:30pm", type: "break" },
  { key: "p6", labelKey: "period6", start: "01:35pm", end: "02:20pm", type: "class" },
  { key: "break2", labelKey: "breaktime", start: "02:20pm", end: "02:40pm", type: "break" },
  { key: "p7", labelKey: "period7", start: "02:40pm", end: "03:25pm", type: "class" },
];

const TYPE_ORDER = ["Quiz", "Assignment", "File", "Page"];
const TYPE_LABELS = {
  Quiz: "Quizzes",
  Assignment: "Assignments",
  File: "Files",
  Page: "Pages",
};

let items = [];
let courses = [];
let subjectCounts = new Map();
let availableWeeks = [];
let selectedCourseId = null;
let currentWeek = (() => { const w = Number(localStorage.getItem("selectedWeek")); return Number.isFinite(w) ? w : 36; })();
let coursesLoaded = false;
let itemCache = new Map();
let timetableMobileView = localStorage.getItem("timetableMobileView") || "today";

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
    ? getSubjectLabel(subjectKey)
    : (course.name || "").split("-")[1]?.trim().slice(0, 14) || `Course ${course.id}`;

  if ((subjectCounts.get(subjectKey) || 0) > 1) {
    const teacher = courseTeacherCode(course);
    if (teacher) {
      return `${subject} · ${teacher.slice(0, 6)}`;
    }
  }

  return subject;
}

function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}

async function fetchJson(url) {
  debugLog("fetchJson: calling", url);
  const response = await apiFetch(url);
  debugLog("fetchJson: response status", response.status, "for", url);

  if (!response.ok) {
    const dataText = await response.text();
    let data;
    try { data = JSON.parse(dataText); } catch { data = { error: dataText }; }
    debugLog("fetchJson: error response body", data);

    if (response.status === 401) {
      // Token expired or invalid - clear it and show setup
      debugLog("fetchJson: got 401, clearing token and showing setup overlay");
      clearToken();
      showSetupOverlay();
    }
    throw new Error(data.error || "Request failed.");
  }

  const data = await response.json();
  return data;
}

function showMessage(text) {
  itemList.innerHTML = "";
  const message = document.createElement("p");
  message.className = "empty_message";
  message.textContent = text;
  itemList.appendChild(message);
}

function showSkeletonLoading() {
  itemList.innerHTML = "";
  const skeletonCount = 6;
  for (let i = 0; i < skeletonCount; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "skeleton_item";
    
    const title = document.createElement("div");
    title.className = "skeleton_title";
    
    const meta = document.createElement("div");
    meta.className = "skeleton_meta";
    
    const badge = document.createElement("div");
    badge.className = "skeleton_badge";
    
    skeleton.append(title, meta, badge);
    itemList.appendChild(skeleton);
  }
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

// Keywords that indicate an item is important for scoring
const IMPORTANT_KEYWORDS = [
  "HKII", "HKI", "HK1", "HK2",
  "học kỳ 1", "học kì 1", "học kỳ 2", "học kì 2",
  "cuối năm",
  "hệ số 1", "hệ số 2", "hệ số 3",
  "HS1", "HS2", "HS3",
];

function isItemImportant(item) {
  const text = [item.title, item.module].join(" ").toLowerCase();
  return IMPORTANT_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
}

function createItemRow(item) {
  const row = document.createElement("div");
  row.className = "item_row";

  if (isItemImportant(item)) {
    row.classList.add("item_row_important");
  }

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
  badge.textContent = item.completed ? t("done") : t("unfinished");

  content.append(title, meta);
  row.append(content, badge);
  return row;
}

function renderItems() {
  const searchQuery = searchInput.value.trim().toLowerCase();
  const visibleItems = items.filter((item) => itemMatchesSearch(item, searchQuery));

  if (items.length === 0) {
    showMessage(t("noItemsWeek"));
    return;
  }

  if (visibleItems.length === 0) {
    showMessage(t("noItemsMatch"));
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

  weekInput.value = currentWeek != null ? String(currentWeek) : "";

  if (weekIndex < 0) {
    // Current week is not in available weeks, enable arrows to jump to nearest valid week
    prevWeekBtn.disabled = availableWeeks.length === 0;
    nextWeekBtn.disabled = availableWeeks.length === 0;
  } else {
    prevWeekBtn.disabled = weekIndex <= 0;
    nextWeekBtn.disabled = weekIndex >= availableWeeks.length - 1;
  }
}

function weekApiPath(courseId, week) {
  const suffix = unfinishedOnly.checked ? "/unfinished" : "";
  return `/api/courses/${courseId}/week/${week}${suffix}`;
}

function updateHubTitle() {
  const course = courses.find((entry) => entry.id === selectedCourseId);
  const courseLabel = course ? courseShortLabel(course) : "Course";
  const scope = unfinishedOnly.checked ? t("unfinished") : `${items.length} ${t("items")}`;
  const weekLabel = currentWeek === 0 ? t("general") : `${t("week")} ${currentWeek}`;
  hubTitle.textContent = `${courseLabel} · ${weekLabel} · ${scope}`;
}

async function loadCourses() {
  if (coursesLoaded) {
    return;
  }

  showMessage(t("loadingCourses"));

  const data = await fetchJson("/api/courses");
  courses = data.courses.filter((course) => !isCourseHidden(course));
  coursesLoaded = true;

  if (courses.length === 0) {
    showMessage(t("noActiveCourses"));
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
  if (!selectedCourseId || (currentWeek !== 0 && !currentWeek)) {
    return;
  }

  const cacheKey = `${selectedCourseId}:${currentWeek}:${unfinishedOnly.checked}`;
  
  if (itemCache.has(cacheKey)) {
    items = itemCache.get(cacheKey);
    updateHubTitle();
    updateWeekNav();
    renderItems();
    return;
  }

  showSkeletonLoading();

  try {
    const data = await fetchJson(weekApiPath(selectedCourseId, currentWeek));
    items = data.items;
    itemCache.set(cacheKey, items);
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
  if (availableWeeks.length === 0) return;

  // Find where currentWeek would be inserted (first week >= currentWeek)
  let insertPoint = availableWeeks.findIndex((w) => w >= currentWeek);
  if (insertPoint < 0) insertPoint = availableWeeks.length;

  let targetIndex;
  if (delta > 0) {
    // Moving right
    if (insertPoint < availableWeeks.length && availableWeeks[insertPoint] === currentWeek) {
      // Current week exists in array, go to next
      targetIndex = insertPoint + 1;
    } else {
      // Current week doesn't exist, go to first week >= currentWeek
      targetIndex = insertPoint;
    }
  } else {
    // Moving left
    targetIndex = insertPoint - 1;
  }

  if (targetIndex < 0 || targetIndex >= availableWeeks.length) return;

  currentWeek = availableWeeks[targetIndex];
  localStorage.setItem("selectedWeek", String(currentWeek));
  loadItems();
}

function timetableEntryFor(dayKey, periodKey) {
  return (TIMETABLE[dayKey] || []).find((entry) => entry.period === periodKey);
}

function todayDayKey() {
  const todayIndex = new Date().getDay();
  return TIMETABLE_DAYS.find((day) => day.index === todayIndex)?.key ?? null;
}

function timeToMinutes(timeStr) {
  const match = timeStr.match(/(\d+):(\d+)(am|pm)/);
  if (!match) return 0;
  
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3];
  
  if (meridiem === "pm" && hours !== 12) {
    hours += 12;
  } else if (meridiem === "am" && hours === 12) {
    hours = 0;
  }
  
  return hours * 60 + minutes;
}

function currentPeriodKey() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const period of TIMETABLE_PERIODS) {
    const startTotal = timeToMinutes(period.start);
    const endTotal = timeToMinutes(period.end);
    
    if (currentMinutes >= startTotal && currentMinutes < endTotal) {
      return period.key;
    }
  }

  return null;
}

function nextPeriodKey() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  let foundCurrent = false;
  
  for (const period of TIMETABLE_PERIODS) {
    if (foundCurrent) {
      return period.key;
    }
    
    const startTotal = timeToMinutes(period.start);
    const endTotal = timeToMinutes(period.end);
    
    if (currentMinutes >= startTotal && currentMinutes < endTotal) {
      foundCurrent = true;
    }
  }

  return null;
}

function createSlotContent(period, entry) {
  const fragment = document.createDocumentFragment();

  const subject = document.createElement("p");
  subject.className = "slot_subject";
  
  if (period.type === "break") {
    subject.textContent = t(period.labelKey);
  } else if (entry?.subject) {
    // Extract subject ID and teacher info from strings like "ESL (GVVN)"
    const subjectMatch = entry.subject.match(/^([A-Z]+)\s*(?:\(([^)]+)\))?$/);
    if (subjectMatch) {
      const subjectId = subjectMatch[1];
      const teacherInfo = subjectMatch[2];
      const subjectLabel = getSubjectLabel(subjectId);
      subject.textContent = teacherInfo ? `${subjectLabel} (${teacherInfo})` : subjectLabel;
    } else {
      subject.textContent = getSubjectLabel(entry.subject);
    }
  } else {
    subject.textContent = t("free");
  }

  const metaParts = [];
  if (entry?.room) {
    metaParts.push(entry.room);
  }

  const meta = document.createElement("p");
  meta.className = "slot_meta";
  meta.textContent = metaParts.length > 0
    ? metaParts.join(" · ")
    : "";

  fragment.append(subject, meta);
  return fragment;
}

function renderTimetableGrid() {
  const todayKey = todayDayKey();
  const currentPeriod = currentPeriodKey();
  const nextPeriod = nextPeriodKey();
  const cells = [];

  const corner = document.createElement("div");
  corner.className = "day_cell";
  corner.textContent = t("time");
  cells.push(corner);

  for (const day of TIMETABLE_DAYS) {
    const dayCell = document.createElement("div");
    dayCell.className = "day_cell";
    dayCell.textContent = t(day.labelKey);

    if (day.key === todayKey) {
      dayCell.classList.add("day_cell_today");
    }

    cells.push(dayCell);
  }

  for (const period of TIMETABLE_PERIODS) {
    if (period.type === "break") {
      const breakCell = document.createElement("div");
      breakCell.className = "slot_cell slot_cell_break slot_cell_break_full";
      if (todayKey) {
        breakCell.classList.add("slot_cell_today");
      }
      const breakSubject = document.createElement("p");
      breakSubject.className = "slot_subject";
      breakSubject.textContent = t(period.labelKey);
      const breakMeta = document.createElement("p");
      breakMeta.className = "slot_meta";
      breakMeta.textContent = `${period.start}-\n${period.end}`;
      breakCell.append(breakSubject, breakMeta);
      cells.push(breakCell);
      continue;
    }

    const timeCell = document.createElement("div");
    timeCell.className = "time_cell";
    timeCell.textContent = `${t(period.labelKey)}\n${period.start}-\n${period.end}`;
    cells.push(timeCell);

    for (let i = 0; i < TIMETABLE_DAYS.length; i++) {
      const day = TIMETABLE_DAYS[i];
      const entry = timetableEntryFor(day.key, period.key);
      const slot = document.createElement("div");
      slot.className = "slot_cell";

      if (!entry) {
        slot.classList.add("slot_cell_free");
      }

      if (day.key === todayKey) {
        slot.classList.add("slot_cell_today");
      }

      if (day.key === todayKey && period.key === currentPeriod) {
        slot.classList.add("slot_cell_current");
      } else if (day.key === todayKey && period.key === nextPeriod) {
        slot.classList.add("slot_cell_next");
      }

      if (i === TIMETABLE_DAYS.length - 1) {
        slot.classList.add("last_col");
      }

      if (timetableEditMode && period.type === "class") {
        slot.style.cursor = "pointer";
        slot.title = "Click to edit subject";
        slot.dataset.dayKey = day.key;
        slot.dataset.periodKey = period.key;
        slot.addEventListener("click", () => openSubjectEditor(day.key, period.key, slot));
      }

      slot.append(createSlotContent(period, entry));
      cells.push(slot);
    }
  }

  timetableGrid.replaceChildren(...cells);
}

function renderTimetableMobile() {
  const todayKey = todayDayKey();
  const nextPeriod = nextPeriodKey();
  
  // Check if it's a weekend (Saturday=6, Sunday=0) and "Today" view is active
  const dayIndex = new Date().getDay();
  const isWeekend = dayIndex === 0 || dayIndex === 6;
  
  // On weekend with "Today" view, show a message instead of days
  if (timetableMobileView === "today" && isWeekend) {
    timetableMobile.replaceChildren();
    const weekendMsg = document.createElement("p");
    weekendMsg.className = "weekend_message";
    weekendMsg.textContent = t("weekendNoClasses");
    timetableMobile.appendChild(weekendMsg);
    return;
  }
  
  // Filter days based on mobile view toggle
  let daysToShow = TIMETABLE_DAYS;
  if (timetableMobileView === "today" && todayKey) {
    daysToShow = TIMETABLE_DAYS.filter(day => day.key === todayKey);
  }
  
  const daySections = daysToShow.map((day) => {
    const section = document.createElement("section");
    section.className = "day_schedule";

    const heading = document.createElement("h3");
    heading.textContent = t(day.labelKey);

    if (day.key === todayKey) {
      const badge = document.createElement("span");
      badge.className = "today_label";
      badge.textContent = t("today");
      heading.appendChild(badge);
    }

    section.appendChild(heading);

    const hasClasses = (TIMETABLE[day.key] || []).some((entry) => entry.subject);
    if (!hasClasses) {
      const empty = document.createElement("p");
      empty.className = "day_empty";
      empty.textContent = t("noClassesAdded");
      section.appendChild(empty);
    }

    for (const period of TIMETABLE_PERIODS) {
      const entry = timetableEntryFor(day.key, period.key);
      if (period.type === "class" && !entry) {
        continue;
      }

      const slot = document.createElement("div");
      slot.className = "mobile_slot";

      const time = document.createElement("div");
      time.className = "mobile_time";
      time.textContent = `${t(period.labelKey)}\n${period.start}-\n${period.end}`;

      const content = document.createElement("div");
      if (day.key === todayKey && period.key === nextPeriod) {
        slot.classList.add("slot_cell_next");
      }
      content.append(createSlotContent(period, entry));
      
      if (timetableEditMode && period.type === "class") {
        slot.style.cursor = "pointer";

        slot.addEventListener("click", () => {
          openSubjectEditor(day.key, period.key, slot);
        });
      }

      slot.append(time, content);
      section.appendChild(slot);
    }

    return section;
  });

  timetableMobile.replaceChildren(...daySections);
}

function renderTimetable() {
  renderTimetableGrid();
  renderTimetableMobile();
}

function isMobile() {
  return window.innerWidth <= 900;
}

function openSubjectEditor(dayKey, periodKey, slotElement) {
  const currentEntry = timetableEntryFor(dayKey, periodKey);
  const currentSubject = currentEntry?.subject || "";
  
  // Use modal editor on mobile, inline editor on desktop
  if (isMobile()) {
    openMobileSubjectEditor(dayKey, periodKey, slotElement, currentSubject);
  } else {
    openDesktopSubjectEditor(dayKey, periodKey, slotElement, currentSubject);
  }
}

function openDesktopSubjectEditor(dayKey, periodKey, slotElement, currentSubject) {
  const editor = document.createElement("div");
  editor.className = "timetable_editor";
  
  const select = document.createElement("select");
  select.className = "timetable_editor_select";
  
  const allSubjects = Object.keys(SUBJECT_LABELS[currentLanguage] || {});
  allSubjects.forEach((subjectId) => {
    const option = document.createElement("option");
    option.value = subjectId;
    option.textContent = getSubjectLabel(subjectId);
    if (subjectId === currentSubject) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  
  // Prevent select from losing focus
  select.addEventListener("mousedown", (e) => {
    e.stopPropagation();
  });
  
  select.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  
  const saveBtn = document.createElement("button");
  saveBtn.className = "timetable_editor_btn";
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const selectedSubject = select.value;
    const day = TIMETABLE[dayKey] || [];
    const existingIndex = day.findIndex((entry) => entry.period === periodKey);
    
    if (existingIndex >= 0) {
      day[existingIndex].subject = selectedSubject;
    } else {
      day.push({ period: periodKey, subject: selectedSubject });
    }
    
    TIMETABLE[dayKey] = day;
    saveTimetable(TIMETABLE);
    closeEditor(editor);
  });
  
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "timetable_editor_btn";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeEditor(editor);
  });
  
  // Prevent editor clicks from bubbling to slot
  editor.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  
  editor.addEventListener("mousedown", (e) => {
    e.stopPropagation();
  });
  
  editor.append(select, saveBtn, cancelBtn);
  slotElement.innerHTML = "";
  slotElement.appendChild(editor);
  
  // Auto-focus the select
  setTimeout(() => select.focus(), 0);
}

function openMobileSubjectEditor(dayKey, periodKey, slotElement, currentSubject) {
  // Create modal overlay
  const modal = document.createElement("div");
  modal.className = "timetable_mobile_modal";
  
  const modalContent = document.createElement("div");
  modalContent.className = "timetable_mobile_modal_content";
  
  const period = TIMETABLE_PERIODS.find(p => p.key === periodKey);
  const entry = timetableEntryFor(dayKey, periodKey);
  
  // Period info (left column, row 1)
  const periodInfo = document.createElement("div");
  periodInfo.className = "timetable_mobile_period_info";
  periodInfo.textContent = `${t(period.labelKey)}\n${period.start}-\n${period.end}`;
  
  // Current subject text (left column, row 2)
  const currentSubjectText = document.createElement("p");
  currentSubjectText.className = "timetable_mobile_current_subject";
  const currentSubjectLabel = entry?.subject ? getSubjectLabel(entry.subject) : t("free");
  currentSubjectText.textContent = `${currentLanguage === "vi" ? "Môn hiện tại:" : "Current:"} ${currentSubjectLabel}`;
  
  // Subject selector (middle column, spans rows 1-2)
  const select = document.createElement("select");
  select.className = "timetable_mobile_select";
  
  const allSubjects = Object.keys(SUBJECT_LABELS[currentLanguage] || {});
  allSubjects.forEach((subjectId) => {
    const option = document.createElement("option");
    option.value = subjectId;
    option.textContent = getSubjectLabel(subjectId);
    if (subjectId === currentSubject) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  
  // Save button (right column, row 1)
  const saveBtn = document.createElement("button");
  saveBtn.className = "timetable_mobile_btn timetable_mobile_btn_save";
  saveBtn.textContent = currentLanguage === "vi" ? "Lưu" : "Save";
  saveBtn.addEventListener("click", () => {
    const selectedSubject = select.value;
    const day = TIMETABLE[dayKey] || [];
    const existingIndex = day.findIndex((entry) => entry.period === periodKey);
    
    if (existingIndex >= 0) {
      day[existingIndex].subject = selectedSubject;
    } else {
      day.push({ period: periodKey, subject: selectedSubject });
    }
    
    TIMETABLE[dayKey] = day;
    saveTimetable(TIMETABLE);
    modal.remove();
    renderTimetable();
  });
  
  // Cancel button (right column, row 2)
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "timetable_mobile_btn timetable_mobile_btn_cancel";
  cancelBtn.textContent = currentLanguage === "vi" ? "Hủy" : "Cancel";
  cancelBtn.addEventListener("click", () => {
    modal.remove();
  });
  
  // Button container for grid layout
  const buttons = document.createElement("div");
  buttons.className = "timetable_mobile_buttons";
  buttons.append(saveBtn, cancelBtn);
  
  // Assemble grid layout - order matters for CSS grid placement
  modalContent.append(periodInfo, currentSubjectText, select, buttons);
  modal.appendChild(modalContent);
  
  // Close modal when clicking outside
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  document.body.appendChild(modal);
  
  // Auto-focus select
  setTimeout(() => select.focus(), 100);
}

function closeEditor(editor) {
  const slotElement = editor.parentElement;
  if (slotElement) {
    const dayKey = slotElement.dataset.dayKey;
    const periodKey = slotElement.dataset.periodKey;
    const period = TIMETABLE_PERIODS.find(p => p.key === periodKey);
    const entry = timetableEntryFor(dayKey, periodKey);
    
    slotElement.innerHTML = "";
    slotElement.appendChild(createSlotContent(period, entry || { subject: "" }));
  }
  editor.remove();
}

function toggleTimetableEditMode() {
  timetableEditMode = !timetableEditMode;
  const editBtn = document.getElementById("timetable_edit_btn");
  if (editBtn) {
    editBtn.classList.toggle("timetable_edit_btn_active", timetableEditMode);
  }
  renderTimetable();
}

function renderWorkView() {
  renderCoursePills();
  renderItems();
  updateHubTitle();
  updateWeekNav();
  
  // Update static text elements for work view
  document.querySelector(".view_tab[data-view='work']").textContent = t("work");
  document.getElementById("week_label").childNodes[0].textContent = `${t("week")} `;
  searchInput.placeholder = t("searchPlaceholder");
  document.querySelector(".filter_toggle span").textContent = t("unfinishedLabel");
}

function renderTimetableView() {
  renderTimetable();
  
  // Update static text elements for timetable view
  document.querySelector(".view_tab[data-view='timetable']").textContent = t("timetable");
  timetableTitle.textContent = t("timetableTitle");
  timetableNote.textContent = t("timetableNote");
}

function renderAll() {
  renderWorkView();
  renderTimetableView();
  
  // Update shared static text elements
  tagline.textContent = t("tagline");
  // Update about tab text
  document.querySelector(".view_tab[data-view='about']").textContent = t("about");
  // Update about page content
  document.getElementById("about_title").textContent = t("aboutTitle");
  document.getElementById("about_what_title").textContent = t("aboutWhatTitle");
  document.getElementById("about_what_desc").textContent = t("aboutWhatDesc");
  document.getElementById("about_why_title").textContent = t("aboutWhyTitle");
  document.getElementById("about_why_desc").textContent = t("aboutWhyDesc");
  document.getElementById("about_how_title").textContent = t("aboutHowTitle");
  document.getElementById("about_how_1").textContent = t("aboutHow1");
  document.getElementById("about_how_2").textContent = t("aboutHow2");
  document.getElementById("about_how_3").textContent = t("aboutHow3");
  document.getElementById("about_how_4").textContent = t("aboutHow4");
  document.getElementById("about_how_5").textContent = t("aboutHow5");
  document.getElementById("about_how_6").textContent = t("aboutHow6");
  document.getElementById("about_how_7").textContent = t("aboutHow7");
  document.getElementById("about_how_8").textContent = t("aboutHow8");
  // Update footer text
  document.getElementById("footer_made_by").textContent = t("footerMadeBy");
  document.getElementById("footer_feedback").textContent = t("footerFeedback");
  document.getElementById("footer_copyright").textContent = t("footerCopyright");
}

function setView(viewName) {
  const nextView = viewName === "timetable" ? "timetable" : viewName === "about" ? "about" : "work";
  localStorage.setItem("selectedView", nextView);

  workView.hidden = nextView !== "work";
  timetableView.hidden = nextView !== "timetable";
  aboutView.hidden = nextView !== "about";
  workView.classList.toggle("app_view_active", nextView === "work");
  timetableView.classList.toggle("app_view_active", nextView === "timetable");
  aboutView.classList.toggle("app_view_active", nextView === "about");

  for (const tab of viewTabs) {
    const isActive = tab.dataset.view === nextView;
    tab.classList.toggle("view_tab_active", isActive);
    tab.setAttribute("aria-pressed", String(isActive));
  }

  if (nextView === "work") {
    loadCourses().catch((error) => showMessage(error.message));
  } else if (nextView === "timetable") {
    renderTimetable();
  }
}

prevWeekBtn.addEventListener("click", () => changeWeek(-1));
nextWeekBtn.addEventListener("click", () => changeWeek(1));

weekInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    const value = Number(weekInput.value);
    if (!Number.isFinite(value) || value < 1) {
      updateWeekNav();
      return;
    }

    currentWeek = value;
    localStorage.setItem("selectedWeek", String(currentWeek));
    loadItems();
  }
});

weekInput.addEventListener("blur", () => {
  updateWeekNav();
});

document.addEventListener("keydown", (event) => {
  if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.isContentEditable) {
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    changeWeek(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    changeWeek(1);
  }
});

unfinishedOnly.addEventListener("change", loadItems);

// Search input management
function updateSearchWrapperClass() {
  const wrapper = searchInput.closest('.input-wrapper');
  if (wrapper) {
    wrapper.classList.toggle('has-value', searchInput.value.trim() !== '');
  }
}

searchInput.addEventListener("input", () => {
  renderItems();
  updateSearchWrapperClass();
});

document.querySelector(".icon").addEventListener("click", () => searchInput.focus());
viewTabs.forEach((tab) => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
});

const timetableEditBtn = document.getElementById("timetable_edit_btn");
if (timetableEditBtn) {
  timetableEditBtn.addEventListener("click", toggleTimetableEditMode);
}

// Mobile timetable view toggle (Today/Full Week)
const timetableViewToggleBtns = document.querySelectorAll(".timetable_view_toggle_btn");
timetableViewToggleBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    timetableMobileView = btn.dataset.view;
    localStorage.setItem("timetableMobileView", timetableMobileView);
    
    // Update active button state
    timetableViewToggleBtns.forEach((b) => b.classList.remove("timetable_view_toggle_btn_active"));
    btn.classList.add("timetable_view_toggle_btn_active");
    
    renderTimetableMobile();
  });
});

languageSelector.addEventListener("change", (event) => {
  setLanguage(event.target.value);
});

// Clear search input on page load to prevent persisted text
searchInput.value = "";
updateSearchWrapperClass();

function applyTheme(theme) {
  if (theme === "light") {
    document.body.classList.add("light");
  } else {
    document.body.classList.remove("light");
  }
}

function toggleTheme() {
  const isLight = document.body.classList.contains("light");
  const newTheme = isLight ? "dark" : "light";
  localStorage.setItem("theme", newTheme);
  applyTheme(newTheme);
}

const savedTheme = localStorage.getItem("theme") || "dark";
applyTheme(savedTheme);

themeToggle.addEventListener("click", toggleTheme);

// ── Setup Wizard ───────────────────────────────────────────────

const SETUP_STEPS = [
  { titleKey: "setupSecurityTitle", descKey: "setupSecurityDesc", isSecurity: true },
  { titleKey: "setupStep1Title", descKey: "setupStep1Desc" },
  { titleKey: "setupStep2Title", descKey: "setupStep2Desc" },
  { titleKey: "setupStep3Title", descKey: "setupStep3Desc" },
  { titleKey: "setupStep4Title", descKey: "setupStep4Desc" },
  { titleKey: "setupStep5Title", descKey: "setupStep5Desc", noteKey: "setupStep5Note" },
  { titleKey: "setupStep6Title", descKey: "setupStep6Desc" },
];

function renderSetupStep(stepIndex) {
  debugLog("renderSetupStep called, stepIndex:", stepIndex);
  const step = SETUP_STEPS[stepIndex];
  if (!step) {
    debugLog("renderSetupStep: no step found for index", stepIndex);
    return;
  }

  const content = document.getElementById("setup_content");
  content.innerHTML = "";

  // Step indicator
  const indicator = document.createElement("p");
  indicator.className = "setup_step_indicator";
  indicator.setAttribute("data-step", String(stepIndex + 1));
  indicator.textContent = `${t("setupStep")} ${stepIndex + 1} ${t("setupOf")} ${SETUP_STEPS.length}`;
  content.appendChild(indicator);

  // Title
  const title = document.createElement("h2");
  title.className = "setup_step_title";
  title.textContent = t(step.titleKey);
  content.appendChild(title);

  // Screenshot — one per step, mapped 1:1 (step 1 → setup_step0.jpg, ..., step 7 → setup_step6.jpg)
  const screenshot = document.createElement("img");
  screenshot.className = "setup_screenshot";
  screenshot.src = `/static/setup_step${stepIndex}.jpg`;
  screenshot.alt = t(step.titleKey);
  screenshot.loading = "lazy";
  content.appendChild(screenshot);

  // Description
  const desc = document.createElement("p");
  desc.className = "setup_step_desc";
  desc.textContent = t(step.descKey);
  content.appendChild(desc);

  // Optional note (for step 5 - expiry info)
  if (step.noteKey) {
    const note = document.createElement("p");
    note.className = "setup_step_note";
    note.textContent = t(step.noteKey);
    content.appendChild(note);
  }

  // Step 6: Token input + validate
  if (stepIndex === SETUP_STEPS.length - 1) {
    const inputGroup = document.createElement("div");
    inputGroup.className = "setup_token_group";

    const input = document.createElement("input");
    input.type = "text";
    input.id = "setup_token_input";
    input.className = "setup_token_input";
    input.placeholder = t("setupTokenPlaceholder");
    input.autocomplete = "off";
    input.spellcheck = false;
    inputGroup.appendChild(input);

    const validateBtn = document.createElement("button");
    validateBtn.type = "button";
    validateBtn.className = "setup_validate_btn";
    validateBtn.textContent = t("setupValidate");
    validateBtn.addEventListener("click", validateAndSaveToken);
    inputGroup.appendChild(validateBtn);

    content.appendChild(inputGroup);

    // Message area
    const msg = document.createElement("p");
    msg.id = "setup_message";
    msg.className = "setup_message";
    content.appendChild(msg);
  }

  // Navigation buttons
  const nav = document.createElement("div");
  nav.className = "setup_nav";

  if (stepIndex > 0) {
    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "setup_nav_btn setup_nav_btn_prev";
    prevBtn.textContent = t("setupPrev");
    prevBtn.addEventListener("click", () => renderSetupStep(stepIndex - 1));
    nav.appendChild(prevBtn);
  } else {
    // Spacer
    const spacer = document.createElement("div");
    nav.appendChild(spacer);
  }

  if (stepIndex < SETUP_STEPS.length - 1) {
    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "setup_nav_btn setup_nav_btn_next";
    nextBtn.textContent = t("setupNext");
    nextBtn.addEventListener("click", () => renderSetupStep(stepIndex + 1));
    nav.appendChild(nextBtn);
  }

  content.appendChild(nav);

  // Step dots
  const dots = document.createElement("div");
  dots.className = "setup_dots";
  for (let i = 0; i < SETUP_STEPS.length; i++) {
    const dot = document.createElement("span");
    dot.className = `setup_dot${i === stepIndex ? " setup_dot_active" : ""}`;
    dot.addEventListener("click", () => renderSetupStep(i));
    dots.appendChild(dot);
  }
  content.appendChild(dots);

  // Focus token input if on step 6
  if (stepIndex === SETUP_STEPS.length - 1) {
    setTimeout(() => document.getElementById("setup_token_input")?.focus(), 100);
  }
}

async function validateAndSaveToken() {
  const input = document.getElementById("setup_token_input");
  const msg = document.getElementById("setup_message");
  const token = input.value.trim();
  debugLog("validateAndSaveToken called, token present:", !!token);

  if (!token) {
    msg.textContent = t("setupTokenLabel");
    msg.className = "setup_message setup_message_error";
    return;
  }

  msg.textContent = t("setupValidating");
  msg.className = "setup_message setup_message_info";

  try {
    debugLog("validateAndSaveToken: sending POST to /api/validate-token");
    const response = await fetch("/api/validate-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await response.json();
    debugLog("validateAndSaveToken: response", data);

    if (data.valid) {
      debugLog("validateAndSaveToken: token is valid, saving");
      saveToken(token);
      msg.textContent = t("setupSuccess");
      msg.className = "setup_message setup_message_success";
      setTimeout(() => {
        debugLog("validateAndSaveToken: hiding overlay and reinitializing");
        hideSetupOverlay();
        reinitializeApp();
      }, 1000);
    } else {
      debugLog("validateAndSaveToken: token invalid:", data.message);
      msg.textContent = data.message || t("setupError");
      msg.className = "setup_message setup_message_error";
    }
  } catch (err) {
    debugLog("validateAndSaveToken: error:", err.message);
    msg.textContent = t("setupError");
    msg.className = "setup_message setup_message_error";
  }
}

function showSetupOverlay() {
  debugLog("showSetupOverlay called");
  // Close settings modal if it's open to prevent overlap
  const settingsModal = document.getElementById("token_settings_modal");
  if (settingsModal) {
    settingsModal.remove();
    debugLog("showSetupOverlay: removed settings modal");
  }

  const overlay = document.getElementById("setup_overlay");
  if (overlay) {
    overlay.hidden = false;
    // Update dynamic header text
    const titleEl = document.getElementById("setup_title");
    if (titleEl) titleEl.textContent = t("setupTitle");
    const subtitleEl = document.getElementById("setup_subtitle");
    if (subtitleEl) subtitleEl.textContent = t("setupSubtitle");
    const skipBtn = document.getElementById("setup_skip_btn");
    if (skipBtn) skipBtn.textContent = t("setupSkip");
    debugLog("showSetupOverlay: overlay unhidden, calling renderSetupStep(0)");
    renderSetupStep(0);
  } else {
    debugLog("showSetupOverlay: overlay element NOT FOUND (DOM not ready?)");
  }
}

function hideSetupOverlay() {
  debugLog("hideSetupOverlay called");
  const overlay = document.getElementById("setup_overlay");
  if (overlay) {
    overlay.hidden = true;
    debugLog("hideSetupOverlay: overlay hidden");
  } else {
    debugLog("hideSetupOverlay: overlay element NOT FOUND");
  }
}

function reinitializeApp() {
  // Reset all state to force a fresh load
  coursesLoaded = false;
  courses = [];
  items = [];
  itemCache = new Map();
  availableWeeks = [];
  selectedCourseId = null;

  // Reload the app in-place
  const currentView = localStorage.getItem("selectedView") || "work";
  setView(currentView);
  updateTokenWarning();
}

// ── Token Expiry Warning ───────────────────────────────────────

function updateTokenWarning() {
  const banner = document.getElementById("token_warning");
  if (!banner) return;

  const token = getToken();
  if (!token) {
    banner.hidden = true;
    return;
  }

  const ageDays = getTokenAgeDays();
  if (ageDays === null) {
    banner.hidden = true;
    return;
  }

  const maxAgeDays = 90; // ~3 months
  const warningThreshold = 7; // Warn 1 week before
  const remaining = maxAgeDays - ageDays;

  let message = "";
  let isExpired = false;

  if (remaining <= 0) {
    message = t("tokenExpired");
    isExpired = true;
  } else if (remaining <= 1) {
    message = t("tokenExpiresToday");
  } else if (remaining <= warningThreshold) {
    message = t("tokenExpiresSoon").replace("{days}", String(Math.ceil(remaining)));
  }

  if (message) {
    banner.querySelector(".token_warning_text").textContent = message;
    banner.hidden = false;
    banner.className = `token_warning${isExpired ? " token_warning_expired" : ""}`;
  } else {
    banner.hidden = true;
  }
}

// ── Settings Menu Modal ────────────────────────────────────────

function openSettingsMenu() {
  // Close setup overlay if it's open to prevent overlap
  const setupOverlay = document.getElementById("setup_overlay");
  if (setupOverlay && !setupOverlay.hidden) {
    setupOverlay.hidden = true;
  }

  const existing = document.getElementById("settings_menu_modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "settings_menu_modal";
  modal.className = "token_settings_modal";

  const content = document.createElement("div");
  content.className = "token_settings_content";

  const title = document.createElement("h2");
  title.textContent = t("settingsTitle");
  content.appendChild(title);

  // API Token option
  const apiOption = document.createElement("button");
  apiOption.type = "button";
  apiOption.className = "settings_menu_option";
  apiOption.innerHTML = `
    <span class="settings_menu_icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    </span>
    <span class="settings_menu_label">${t("settingsApiToken")}</span>
  `;
  apiOption.addEventListener("click", () => {
    modal.remove();
    openTokenSettings();
  });
  content.appendChild(apiOption);

  // Feedback option
  const feedbackOption = document.createElement("button");
  feedbackOption.type = "button";
  feedbackOption.className = "settings_menu_option";
  feedbackOption.innerHTML = `
    <span class="settings_menu_icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </span>
    <span class="settings_menu_label">${t("settingsFeedback")}</span>
  `;
  feedbackOption.addEventListener("click", () => {
    modal.remove();
    openFeedbackForm();
  });
  content.appendChild(feedbackOption);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "setup_nav_btn setup_nav_btn_prev";
  closeBtn.textContent = t("tokenClose");
  closeBtn.style.marginTop = "12px";
  closeBtn.addEventListener("click", () => modal.remove());
  content.appendChild(closeBtn);

  modal.appendChild(content);

  // Close on backdrop click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  document.body.appendChild(modal);
}

// ── Token Management Modal ─────────────────────────────────────

function openTokenSettings() {
  const existing = document.getElementById("token_settings_modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "token_settings_modal";
  modal.className = "token_settings_modal";

  const content = document.createElement("div");
  content.className = "token_settings_content";

  const title = document.createElement("h2");
  title.textContent = t("tokenSettings");
  content.appendChild(title);

  const ageDays = getTokenAgeDays();
  if (ageDays !== null) {
    const ageP = document.createElement("p");
    ageP.className = "token_settings_info";
    ageP.textContent = t("tokenAge").replace("{days}", String(Math.round(ageDays)));
    content.appendChild(ageP);
  }

  // Token input field
  const inputGroup = document.createElement("div");
  inputGroup.className = "setup_token_group";
  inputGroup.style.marginTop = "8px";

  const input = document.createElement("input");
  input.type = "text";
  input.id = "settings_token_input";
  input.className = "setup_token_input";
  input.placeholder = t("setupTokenPlaceholder");
  input.autocomplete = "off";
  input.spellcheck = false;
  // Pre-fill with current token if it exists
  const currentToken = getToken();
  if (currentToken) {
    input.value = currentToken;
  }
  inputGroup.appendChild(input);

  const validateBtn = document.createElement("button");
  validateBtn.type = "button";
  validateBtn.className = "setup_validate_btn";
  validateBtn.textContent = t("setupValidate");
  validateBtn.addEventListener("click", async () => {
    const token = input.value.trim();
    if (!token) {
      msg.textContent = t("setupTokenLabel");
      msg.className = "setup_message setup_message_error";
      return;
    }

    validateBtn.disabled = true;
    msg.textContent = t("setupValidating");
    msg.className = "setup_message setup_message_info";

    try {
      const response = await fetch("/api/validate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();

      if (data.valid) {
        saveToken(token);
        msg.textContent = t("setupSuccess");
        msg.className = "setup_message setup_message_success";
        setTimeout(() => {
          modal.remove();
          reinitializeApp();
        }, 1000);
      } else {
        msg.textContent = data.message || t("setupError");
        msg.className = "setup_message setup_message_error";
        validateBtn.disabled = false;
      }
    } catch (err) {
      msg.textContent = t("setupError");
      msg.className = "setup_message setup_message_error";
      validateBtn.disabled = false;
    }
  });
  inputGroup.appendChild(validateBtn);

  content.appendChild(inputGroup);

  // Message area
  const msg = document.createElement("p");
  msg.id = "settings_token_message";
  msg.className = "setup_message";
  content.appendChild(msg);

  // "Need a token?" link to open the tutorial wizard
  const needTokenBtn = document.createElement("button");
  needTokenBtn.type = "button";
  needTokenBtn.className = "setup_skip_btn";
  needTokenBtn.textContent = t("setupTokenHelp");
  needTokenBtn.style.marginTop = "4px";
  needTokenBtn.addEventListener("click", () => {
    modal.remove();
    showSetupOverlay();
  });
  content.appendChild(needTokenBtn);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "setup_nav_btn setup_nav_btn_prev";
  closeBtn.textContent = t("tokenClose");
  closeBtn.style.marginTop = "8px";
  closeBtn.addEventListener("click", () => modal.remove());
  content.appendChild(closeBtn);

  modal.appendChild(content);

  // Close on backdrop click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  document.body.appendChild(modal);

  // Focus the input
  setTimeout(() => input.focus(), 100);
}

// ── Feedback Form ─────────────────────────────────────────────

function openFeedbackForm() {
  const existing = document.getElementById("feedback_modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "feedback_modal";
  modal.className = "token_settings_modal";

  const content = document.createElement("div");
  content.className = "token_settings_content feedback_form";

  const title = document.createElement("h2");
  title.textContent = t("feedbackTitle");
  content.appendChild(title);

  // Question 1: Star rating
  const ratingLabel = document.createElement("p");
  ratingLabel.className = "feedback_question";
  ratingLabel.textContent = t("feedbackRating");
  content.appendChild(ratingLabel);

  const starContainer = document.createElement("div");
  starContainer.className = "star_rating";
  let selectedRating = 0;

  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("span");
    star.className = "star";
    star.dataset.value = i;
    star.textContent = "★";
    star.dataset.value = i;
    star.addEventListener("click", () => {
      selectedRating = i;
      starContainer.querySelectorAll(".star").forEach((s, idx) => {
        s.classList.toggle("star_filled", idx < i);
      });
    });
    star.addEventListener("mouseenter", () => {
      starContainer.querySelectorAll(".star").forEach((s, idx) => {
        s.classList.toggle("star_filled", idx < i);
      });
    });
    star.addEventListener("mouseleave", () => {
      starContainer.querySelectorAll(".star").forEach((s, idx) => {
        s.classList.toggle("star_filled", idx < selectedRating);
      });
    });
    starContainer.appendChild(star);
  }
  content.appendChild(starContainer);

  // Question 2: Usage type (radio)
  const usageLabel = document.createElement("p");
  usageLabel.className = "feedback_question";
  usageLabel.textContent = t("feedbackUsage");
  content.appendChild(usageLabel);

  const usageGroup = document.createElement("div");
  usageGroup.className = "feedback_radio_group";

  const usageOptions = [
    { value: "quizzes_assignments", key: "feedbackUsageQuizzes" },
    { value: "timetable", key: "feedbackUsageTimetable" },
    { value: "unfinished", key: "feedbackUsageUnfinished" },
    { value: "other", key: "feedbackUsageOther" },
  ];

  let selectedUsage = null;
  usageOptions.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "feedback_radio_btn";
    btn.textContent = t(opt.key);
    btn.addEventListener("click", () => {
      selectedUsage = opt.value;
      usageGroup.querySelectorAll(".feedback_radio_btn").forEach((b) => b.classList.remove("feedback_radio_btn_active"));
      btn.classList.add("feedback_radio_btn_active");
    });
    usageGroup.appendChild(btn);
  });
  content.appendChild(usageGroup);

  // Question 3: Recommend (radio)
  const recommendLabel = document.createElement("p");
  recommendLabel.className = "feedback_question";
  recommendLabel.textContent = t("feedbackRecommend");
  content.appendChild(recommendLabel);

  const recommendGroup = document.createElement("div");
  recommendGroup.className = "feedback_radio_group";

  const recommendOptions = [
    { value: "yes", key: "feedbackRecommendYes" },
    { value: "maybe", key: "feedbackRecommendMaybe" },
    { value: "no", key: "feedbackRecommendNo" },
  ];

  let selectedRecommend = null;
  recommendOptions.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "feedback_radio_btn";
    btn.textContent = t(opt.key);
    btn.addEventListener("click", () => {
      selectedRecommend = opt.value;
      recommendGroup.querySelectorAll(".feedback_radio_btn").forEach((b) => b.classList.remove("feedback_radio_btn_active"));
      btn.classList.add("feedback_radio_btn_active");
    });
    recommendGroup.appendChild(btn);
  });
  content.appendChild(recommendGroup);

  // Question 4: Improvement text
  const improveLabel = document.createElement("p");
  improveLabel.className = "feedback_question";
  improveLabel.textContent = t("feedbackImprove");
  content.appendChild(improveLabel);

  const improveTextarea = document.createElement("textarea");
  improveTextarea.className = "feedback_textarea";
  improveTextarea.placeholder = t("feedbackImprovePlaceholder");
  improveTextarea.rows = 3;
  content.appendChild(improveTextarea);

  // Message area
  const feedbackMsg = document.createElement("p");
  feedbackMsg.id = "feedback_message";
  feedbackMsg.className = "setup_message";
  content.appendChild(feedbackMsg);

  // Submit button
  const submitBtn = document.createElement("button");
  submitBtn.type = "button";
  submitBtn.className = "setup_validate_btn";
  submitBtn.style.width = "100%";
  submitBtn.style.marginTop = "8px";
  submitBtn.textContent = t("feedbackSubmit");
  submitBtn.addEventListener("click", async () => {
    if (selectedRating === 0) {
      feedbackMsg.textContent = "Please select a rating.";
      feedbackMsg.className = "setup_message setup_message_error";
      return;
    }
    if (!selectedUsage) {
      feedbackMsg.textContent = "Please select what you use it for.";
      feedbackMsg.className = "setup_message setup_message_error";
      return;
    }
    if (!selectedRecommend) {
      feedbackMsg.textContent = "Please select a recommendation.";
      feedbackMsg.className = "setup_message setup_message_error";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = t("feedbackSubmitting");
    feedbackMsg.textContent = "";
    feedbackMsg.className = "setup_message";

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: selectedRating,
          usage_type: selectedUsage,
          recommend: selectedRecommend,
          improvement: improveTextarea.value.trim(),
        }),
      });
      const data = await response.json();

      if (data.success) {
        feedbackMsg.textContent = t("feedbackSuccess");
        feedbackMsg.className = "setup_message setup_message_success";
        submitBtn.textContent = t("feedbackSubmit");
        submitBtn.disabled = true;
        setTimeout(() => modal.remove(), 2000);
      } else {
        feedbackMsg.textContent = data.message || t("feedbackError");
        feedbackMsg.className = "setup_message setup_message_error";
        submitBtn.disabled = false;
        submitBtn.textContent = t("feedbackSubmit");
      }
    } catch (err) {
      feedbackMsg.textContent = t("feedbackError");
      feedbackMsg.className = "setup_message setup_message_error";
      submitBtn.disabled = false;
      submitBtn.textContent = t("feedbackSubmit");
    }
  });
  content.appendChild(submitBtn);

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "setup_nav_btn setup_nav_btn_prev";
  closeBtn.textContent = t("tokenClose");
  closeBtn.style.marginTop = "8px";
  closeBtn.addEventListener("click", () => modal.remove());
  content.appendChild(closeBtn);

  modal.appendChild(content);

  // Close on backdrop click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  document.body.appendChild(modal);
}

// ── Initialize ─────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // Setup overlay
  const overlay = document.getElementById("setup_overlay");
  let showingSetup = false;
  if (overlay) {
    // Close setup overlay when "skip" is clicked and open settings modal
    const skipBtn = document.getElementById("setup_skip_btn");
    if (skipBtn) {
      skipBtn.addEventListener("click", () => {
        overlay.hidden = true;
        openSettingsMenu();
      });
    }

    // If no token, show the setup overlay
    if (!getToken()) {
      showSetupOverlay();
      showingSetup = true;
    }
  }

  // Only start the app if we have a token (overlay not shown)
  if (!showingSetup) {
    const initialView = new URLSearchParams(window.location.search).get("view")
      || localStorage.getItem("selectedView")
      || "work";
    setView(initialView);
  }

  // Settings button - opens the settings menu
  const settingsBtn = document.getElementById("token_settings_btn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", openSettingsMenu);
  }

  // Token expiry warning
  updateTokenWarning();
  // Check every hour
  setInterval(updateTokenWarning, 60 * 60 * 1000);

  // Warning banner "Update" button
  const warningBtn = document.getElementById("token_warning_btn");
  if (warningBtn) {
    warningBtn.addEventListener("click", openSettingsMenu);
  }

  // Warning banner dismiss button
  const dismissBtn = document.getElementById("token_warning_dismiss");
  if (dismissBtn) {
    dismissBtn.addEventListener("click", () => {
      const banner = document.getElementById("token_warning");
      if (banner) {
        banner.hidden = true;
      }
    });
  }
});

// Initialize language
setLanguage(currentLanguage);
