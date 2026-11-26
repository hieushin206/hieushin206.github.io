/* =========================================================
   course-detail-render.js - Dựng trang chi tiết cho khóa học do ADMIN thêm mới
   Trang: courses/chi-tiet-khoa-hoc.html?id=KHxxx
   Lấy dữ liệu từ Store (course.detail) và tạo đúng cấu trúc HTML/CSS của các trang
   khóa học có sẵn: section-one, section-two (item-1..item-N) và hộp .side-bar-sticky.
   Phải được nạp SAU seed-data.js + store.js và TRƯỚC header-auth.js.
   Ngoài ra còn dùng cho khóa học CÓ SẴN trong file HTML mà admin đã sửa nội dung chi tiết
   (course.detailOverride): CourseSync nạp file này và gọi applyOverride() để thay các khối item-1..4 + hộp bên phải.
   ========================================================= */
const CourseDetailRender = (function () {
  const root = document.getElementById("cd-root"); // chỉ có ở trang chi-tiet-khoa-hoc.html
  if (typeof Store === "undefined") return {};

  const esc = (t) => {
    const d = document.createElement("div");
    d.textContent = String(t == null ? "" : t);
    return d.innerHTML.replace(/"/g, "&quot;");
  };
  const money = (n) => Number(n).toLocaleString("vi-VN") + " đ";
  const imgSrc = (src) =>
    !src
      ? "/assets/images/LetDiv.webp"
      : /^(data:|https?:|\/)/i.test(src)
        ? src
        : "/" + src;

  // Link YouTube -> link nhúng (chỉ nhận youtube.com / youtu.be)
  function youtubeEmbed(url) {
    const m = String(url || "")
      .trim()
      .match(
        /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i,
      );
    return m ? "https://www.youtube-nocookie.com/embed/" + m[1] : ""; // nocookie: không đặt cookie theo dõi khi chưa bấm xem
  }

  // "Tiêu đề: mô tả" -> <strong>Tiêu đề:</strong> mô tả
  function lessonHtml(line) {
    const i = line.indexOf(":");
    if (i > 0 && i < 80)
      return (
        "<li><strong>" +
        esc(line.slice(0, i + 1)) +
        "</strong> " +
        esc(line.slice(i + 1).trim()) +
        "</li>"
      );
    return "<li>" + esc(line) + "</li>";
  }

  const list = (items) => items.map((t) => "<li>" + esc(t) + "</li>").join("");
  const ICON_OK = [
    "fa-regular fa-clock",
    "fa-regular fa-calendar",
    "fa-solid fa-code",
    "fa-regular fa-circle-question",
    "fa-solid fa-video",
    "fa-solid fa-users",
    "fa-solid fa-medal",
    "fa-solid fa-infinity",
  ];

  const POLICIES =
    '<div class="content-child"><h2 class="title">Học 1 Kèm 1 - Đảm bảo chất lượng Tốt Nhất</h2><ul class="content-padding">' +
    "<li>Bạn sẽ được theo sát và hỗ trợ 1-1 bởi giảng viên. Đảm bảo chất lượng học tập đạt kết quả tốt nhất.</li>" +
    "<li>Nếu <strong>HỌC CHẬM</strong> bạn không cần lo lắng không theo kịp chương trình, giảng viên sẽ đi chậm để đảm bảo bạn nắm chắc 100% kiến thức.</li>" +
    "<li>Nếu học nhanh, bạn có thể nhanh chóng kết thúc chương trình để đi làm công ty.</li></ul></div>" +
    '<div class="content-child"><h2 class="title">Học online - Tiết kiệm thời gian di chuyển</h2>' +
    "<p>Thay vì phải di chuyển vất vả trên đường giữa dòng người đông đúc. Giờ đây, bạn chỉ cần mở laptop để bắt đầu học ngay tại nhà. Tiết kiệm thời gian, tránh căng thẳng, và tập trung hoàn toàn vào việc học!</p></div>" +
    '<div class="content-child"><h2 class="title">Lịch học linh hoạt</h2><ul class="content-padding">' +
    "<li>LetDiv sắp xếp lịch học theo ý của bạn. Học đúng thời điểm mà bạn cảm thấy thoải mái nhất.</li>" +
    "<li>Dễ dàng thay đổi lịch học trong khi học nếu bạn có việc bận. Không làm gián đoạn tiến độ học tập của bạn.</li>" +
    "<li>LetDiv có thể sắp xếp thời gian học cho bạn từ 8h đến 23h, kể cả cuối tuần.</li></ul></div>" +
    '<div class="content-child"><h2 class="title">Chính sách Hỗ trợ việc làm</h2><ul class="content-padding">' +
    "<li>Hỗ trợ chỉnh sửa CV giúp hồ sơ của bạn nổi bật hơn, gia tăng cơ hội nhận lời mời phỏng vấn.</li>" +
    "<li>Hỗ trợ giới thiệu hồ sơ đến các công ty lập trình Việt Nam.</li>" +
    "<li>Có cơ hội thực tập tại LetDiv, tham gia vào phát triển dự án eLearning.</li></ul></div>" +
    '<div class="content-child"><h2 class="title">Chính sách hoàn tiền 100%</h2><ul class="content-padding">' +
    "<li>Cam kết <strong>hoàn tiền 100%</strong> nếu bạn không hài lòng với chất lượng đào tạo trong <strong>2 buổi đầu tiên</strong>.</li>" +
    "<li>Quá trình hoàn tiền sẽ diễn ra nhanh chóng <strong>ngay trong ngày.</strong></li></ul></div>";

  function notFound(text) {
    root.innerHTML =
      '<div class="section-one"><div class="container"><div class="inner-wrap"><div class="inner-content"><h1>' +
      esc(text) +
      "</h1>" +
      '<p><a href="/courses/course.html" style="color:#fff;text-decoration:underline">← Quay lại danh sách khóa học</a></p></div></div></div></div>';
    document.title = "Không tìm thấy khóa học - LetDiv";
  }

  // Bên phải tiêu đề chương: nút "Học thử" + thời lượng video (chỉ khi chương có video hợp lệ)
  function trialHtml(ch) {
    const url = youtubeEmbed(ch.trialVideo);
    if (!url) return "";
    return (
      '<div class="trial-box"><a href="#" class="trial-link" data-trial="' +
      esc(url) +
      '" data-title="' +
      esc(ch.title) +
      '"><i class="fa-solid fa-circle-play"></i> Học thử</a>' +
      (ch.trialTime
        ? '<span class="trial-time">' + esc(ch.trialTime) + "</span>"
        : "") +
      "</div>"
    );
  }

  // Số chương đầu cho xem thử miễn phí (mặc định 2)
  function freeTrialCount(d) {
    const n = Number(d && d.freeTrial);
    return n >= 0 && n <= 10 && d.freeTrial !== undefined && d.freeTrial !== ""
      ? n
      : 2;
  }

  // Các chương còn lại: chỉ người đã MUA khóa học mới thấy nút Học thử + thời lượng (người chưa mua thì không có trong trang)
  // Chương này có cho xem thử miễn phí không? (dữ liệu cũ chưa có cờ riêng: n chương đầu là miễn phí)
  function isFree(ch, i, d) {
    return ch.trialFree !== undefined ? !!ch.trialFree : i < freeTrialCount(d);
  }

  function unlockTrialsForOwner(course, scope) {
    if (typeof CartStore === "undefined" || typeof AuthStore === "undefined")
      return;
    const me = AuthStore.currentUser();
    // Admin xem được mọi video; khách hàng chỉ xem khi đã mua khóa học (hoặc khóa nằm trong combo đã mua)
    if (!me || (me.role !== "admin" && !CartStore.isOwned(course.id))) return;
    const d = course.detail || {};
    (d.chapters || []).forEach((ch, i) => {
      if (isFree(ch, i, d) || !youtubeEmbed(ch.trialVideo)) return;
      const head = (scope || document).querySelector(
        '.card-header[data-ch="' + i + '"]',
      );
      if (!head || head.querySelector(".trial-box")) return;
      head.classList.add("has-trial");
      head.insertAdjacentHTML("beforeend", trialHtml(ch));
    });
  }

  // Cửa sổ xem video học thử (có nút đóng; đóng thì dừng video)
  let trialModalReady = false;
  function setupTrialModal() {
    if (trialModalReady) return;
    trialModalReady = true;
    const box = document.createElement("div");
    box.className = "trial-modal";
    box.innerHTML =
      '<div class="trial-dialog"><div class="trial-head"><span class="trial-name"></span><a class="trial-yt trial-ext" target="_blank" rel="noopener" hidden><i class="fa-brands fa-youtube"></i> Mở trên YouTube</a>' +
      '<button type="button" class="trial-close" title="Đóng"><i class="fa-solid fa-xmark"></i> Đóng</button></div>' +
      '<div class="trial-frame"></div></div>';
    document.body.appendChild(box);
    const frame = box.querySelector(".trial-frame");
    function close() {
      box.classList.remove("open");
      frame.innerHTML = ""; // gỡ iframe để video ngừng phát
      document.body.style.overflow = "";
    }
    box.addEventListener("click", (e) => {
      if (e.target === box || e.target.closest(".trial-close")) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && box.classList.contains("open")) close();
    });
    document.addEventListener("click", (e) => {
      const link = e.target.closest(".trial-link");
      if (!link) return;
      e.preventDefault();
      box.querySelector(".trial-name").textContent =
        "Học thử: " + link.dataset.title;
      const idMatch = link.dataset.trial.match(/embed\/([\w-]{11})/);
      const watch = idMatch
        ? "https://www.youtube.com/watch?v=" + idMatch[1]
        : "";
      const fallback = watch
        ? '<a class="trial-yt" href="' +
          esc(watch) +
          '" target="_blank" rel="noopener"><i class="fa-brands fa-youtube"></i> Mở trên YouTube</a>'
        : "";
      const ext = box.querySelector(".trial-ext");
      ext.hidden = !watch;
      if (watch) ext.href = watch; // dự phòng: video bị chặn nhúng thì mở thẳng trên YouTube
      if (location.protocol === "file:") {
        // YouTube từ chối phát khi trang mở trực tiếp từ file (lỗi 153): hướng dẫn thay vì để khung đen
        frame.innerHTML =
          '<div class="trial-note">Video YouTube không phát được khi mở trực tiếp file trên máy.<br>Hãy chạy website bằng Live Server hoặc đưa lên GitHub Pages.<br>' +
          fallback +
          "</div>";
      } else {
        // referrerpolicy bắt buộc có thì YouTube mới cho nhúng; thêm link dự phòng nếu video bị chặn nhúng
        frame.innerHTML =
          '<iframe src="' +
          esc(link.dataset.trial) +
          '?autoplay=1&rel=0&modestbranding=1&playsinline=1" title="Video học thử" frameborder="0" ' +
          'allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>' +
          "";
      }
      box.classList.add("open");
      document.body.style.overflow = "hidden";
    });
  }

  // item-3 dạng Collapse (các chương)
  function chaptersHtml(chapters, d) {
    const cards = chapters
      .map((ch, i) => {
        const free = isFree(ch, i, d); // chương tick "xem thử miễn phí" ai cũng thấy; còn lại phải mua khóa học
        const n = i + 1;
        return (
          '<div class="card"><div class="card-header' +
          (free && youtubeEmbed(ch.trialVideo) ? " has-trial" : "") +
          '" id="heading' +
          n +
          '" data-ch="' +
          i +
          '"><h2 class="mb-0">' +
          '<button class="btn btn-link btn-block text-left' +
          (i === 0 ? "" : " collapsed") +
          '" type="button" data-toggle="collapse" data-target="#collapse' +
          n +
          '" aria-expanded="' +
          (i === 0 ? "true" : "false") +
          '" aria-controls="collapse' +
          n +
          '">' +
          '<span class="collapse-icon"></span><span>' +
          esc(ch.title) +
          "</span></button></h2>" +
          (free ? trialHtml(ch) : "") +
          "</div>" +
          '<div id="collapse' +
          n +
          '" class="collapse' +
          (i === 0 ? " show" : "") +
          '" aria-labelledby="heading' +
          n +
          '" data-parent="#accordionCourse">' +
          '<div class="card-body"><ul>' +
          ch.lessons.map(lessonHtml).join("") +
          "</ul></div></div></div>"
        );
      })
      .join("");
    return (
      '<div class="inner-dropdown"><div class="accordion" id="accordionCourse">' +
      cards +
      "</div></div>"
    );
  }

  // item-3 dạng khối khóa học liên quan (giống trang combo)
  function relatedHtml(ids) {
    const boxes = ids
      .map((id) => Store.getCourse(id))
      .filter((c) => c && !c.deleted && c.status !== "hidden")
      .map((c) => {
        const href = c.href ? "/" + c.href : "#";
        return (
          '<div class="inner-box col-xl-6 col-lg-6 col-md-6 col-sm-12"><div class="img"><a href="' +
          esc(href) +
          '"><img src="' +
          esc(imgSrc(c.image)) +
          '" alt=""></a></div>' +
          '<div class="content"><p><a href="' +
          esc(href) +
          '">' +
          esc(c.name) +
          "</a></p></div></div>"
        );
      })
      .join("");
    return boxes
      ? '<div class="inner-course"><div class="row">' + boxes + "</div></div>"
      : "";
  }

  // HTML của 4 khối nội dung chính (rỗng nếu không có dữ liệu)
  function itemsHtml(d) {
    const out = { 1: "", 2: "", 3: "", 4: "" };
    const embed = youtubeEmbed(d.videoUrl);
    if (d.introTitle || d.introText || embed) {
      out[1] =
        '<div class="content-child item-1">' +
        (d.introTitle
          ? '<h2 class="title">' + esc(d.introTitle) + "</h2>"
          : "") +
        (d.introText ? "<p>" + esc(d.introText) + "</p>" : "") +
        (embed
          ? '<iframe class="video" width="560" height="315" src="' +
            esc(embed) +
            '" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
          : "") +
        "</div>";
    }
    if (d.learn && d.learn.length) {
      out[2] =
        '<div class="content-child item-2"><h2 class="title">Bạn sẽ học được gì?</h2><ul class="lesson-content">' +
        d.learn
          .map(
            (t) =>
              '<li><i class="fa-solid fa-check"></i><span>' +
              esc(t) +
              "</span></li>",
          )
          .join("") +
        "</ul></div>";
    }
    let item3 = "";
    if (d.contentMode === "related") item3 = relatedHtml(d.related || []);
    else if (d.chapters && d.chapters.length)
      item3 = chaptersHtml(d.chapters, d);
    if (item3)
      out[3] =
        '<div class="content-child item-3"><h2 class="title">Nội dung khóa học</h2>' +
        item3 +
        "</div>";
    if (d.audience && d.audience.length) {
      out[4] =
        '<div class="content-child item-4"><h2 class="title">Đối tượng học</h2><ul class="content-padding">' +
        list(d.audience) +
        "</ul></div>";
    }
    return out;
  }

  // Khối "Khóa học này bao gồm" của hộp bên phải
  function perksHtml(d) {
    const perks = (d.perks || []).filter((p) => p.text);
    if (!perks.length) return "";
    return (
      '<div class="desc"><p>Khóa học này bao gồm</p><ul>' +
      perks
        .map(
          (p) =>
            '<li><i class="' +
            (ICON_OK.indexOf(p.icon) >= 0 ? p.icon : ICON_OK[0]) +
            '"></i> ' +
            esc(p.text) +
            "</li>",
        )
        .join("") +
      "</ul></div>"
    );
  }

  // Khóa học CÓ SẴN trong HTML mà admin đã sửa nội dung: thay các khối tương ứng trên trang
  function applyOverride(c) {
    const d = c.detail || {};
    // section-one
    const one = document.querySelector(".section-one .inner-content");
    if (one) {
      let p = one.querySelector(":scope > p");
      if (c.description) {
        if (!p) {
          p = document.createElement("p");
          const h1 = one.querySelector("h1");
          if (h1) h1.insertAdjacentElement("afterend", p);
        }
        if (p) p.textContent = c.description;
      } else if (p) p.remove();
      const spans = one.querySelectorAll(".course-element li");
      if (spans[0] && d.updatedAt)
        spans[0].querySelectorAll("span")[1].textContent = d.updatedAt;
      if (spans[1] && d.students !== undefined)
        spans[1].querySelectorAll("span")[1].textContent = d.students;
    }
    // item-1..4
    const wrap = document.querySelector(
      ".section-two .inner-wrap > .inner-content",
    );
    if (wrap) {
      const it = itemsHtml(d);
      [1, 2, 3, 4].forEach((n) => {
        const old = wrap.querySelector(":scope > .item-" + n);
        if (old) {
          if (it[n]) old.outerHTML = it[n];
          else old.remove();
        } else if (it[n]) {
          // trang chưa có khối này: chèn trước khối có số lớn hơn gần nhất, nếu không có thì thêm cuối
          let next = null;
          for (let k = n + 1; k <= 13 && !next; k++)
            next = wrap.querySelector(":scope > .item-" + k);
          if (next) next.insertAdjacentHTML("beforebegin", it[n]);
          else wrap.insertAdjacentHTML("beforeend", it[n]);
        }
      });
    }
    // hộp bên phải
    const box = document.querySelector(".side-bar-sticky .inner-price");
    if (box) {
      const oldDesc = box.querySelector(".desc");
      const html = perksHtml(d);
      if (oldDesc) {
        if (html) oldDesc.outerHTML = html;
        else oldDesc.remove();
      } else if (html) box.insertAdjacentHTML("beforeend", html);
    }
    setupTrialModal();
    if (typeof AuthReady === "function")
      AuthReady(() => unlockTrialsForOwner(c, document));
  }

  function render(c) {
    const d = c.detail || {};
    const hidden = c.deleted || c.status === "hidden";
    document.title = c.name + " - LetDiv";

    let html = "";
    if (hidden)
      html +=
        '<div style="background:#fff4dc;color:#8a5a00;text-align:center;padding:12px 16px;font-weight:600">Khóa học này hiện tạm ngừng nhận đăng ký.</div>';

    // ----- section-one -----
    html +=
      '<div class="section-one"><div class="container"><div class="inner-wrap"><div class="inner-content"><h1>' +
      esc(c.name) +
      "</h1>" +
      (c.description ? "<p>" + esc(c.description) + "</p>" : "") +
      '<ul class="course-element">' +
      '<li><div class="course-element-right"><span>Ngày cập nhật</span><span>' +
      esc(d.updatedAt || "") +
      "</span></div></li>" +
      '<li><div class="course-element-right"><span>Học viên</span><span>' +
      esc(d.students || 0) +
      "</span></div></li>" +
      "</ul></div></div></div></div>";

    // ----- section-two: nội dung -----
    const it = itemsHtml(d);
    let main = it[1] + it[2] + it[3] + it[4];
    if (d.policies !== false) main += POLICIES;

    // ----- hộp bên phải -----
    const side =
      '<div class="side-bar-sticky"><div class="inner-images"><img src="' +
      esc(imgSrc(c.image)) +
      '" alt=""></div>' +
      '<div class="inner-price"><div class="price">' +
      money(c.price) +
      (c.oldPrice > c.price
        ? '<span class="price-del"><del>' + money(c.oldPrice) + "</del></span>"
        : "") +
      "</div>" +
      '<button type="button" class="btn btn-primary button" data-toggle="modal" data-target="#exampleModal">Tư Vấn Ngay</button>' +
      '<button class="button cart"' +
      (hidden ? " disabled" : "") +
      ">" +
      (hidden ? "Tạm ngừng đăng ký" : "Thêm Vào Giỏ") +
      "</button>" +
      perksHtml(d) +
      "</div></div>";

    html +=
      '<div class="section-two"><div class="container"><div class="inner-wrap"><div class="inner-content">' +
      main +
      "</div>" +
      side +
      "</div></div></div>";
    root.innerHTML = html;
  }

  if (root) {
    const id = new URLSearchParams(location.search).get("id");
    const course = id ? Store.getCourse(id) : null;
    if (!course || !course.custom) notFound("Không tìm thấy khóa học này.");
    else if (course.deleted) notFound("Khóa học này không còn tồn tại.");
    else {
      render(course);
      setupTrialModal();
      // header-auth.js (nạp sau file này) báo sẵn sàng qua AuthReady -> lúc đó mới biết người xem đã mua khóa chưa
      document.addEventListener("DOMContentLoaded", () => {
        if (typeof AuthReady === "function")
          AuthReady(() => unlockTrialsForOwner(course, root));
      });
    }
  }

  return { applyOverride: applyOverride };
})();
