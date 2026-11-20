/* =========================================================
   course-sync.js - Áp dụng chỉnh sửa khóa học của ADMIN lên các trang chính
   (trang chủ, danh sách khóa học, trang chi tiết khóa học).
   ---------------------------------------------------------
   Được header-auth.js nạp và gọi trên mọi trang. Với mỗi khóa học trong Store:
   - Khóa bị ẨN (admin tắt hiển thị): khối khóa học biến mất khỏi trang chủ + trang khóa học;
     trang chi tiết hiện thông báo và nút "Thêm Vào Giỏ" bị vô hiệu hóa.
   - Admin sửa TÊN / ẢNH / GIÁ: các khối và trang chi tiết đổi theo.
   Chỉ ghi đè khi giá trị khác với bản đã đọc từ file HTML (course.htmlSnap), nên nội dung
   trong file HTML được giữ nguyên nếu admin chưa chỉnh gì.
   (Chiều ngược lại - sửa file HTML thì admin cập nhật - do admin/js/site-sync.js làm.)
   ========================================================= */
const CourseSync = (function () {
  function pathOf(href) {
    try {
      return new URL(href, location.href).pathname.toLowerCase();
    } catch (e) {
      return "";
    }
  }

  // Tìm khóa học ứng với 1 đường dẫn (khớp phần đuôi: courses/react.html)
  function findCourse(courses, href) {
    const path = pathOf(href);
    if (!path) return null;
    return courses.find((c) => c.href && path.endsWith("/" + c.href.toLowerCase())) || null;
  }

  // Giá trị admin đã sửa so với bản đọc từ HTML?
  function changed(c, field) {
    return !!c.htmlSnap && c[field] !== c.htmlSnap[field];
  }

  // Đường dẫn ảnh tính từ gốc website (ảnh tải lên là dữ liệu base64 thì giữ nguyên)
  function imgSrc(src) {
    if (!src) return "";
    return /^(data:|https?:|\/)/i.test(src) ? src : "/" + src;
  }

  function money(n) {
    return Number(n).toLocaleString("vi-VN") + " đ";
  }

  /* ---------- Khối khóa học ở trang chủ + trang danh sách ---------- */
  function applyBlocks(courses) {
    document.querySelectorAll(".inner-box").forEach((box) => {
      const link = box.querySelector(".content a[href]") || box.querySelector(".img a[href]");
      if (!link) return;
      const c = findCourse(courses, link.getAttribute("href"));
      if (!c) return;

      if (c.deleted || c.status === "hidden") {
        box.style.display = "none"; // khóa học bị ẩn: biến mất khỏi trang
        return;
      }
      if (changed(c, "name")) {
        const nameLink = box.querySelector(".content a[href]");
        if (nameLink) nameLink.textContent = c.name;
      }
      if (changed(c, "image")) {
        const img = box.querySelector(".img img");
        if (img) img.src = imgSrc(c.image);
      }
    });
  }

  // Nạp course-detail-render.js (nếu trang chưa có) rồi thay các khối nội dung theo dữ liệu admin
  function applyDetailOverride(c) {
    function run() {
      if (typeof CourseDetailRender === "undefined" || !CourseDetailRender.applyOverride) return;
      if (!document.querySelector('link[href*="course-short.css"]')) {
        const link = document.createElement("link"); // CSS của collapse + nút Học thử
        link.rel = "stylesheet";
        link.href = "/courses/css/course-short.css";
        document.head.appendChild(link);
      }
      CourseDetailRender.applyOverride(c);
    }
    if (typeof CourseDetailRender !== "undefined") return run();
    const script = document.createElement("script");
    script.src = "/assets/js/course-detail-render.js";
    script.onload = run;
    document.head.appendChild(script);
  }

  /* ---------- Trang chi tiết khóa học ---------- */
  function applyDetail(courses) {
    const priceBox = document.querySelector(".inner-price .price");
    if (!priceBox) return; // không phải trang chi tiết
    const c = findCourse(courses, location.pathname);
    if (!c) return;

    if (changed(c, "name")) {
      const h1 = document.querySelector(".inner-content h1");
      if (h1) h1.textContent = c.name;
    }
    if (changed(c, "image")) {
      const img = document.querySelector(".inner-images img");
      if (img) img.src = imgSrc(c.image);
    }
    if (changed(c, "price") || changed(c, "oldPrice")) {
      // Cấu trúc gốc: "7.600.000 đ<span class="price-del"><del>8.200.000 đ</del></span>"
      let text = Array.from(priceBox.childNodes).find((n) => n.nodeType === 3);
      if (!text) {
        text = document.createTextNode("");
        priceBox.insertBefore(text, priceBox.firstChild);
      }
      text.nodeValue = money(c.price);
      let del = priceBox.querySelector(".price-del");
      if (c.oldPrice > c.price) {
        if (!del) {
          del = document.createElement("span");
          del.className = "price-del";
          priceBox.appendChild(del);
        }
        del.innerHTML = "<del>" + money(c.oldPrice) + "</del>";
      } else if (del) {
        del.remove();
      }
    }

    // Admin đã sửa nội dung chi tiết (item-1..4, hộp bên phải) của khóa có sẵn trong HTML
    if (c.detailOverride && c.detail) applyDetailOverride(c);

    // Khóa học bị ẩn: báo rõ trên trang và không cho thêm vào giỏ
    if (c.deleted || c.status === "hidden") {
      const bar = document.createElement("div");
      bar.style.cssText = "background:#fff4dc;color:#8a5a00;text-align:center;padding:12px 16px;font-weight:600";
      bar.textContent = "Khóa học này hiện tạm ngừng nhận đăng ký.";
      const first = document.querySelector(".section-one");
      if (first && first.parentNode) first.parentNode.insertBefore(bar, first);

      const btn = document.querySelector(".inner-price .cart");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Tạm ngừng đăng ký";
        btn.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
          },
          true,
        );
      }
    }
  }

  /* ---------- Khóa học do admin THÊM MỚI: chèn khối vào trang chủ + trang danh sách ---------- */
  function esc(t) {
    const d = document.createElement("div");
    d.textContent = String(t == null ? "" : t);
    return d.innerHTML.replace(/"/g, "&quot;");
  }

  function boxHtml(c) {
    const href = esc("/" + c.href);
    const n = (c.detail && c.detail.students) || 0;
    return (
      '<div class="inner-box col-xl-3 col-lg-3 col-md-4 col-sm-12" data-custom-course="' + esc(c.id) + '">' +
      '<div class="img"><a href="' + href + '"><img src="' + esc(imgSrc(c.image)) + '" alt=""></a></div>' +
      '<div class="content"><p><a href="' + href + '">' + esc(c.name) + "</a></p>" +
      '<p><i class="fa-solid fa-user"></i> ' + n + " học viên</p></div></div>"
    );
  }

  function injectCustom(courses) {
    const list = courses.filter((c) => c.custom && c.href && !c.deleted && c.status !== "hidden");
    if (list.length === 0 || document.querySelector("[data-custom-course]")) return;
    const path = location.pathname.toLowerCase();

    // Trang danh sách khóa học: thêm 1 mục "Khóa Học Mới" ngay sau mục Khóa Học Ngắn Hạn
    if (path.endsWith("/courses/course.html")) {
      const anchor = document.querySelector(".section-four");
      if (!anchor) return;
      const sec = document.createElement("div");
      sec.className = "section-four";
      sec.innerHTML =
        '<div class="container"><div class="inner-wrap"><div class="inner-title"><h2 class="title">Khóa Học <span>Mới</span></h2></div>' +
        '<div class="row">' + list.map(boxHtml).join("") + "</div></div></div>";
      anchor.parentNode.insertBefore(sec, anchor.nextSibling);
      return;
    }

    // Trang chủ: thêm vào cuối hàng "Khóa Học Phổ Biến"
    const title = document.querySelector(".section-two .inner-title .title");
    if (title && /Phổ Biến/i.test(title.textContent)) {
      const row = title.closest(".section-two").querySelector(".row");
      if (row) row.insertAdjacentHTML("beforeend", list.map(boxHtml).join(""));
    }
  }

  function apply() {
    if (typeof Store === "undefined") return;
    const courses = Store.getCourses(true);
    applyBlocks(courses);
    injectCustom(courses);
    applyDetail(courses);
  }

  return { apply: apply };
})();
