(function () {

  /* ── Nav scroll state ── */
  const nav = document.getElementById("nav");
  let navScrolled = false;

  function updateNavScroll() {
    const shouldScroll = window.scrollY > 40;
    if (shouldScroll !== navScrolled) {
      navScrolled = shouldScroll;
      nav.classList.toggle("nav_scrolled", shouldScroll);
    }
  }

  window.addEventListener("scroll", updateNavScroll, { passive: true });
  updateNavScroll();

  /* ── Mobile nav toggle ── */
  const toggleBtn = document.getElementById("nav_mobile_toggle");
  const navLinks = document.getElementById("nav_links");

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
        var offset = 72;
        var top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: "smooth" });
      }
    }
  });

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

  /* ── Scroll-triggered fade-in ── */
  var animateTargets = document.querySelectorAll(
    ".feature_card, .showcase_row, .privacy_card, .step, .faq_item, .section_title, .section_subtitle"
  );

  animateTargets.forEach(function (el) {
    el.classList.add("fade_in");
  });

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("fade_in_visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
  );

  animateTargets.forEach(function (el) {
    observer.observe(el);
  });

  /* ── Bilingual i18n ── */
  var i18nStrings = {
    en: {
      nav_features: "Features",
      nav_screenshots: "Screenshots",
      nav_privacy: "Privacy",
      nav_faq: "FAQ",
      nav_github: "GitHub",
      nav_launch: "Launch App",
      hero_title: "Browse Canvas.<br>Not the clutter.",
      hero_desc: "Everything from Canvas. Nothing in your way.",
      hero_launch: "Launch App",
      hero_github: "View on GitHub",
      features_title: "Everything in one place",
      features_subtitle: "Canvas has the data. VinFocus puts it in front of you.",
      feature1_title: "Browse Courses",
      feature1_desc: "View all your active courses side by side. Switch between subjects instantly with clean pill-style navigation.",
      feature2_title: "Search Everything",
      feature2_desc: "Search across courses, modules, quizzes, assignments, and files from a single search bar with instant results.",
      feature3_title: "Semester Progress",
      feature3_desc: "See exactly where you stand. Per-week completion stats, type breakdowns, and a visual progress bar for the entire semester.",
      feature4_title: "Weekly Overview",
      feature4_desc: "Navigate weeks instead of scrolling through long module lists. Every quiz, assignment, and file organized by week.",
      showcase1_label: "Dashboard",
      showcase1_title: "Semester progress at a glance",
      showcase1_desc: "The overview sidebar shows you exactly where you stand in each course. See which weeks have unfinished work, which types of assignments remain, and how much of the semester you have completed — all without leaving the page.",
      showcase1_li1: "Per-week completion stats with visual progress bars",
      showcase1_li2: "Item type breakdowns (Quizzes, Assignments, Files, Pages)",
      showcase1_li3: "Course-wide totals: done, unfinished, and unknown items",
      showcase1_li4: "Warning banner for unassigned work",
      showcase2_label: "Timetable",
      showcase2_title: "Your schedule, always accessible",
      showcase2_desc: "A fully editable weekly timetable that lives in your browser. Add, edit, or remove subjects and periods. The timetable highlights the current period and today's column so you always know what is next.",
      showcase2_li1: "Edit subjects inline or with a dedicated editor",
      showcase2_li2: "Current period and today highlighting",
      showcase2_li3: "Responsive design with mobile-friendly modal editing",
      showcase2_li4: "Data stored locally — no server uploads",
      privacy_title: "Your privacy comes first.",
      privacy_subtitle: "VinFocus is designed to be transparent about what it can and cannot do with your account.",
      privacy_1: "No Canvas password required",
      privacy_2: "Uses your personal Access Card",
      privacy_3: "Read-only access",
      privacy_4: "Cannot submit assignments",
      privacy_5: "Your data stays yours",
      steps_title: "Getting started",
      steps_subtitle: "Three simple steps to start browsing.",
      step1_title: "Generate an Access Card",
      step1_desc: "Open your Canvas account settings and create a new API access token. This is your personal Access Card.",
      step2_title: "Paste it into VinFocus",
      step2_desc: "Copy your Access Card and paste it into the VinFocus setup wizard. The card is stored only in your browser.",
      step3_title: "Start browsing",
      step3_desc: "Your courses load automatically. Navigate weeks, search resources, and track your semester progress.",
      faq_title: "Frequently asked questions",
      faq_subtitle: "Quick answers to common questions.",
      faq1_q: "Is VinFocus an official Vinschool product?",
      faq1_a: "No. VinFocus is an independent project created by a student. It is not affiliated with Vinschool or Canvas LMS. It uses Canvas's public API to read course data with your permission.",
      faq2_q: "Why do I need an Access Card?",
      faq2_a: "VinFocus uses Canvas's API to fetch your course data. The API requires an access token (Access Card) to authenticate you. The token is never stored on our servers.",
      faq3_q: "Is my data safe?",
      faq3_a: "Yes. Your token is stored only in your browser's localStorage or sessionStorage. It is sent directly to Canvas with each request and is never logged or stored on VinFocus servers. No data is collected or shared.",
      faq4_q: "Can teachers see that I use VinFocus?",
      faq4_a: "No. VinFocus uses the same Canvas API that any student can use. It makes read-only requests that are indistinguishable from normal Canvas usage. There is no way for teachers to detect VinFocus.",
      faq5_q: "Does it work on mobile?",
      faq5_a: "Yes. VinFocus is fully responsive and works on mobile browsers. The interface adapts to smaller screens with touch-friendly controls and a mobile-optimized timetable view.",
      footer_credit: "Made by Pham Le Manh Hung",
      footer_disclaimer: "VinFocus is an independent project and is not affiliated with Vinschool or Canvas LMS.",
      footer_copyright: "© 2026 VinFocus"
    },
    vi: {
      nav_features: "Tính năng",
      nav_screenshots: "Ảnh chụp",
      nav_privacy: "Quyền riêng tư",
      nav_faq: "FAQ",
      nav_github: "GitHub",
      nav_launch: "Mở Ứng dụng",
      hero_title: "Duyệt Canvas.<br>Không lộn xộn.",
      hero_desc: "Mọi thứ từ Canvas. Không có gì cản trở.",
      hero_launch: "Mở Ứng dụng",
      hero_github: "Xem trên GitHub",
      features_title: "Mọi thứ trong một nơi",
      features_subtitle: "Canvas có dữ liệu. VinFocus đặt nó trước mặt bạn.",
      feature1_title: "Duyệt Khóa học",
      feature1_desc: "Xem tất cả khóa học của bạn cạnh nhau. Chuyển đổi giữa các môn ngay lập tức với điều hướng dạng viên gọn gàng.",
      feature2_title: "Tìm kiếm Mọi thứ",
      feature2_desc: "Tìm kiếm trong khóa học, mô-đun, bài kiểm tra, bài tập và tệp tin từ một thanh tìm kiếm duy nhất với kết quả tức thì.",
      feature3_title: "Tiến độ Học kỳ",
      feature3_desc: "Xem chính xác bạn đang ở đâu. Thống kê hoàn thành theo tuần, phân loại theo loại và thanh tiến độ trực quan cho cả học kỳ.",
      feature4_title: "Tổng quan Hàng tuần",
      feature4_desc: "Điều hướng theo tuần thay vì cuộn qua danh sách mô-đun dài. Mọi bài kiểm tra, bài tập và tệp tin được sắp xếp theo tuần.",
      showcase1_label: "Bảng điều khiển",
      showcase1_title: "Tiến độ học kỳ trong nháy mắt",
      showcase1_desc: "Thanh bên tổng quan cho bạn thấy chính xác bạn đang ở đâu trong mỗi khóa học. Xem tuần nào còn việc chưa hoàn thành, loại bài tập nào còn lại và bạn đã hoàn thành bao nhiêu phần trăm học kỳ — tất cả mà không cần rời khỏi trang.",
      showcase1_li1: "Thống kê hoàn thành theo tuần với thanh tiến độ trực quan",
      showcase1_li2: "Phân loại theo loại (Bài kiểm tra, Bài tập, Tệp tin, Trang)",
      showcase1_li3: "Tổng số toàn khóa: đã làm, chưa xong và không xác định",
      showcase1_li4: "Cảnh báo cho công việc chưa được phân tuần",
      showcase2_label: "Thời khóa biểu",
      showcase2_title: "Lịch học của bạn, luôn có sẵn",
      showcase2_desc: "Một thời khóa biểu hàng tuần có thể chỉnh sửa ngay trong trình duyệt. Thêm, sửa hoặc xóa môn học và tiết học. Thời khóa biểu làm nổi bật tiết học hiện tại và cột hôm nay để bạn luôn biết tiết tiếp theo là gì.",
      showcase2_li1: "Chỉnh sửa môn học trực tiếp hoặc với trình chỉnh sửa chuyên dụng",
      showcase2_li2: "Làm nổi bật tiết hiện tại và hôm nay",
      showcase2_li3: "Thiết kế responsive với chỉnh sửa dạng modal thân thiện trên di động",
      showcase2_li4: "Dữ liệu lưu trữ cục bộ — không tải lên máy chủ",
      privacy_title: "Quyền riêng tư của bạn là trên hết.",
      privacy_subtitle: "VinFocus được thiết kế minh bạch về những gì nó có thể và không thể làm với tài khoản của bạn.",
      privacy_1: "Không yêu cầu mật khẩu Canvas",
      privacy_2: "Sử dụng Access Card cá nhân của bạn",
      privacy_3: "Chỉ đọc",
      privacy_4: "Không thể nộp bài tập",
      privacy_5: "Dữ liệu của bạn vẫn là của bạn",
      steps_title: "Bắt đầu",
      steps_subtitle: "Ba bước đơn giản để bắt đầu duyệt.",
      step1_title: "Tạo Access Card",
      step1_desc: "Mở cài đặt tài khoản Canvas của bạn và tạo một mã truy cập API mới. Đây là Access Card cá nhân của bạn.",
      step2_title: "Dán vào VinFocus",
      step2_desc: "Sao chép Access Card của bạn và dán vào trình hướng dẫn thiết lập VinFocus. Thẻ chỉ được lưu trữ trong trình duyệt của bạn.",
      step3_title: "Bắt đầu duyệt",
      step3_desc: "Các khóa học của bạn sẽ tải tự động. Điều hướng theo tuần, tìm kiếm tài nguyên và theo dõi tiến độ học kỳ của bạn.",
      faq_title: "Các câu hỏi thường gặp",
      faq_subtitle: "Câu trả lời nhanh cho các câu hỏi phổ biến.",
      faq1_q: "VinFocus có phải là sản phẩm chính thức của Vinschool không?",
      faq1_a: "Không. VinFocus là một dự án độc lập được tạo bởi một học sinh. Nó không liên kết với Vinschool hoặc Canvas LMS. Nó sử dụng API công khai của Canvas để đọc dữ liệu khóa học với sự cho phép của bạn.",
      faq2_q: "Tại sao tôi cần Access Card?",
      faq2_a: "VinFocus sử dụng API của Canvas để lấy dữ liệu khóa học của bạn. API yêu cầu một mã truy cập (Access Card) để xác thực bạn. Mã này không bao giờ được lưu trữ trên máy chủ của chúng tôi.",
      faq3_q: "Dữ liệu của tôi có an toàn không?",
      faq3_a: "Có. Mã của bạn chỉ được lưu trữ trong localStorage hoặc sessionStorage của trình duyệt. Nó được gửi trực tiếp đến Canvas với mỗi yêu cầu và không bao giờ được ghi lại hoặc lưu trữ trên máy chủ VinFocus. Không có dữ liệu nào bị thu thập hoặc chia sẻ.",
      faq4_q: "Giáo viên có thể thấy tôi sử dụng VinFocus không?",
      faq4_a: "Không. VinFocus sử dụng cùng API Canvas mà bất kỳ học sinh nào cũng có thể sử dụng. Nó thực hiện các yêu cầu chỉ đọc không thể phân biệt với việc sử dụng Canvas thông thường. Không có cách nào để giáo viên phát hiện VinFocus.",
      faq5_q: "Nó có hoạt động trên di động không?",
      faq5_a: "Có. VinFocus hoàn toàn tương thích và hoạt động trên trình duyệt di động. Giao diện thích ứng với màn hình nhỏ hơn với các điều khiển thân thiện với cảm ứng và chế độ xem thời khóa biểu tối ưu cho di động.",
      footer_credit: "Được tạo bởi Phạm Lê Mạnh Hùng",
      footer_disclaimer: "VinFocus là một dự án độc lập và không liên kết với Vinschool hoặc Canvas LMS.",
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
    var strings = i18nStrings[lang];
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (strings[key] !== undefined) {
        el.innerHTML = strings[key];
      }
    });
    currentLang = lang;
    localStorage.setItem("vinfocus_lang", lang);
    updateSwitcher(lang);
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

  console.log("[VinFocus] Landing page loaded");
})();