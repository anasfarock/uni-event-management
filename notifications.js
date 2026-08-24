/* ============================================================
   Notifications UI — a small bell + dropdown panel, shared by
   admin.html, organizer.html, and student.html. Each page keeps
   its own refresh function that pulls the right audience list
   from DB and calls renderNotifPanel().
   ============================================================ */

const NOTIF_ICONS = {
  registration: "✅",
  approval: "✔️",
  rejection: "✖️",
  approval_needed: "🕓",
  cancellation: "⚠️",
  reminder: "⏰",
  certificate: "🎓",
};

function notifTimeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function toggleNotifPanel() {
  document.getElementById("notifPanel").classList.toggle("open");
}

function renderNotifPanel(notifications, onMarkAllRead) {
  const unread = notifications.filter((n) => !n.read).length;
  const badge = document.getElementById("notifBadge");
  badge.textContent = unread > 9 ? "9+" : String(unread);
  badge.style.display = unread > 0 ? "flex" : "none";

  const panel = document.getElementById("notifPanel");
  if (notifications.length === 0) {
    panel.innerHTML = `<div class="notif-empty">No notifications yet.</div>`;
    return;
  }

  panel.innerHTML = `
    <div class="notif-panel-head">
      <span>Notifications</span>
      <button class="notif-markread" id="notifMarkAllBtn">Mark all read</button>
    </div>
    <div class="notif-list">
      ${notifications.slice(0, 25).map((n) => `
        <div class="notif-item ${n.read ? "" : "unread"}">
          <span class="notif-icon">${NOTIF_ICONS[n.type] || "🔔"}</span>
          <div class="notif-body">
            <div class="notif-msg">${escapeHtml(n.message)}</div>
            <div class="notif-time">${notifTimeAgo(n.createdAt)}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
  document.getElementById("notifMarkAllBtn").onclick = onMarkAllRead;
}

// Close the panel when clicking outside it.
document.addEventListener("click", (e) => {
  const panel = document.getElementById("notifPanel");
  const bellWrap = document.getElementById("notifBellWrap");
  if (!panel || !bellWrap) return;
  if (panel.classList.contains("open") && !bellWrap.contains(e.target)) {
    panel.classList.remove("open");
  }
});
