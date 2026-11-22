/* =========================================================
   khoa-hoc.js - Trang "Khóa học"
   Chức năng: danh sách (bảng / thẻ), tìm kiếm, lọc trạng thái,
   sửa thông tin (tên, giá, ảnh, mô tả), xóa, bật/tắt hiển thị.
   THÊM KHÓA HỌC MỚI: form nhập đủ nội dung trang chi tiết (section-one, item-1..4, hộp bên phải).
   Khóa học tự tạo lưu trong Store (custom = true, detail = {...}) và được dựng thành trang
   courses/chi-tiet-khoa-hoc.html?id=... (xem assets/js/course-detail-render.js).
   Các khóa học có sẵn lấy từ file HTML của website (xem site-sync.js) - sửa nội dung chi tiết của chúng trong file HTML.
   Sửa tên / ảnh / giá hoặc ẩn khóa học ở đây thì các trang chính đổi theo (course-sync.js).
   ========================================================= */
function initCoursePage() {
  const FIELDS = ["name", "price", "oldPrice", "image"];
  let pendingImage = ""; // ảnh vừa chọn từ máy, chưa lưu vào thư viện
  const VIEW_KEY = "letdiv_admin_course_view";

  // Trạng thái bộ lọc hiện tại của trang
  const state = {
    search: "",
    status: "all", // all | active | hidden
    view: localStorage.getItem(VIEW_KEY) || "table",
    page: 1,
  };
  let editingId = null; // khóa học đang sửa
  let detailSnap = ""; // nội dung chi tiết lúc mở form (để biết admin có sửa hay không)

  const $ = (id) => document.getElementById(id);
  const listArea = $("list-area");

  /* ---------- Lọc dữ liệu ---------- */
  function getFiltered() {
    let list = Store.get("courses").filter((c) => !c.deleted);
    if (state.status === "active" || state.status === "hidden") list = list.filter((c) => c.status === state.status);
    const kw = UI.normalize(state.search);
    if (kw) list = list.filter((c) => UI.normalize(c.name + " " + c.id).includes(kw));
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // mới nhất trước
  }

  // Số lượt bán của từng khóa (tính từ đơn hoàn thành)
  function getSoldMap() {
    const map = {};
    Store.completedOrders().forEach((o) => o.items.forEach((it) => (map[it.courseId] = (map[it.courseId] || 0) + 1)));
    return map;
  }

  /* ---------- Hiển thị ---------- */
  function renderTabs() {
    const all = Store.get("courses");
    const alive = all.filter((c) => !c.deleted);
    const tabs = [
      { key: "all", label: "Tất cả", count: alive.length },
      { key: "active", label: "Đang hiển thị", count: alive.filter((c) => c.status === "active").length },
      { key: "hidden", label: "Đang ẩn", count: alive.filter((c) => c.status === "hidden").length },
    ];
    $("status-tabs").innerHTML = tabs
      .map((t) => '<button class="tab ' + (state.status === t.key ? "active" : "") + '" data-status="' + t.key + '">' + t.label + '<span class="count">' + t.count + "</span></button>")
      .join("");
  }

  function statusCell(c) {
    const on = c.status === "active";
    return (
      '<label class="switch-wrap"><span class="switch"><input type="checkbox" data-action="toggle" data-id="' + c.id + '"' + (on ? " checked" : "") + '><span class="slider"></span></span>' +
      "<span>" + (on ? "Hiển thị" : "Đang ẩn") + "</span></label>"
    );
  }

  function actionButtons(c) {
    return (
      '<button class="icon-btn" title="Sửa thông tin" data-action="edit" data-id="' + c.id + '"><i class="fa-solid fa-pen"></i></button>' +
      '<button class="icon-btn danger" title="Xóa khóa học" data-action="delete" data-id="' + c.id + '"><i class="fa-solid fa-trash"></i></button>'
    );
  }

  function priceHtml(c) {
    let html = '<div class="price">' + UI.money(c.price) + "</div>";
    if (c.oldPrice > c.price) html += '<div class="price-old">' + UI.money(c.oldPrice) + "</div>";
    return html;
  }

  function tableHtml(items, sold) {
    const rows = items
      .map((c) => {
        return (
          '<tr>' +
          '<td><img class="thumb" src="' + UI.esc(UI.img(c.image)) + '" alt=""></td>' +
          '<td><div class="cell-title">' + UI.esc(c.name) + '</div><div class="cell-sub">' + c.id + "</div></td>" +
          '<td class="num">' + priceHtml(c) + "</td>" +
          '<td class="num">' + (sold[c.id] || 0) + "</td>" +
          "<td>" + statusCell(c) + "</td>" +
          '<td class="actions">' + actionButtons(c) + "</td></tr>"
        );
      })
      .join("");
    return (
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>Ảnh</th><th>Khóa học</th><th class="num">Giá</th><th class="num">Đã bán</th><th>Trạng thái</th><th class="num">Thao tác</th></tr></thead><tbody>' +
      rows + "</tbody></table></div>"
    );
  }

  function cardsHtml(items, sold) {
    return (
      '<div class="course-grid">' +
      items
        .map((c) => {
          return (
            '<div class="course-card">' +
            '<div class="cc-img"><img src="' + UI.esc(UI.img(c.image)) + '" alt=""></div>' +
            '<div class="cc-body"><div class="cc-title">' + UI.esc(c.name) + "</div>" +
            '<div class="cc-meta"><span><i class="fa-solid fa-cart-shopping"></i> ' + (sold[c.id] || 0) + " đã bán</span></div>" +
            "<div>" + priceHtml(c) + "</div></div>" +
            '<div class="cc-foot">' + statusCell(c) + "<div>" + actionButtons(c) + "</div></div></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function render() {
    renderTabs();
    $("view-table").classList.toggle("active", state.view === "table");
    $("view-card").classList.toggle("active", state.view === "card");

    const list = getFiltered();
    const size = state.view === "card" ? 9 : 8;
    const pages = Math.max(1, Math.ceil(list.length / size));
    if (state.page > pages) state.page = pages;
    const items = list.slice((state.page - 1) * size, state.page * size);

    if (list.length === 0) {
      listArea.innerHTML =
        '<div class="empty-state"><i class="fa-regular fa-folder-open"></i><h3>' +
        "Không tìm thấy khóa học" +
        "</h3><p>" + "Hãy thử đổi từ khóa hoặc bộ lọc." + "</p></div>";
    } else {
      const sold = getSoldMap();
      listArea.innerHTML = state.view === "card" ? cardsHtml(items, sold) : tableHtml(items, sold);
    }
    UI.pager($("pager"), list.length, state.page, size, (p) => {
      state.page = p;
      render();
    });
  }

  /* ---------- Form thêm / sửa ---------- */
  /* ---------- Ảnh khóa học: chọn từ thư viện, tải lên + đặt tên, xóa khỏi lựa chọn ---------- */
  function setImage(src) {
    $("f-image").value = src || "";
    $("image-preview").innerHTML = src ? '<img src="' + UI.esc(UI.img(src)) + '" alt="">' : '<i class="fa-regular fa-image"></i>';
    renderGallery();
  }

  // Lưới ảnh: ảnh có sẵn của website + ảnh admin đã tải lên (có nút × để xóa)
  function renderGallery() {
    const current = $("f-image").value;
    const preset = PRESET_IMAGES.map((p) => ({ src: p.file, name: p.label, mine: false }));
    const mine = Store.getImageLibrary().map((i) => ({ src: i.src, name: i.name, mine: true, id: i.id }));
    $("img-gallery").innerHTML = mine
      .concat(preset)
      .map((g) => {
        return (
          '<button type="button" class="gal-item ' + (g.src === current ? "selected" : "") + '" data-src="' + UI.esc(g.src) + '" title="' + UI.esc(g.name) + '">' +
          '<img src="' + UI.esc(UI.img(g.src)) + '" alt="">' +
          (g.mine ? '<span class="gal-tag">Của bạn</span><span class="gal-del" data-del="' + g.id + '" title="Xóa ảnh khỏi lựa chọn">×</span>' : "") +
          '<span class="gal-name">' + UI.esc(g.name) + "</span></button>"
        );
      })
      .join("");
  }

  function resetUpload() {
    pendingImage = "";
    $("up-name").value = "";
    $("up-file").textContent = "Chưa chọn ảnh";
    $("e-upload").textContent = "";
  }

  function updatePriceHint() {
    const v = Number($("f-price").value);
    $("price-hint").textContent = v > 0 ? "= " + UI.money(v) : "";
  }

  /* ---------- Nội dung trang chi tiết (chỉ khóa học tự tạo) ---------- */
  const PERK_ICONS = [
    ["fa-regular fa-clock", "Thời lượng"],
    ["fa-regular fa-calendar", "Lịch học"],
    ["fa-solid fa-code", "Bài tập / thực hành"],
    ["fa-regular fa-circle-question", "Hỗ trợ"],
    ["fa-solid fa-video", "Video"],
    ["fa-solid fa-users", "Lớp học"],
    ["fa-solid fa-medal", "Chứng nhận"],
    ["fa-solid fa-infinity", "Truy cập trọn đời"],
  ];
  const DEFAULT_PERKS = [
    { icon: "fa-regular fa-clock", text: "Thời lượng 15 buổi (3 tháng)" },
    { icon: "fa-regular fa-calendar", text: "2-3 buổi/tuần (2.5 tiếng/buổi)" },
    { icon: "fa-solid fa-code", text: "20 bài tập thực hành" },
    { icon: "fa-regular fa-circle-question", text: "Hỗ trợ riêng 1-1" },
  ];
  // Link YouTube (watch / youtu.be / embed) -> link nhúng; không phải YouTube thì trả "" (giống course-detail-render.js)
  function youtubeEmbed(url) {
    const m = String(url || "").trim().match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
    return m ? "https://www.youtube.com/embed/" + m[1] : "";
  }
  function youtubeId(url) {
    const m = youtubeEmbed(url).match(/embed\/([\w-]{11})/);
    return m ? m[1] : "";
  }

  // Nạp YouTube IFrame API 1 lần (không cần API key, cần có mạng)
  let ytApi = null;
  function loadYouTubeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (ytApi) return ytApi;
    ytApi = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        resolve();
      };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.onerror = () => {
        ytApi = null;
        reject(new Error("api"));
      };
      document.head.appendChild(tag);
      setTimeout(() => {
        if (!(window.YT && window.YT.Player)) {
          ytApi = null;
          reject(new Error("timeout"));
        }
      }, 10000);
    });
    return ytApi;
  }

  function formatDuration(sec) {
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const ss = String(sec % 60).padStart(2, "0");
    return h > 0 ? h + ":" + String(m).padStart(2, "0") + ":" + ss : String(m).padStart(2, "0") + ":" + ss;
  }

  // Tạo 1 player ẩn, đọc độ dài video rồi hủy. Trả về "mm:ss" hoặc ném lỗi
  function fetchYouTubeDuration(videoId) {
    return loadYouTubeApi().then(
      () =>
        new Promise((resolve, reject) => {
          const holder = document.createElement("div");
          holder.style.cssText = "position:fixed;left:-9999px;top:0;width:200px;height:120px";
          const target = document.createElement("div");
          holder.appendChild(target);
          document.body.appendChild(holder);
          let player;
          let timer;
          const finish = (err, value) => {
            clearInterval(timer);
            clearTimeout(killer);
            try {
              player && player.destroy();
            } catch (e) {}
            holder.remove();
            if (err) reject(err);
            else resolve(value);
          };
          const killer = setTimeout(() => finish(new Error("timeout")), 12000);
          player = new YT.Player(target, {
            videoId: videoId,
            playerVars: { controls: 0, playsinline: 1 },
            events: {
              onReady: (e) => {
                // getDuration có thể trả 0 lúc mới sẵn sàng: phát tắt tiếng để tải thông tin rồi hỏi lại
                e.target.mute();
                e.target.playVideo();
                timer = setInterval(() => {
                  const d = e.target.getDuration();
                  if (d > 0) finish(null, formatDuration(d));
                }, 300);
              },
              onError: () => finish(new Error("embed")),
            },
          });
        })
    );
  }

  const lines = (text) => String(text || "").split("\n").map((t) => t.trim()).filter(Boolean);
  const monthNow = () => String(new Date().getMonth() + 1).padStart(2, "0") + "/" + new Date().getFullYear();

  function chapterRow(ch) {
    const div = document.createElement("div");
    div.className = "repeat-item chapter-row";
    div.innerHTML =
      '<div class="repeat-head"><input type="text" class="ch-title" maxlength="120" placeholder="Tiêu đề chương (VD: Khái niệm nền tảng)">' +
      '<button type="button" class="icon-btn danger" title="Xóa chương" data-remove><i class="fa-solid fa-trash"></i></button></div>' +
      '<div class="repeat-head"><input type="text" class="ch-video" maxlength="200" placeholder="Link video học thử YouTube (không bắt buộc)">' +
      '<input type="text" class="ch-time" maxlength="8" style="flex:0 0 110px" placeholder="Thời lượng 05:30">' +
      '</div>' +
      '<div class="ch-msg" aria-live="polite"></div>' +
      '<label class="check-line ch-free-line"><input type="checkbox" class="ch-free"> Cho xem thử miễn phí</label>' +
      '<textarea class="ch-lessons" placeholder="Mỗi dòng 1 nội dung, VD:&#10;React là gì: Khái niệm và lợi ích khi sử dụng.&#10;Virtual DOM: Cách Virtual DOM tăng hiệu suất."></textarea>';
    div.querySelector(".ch-title").value = (ch && ch.title) || "";
    div.querySelector(".ch-video").value = (ch && ch.trialVideo) || "";
    div.querySelector(".ch-time").value = (ch && ch.trialTime) || "";
    div.querySelector(".ch-lessons").value = ch && ch.lessons ? ch.lessons.join("\n") : "";
    div.querySelector(".ch-free").checked = ch && ch.trialFree !== undefined ? !!ch.trialFree : true; // chương mới: mặc định cho xem thử
    return div;
  }

  function perkRow(perk) {
    const div = document.createElement("div");
    div.className = "repeat-item perk-row";
    const opts = PERK_ICONS.map((i) => '<option value="' + i[0] + '">' + i[1] + "</option>").join("");
    div.innerHTML =
      '<div class="repeat-head"><select class="pk-icon">' + opts + "</select>" +
      '<input type="text" class="pk-text" maxlength="100" placeholder="VD: Thời lượng 15 buổi (3 tháng)">' +
      '<button type="button" class="icon-btn danger" title="Xóa dòng" data-remove><i class="fa-solid fa-trash"></i></button></div>';
    div.querySelector(".pk-icon").value = (perk && perk.icon) || PERK_ICONS[0][0];
    div.querySelector(".pk-text").value = (perk && perk.text) || "";
    return div;
  }

  // Danh sách khóa học để chọn làm "khóa học liên quan" (không tính chính khóa đang sửa)
  function renderRelatedPick(selected) {
    const list = Store.getCourses(false).filter((c) => c.id !== editingId);
    $("related-list").innerHTML = list.length
      ? list
          .map((c) => {
            return (
              '<label class="pick-item"><input type="checkbox" value="' + UI.esc(c.id) + '"' + (selected.includes(c.id) ? " checked" : "") + ">" +
              '<span class="pick-name"><div class="cell-title">' + UI.esc(c.name) + '</div><div class="cell-sub">' + UI.esc(c.id) + "</div></span></label>"
            );
          })
          .join("")
      : '<div class="text-muted" style="padding:10px 12px">Chưa có khóa học nào để chọn.</div>';
  }

  function setContentMode(mode) {
    $("f-contentMode").value = mode;
    $("mode-collapse").hidden = mode !== "collapse";
    $("mode-related").hidden = mode !== "related";
  }

  function fillDetail(d) {
    d = d || {};
    $("f-updatedAt").value = d.updatedAt || monthNow();
    $("f-students").value = d.students || 0;
    $("f-introTitle").value = d.introTitle || "";
    $("f-introText").value = d.introText || "";
    $("f-videoUrl").value = d.videoUrl || "";
    $("f-learn").value = (d.learn || []).join("\n");
    $("f-audience").value = (d.audience || []).join("\n");
    $("f-policies").checked = d.policies !== false;

    $("chapter-list").innerHTML = "";
    const oldFree = d.freeTrial === 1 ? 1 : 2; // dữ liệu cũ chưa có cờ riêng từng chương: n chương đầu là miễn phí
    (d.chapters && d.chapters.length ? d.chapters : [{}]).forEach((ch, i) => {
      if (d.chapters && d.chapters.length && ch.trialFree === undefined) ch = Object.assign({}, ch, { trialFree: i < oldFree });
      $("chapter-list").appendChild(chapterRow(ch));
    });
    $("perk-list").innerHTML = "";
    (d.perks && d.perks.length ? d.perks : DEFAULT_PERKS).forEach((pk) => $("perk-list").appendChild(perkRow(pk)));
    renderRelatedPick(d.related || []);
    setContentMode(d.contentMode === "related" ? "related" : "collapse");
    $("e-videoUrl").textContent = "";
    $("e-content").textContent = "";
  }

  // Gom dữ liệu các ô nhập thành object detail; trả về { detail, errors }
  function collectDetail() {
    const errors = {};
    const mode = $("f-contentMode").value;
    const chapters = Array.from($("chapter-list").querySelectorAll(".chapter-row"))
      .map((row) => ({
        title: row.querySelector(".ch-title").value.trim(),
        trialVideo: row.querySelector(".ch-video").value.trim(),
        trialTime: row.querySelector(".ch-time").value.trim(),
        trialFree: row.querySelector(".ch-free").checked,
        lessons: lines(row.querySelector(".ch-lessons").value),
      }))
      .filter((ch) => ch.title || ch.lessons.length || ch.trialVideo);
    const related = Array.from($("related-list").querySelectorAll("input:checked")).map((i) => i.value);
    const perks = Array.from($("perk-list").querySelectorAll(".perk-row"))
      .map((row) => ({ icon: row.querySelector(".pk-icon").value, text: row.querySelector(".pk-text").value.trim() }))
      .filter((pk) => pk.text);
    const video = $("f-videoUrl").value.trim();

    // Link học thử sai: báo ngay cạnh ô nhập của chương đó
    Array.from($("chapter-list").querySelectorAll(".chapter-row")).forEach((row) => {
      const v = row.querySelector(".ch-video").value.trim();
      if (v && !youtubeId(v)) setChMsg(row, "err", BAD_LINK_MSG);
    });
    if (video && !youtubeEmbed(video)) errors.videoUrl = "Chỉ hỗ trợ link YouTube (youtube.com hoặc youtu.be).";
    if (mode === "collapse" && chapters.some((ch) => !ch.title)) errors.content = "Mỗi chương cần có tiêu đề.";
    else if (mode === "collapse" && chapters.some((ch) => ch.trialVideo && !youtubeEmbed(ch.trialVideo))) errors.content = "Link video học thử chỉ hỗ trợ YouTube (youtube.com hoặc youtu.be).";
    else if (mode === "collapse" && chapters.some((ch) => ch.trialTime && !/^\d{1,2}(:\d{2}){1,2}$/.test(ch.trialTime))) errors.content = "Thời lượng video viết dạng 05:30 hoặc 1:05:30.";

    return {
      errors: errors,
      detail: {
        updatedAt: $("f-updatedAt").value.trim() || monthNow(),
        students: Math.max(0, Number($("f-students").value) || 0),
        introTitle: $("f-introTitle").value.trim(),
        introText: $("f-introText").value.trim(),
        videoUrl: video,
        learn: lines($("f-learn").value),
        contentMode: mode,
        chapters: chapters,
        related: related,
        audience: lines($("f-audience").value),
        policies: $("f-policies").checked,
        perks: perks,
      },
    };
  }

  /* ---------- Khóa học có sẵn trong HTML: đọc nội dung trang để điền sẵn vào form ---------- */
  function parseStaticDetail(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const txt = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
    const all = (sel, root) => Array.from((root || doc).querySelectorAll(sel));
    const d = { contentMode: "collapse", chapters: [], related: [], policies: true };

    const meta = all(".section-one .course-element li");
    const val = (li) => (li ? txt(li.querySelectorAll("span")[1]) : "");
    d.updatedAt = val(meta[0]);
    d.students = Number(val(meta[1]).replace(/\D/g, "")) || 0;

    const i1 = doc.querySelector(".content-child.item-1");
    if (i1) {
      d.introTitle = txt(i1.querySelector("h2"));
      d.introText = txt(i1.querySelector("p"));
      const f = i1.querySelector("iframe");
      const m = f && (f.getAttribute("src") || "").match(/embed\/([\w-]{11})/);
      d.videoUrl = m ? "https://www.youtube.com/watch?v=" + m[1] : "";
    }
    d.learn = all(".content-child.item-2 .lesson-content li").map(txt).filter(Boolean);

    const cards = all(".content-child.item-3 .accordion .card");
    if (cards.length) {
      d.chapters = cards.map((card) => {
        const spans = card.querySelectorAll(".card-header button span");
        const lessons = [];
        all(".card-body > ul > li", card).forEach((li) => {
          const nested = li.querySelector("ul");
          if (!nested) return lessons.push(txt(li));
          const clone = li.cloneNode(true);
          clone.querySelector("ul").remove();
          lessons.push(txt(clone));
          all("li", nested).forEach((n) => lessons.push(txt(n)));
        });
        return { title: txt(spans[spans.length - 1]), trialVideo: "", trialTime: "", lessons: lessons.filter(Boolean) };
      });
    } else {
      // Dạng combo: các khối khóa học liên quan -> khớp với khóa học trong Store theo tên file
      const ids = [];
      all(".content-child.item-3 .inner-box a[href]").forEach((a) => {
        const file = (a.getAttribute("href") || "").split("/").pop().toLowerCase();
        const c = Store.getCourses(false).find((x) => x.href && x.href.split("/").pop().toLowerCase() === file);
        if (c && !ids.includes(c.id)) ids.push(c.id);
      });
      if (ids.length) {
        d.contentMode = "related";
        d.related = ids;
      }
    }
    d.audience = all(".content-child.item-4 li").map(txt).filter(Boolean);
    d.perks = all(".side-bar-sticky .desc li").map((li) => ({
      icon: (li.querySelector("i") && li.querySelector("i").getAttribute("class")) || PERK_ICONS[0][0],
      text: txt(li),
    }));
    return d;
  }

  async function loadStaticDetail(c) {
    try {
      const url = new URL(c.href, SiteSync.rootUrl());
      const res = await fetch(url.href, { cache: "no-store" });
      if (!res.ok) return null;
      return parseStaticDetail(await res.text());
    } catch (e) {
      console.error("Không đọc được nội dung trang khóa học:", e);
      return null; // mở bằng file:// hoặc lỗi mạng / lỗi phân tích
    }
  }

  // Mở form: id = null -> thêm mới; id có giá trị -> sửa
  function openForm(id) {
    const c = id ? Store.getCourse(id) : null;
    if (id && !c) return;
    editingId = id || null;
    $("btn-save").disabled = false;
    UI.clearErrors(FIELDS);
    resetUpload();
    if (c) {
      $("course-modal-title").textContent = "Sửa khóa học " + c.id;
      $("f-name").value = c.name;
      $("f-price").value = c.price;
      $("f-oldPrice").value = c.oldPrice ? c.oldPrice : "";
      $("f-description").value = c.description;
      $("f-status").value = c.status;
      setImage(c.image);
    } else {
      $("course-modal-title").textContent = "Thêm khóa học mới";
      $("f-name").value = "";
      $("f-price").value = "";
      $("f-oldPrice").value = "";
      $("f-description").value = "";
      $("f-status").value = "active";
      setImage("");
    }
    // Nội dung chi tiết: hiện cho mọi khóa học. Khóa có sẵn trong HTML thì đọc nội dung từ trang để điền sẵn
    $("detail-fields").hidden = false;
    $("policy-row").hidden = !!(c && !c.custom); // khóa có sẵn giữ nguyên các mục chính sách trong HTML
    $("detail-status").textContent = "";
    detailSnap = "";
    if (!c || c.custom) {
      fillDetail(c ? c.detail : null);
      detailSnap = JSON.stringify(collectDetail().detail);
    } else if (c.detailOverride && c.detail) {
      fillDetail(c.detail); // lần trước admin đã sửa: dùng lại bản đã sửa
      detailSnap = JSON.stringify(collectDetail().detail);
    } else {
      // Đọc nội dung trang HTML; trong lúc đọc tạm khóa nút Lưu để không ghi đè nhầm
      fillDetail(null);
      $("btn-save").disabled = true;
      $("detail-status").textContent = "Đang đọc nội dung trang khóa học...";
      const openedId = id;
      loadStaticDetail(c).catch(() => null).then((d) => {
        if (editingId !== openedId) return; // đã đóng / mở khóa khác
        $("btn-save").disabled = false;
        if (d) {
          fillDetail(d);
          $("detail-status").textContent = "";
        } else {
          $("detail-status").textContent = "Không đọc được nội dung trang (cần mở website bằng Live Server). Các ô bên dưới đang trống.";
        }
        detailSnap = JSON.stringify(collectDetail().detail);
      });
    }
    updatePriceHint();
    UI.openModal("course-modal");
    $("course-modal").scrollTop = 0;
    $("f-name").focus();
  }

  function saveForm() {
    const data = {
      name: $("f-name").value,
      price: Number($("f-price").value) || 0,
      oldPrice: Number($("f-oldPrice").value) || 0,
      image: $("f-image").value,
      description: $("f-description").value,
      status: $("f-status").value,
    };
    const errors = Store.validateCourse(data, editingId);
    UI.showErrors(errors, FIELDS);

    const editing = editingId ? Store.getCourse(editingId) : null;
    const extra = collectDetail();
    $("e-videoUrl").textContent = extra.errors.videoUrl || "";
    $("e-content").textContent = extra.errors.content || "";
    // Khóa có sẵn trong HTML: chỉ ghi đè nội dung trang khi admin THỰC SỰ sửa (giữ nguyên trang gốc nếu không đổi)
    if (!editing || editing.custom) data.detail = extra.detail;
    else if (editing.detailOverride || JSON.stringify(extra.detail) !== detailSnap) {
      data.detail = extra.detail;
      data.detailOverride = true;
    }
    if (Object.keys(errors).length > 0 || Object.keys(extra.errors).length > 0) {
      // Form dài: cuộn tới thông báo lỗi đầu tiên để người dùng thấy ngay lý do chưa lưu được
      const firstErr = Array.from($("course-modal").querySelectorAll(".error-text")).find((el) => el.textContent.trim());
      if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
      UI.toast("Chưa lưu được: " + (firstErr ? firstErr.textContent.trim() : "vui lòng kiểm tra lại các ô báo lỗi."), "error");
      return;
    }

    if (editing) {
      if (!Store.updateCourse(editingId, data)) {
        UI.toast("Không lưu được: bộ nhớ trình duyệt đã đầy. Hãy chọn ảnh nhỏ hơn.", "error");
        return;
      }
      UI.toast("Đã cập nhật khóa học. Trang chính sẽ hiển thị thông tin mới.");
    } else {
      const item = Store.addCourse(data);
      if (!item) {
        UI.toast("Không lưu được: bộ nhớ trình duyệt đã đầy. Hãy chọn ảnh nhỏ hơn.", "error");
        return;
      }
      state.status = "all";
      state.search = "";
      $("search").value = "";
      state.page = 1;
      UI.toast("Đã thêm khóa học " + item.id + ". Khóa học đã hiển thị ở trang Khóa học.");
    }
    UI.closeModal("course-modal");
    render();
  }

  /* ---------- Xóa khóa học (xóa mềm: giữ dữ liệu để đơn hàng cũ vẫn hiển thị đúng) ---------- */
  async function deleteCourse(id) {
    const c = Store.getCourse(id);
    if (!c || c.deleted) return;
    const sold = getSoldMap()[id] || 0;
    const yes = await UI.confirm({
      title: "Xóa khóa học " + c.id + "?",
      message:
        "Khóa học <b>" + UI.esc(c.name) + "</b> sẽ bị gỡ khỏi trang chủ, trang Khóa học và không thể mua nữa." +
        (sold > 0 ? "<br><br>Khóa này đã có <b>" + sold + " đơn hoàn thành</b>: lịch sử đơn hàng và học viên đã mua vẫn được giữ nguyên." : "") +
        (c.custom ? "" : "<br><br><i>Lưu ý: đây là khóa có sẵn trong file HTML, file trang vẫn còn trong dự án nhưng sẽ hiện thông báo tạm ngừng đăng ký.</i>"),
      okText: "Xóa khóa học",
      danger: true,
    });
    if (!yes) return;
    if (!Store.deleteCourse(id)) return UI.toast("Không xóa được khóa học.", "error");
    UI.toast("Đã xóa khóa học " + c.id + ".");
    render();
  }

  /* ---------- Sự kiện ---------- */
  $("btn-save").addEventListener("click", saveForm);
  $("btn-add").addEventListener("click", () => openForm(null));
  $("f-contentMode").addEventListener("change", (e) => setContentMode(e.target.value));
  $("btn-add-chapter").addEventListener("click", () => $("chapter-list").appendChild(chapterRow()));
  $("btn-add-perk").addEventListener("click", () => $("perk-list").appendChild(perkRow()));
  const BAD_LINK_MSG = "Link không hợp lệ. Chỉ nhận link YouTube dạng youtube.com/watch?v=... hoặc youtu.be/...";

  function setChMsg(row, type, text) {
    const el = row.querySelector(".ch-msg");
    el.className = "ch-msg" + (type ? " " + type : "");
    el.textContent = text || "";
  }

  // Kiểm tra link ở 1 chương: sai -> báo cạnh ô; đúng -> tự điền thời lượng (ghi đè giá trị cũ)
  async function checkChapterVideo(row) {
    const link = row.querySelector(".ch-video").value.trim();
    const timeBox = row.querySelector(".ch-time");
    const token = (row._videoToken = (row._videoToken || 0) + 1); // bỏ qua kết quả cũ nếu link đã đổi
    if (!link) {
      setChMsg(row, "", "");
      timeBox.value = "";
      return;
    }
    const id = youtubeId(link);
    if (!id) {
      setChMsg(row, "err", BAD_LINK_MSG);
      timeBox.value = "";
      return;
    }
    setChMsg(row, "wait", "Đang lấy thời lượng video...");
    try {
      const dur = await fetchYouTubeDuration(id);
      if (token !== row._videoToken) return;
      timeBox.value = dur;
      setChMsg(row, "ok", "✓ Đã tự điền thời lượng " + dur);
    } catch (e) {
      if (token !== row._videoToken) return;
      setChMsg(row, "err", "Không lấy được thời lượng tự động (video riêng tư, chặn nhúng hoặc chưa có mạng). Hãy nhập tay vào ô thời lượng.");
    }
  }

  // Gõ / dán link: chờ ngừng gõ ~0,6 giây rồi kiểm tra + tự điền thời lượng
  $("chapter-list").addEventListener("input", (e) => {
    if (!e.target.classList.contains("ch-video")) return;
    const row = e.target.closest(".chapter-row");
    clearTimeout(row._videoTimer);
    row._videoTimer = setTimeout(() => checkChapterVideo(row), 600);
  });

  // Nút xóa dòng trong các danh sách chương / dòng hộp bên phải
  [$("chapter-list"), $("perk-list")].forEach((box) =>
    box.addEventListener("click", (e) => {
      const rm = e.target.closest("[data-remove]");
      if (rm) rm.closest(".repeat-item").remove();
    })
  );
  $("f-price").addEventListener("input", updatePriceHint);

  // Bấm 1 ảnh trong lưới = chọn ảnh đó; bấm × = xóa ảnh (chỉ ảnh bạn đã tải lên) khỏi lựa chọn
  $("img-gallery").addEventListener("click", async (e) => {
    const del = e.target.closest("[data-del]");
    if (del) {
      e.stopPropagation();
      const img = Store.getImageLibrary().find((i) => i.id === del.dataset.del);
      if (!img) return;
      const yes = await UI.confirm({
        title: "Xóa ảnh khỏi lựa chọn?",
        message: 'Ảnh <b>' + UI.esc(img.name) + "</b> sẽ không còn trong danh sách chọn. Khóa học đang dùng ảnh này vẫn giữ nguyên ảnh của nó.",
        okText: "Xóa ảnh",
        danger: true,
      });
      if (!yes) return;
      Store.deleteLibraryImage(img.id);
      if ($("f-image").value === img.src) setImage(""); // đang chọn ảnh vừa xóa thì bỏ chọn
      else renderGallery();
      UI.toast("Đã xóa ảnh khỏi lựa chọn.", "info");
      return;
    }
    const item = e.target.closest("[data-src]");
    if (item) setImage(item.dataset.src);
  });

  // Tải ảnh từ máy -> đặt tên -> "Lưu vào lựa chọn"
  $("btn-upload").addEventListener("click", () => $("file-input").click());
  $("file-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      $("e-upload").textContent = "Vui lòng chọn tệp ảnh.";
      return;
    }
    UI.resizeImage(file, 640, (dataUrl) => {
      if (!dataUrl) {
        $("e-upload").textContent = "Không đọc được tệp ảnh này.";
        return;
      }
      pendingImage = dataUrl;
      $("e-upload").textContent = "";
      $("up-file").textContent = file.name;
      $("image-preview").innerHTML = '<img src="' + UI.esc(dataUrl) + '" alt="">'; // xem trước
      if (!$("up-name").value) $("up-name").value = file.name.replace(/\.[^.]+$/, "").slice(0, 40);
    });
  });
  $("btn-save-image").addEventListener("click", () => {
    const res = Store.addLibraryImage($("up-name").value, pendingImage);
    if (!res.ok) {
      $("e-upload").textContent = res.error;
      return;
    }
    resetUpload();
    setImage(res.image.src); // lưu xong tự chọn luôn ảnh này
    UI.toast("Đã lưu ảnh \"" + res.image.name + "\" vào lựa chọn.");
  });

  $("search").addEventListener(
    "input",
    UI.debounce((e) => {
      state.search = e.target.value;
      state.page = 1;
      render();
    }, 200)
  );
  $("status-tabs").addEventListener("click", (e) => {
    const tab = e.target.closest("[data-status]");
    if (!tab) return;
    state.status = tab.dataset.status;
    state.page = 1;
    render();
  });
  [["view-table", "table"], ["view-card", "card"]].forEach(([id, view]) => {
    $(id).addEventListener("click", () => {
      state.view = view;
      state.page = 1;
      localStorage.setItem(VIEW_KEY, view);
      render();
    });
  });

  // Các nút trong bảng / thẻ (dùng 1 listener cho cả vùng - "event delegation")
  listArea.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;

    if (btn.dataset.action === "edit") openForm(id);
    if (btn.dataset.action === "delete") deleteCourse(id);
  });

  listArea.addEventListener("change", (e) => {
    if (e.target.dataset.action !== "toggle") return;
    const status = e.target.checked ? "active" : "hidden";
    Store.setCourseStatus(e.target.dataset.id, status);
    UI.toast(status === "active" ? "Khóa học đã hiển thị trên website." : "Khóa học đã được ẩn khỏi các trang chính.");
    render();
  });

  render();

  // Đọc lại file HTML của website: khối khóa học thêm / sửa / xóa trong HTML thì danh sách ở đây tự cập nhật
  SiteSync.run().then((r) => {
    if (!r.changed) return;
    render();
    UI.toast(SiteSync.describe(r), "info");
  });
}

initCoursePage();
