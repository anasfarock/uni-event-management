const session = Auth.requireRole("organizer");
let currentOrganizer = null;

if (session) {
  currentOrganizer = DB.getOrganizer(session.organizerId);
  document.getElementById("sessionName").textContent = currentOrganizer ? currentOrganizer.name : session.username;
  document.getElementById("sessionSub").textContent = currentOrganizer ? currentOrganizer.department : "Organizer";
}

function showView(view) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById("view-" + view).classList.add("active");
  if (view === "myEvents") renderMyEvents();
}

function handleLogout() {
  Auth.logout();
  window.location.href = "index.html";
}

/* ================= NOTIFICATIONS ================= */
function refreshNotifications() {
  renderNotifPanel(DB.getNotificationsForOrganizer(currentOrganizer.organizerId), () => {
    DB.markAllRead(DB.getNotificationsForOrganizer(currentOrganizer.organizerId));
    refreshNotifications();
  });
}

/* ================= STATUS BADGE ================= */
function statusBadge(status) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return `<span class="status-badge ${status}">${label}</span>`;
}

/* ================= MY EVENTS ================= */
function renderMyEvents() {
  const events = DB.getEventsByOrganizer(currentOrganizer.organizerId).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const wrap = document.getElementById("myEventsWrap");
  if (events.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><div class="display">No events yet</div>Create your first event — it will need admin approval before students can see it.</div>`;
    return;
  }
  wrap.innerHTML = `
    <table>
      <thead><tr><th>Title</th><th>Status</th><th>Date</th><th>Venue</th><th>Registered</th><th></th></tr></thead>
      <tbody>
        ${events.map((e) => {
          const taken = DB.seatsTaken(e.eventId);
          return `
          <tr>
            <td><strong>${escapeHtml(e.title)}</strong>${e.status === "rejected" && e.rejectionReason ? `<div style="font-size:11.5px;color:var(--danger);margin-top:2px;">Reason: ${escapeHtml(e.rejectionReason)}</div>` : ""}</td>
            <td>${statusBadge(e.status)}</td>
            <td>${formatDate(e.date)}</td>
            <td>${escapeHtml(e.venue)}</td>
            <td class="seat-count">${taken} / ${e.maxParticipants}</td>
            <td>
              <div class="row-actions">
                <button class="btn btn-ghost btn-sm" onclick="openDetailModal('${e.eventId}')">Manage</button>
                <button class="btn btn-ghost btn-sm" onclick="openEventModal('${e.eventId}')">Edit</button>
              </div>
            </td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
}

/* ================= CREATE / EDIT EVENT ================= */
function openEventModal(eventId) {
  const form = document.getElementById("eventForm");
  form.reset();
  document.getElementById("eventEditingId").value = "";
  document.getElementById("approvalHint").style.display = "block";
  if (eventId) {
    const ev = DB.getEvent(eventId);
    document.getElementById("eventModalTitle").textContent = "Edit Event";
    document.getElementById("eventEditingId").value = eventId;
    document.getElementById("ef-title").value = ev.title;
    document.getElementById("ef-description").value = ev.description;
    document.getElementById("ef-category").value = ev.category;
    document.getElementById("ef-venue").value = ev.venue;
    document.getElementById("ef-date").value = ev.date;
    document.getElementById("ef-maxParticipants").value = ev.maxParticipants;
    document.getElementById("ef-startTime").value = ev.startTime;
    document.getElementById("ef-endTime").value = ev.endTime;
    document.getElementById("approvalHint").style.display = "none";
  } else {
    document.getElementById("eventModalTitle").textContent = "Create Event";
  }
  document.getElementById("eventModalBackdrop").classList.add("open");
}
function closeEventModal() { document.getElementById("eventModalBackdrop").classList.remove("open"); }

function submitEventForm(e) {
  e.preventDefault();
  const editingId = document.getElementById("eventEditingId").value;
  const event = {
    title: document.getElementById("ef-title").value.trim(),
    description: document.getElementById("ef-description").value.trim(),
    category: document.getElementById("ef-category").value.trim(),
    venue: document.getElementById("ef-venue").value.trim(),
    date: document.getElementById("ef-date").value,
    maxParticipants: Number(document.getElementById("ef-maxParticipants").value),
    startTime: document.getElementById("ef-startTime").value,
    endTime: document.getElementById("ef-endTime").value,
  };
  if (event.endTime <= event.startTime) {
    toast("End time must be after start time.", "error");
    return;
  }
  try {
    if (editingId) {
      DB.updateEvent(editingId, event);
      toast("Event updated.", "success");
    } else {
      DB.addEvent(event, { createdBy: "organizer", organizerId: currentOrganizer.organizerId });
      toast("Event submitted for approval.", "success");
    }
    closeEventModal();
    renderMyEvents();
  } catch (err) {
    toast(err.message, "error");
  }
}

/* ================= DETAIL / PARTICIPANTS / ATTENDANCE ================= */
function openDetailModal(eventId) {
  document.getElementById("detailModalBackdrop").classList.add("open");
  renderDetailModal(eventId);
}
function closeDetailModal() { document.getElementById("detailModalBackdrop").classList.remove("open"); }

function renderDetailModal(eventId) {
  const ev = DB.getEvent(eventId);
  if (!ev) return;
  const rows = DB.getAttendanceForEvent(eventId);
  const stats = DB.attendanceStats(eventId);

  document.getElementById("detailModalTitle").textContent = ev.title;
  document.getElementById("detailModalBody").innerHTML = `
    <div class="meta" style="display:flex;flex-direction:column;gap:6px;font-size:13.5px;margin-bottom:14px;">
      <span>${statusBadge(ev.status)}</span>
      <span><b>Date:</b> ${formatDate(ev.date)} &nbsp; <b>Time:</b> ${formatTimeRange(ev.startTime, ev.endTime)}</span>
      <span><b>Venue:</b> ${escapeHtml(ev.venue)} &nbsp; <b>Capacity:</b> ${ev.maxParticipants}</span>
      <span style="color:var(--slate-soft);">${escapeHtml(ev.description)}</span>
    </div>

    <div class="toolbar" style="margin-bottom:14px;">
      ${ev.status === "approved" ? `<button class="btn btn-ghost btn-sm" onclick="openQrModal('${ev.eventId}')">Show Registration QR</button>` : ""}
      ${ev.status === "approved" ? `<button class="btn btn-ghost btn-sm" onclick="sendReminder('${ev.eventId}')">Send Reminder</button>` : ""}
    </div>

    <div class="summary-strip">
      <div class="summary-pill">Registered: <b>${stats.total}</b></div>
      <div class="summary-pill">Present: <b>${stats.present}</b></div>
      <div class="summary-pill">Absent: <b>${stats.absent}</b></div>
      <div class="summary-pill">Unmarked: <b>${stats.unmarked}</b></div>
    </div>

    <h3 style="font-size:15px;margin:16px 0 10px;">Registered Participants & Attendance</h3>
    ${rows.length === 0 ? `<div class="empty-state" style="padding:24px;"><div class="display">No registrations yet</div></div>` : `
    <table>
      <thead><tr><th>Student</th><th>Roll No.</th><th>Department</th><th>Attendance</th></tr></thead>
      <tbody>
        ${rows.map((r) => `
          <tr>
            <td>${r.student ? escapeHtml(r.student.name) : "—"}</td>
            <td>${r.student ? escapeHtml(r.student.rollNumber) : "—"}</td>
            <td>${r.student ? escapeHtml(r.student.department) : "—"}</td>
            <td>
              <div class="attendance-toggle">
                <button class="att-btn present ${r.status === "present" ? "active" : ""}" onclick="setAttendance('${eventId}','${r.studentId}','present')">Present</button>
                <button class="att-btn absent ${r.status === "absent" ? "active" : ""}" onclick="setAttendance('${eventId}','${r.studentId}','absent')">Absent</button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>`}
  `;
}

function setAttendance(eventId, studentId, status) {
  DB.markAttendance(eventId, studentId, status);
  if (status === "present") toast("Marked present — certificate issued.", "success");
  else toast("Marked absent.", "success");
  renderDetailModal(eventId);
  renderMyEvents();
}

function sendReminder(eventId) {
  const count = DB.sendReminder(eventId);
  toast(count > 0 ? `Reminder sent to ${count} registered student(s).` : "No one is registered yet.", "success");
}

/* ================= QR ================= */
function openQrModal(eventId) {
  const link = renderEventQr(document.getElementById("qrCodeContainer"), eventId);
  document.getElementById("qrLinkText").textContent = link;
  document.getElementById("qrModalBackdrop").classList.add("open");
}
function closeQrModal() { document.getElementById("qrModalBackdrop").classList.remove("open"); }

/* ---------------- init ---------------- */
renderMyEvents();
refreshNotifications();
