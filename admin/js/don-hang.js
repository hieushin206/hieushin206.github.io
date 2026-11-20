/* =========================================================
   don-hang.js - Trang "Đơn hàng"
   Chức năng: danh sách + lọc (trạng thái, ngày, từ khóa), xem chi tiết, hủy đơn.
   - Khách mua khóa học là thanh toán thành công ngay: đơn tự động "Hoàn thành"
     (không còn trạng thái "Chờ xác nhận", không tạo đơn thủ công ở đây).
   Đơn hàng lưu SNAPSHOT tại thời điểm mua nên sửa/xóa khóa học
   hay đổi tên học viên về sau không làm sai lịch sử.
   ========================================================= */
function initOrderPage() {
  const $ = (id) => document.getElementById(id);
  const state = { status: "all", search: "", from: "", to: "", page: 1 };
  const PAGE_SIZE = 10;

  // Mở sẵn theo trạng thái: don-hang.html?status=completed
  const qs = new URLSearchParams(location.search).get("status");
  if (qs && ORDER_STATUS[qs]) state.status = qs;

  // Chuỗi ISO -> "YYYY-MM-DD" theo giờ địa phương (để so sánh với ô chọn ngày)
  function dayOf(iso) {
    const d = new Date(iso);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* ---------- Danh sách ---------- */
  function getFiltered() {
    let list = Store.get("orders");
    if (state.status !== "all") list = list.filter((o) => o.status === state.status);
    const kw = UI.normalize(state.search);
    if (kw) {
      list = list.filter((o) => {
        const text = o.id + " " + o.studentName + " " + o.studentEmail + " " + o.items.map((i) => i.name).join(" ");
        return UI.normalize(text).includes(kw);
      });
    }
    if (state.from) list = list.filter((o) => dayOf(o.createdAt) >= state.from);
    if (state.to) list = list.filter((o) => dayOf(o.createdAt) <= state.to);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function renderTabs() {
    const all = Store.get("orders");
    const tabs = [{ key: "all", label: "Tất cả", count: all.length }]
      .concat(Object.keys(ORDER_STATUS).map((k) => ({ key: k, label: ORDER_STATUS[k], count: all.filter((o) => o.status === k).length })));
    $("status-tabs").innerHTML = tabs
      .map((t) => '<button class="tab ' + (state.status === t.key ? "active" : "") + '" data-status="' + t.key + '">' + t.label + '<span class="count">' + t.count + "</span></button>")
      .join("");
  }

  function render() {
    renderTabs();
    const list = getFiltered();
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (state.page > pages) state.page = pages;
    const items = list.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

    if (list.length === 0) {
      $("list-area").innerHTML = '<div class="empty-state"><i class="fa-solid fa-receipt"></i><h3>Không có đơn hàng phù hợp</h3><p>Hãy thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p></div>';
    } else {
      $("list-area").innerHTML =
        '<div class="table-wrap"><table class="data-table"><thead><tr><th>Mã đơn</th><th>Học viên</th><th>Khóa học</th><th>Ngày đặt</th><th class="num">Tổng tiền</th><th>Thanh toán</th><th>Trạng thái</th><th class="num">Chi tiết</th></tr></thead><tbody>' +
        items
          .map((o) => {
            const first = UI.esc(o.items[0].name);
            const more = o.items.length > 1 ? '<div class="cell-sub">+ ' + (o.items.length - 1) + " khóa học khác</div>" : "";
            const promo = o.promoCode ? '<div class="cell-sub text-discount"><i class="fa-solid fa-ticket"></i> ' + UI.esc(o.promoCode) + "</div>" : "";
            return (
              '<tr><td><b>' + o.id + "</b></td>" +
              '<td><div class="cell-title">' + UI.esc(o.studentName) + '</div><div class="cell-sub">' + o.studentId + "</div></td>" +
              '<td style="max-width: 240px"><div>' + first + "</div>" + more + "</td>" +
              "<td>" + UI.date(o.createdAt) + '<div class="cell-sub">' + UI.time(o.createdAt) + "</div></td>" +
              '<td class="num"><div class="price">' + UI.money(o.total) + "</div>" + promo + "</td>" +
              '<td class="cell-sub" style="color:inherit">' + UI.esc(o.payment) + "</td>" +
              "<td>" + UI.orderBadge(o.status) + "</td>" +
              '<td class="actions"><button class="btn btn-outline btn-sm" data-detail="' + o.id + '"><i class="fa-regular fa-eye"></i> Xem</button></td></tr>'
            );
          })
          .join("") +
        "</tbody></table></div>";
    }
    UI.pager($("pager"), list.length, state.page, PAGE_SIZE, (p) => {
      state.page = p;
      render();
    });
  }

  /* ---------- Chi tiết đơn hàng ---------- */
  function openDetail(id) {
    const o = Store.getOrder(id);
    if (!o) return;
    $("detail-title").innerHTML = "Đơn hàng " + o.id + " " + UI.orderBadge(o.status);

    const student = Store.getStudent(o.studentId);
    const itemsHtml = o.items
      .map((it, i) => {
        return (
          "<tr><td>" + (i + 1) + "</td><td><b>" + UI.esc(it.name) + "</b></td>" +
          '<td class="num">' + UI.money(it.price) + "</td></tr>"
        );
      })
      .join("");

    const historyHtml = o.history
      .map((h) => '<li class="t-' + h.status + '"><b>' + ORDER_STATUS[h.status] + '</b><div class="t-time">' + UI.dateTime(h.at) + "</div></li>")
      .join("");

    const canCancel = Store.allowedNextStatuses(o.status).includes("cancelled");
    const updateHtml = canCancel
      ? '<div class="status-update"><span class="label">Thao tác:</span><button class="btn btn-outline btn-sm" style="color:var(--color-seven)" id="btn-cancel-order" data-id="' + o.id + '"><i class="fa-solid fa-ban"></i> Hủy đơn hàng</button></div>'
      : '<div class="note" style="margin-top: 18px"><i class="fa-solid fa-lock"></i><span>Đơn hàng đã hủy là trạng thái cuối, không thể thay đổi.</span></div>';

    $("detail-body").innerHTML =
      '<div class="info-grid">' +
      '<div class="info-box"><h4>Học viên</h4>' +
      '<div class="info-line"><span>Họ tên</span><span>' + UI.esc(o.studentName) + "</span></div>" +
      '<div class="info-line"><span>Mã học viên</span><span>' + o.studentId + "</span></div>" +
      '<div class="info-line"><span>Email</span><span>' + UI.esc(o.studentEmail) + "</span></div>" +
      (student && student.status === "disabled" ? '<div class="info-line"><span>Tài khoản</span><span style="color:#e03131">Đã vô hiệu hóa</span></div>' : "") +
      "</div>" +
      '<div class="info-box"><h4>Thông tin đơn hàng</h4>' +
      '<div class="info-line"><span>Ngày đặt</span><span>' + UI.dateTime(o.createdAt) + "</span></div>" +
      '<div class="info-line"><span>Thanh toán</span><span>' + UI.esc(o.payment) + "</span></div>" +
      '<div class="info-line"><span>Mã khuyến mãi</span><span>' + (o.promoCode ? UI.esc(o.promoCode) : "Không dùng") + "</span></div>" +
      "</div></div>" +
      '<h4 class="section-title">Khóa học đã mua</h4>' +
      '<table class="mini-table"><thead><tr><th style="width:36px">#</th><th>Khóa học</th><th class="num">Giá lúc mua</th></tr></thead><tbody>' + itemsHtml + "</tbody></table>" +
      '<div class="total-box">' +
      '<div class="info-line"><span>Tạm tính</span><span>' + UI.money(o.subtotal) + "</span></div>" +
      '<div class="info-line"><span>Giảm giá' + (o.promoCode ? " (" + UI.esc(o.promoCode) + ")" : "") + '</span><span class="text-discount">- ' + UI.money(o.discount) + "</span></div>" +
      '<div class="info-line grand"><span style="color:inherit;font-weight:700">Tổng thanh toán</span><span>' + UI.money(o.total) + "</span></div></div>" +
      '<h4 class="section-title">Lịch sử trạng thái</h4><ul class="timeline">' + historyHtml + "</ul>" +
      updateHtml;

    UI.openModal("detail-modal");
  }

  $("detail-body").addEventListener("click", async (e) => {
    // --- Hủy đơn hàng ---
    const cancel = e.target.closest("#btn-cancel-order");
    if (!cancel) return;
    const id = cancel.dataset.id;
    const yes = await UI.confirm({
      title: "Hủy đơn hàng " + id + "?",
      message: "Đơn hàng sẽ chuyển sang <b>Đã hủy</b>, không còn được tính vào doanh thu và <b>không thể hoàn tác</b>.",
      okText: "Hủy đơn hàng",
      danger: true,
    });
    if (!yes) return;
    const res = Store.updateOrderStatus(id, "cancelled");
    if (!res.ok) return UI.toast(res.error, "error");
    UI.toast("Đã hủy đơn " + id + ".");
    openDetail(id);
    render();
  });

  /* ---------- Sự kiện bộ lọc ---------- */
  $("status-tabs").addEventListener("click", (e) => {
    const tab = e.target.closest("[data-status]");
    if (!tab) return;
    state.status = tab.dataset.status;
    state.page = 1;
    render();
  });
  $("search").addEventListener(
    "input",
    UI.debounce((e) => {
      state.search = e.target.value;
      state.page = 1;
      render();
    }, 200)
  );
  // Lọc theo ngày: ngày kết thúc không được nhỏ hơn ngày bắt đầu (chặn ở ô chọn ngày, gõ tay sai thì báo lỗi + tự sửa)
  const dateRange = linkDateRange(
    $("date-from"),
    $("date-to"),
    (msg) => {
      $("e-range").textContent = msg;
    },
    () => {
      state.from = $("date-from").value;
      state.to = $("date-to").value;
      state.page = 1;
      render();
    },
  );
  $("btn-clear").addEventListener("click", () => {
    state.status = "all";
    state.search = state.from = state.to = "";
    state.page = 1;
    $("search").value = $("date-from").value = $("date-to").value = "";
    $("e-range").textContent = "";
    dateRange.sync();
    render();
  });
  $("list-area").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-detail]");
    if (btn) openDetail(btn.dataset.detail);
  });

  render();
}

initOrderPage();
