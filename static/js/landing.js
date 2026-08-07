(function () {

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Nav scroll state ── */
  var nav = document.getElementById("nav");
  var navScrolled = false;

  function updateNavScroll() {
    var shouldScroll = window.scrollY > 40;
    if (shouldScroll !== navScrolled) {
      navScrolled = shouldScroll;
      nav.classList.toggle("nav_scrolled", shouldScroll);
    }
  }

  window.addEventListener("scroll", updateNavScroll, { passive: true });
  updateNavScroll();

  /* ── Mobile nav toggle ── */
  var toggleBtn = document.getElementById("nav_mobile_toggle");
  var navLinks = document.getElementById("nav_links");

  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener("click", function () {
      navLinks.classList.toggle("nav_links_open");
    });

    document.addEventListener("click", function (e) {
      if (!nav.contains(e.target)) {
        navLinks.classList.remove("nav_links_open");
      }
    });

    navLinks.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navLinks.classList.remove("nav_links_open");
      });
    });
  }

  /* ── Smooth scroll for anchor links ── */
  document.addEventListener("click", function (e) {
    var target = e.target.closest('a[href^="#"]');
    if (target) {
      var id = target.getAttribute("href").slice(1);
      var el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        scrollToSection(id);
      }
    }
  });

  function scrollToSection(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var offset = 72;
    var top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
  }

  /* ── Scroll-to-top button ── */
  var scrollTopBtn = document.getElementById("scroll_top");

  if (scrollTopBtn) {
    window.addEventListener("scroll", function () {
      scrollTopBtn.classList.toggle("scroll_top_visible", window.scrollY > 400);
    }, { passive: true });

    scrollTopBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ── FAQ Accordion ── */
  document.querySelectorAll(".faq_question").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      var answer = btn.nextElementSibling;

      document.querySelectorAll(".faq_question").forEach(function (other) {
        if (other !== btn) {
          other.setAttribute("aria-expanded", "false");
          other.nextElementSibling.classList.remove("faq_answer_open");
        }
      });

      btn.setAttribute("aria-expanded", expanded ? "false" : "true");
      answer.classList.toggle("faq_answer_open", !expanded);
    });
  });

  /* ── Keyboard navigation: j / k between sections ── */
  var SECTION_IDS = [
    "hero", "problem", "tour", "search", "weeks", "progress",
    "timetable", "unfinished", "about", "privacy", "getting-started", "faq", "cta"
  ];

  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    var key = e.key.toLowerCase();
    if (key !== "j" && key !== "k") return;

    var currentIndex = -1;
    for (var i = 0; i < SECTION_IDS.length; i++) {
      var el = document.getElementById(SECTION_IDS[i]);
      if (el && el.getBoundingClientRect().top <= 140) {
        currentIndex = i;
      }
    }
    if (currentIndex < 0) currentIndex = 0;

    var nextIndex = key === "j" ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= SECTION_IDS.length) return;
    scrollToSection(SECTION_IDS[nextIndex]);
  });

  /* ── Search demo ── */
  var DEMO_ITEMS = [
    { t: "quiz", title: "Quiz — Week 4 reading check" },
    { t: "assignment", title: "Assignment — essay draft" },
    { t: "file", title: "File — revision notes" },
    { t: "page", title: "Page — grammar guide" },
    { t: "quiz", title: "Quiz — Week 3 vocabulary check" },
    { t: "assignment", title: "Assignment — lab report" },
    { t: "file", title: "File — past paper 2025" },
    { t: "page", title: "Page — pronunciation practice" },
    { t: "quiz", title: "Quiz — midterm practice set" },
    { t: "assignment", title: "Assignment — group project" },
    { t: "file", title: "File — syllabus overview" },
    { t: "page", title: "Page — writing workshop" }
  ];

  var BADGE_LABELS = { quiz: "QZ", assignment: "AS", file: "FL", page: "PG" };

  function renderSearch(items) {
    var list = document.getElementById("demo_results");
    if (!list) return;
    list.innerHTML = "";
    if (items.length === 0) {
      var li = document.createElement("li");
      li.className = "demo_row demo_row--empty";
      li.textContent = (i18nStrings[currentLang] && i18nStrings[currentLang].search_empty) || "0 results";
      list.appendChild(li);
      return;
    }
    items.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "demo_row";
      var badge = document.createElement("span");
      badge.className = "type_badge type--" + item.t;
      badge.textContent = BADGE_LABELS[item.t];
      var span = document.createElement("span");
      span.textContent = item.title;
      li.appendChild(badge);
      li.appendChild(span);
      list.appendChild(li);
    });
  }

  var searchInput = document.getElementById("demo_search");
  var searchCount = document.getElementById("search_count");

  function updateSearch() {
    var q = (searchInput.value || "").trim().toLowerCase();
    var shown = q ? DEMO_ITEMS.filter(function (item) {
      return item.title.toLowerCase().indexOf(q) !== -1;
    }) : DEMO_ITEMS;
    renderSearch(shown);
    if (searchCount) {
      searchCount.textContent = shown.length + "/" + DEMO_ITEMS.length +
        (currentLang === "vi" ? " mục" : " items");
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", updateSearch);
    updateSearch();
  }

  /* ── Scroll-triggered reveal ── */
  var revealTargets = document.querySelectorAll(
    ".section .eyebrow, .section .section_title, .section .section_desc, " +
    ".window, .three_state_row, .steps_code, .perm_table, .privacy_note, .faq_item, .tour_legend"
  );

  if (!reduceMotion) {
    revealTargets.forEach(function (el) { el.classList.add("fade_in"); });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("fade_in_visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

    revealTargets.forEach(function (el) { observer.observe(el); });
  }

  /* ── Hero entrance + typewriter ── */
  var heroPromptText = document.getElementById("hero_prompt_text");
  var heroCaret = document.querySelector(".hero_caret");
  var typingTimer = null;

  function typeHero() {
    if (!heroPromptText || reduceMotion) return;
    var full = heroPromptText.textContent;
    heroPromptText.textContent = "";
    var i = 0;
    typingTimer = setInterval(function () {
      if (i < full.length) {
        heroPromptText.textContent = full.slice(0, ++i);
      } else {
        clearInterval(typingTimer);
        typingTimer = null;
        if (heroCaret) setTimeout(function () { heroCaret.classList.add("hero_caret--hidden"); }, 1400);
      }
    }, 30);
  }

  document.querySelectorAll(".hero_title, .hero_desc, .hero_actions, .hero_kbd, .hero_shot")
    .forEach(function (el) {
      var map = {
        "hero_title": "hero_load_title",
        "hero_desc": "hero_load_desc",
        "hero_actions": "hero_load_actions",
        "hero_kbd": "hero_load_kbd",
        "hero_shot": "hero_load_shot"
      };
      var cls = map[el.className.replace(/ .*/, "")];
      if (cls) el.classList.add(cls);
    });

  /* ── Bilingual i18n ── */
  var i18nStrings = {
    en: {
      nav_features: "Features",
      nav_privacy: "Privacy",
      nav_faq: "FAQ",
      nav_github: "GitHub",
      nav_launch: "Launch App",
      hero_eyebrow: "vinfocus --view this-week",
      hero_title: "Browse LMS.<br>Not the clutter.",
      hero_desc: "A faster way through Vinschool's LMS.<br>Everything from LMS. Nothing in your way.",
      hero_launch: "Launch App",
      hero_github: "View on GitHub",
      hero_kbd: "navigate sections",
      hero_status_courses: "courses",
      hero_status_weeks: "weeks",
      hero_status_indexed: "items indexed",
      hero_status_sync: "last sync",
      problem_eyebrow: "// the problem",
      problem_title: "LMS has everything.<br>Finding it is the hard part.",
      problem_body1: "Open a course. Scroll the module list. Hope the quiz you need is where you left it. Repeat for every subject, every week.",
      problem_body2: "LMS isn't bad. It's just slow to navigate. VinFocus doesn't replace it — it rearranges the same information into something you can actually move through.",
      reveal_eyebrow: "// the fix",
      reveal_title: "The whole week, at a glance",
      reveal_desc: "One window for the work you actually have to do. A tour of the main screen:",
      annot_search: "one search across everything",
      annot_pills: "course pills · progress per subject",
      annot_week: "week navigator · j / k or g to jump",
      annot_filter: "unfinished · unknown filters",
      annot_overview: "semester progress sidebar",
      annot_items: "quizzes · assignments · files · pages",
      search_eyebrow: "// search",
      search_title: "Search everything. Unlike LMS.",
      search_desc: "This is not a mockup — type and the list filters. The real app does the same across courses, modules, quizzes, assignments, and files.",
      search_placeholder: "search items…",
      search_hint: "try \"quiz\" · \"week 3\" · \"revision\"",
      search_empty: "0 results",
      weeks_eyebrow: "// weeks",
      weeks_title: "Modules are for teachers.<br>Weeks are for you.",
      weeks_desc: "LMS hides content in long module lists. VinFocus reads the module names — messy as they are — and rebuilds them into a clean week navigator.",
      weeks_li1: "Names like \"TUẦN 35 + 36\" become one clean week",
      weeks_li2: "j / k to move, g to jump to any week",
      weeks_li3: "Each week shows quizzes, assignments, files, and pages together",
      weeks_footnote: "week 0 exists because someone named a module \"misc stuff\".",
      progress_eyebrow: "// progress",
      progress_title: "You can see the finish line.",
      progress_desc: "The overview sidebar tracks every item LMS reports — per week, per type, per course. No more guessing how far along the semester you actually are.",
      progress_li1: "Per-week completion bars across the whole semester",
      progress_li2: "Type breakdowns: quizzes, assignments, files, pages",
      progress_li3: "Course-wide totals — done, unfinished, unknown",
      timetable_eyebrow: "// timetable",
      timetable_title: "What's next, without another tab.",
      timetable_desc: "A weekly timetable that lives in your browser. It highlights the current period and today's column, so you always know what's next — even at break.",
      timetable_li1: "Current period and today column highlighted",
      timetable_li2: "Inline editing on desktop, mobile editor on phones",
      timetable_li3: "Stored locally — no uploads, no accounts",
      three_eyebrow: "// unfinished",
      three_title: "LMS knows three things about your work.<br>VinFocus shows all three.",
      three_desc: "The unfinished filter keeps the week list honest. \"Unknown\" means LMS isn't tracking it — VinFocus marks it instead of pretending.",
      three_row1: "Quiz — Chapter 4 reading check",
      three_row1_status: "completed",
      three_row2: "Assignment — essay draft",
      three_row2_status: "not done",
      three_row3: "File — revision notes",
      three_row3_status: "no tracking",
      done_label: "done",
      unfinished_label: "unfinished",
      unknown_label: "unknown",
      about_eyebrow: "// context",
      about_title: "Built because LMS was in the way.",
      about_body1: "I'm a student at Vinschool. Every week meant opening LMS, clicking a course, scrolling a module list, and hoping the quiz I needed was where I remembered it. It usually wasn't.",
      about_body2: "So I built VinFocus. It reads the same courses you already have and rearranges them into weeks, a search bar, and a progress view. It doesn't decide what you should do. It makes what exists easier to find.",
      about_mono: "not affiliated with vinschool or LMS. it just makes them usable.",
      privacy_eyebrow: "// privacy",
      privacy_title: "Check the permissions yourself.",
      privacy_prompt: "$ vinfocus --check-permissions",
      privacy_intro: "No signup. No account. No server-side storage of anything that matters.",
      privacy_note: "Your Access Card lives in your browser and goes straight to LMS. It is never stored on VinFocus servers, and nothing is collected or shared.",
      perm_op_read_courses: "READ courses",
      perm_op_read_assignments: "READ assignments",
      perm_op_write: "WRITE anything",
      perm_op_submit: "SUBMIT assignments",
      perm_op_store: "STORE token",
      perm_op_send: "SEND your data",
      perm_yes: "yes",
      perm_no: "no",
      perm_browser_only: "browser only",
      perm_nowhere: "nowhere",
      steps_eyebrow: "// setup",
      steps_title: "Getting started",
      steps_subtitle: "Three steps. No installation.",
      step1_title: "generate an access card",
      step1_desc: "Open your LMS account settings and create a new API access token. This is your personal Access Card.",
      step2_title: "paste it into vinfocus",
      step2_desc: "Copy your Access Card and paste it into the setup wizard. The card is stored only in your browser.",
      step3_title: "start browsing",
      step3_desc: "Your courses load automatically. Navigate weeks, search resources, and track your semester progress.",
      steps_note_text: "Your Access Card is extremely sensitive. It can only be viewed once when generated and expires after 4 months. Save it somewhere safe — you will need to repeat this process 2–3 times each school year.",
      faq_title: "Frequently asked questions",
      faq_subtitle: "Quick answers to common questions.",
      faq1_q: "Is VinFocus an official Vinschool product?",
      faq1_a: "No. VinFocus is an independent project created by a student. It is not affiliated with Vinschool or LMS. It uses LMS's public API to read course data with your permission.",
      faq2_q: "Why do I need an Access Card?",
      faq2_a: "VinFocus uses LMS's API to fetch your course data. The API requires an access token (Access Card) to authenticate you. The token is never stored on our servers.",
      faq3_q: "Is my data safe?",
      faq3_a: "Yes. Your token is stored only in your browser's localStorage or sessionStorage. It is sent directly to LMS with each request and is never logged or stored on VinFocus servers. No data is collected or shared.",
      faq4_q: "Can teachers see that I use VinFocus?",
      faq4_a: "No. VinFocus uses the same LMS API that any student can use. It makes read-only requests that are indistinguishable from normal LMS usage. There is no way for teachers to detect VinFocus.",
      faq5_q: "Why not use Vinschool LMS?",
      faq5_a: "VinFocus doesn't replace Vinschool LMS. It provides a faster, more focused way to view assignments, progress, and schedules without navigating through multiple LMS pages.",
      cta_eyebrow: "$ ./vinfocus",
      cta_title: "Your next week is one tab away.",
      cta_desc: "Open the app, paste your Access Card, and see everything LMS hides in module lists.",
      cta_launch: "Launch App",
      footer_credit: "Made by Pham Le Manh Hung",
      footer_disclaimer: "VinFocus is an independent project and is not affiliated with Vinschool or LMS.",
      footer_copyright: "© 2026 VinFocus"
    },
    vi: {
      nav_features: "Tính năng",
      nav_privacy: "Quyền riêng tư",
      nav_faq: "FAQ",
      nav_github: "GitHub",
      nav_launch: "Mở ứng dụng",
      hero_eyebrow: "vinfocus --view this-week",
      hero_title: "Lướt LMS.<br>Không rối rắm.",
      hero_desc: "Một cách nhanh gọn hơn để dùng LMS của Vinschool. Tất cả từ LMS. Tập trung vào điều quan trọng nhất.",
      hero_launch: "Mở ứng dụng",
      hero_github: "Xem trên GitHub",
      hero_kbd: "điều hướng các phần",
      hero_status_courses: "khóa học",
      hero_status_weeks: "tuần",
      hero_status_indexed: "mục đã đánh chỉ mục",
      hero_status_sync: "đồng bộ gần nhất",
      problem_eyebrow: "// vấn đề",
      problem_title: "LMS chứa tất cả.<br>Tìm nó mới là phần khó.",
      problem_body1: "Mở khóa học. Cuộn danh sách học phần. Hy vọng bài kiểm tra cần tìm nằm đúng chỗ bạn nhớ. Lặp lại cho mỗi môn, mỗi tuần.",
      problem_body2: "LMS không tệ. Chỉ là việc điều hướng hơi chậm. VinFocus không thay thế nó — nó sắp xếp lại cùng một thông tin để bạn có thể điều hướng dễ dàng hơn.",
      reveal_eyebrow: "// giải pháp",
      reveal_title: "Cả tuần, chỉ trong một màn hình",
      reveal_desc: "Một cửa sổ cho tất cả việc bạn cần làm. Một chuyến tham quan thực tế màn hình chính:",
      annot_search: "một ô tìm kiếm cho mọi thứ",
      annot_pills: "thẻ môn học · tiến độ từng môn",
      annot_week: "điều hướng tuần · j / k hoặc g để nhảy",
      annot_filter: "bộ lọc chưa xong · không xác định",
      annot_overview: "thanh bên tiến độ học kỳ",
      annot_items: "bài kiểm tra · bài tập · tệp tin · trang",
      search_eyebrow: "// tìm kiếm",
      search_title: "Tìm mọi thứ. Không như LMS.",
      search_desc: "Đây không phải bản mô phỏng — gõ là danh sách lọc ngay. Ứng dụng thật làm điều tương tự trên khóa học, học phần, bài kiểm tra, bài tập và tệp tin.",
      search_placeholder: "tìm kiếm nội dung…",
      search_hint: "thử \"quiz\" · \"tuần 3\" · \"ôn tập\"",
      search_empty: "không có kết quả",
      weeks_eyebrow: "// tuần",
      weeks_title: "Học phần dành cho giáo viên.<br>Tuần dành cho bạn.",
      weeks_desc: "LMS giấu nội dung trong các danh sách học phần dài. VinFocus đọc tên học phần — dù có lộn xộn — và xây lại thành bộ điều hướng tuần gọn gàng.",
      weeks_li1: "Tên như \"TUẦN 35 + 36\" gộp thành một tuần duy nhất",
      weeks_li2: "j / k để chuyển, g để nhảy tới bất kỳ tuần nào",
      weeks_li3: "Mỗi tuần hiển thị bài kiểm tra, bài tập, tệp tin và trang cùng nhau",
      weeks_footnote: "tuần 0 tồn tại vì ai đó đặt tên học phần là \"misc stuff\".",
      progress_eyebrow: "// tiến độ",
      progress_title: "Bạn có thể thấy vạch đích.",
      progress_desc: "Thanh bên tổng quan theo dõi từng mục mà LMS báo cáo — theo tuần, theo loại, theo môn. Không còn phải đoán học kỳ mình đã đi được bao xa.",
      progress_li1: "Thanh hoàn thành theo tuần cho cả học kỳ",
      progress_li2: "Phân loại theo loại: bài kiểm tra, bài tập, tệp tin, trang",
      progress_li3: "Tổng toàn khóa — đã làm, chưa xong, không xác định",
      timetable_eyebrow: "// thời khóa biểu",
      timetable_title: "Tiết tiếp theo, không cần mở tab khác.",
      timetable_desc: "Thời khóa biểu tuần nằm ngay trong trình duyệt. Nó làm nổi bật tiết hiện tại và cột hôm nay, để bạn luôn biết tiết sau là gì.",
      timetable_li1: "Làm nổi bật tiết hiện tại và cột hôm nay",
      timetable_li2: "Chỉnh sửa trực tiếp trên máy tính, trình soạn thảo trên điện thoại",
      timetable_li3: "Lưu cục bộ — không tải lên, không tài khoản",
      three_eyebrow: "// chưa xong",
      three_title: "LMS biết ba trạng thái về bài của bạn.<br>VinFocus hiển thị cả ba.",
      three_desc: "Bộ lọc chưa xong giữ cho danh sách tuần trung thực. \"Không xác định\" nghĩa là LMS không theo dõi chúng — VinFocus đánh dấu thay vì giả vờ.",
      three_row1: "Bài kiểm tra — Đọc hiểu chương 4",
      three_row1_status: "đã hoàn thành",
      three_row2: "Bài tập — bản nháp bài luận",
      three_row2_status: "chưa xong",
      three_row3: "Tệp tin — ghi chú ôn tập",
      three_row3_status: "không theo dõi",
      done_label: "đã làm",
      unfinished_label: "chưa xong",
      unknown_label: "không xác định",
      about_eyebrow: "// bối cảnh",
      about_title: "Xây dựng vì LMS chắn đường.",
      about_body1: "Tôi là học sinh Vinschool. Mỗi tuần nghĩa là mở LMS, bấm vào khóa học, cuộn danh sách học phần, và hy vọng bài kiểm tra cần tìm nằm đúng chỗ tôi nhớ. Thường thì không.",
      about_body2: "Nên tôi đã xây VinFocus. Nó đọc chính những khóa học bạn đang có và sắp xếp lại thành tuần, ô tìm kiếm và chế độ xem tiến độ. Nó không quyết định bạn nên làm gì. Nó chỉ giúp những gì đang có dễ tìm hơn.",
      about_mono: "không liên kết với vinschool hay LMS. chỉ làm chúng dễ dùng hơn.",
      privacy_eyebrow: "// quyền riêng tư",
      privacy_title: "Tự kiểm tra quyền hạn của ứng dụng.",
      privacy_prompt: "$ vinfocus --check-permissions",
      privacy_intro: "Không đăng ký. Không tài khoản. Không lưu gì quan trọng trên máy chủ.",
      privacy_note: "Access Card của bạn nằm trong trình duyệt và được gửi thẳng tới LMS. Nó không bao giờ được lưu trên máy chủ VinFocus, và không có dữ liệu nào bị thu thập hay chia sẻ.",
      perm_op_read_courses: "ĐỌC khóa học",
      perm_op_read_assignments: "ĐỌC bài tập",
      perm_op_write: "GHI bất kỳ thứ gì",
      perm_op_submit: "NỘP bài tập",
      perm_op_store: "LƯU mã truy cập",
      perm_op_send: "GỬI dữ liệu của bạn",
      perm_yes: "có",
      perm_no: "không",
      perm_browser_only: "chỉ trong trình duyệt",
      perm_nowhere: "không nơi nào",
      steps_eyebrow: "// thiết lập",
      steps_title: "Thiết lập trong vài phút",
      steps_subtitle: "Ba bước. Không cần cài đặt.",
      step1_title: "tạo access card",
      step1_desc: "Mở cài đặt tài khoản LMS và tạo một mã truy cập API mới. Đây chính là Access Card của bạn.",
      step2_title: "dán vào vinfocus",
      step2_desc: "Sao chép Access Card và dán vào trình hướng dẫn thiết lập. Thẻ sẽ chỉ được lưu trong trình duyệt của bạn.",
      step3_title: "bắt đầu trải nghiệm",
      step3_desc: "Khóa học của bạn sẽ tự động tải. Điều hướng theo tuần, tìm kiếm tài nguyên và theo dõi tiến độ học kỳ.",
      steps_note_text: "Access Card của bạn cực kỳ nhạy cảm. Bạn chỉ có thể xem nó một lần khi tạo và nó hết hạn sau 4 tháng. Hãy lưu nó ở nơi an toàn — bạn sẽ cần lặp lại quy trình này 2–3 lần mỗi năm học.",
      faq_title: "Câu hỏi thường gặp",
      faq_subtitle: "Câu trả lời nhanh cho các thắc mắc phổ biến.",
      faq1_q: "VinFocus có phải sản phẩm chính thức của Vinschool không?",
      faq1_a: "Không. VinFocus là dự án độc lập do một học sinh xây dựng, không liên kết với Vinschool hay LMS. Ứng dụng sử dụng API công khai của LMS để đọc dữ liệu khóa học với sự cho phép của bạn.",
      faq2_q: "Tôi cần Access Card để làm gì?",
      faq2_a: "VinFocus dùng API của LMS để truy xuất dữ liệu khóa học. API yêu cầu mã truy cập (Access Card) để xác thực và mã này không bao giờ được lưu trên máy chủ.",
      faq3_q: "Dữ liệu của tôi có an toàn không?",
      faq3_a: "Có. Mã của bạn chỉ được lưu trong localStorage hoặc sessionStorage của trình duyệt, được gửi trực tiếp đến LMS khi cần và không bao giờ lưu hay ghi lại trên máy chủ VinFocus. Không có dữ liệu nào bị thu thập hay chia sẻ.",
      faq4_q: "Giáo viên có biết tôi dùng VinFocus không?",
      faq4_a: "Không. VinFocus chỉ sử dụng API đọc dữ liệu của LMS và không thực hiện hành động nào thay mặt bạn.",
      faq5_q: "Tại sao không dùng LMS Vinschool?",
      faq5_a: "VinFocus không thay thế Vinschool LMS. Đây là một cách nhanh gọn và trực quan hơn để theo dõi bài tập, tiến độ học tập và thời khóa biểu mà không cần chuyển qua nhiều trang khác nhau trên LMS.",
      cta_eyebrow: "$ ./vinfocus",
      cta_title: "Tuần tới của bạn chỉ cách một tab.",
      cta_desc: "Mở ứng dụng, dán Access Card và thấy mọi thứ LMS giấu trong danh sách học phần.",
      cta_launch: "Mở ứng dụng",
      footer_credit: "Một dự án của Phạm Lê Mạnh Hùng",
      footer_disclaimer: "VinFocus là dự án độc lập và không liên kết với Vinschool hay LMS.",
      footer_copyright: "© 2026 VinFocus"
    }
  };

  var currentLang = localStorage.getItem("vinfocus_lang") || "en";

  function updateSwitcher(lang) {
    document.querySelectorAll(".lang_option").forEach(function (opt) {
      opt.classList.toggle("lang_option_active", opt.getAttribute("data-lang") === lang);
    });
    var ind = document.querySelector(".lang_indicator");
    if (ind) {
      ind.classList.toggle("lang_indicator_vi", lang === "vi");
    }
  }

  function applyLanguage(lang) {
    if (typingTimer) {
      clearInterval(typingTimer);
      typingTimer = null;
      if (heroPromptText && i18nStrings[lang] && i18nStrings[lang].hero_eyebrow !== undefined) {
        heroPromptText.textContent = i18nStrings[lang].hero_eyebrow;
      }
      if (heroCaret) heroCaret.classList.add("hero_caret--hidden");
    }

    var strings = i18nStrings[lang];
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (strings[key] !== undefined) {
        el.innerHTML = strings[key];
      }
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-ph");
      if (strings[key] !== undefined) {
        el.setAttribute("placeholder", strings[key]);
      }
    });
    currentLang = lang;
    localStorage.setItem("vinfocus_lang", lang);
    updateSwitcher(lang);
    updateSearch();
  }

  var switcher = document.getElementById("lang_switcher");
  if (switcher) {
    switcher.addEventListener("click", function (e) {
      var opt = e.target.closest(".lang_option");
      if (opt) {
        var lang = opt.getAttribute("data-lang");
        if (lang !== currentLang) {
          applyLanguage(lang);
        }
      }
    });
  }

  applyLanguage(currentLang);

  /* start the typewriter only after i18n is applied */
  window.addEventListener("load", function () {
    typeHero();
  });

  console.log("[VinFocus] Landing page loaded");
})();
