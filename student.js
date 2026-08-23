const session = Auth.requireRole("student");
let currentStudent = null;

if (session) {
  currentStudent = DB.getStudent(session.studentId);
  document.getElementById("sessionName").textContent = currentStudent ? currentStudent.name : session.username;
  document.getElementById("sessionSub").textContent = currentStudent ? currentStudent.rollNumber : "Student";
}

function showView(view) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById("view-" + view).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  if (view === "browse") renderBrowse();
  if (view === "mine") renderMyRegistrations();
}

function handleLogout() {
  Auth.logout();
  window.location.href = "index.html";
}

/* ---------------- seat meter (signature visual) ---------------- */
function seatMeter(taken, max) {
  const dotCount = Math.min(max, 10);
  const filledDots = Math.round((taken / max) * dotCount);
  const isFull = taken >= max;
  let dots = "";
  for (let i = 0; i < dotCount; i++) {
    const cls = i < filledDots ? (isFull ? "seat-dot full" : "seat-dot filled") : "seat-dot";
    dots += `<span class="${cls}"></span>`;
  }
  return `<div class="seat-meter"><div class="seat-dots">${dots}</div><span class="seat-count">${taken}/${max} seats</span></div>`;
}

/* ---------------- BROWSE ---------------- */

function populateBrowseCategoryFilter() {
  const sel = document.getElementById("browseCategoryFilter");
  sel.innerHTML = DB.categories().map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function renderBrowse() {
  const query = document.getElementById("browseSearch").value;
  const category = document.getElementById("browseCategoryFilter").value;
  const today = new Date().toISOString().slice(0, 10);
  const events = DB.searchEvents(query, category)
    .filter((e) => e.date >= today)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

  const wrap = document.getElementById("browseGridWrap");
  if (events.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><div class="display">No upcoming events match</div>Try a different search or category.</div>`;
    return;
  }

  wrap.innerHTML = `<div class="event-grid">
    ${events.map((e) => {
      const taken = DB.seatsTaken(e.eventId);
      const isRegistered = DB.isRegistered(currentStudent.studentId, e.eventId);
      const isFull = taken >= e.maxParticipants;
      return `
      <div class="event-card">
        <div class="cat-row"><span class="tag">${escapeHtml(e.category)}</span>${isRegistered ? '<span class="tag" style="background:var(--success-bg);color:var(--success);">Registered</span>' : ""}</div>
        <h3>${escapeHtml(e.title)}</h3>
        <p class="desc">${escapeHtml(e.description.slice(0, 100))}${e.description.length > 100 ? "…" : ""}</p>
        <div class="meta">
          <span><b>Date</b>${formatDate(e.date)}</span>
          <span><b>Time</b>${formatTimeRange(e.startTime, e.endTime)}</span>
          <span><b>Venue</b>${escapeHtml(e.venue)}</span>
        </div>
        <div class="card-foot">
          ${seatMeter(taken, e.maxParticipants)}
        </div>
        <div class="card-foot">
          <button class="btn btn-ghost btn-sm" onclick="openEventDetails('${e.eventId}')">Details</button>
          ${isRegistered
            ? `<button class="btn btn-danger btn-sm" onclick="cancelRegistration('${e.eventId}')">Cancel</button>`
            : `<button class="btn btn-gold btn-sm" onclick="registerForEvent('${e.eventId}')" ${isFull ? "disabled" : ""}>${isFull ? "Full" : "Register"}</button>`
          }
        </div>
      </div>`;
    }).join("")}
  </div>`;
}

function openEventDetails(eventId) {
  const e = DB.getEvent(eventId);
  if (!e) return;
  const taken = DB.seatsTaken(eventId);
  const isRegistered = DB.isRegistered(currentStudent.studentId, eventId);
  const isFull = taken >= e.maxParticipants;

  document.getElementById("eventDetailsModal").innerHTML = `
    <div class="modal-head">
      <h2>${escapeHtml(e.title)}</h2>
      <button class="modal-close" onclick="closeEventDetails()">&times;</button>
    </div>
    <span class="tag">${escapeHtml(e.category)}</span>
    <p style="margin:14px 0; color:var(--slate); font-size:14px; line-height:1.6;">${escapeHtml(e.description)}</p>
    <div class="meta" style="font-size:13.5px; display:flex; flex-direction:column; gap:6px; margin-bottom:18px;">
      <span><b>Date:</b> ${formatDate(e.date)}</span>
      <span><b>Time:</b> ${formatTimeRange(e.startTime, e.endTime)}</span>
      <span><b>Venue:</b> ${escapeHtml(e.venue)}</span>
      <span><b>Capacity:</b> ${taken} / ${e.maxParticipants} registered</span>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeEventDetails()">Close</button>
      ${isRegistered
        ? `<button class="btn btn-danger" onclick="cancelRegistration('${e.eventId}'); closeEventDetails();">Cancel Registration</button>`
        : `<button class="btn btn-gold" onclick="registerForEvent('${e.eventId}'); closeEventDetails();" ${isFull ? "disabled" : ""}>${isFull ? "Event Full" : "Register"}</button>`
      }
    </div>
  `;
  document.getElementById("eventDetailsBackdrop").classList.add("open");
}

function closeEventDetails() {
  document.getElementById("eventDetailsBackdrop").classList.remove("open");
}

function registerForEvent(eventId) {
  try {
    DB.register(currentStudent.studentId, eventId);
    toast("You're registered!", "success");
    renderBrowse();
  } catch (err) {
    toast(err.message, "error");
  }
}

function cancelRegistration(eventId) {
  const e = DB.getEvent(eventId);
  if (!confirm(`Cancel your registration for "${e.title}"?`)) return;
  DB.cancelRegistration(currentStudent.studentId, eventId);
  toast("Registration cancelled.", "success");
  renderBrowse();
  renderMyRegistrations();
}

/* ---------------- MY REGISTRATIONS ---------------- */

function renderMyRegistrations() {
  const regs = DB.getRegistrationsForStudent(currentStudent.studentId)
    .sort((a, b) => (a.event.date + a.event.startTime).localeCompare(b.event.date + b.event.startTime));
  const wrap = document.getElementById("myRegsWrap");

  if (regs.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><div class="display">No registrations yet</div>Browse upcoming events and register for one.</div>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead><tr><th>Event</th><th>Category</th><th>Date</th><th>Time</th><th>Venue</th><th></th></tr></thead>
      <tbody>
        ${regs.map((r) => `
          <tr>
            <td><strong>${escapeHtml(r.event.title)}</strong></td>
            <td><span class="tag">${escapeHtml(r.event.category)}</span></td>
            <td>${formatDate(r.event.date)}</td>
            <td>${formatTimeRange(r.event.startTime, r.event.endTime)}</td>
            <td>${escapeHtml(r.event.venue)}</td>
            <td><div class="row-actions"><button class="btn btn-danger btn-sm" onclick="cancelRegistration('${r.eventId}')">Cancel</button></div></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* ---------------- init ---------------- */
populateBrowseCategoryFilter();
renderBrowse();
renderMyRegistrations();
