const session = Auth.requireRole("admin");
if (session) document.getElementById("sessionName").textContent = session.username;

/* ---------------- View switching ---------------- */
function showView(view) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById("view-" + view).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  if (view === "dashboard") renderDashboard();
  if (view === "approvals") renderApprovals();
  if (view === "students") renderStudents();
  if (view === "organizers") renderOrganizers();
  if (view === "events") renderEvents();
  if (view === "reports") renderReport();
}

function handleLogout() {
  Auth.logout();
  window.location.href = "index.html";
}

/* ================= NOTIFICATIONS ================= */
function refreshNotifications() {
  renderNotifPanel(DB.getNotificationsForAdmin(), () => {
    DB.markAllRead(DB.getNotificationsForAdmin());
    refreshNotifications();
  });
}

/* ================= DASHBOARD ================= */
function renderDashboard() {
  const stats = DB.getDashboardStats();
  const cards = [
    { label: "Total Events", value: stats.totalEvents },
    { label: "Upcoming Events", value: stats.upcomingEvents },
    { label: "Completed Events", value: stats.completedEvents },
    { label: "Total Students", value: stats.totalStudents },
    { label: "Total Registrations", value: stats.totalRegistrations },
    { label: "Total Participants", value: stats.totalParticipants },
  ];
  document.getElementById("statGrid").innerHTML = cards.map((c, i) => `
    <div class="stat-card ${i === 0 ? "accent" : ""}">
      <div class="stat-value">${c.value}</div>
      <div class="stat-label">${c.label}</div>
    </div>
  `).join("");

  const byCategory = DB.getRegistrationsByCategory().map((c) => ({ label: c.category, value: c.count }));
  renderBarChart(document.getElementById("regByCategoryChart"), byCategory);

  const statusBreak = DB.getEventStatusBreakdown();
  renderDonutChart(document.getElementById("statusDonutChart"), [
    { label: "Approved", value: statusBreak.approved, color: "#2f8f5b" },
    { label: "Pending", value: statusBreak.pending, color: "#c79a3f" },
    { label: "Rejected", value: statusBreak.rejected, color: "#c1443b" },
  ]);

  const att = DB.getAttendanceBreakdown();
  renderDonutChart(document.getElementById("attendanceDonutChart"), [
    { label: "Present", value: att.present, color: "#2f8f5b" },
    { label: "Absent", value: att.absent, color: "#c1443b" },
  ]);
}

/* ================= APPROVALS ================= */
function renderApprovals() {
  const pending = DB.getPendingEvents();
  const wrap = document.getElementById("approvalsWrap");
  if (pending.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><div class="display">Nothing waiting on you</div>No events are pending approval right now.</div>`;
    return;
  }
  wrap.innerHTML = `
    <table>
      <thead><tr><th>Title</th><th>Organizer</th><th>Category</th><th>Date</th><th>Venue</th><th>Capacity</th><th></th></tr></thead>
      <tbody>
        ${pending.map((e) => {
          const organizer = e.organizerId ? DB.getOrganizer(e.organizerId) : null;
          return `
          <tr>
            <td><strong>${escapeHtml(e.title)}</strong><div style="font-size:12px;color:var(--slate-soft);margin-top:2px;">${escapeHtml(e.description.slice(0, 70))}${e.description.length > 70 ? "…" : ""}</div></td>
            <td>${organizer ? escapeHtml(organizer.name) : "—"}</td>
            <td><span class="tag">${escapeHtml(e.category)}</span></td>
            <td>${formatDate(e.date)}</td>
            <td>${escapeHtml(e.venue)}</td>
            <td>${e.maxParticipants}</td>
            <td>
              <div class="row-actions">
                <button class="btn btn-gold btn-sm" onclick="approveEvent('${e.eventId}')">Approve</button>
                <button class="btn btn-danger btn-sm" onclick="openRejectModal('${e.eventId}')">Reject</button>
              </div>
            </td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
}

function approveEvent(eventId) {
  DB.approveEvent(eventId);
  toast("Event approved — now visible to students.", "success");
  renderApprovals();
}

function openRejectModal(eventId) {
  document.getElementById("rejectForm").reset();
  document.getElementById("rejectEventId").value = eventId;
  document.getElementById("rejectModalBackdrop").classList.add("open");
}
function closeRejectModal() {
  document.getElementById("rejectModalBackdrop").classList.remove("open");
}
function submitRejectForm(e) {
  e.preventDefault();
  const eventId = document.getElementById("rejectEventId").value;
  const reason = document.getElementById("rf-reason").value.trim();
  DB.rejectEvent(eventId, reason);
  toast("Event rejected.", "success");
  closeRejectModal();
  renderApprovals();
}

/* ================= STUDENTS ================= */
function renderStudents() {
  const query = document.getElementById("studentSearch").value;
  const students = DB.searchStudents(query);
  const wrap = document.getElementById("studentsTableWrap");
  if (students.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><div class="display">No students found</div>Try a different search, or add a new student.</div>`;
    return;
  }
  wrap.innerHTML = `
    <table>
      <thead><tr><th>Student ID</th><th>Name</th><th>Roll No.</th><th>Email</th><th>Department</th><th>Sem.</th><th></th></tr></thead>
      <tbody>
        ${students.map((s) => `
          <tr>
            <td class="id-tag">${escapeHtml(s.studentId)}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.rollNumber)}</td>
            <td>${escapeHtml(s.email)}</td>
            <td><span class="tag">${escapeHtml(s.department)}</span></td>
            <td>${escapeHtml(String(s.semester))}</td>
            <td>
              <div class="row-actions">
                <button class="btn btn-ghost btn-sm" onclick="openStudentModal('${s.studentId}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="confirmDeleteStudent('${s.studentId}')">Delete</button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function openStudentModal(studentId) {
  const form = document.getElementById("studentForm");
  form.reset();
  document.getElementById("studentEditingId").value = "";
  document.getElementById("sf-studentId").disabled = false;
  document.getElementById("loginFieldsGroup").style.display = "block";

  if (studentId) {
    const s = DB.getStudent(studentId);
    document.getElementById("studentModalTitle").textContent = "Edit Student";
    document.getElementById("studentEditingId").value = studentId;
    document.getElementById("sf-studentId").value = s.studentId;
    document.getElementById("sf-studentId").disabled = true;
    document.getElementById("sf-rollNumber").value = s.rollNumber;
    document.getElementById("sf-name").value = s.name;
    document.getElementById("sf-email").value = s.email;
    document.getElementById("sf-department").value = s.department;
    document.getElementById("sf-semester").value = s.semester;
    document.getElementById("loginFieldsGroup").style.display = "none";
  } else {
    document.getElementById("studentModalTitle").textContent = "Add Student";
  }
  document.getElementById("studentModalBackdrop").classList.add("open");
}
function closeStudentModal() { document.getElementById("studentModalBackdrop").classList.remove("open"); }

function submitStudentForm(e) {
  e.preventDefault();
  const editingId = document.getElementById("studentEditingId").value;
  const student = {
    studentId: document.getElementById("sf-studentId").value.trim(),
    rollNumber: document.getElementById("sf-rollNumber").value.trim(),
    name: document.getElementById("sf-name").value.trim(),
    email: document.getElementById("sf-email").value.trim(),
    department: document.getElementById("sf-department").value.trim(),
    semester: Number(document.getElementById("sf-semester").value),
  };
  try {
    if (editingId) {
      DB.updateStudent(editingId, student);
      toast("Student updated.", "success");
    } else {
      const username = document.getElementById("sf-username").value.trim();
      const password = document.getElementById("sf-password").value.trim();
      DB.addStudent(student, username && password ? { username, password } : null);
      toast("Student added.", "success");
    }
    closeStudentModal();
    renderStudents();
  } catch (err) {
    toast(err.message, "error");
  }
}

function confirmDeleteStudent(studentId) {
  const s = DB.getStudent(studentId);
  if (!s) return;
  if (confirm(`Delete ${s.name} (${s.studentId})? This also removes their registrations, attendance, certificates and login.`)) {
    DB.deleteStudent(studentId);
    toast("Student deleted.", "success");
    renderStudents();
  }
}

/* ================= ORGANIZERS ================= */
function renderOrganizers() {
  const query = document.getElementById("organizerSearch").value;
  const organizers = DB.searchOrganizers(query);
  const wrap = document.getElementById("organizersTableWrap");
  if (organizers.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><div class="display">No organizers found</div>Add an Event Organizer account to get started.</div>`;
    return;
  }
  wrap.innerHTML = `
    <table>
      <thead><tr><th>Organizer ID</th><th>Name</th><th>Email</th><th>Department</th><th>Events Submitted</th><th></th></tr></thead>
      <tbody>
        ${organizers.map((o) => {
          const count = DB.getEventsByOrganizer(o.organizerId).length;
          return `
          <tr>
            <td class="id-tag">${escapeHtml(o.organizerId)}</td>
            <td>${escapeHtml(o.name)}</td>
            <td>${escapeHtml(o.email)}</td>
            <td><span class="tag">${escapeHtml(o.department)}</span></td>
            <td>${count}</td>
            <td><div class="row-actions"><button class="btn btn-danger btn-sm" onclick="confirmDeleteOrganizer('${o.organizerId}')">Delete</button></div></td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
}

function openOrganizerModal() {
  document.getElementById("organizerForm").reset();
  document.getElementById("organizerModalBackdrop").classList.add("open");
}
function closeOrganizerModal() { document.getElementById("organizerModalBackdrop").classList.remove("open"); }

function submitOrganizerForm(e) {
  e.preventDefault();
  const organizer = {
    organizerId: document.getElementById("of-organizerId").value.trim(),
    name: document.getElementById("of-name").value.trim(),
    email: document.getElementById("of-email").value.trim(),
    department: document.getElementById("of-department").value.trim(),
  };
  const credentials = {
    username: document.getElementById("of-username").value.trim(),
    password: document.getElementById("of-password").value.trim(),
  };
  try {
    DB.addOrganizer(organizer, credentials);
    toast("Organizer added.", "success");
    closeOrganizerModal();
    renderOrganizers();
  } catch (err) {
    toast(err.message, "error");
  }
}

function confirmDeleteOrganizer(organizerId) {
  const o = DB.getOrganizer(organizerId);
  if (!o) return;
  if (confirm(`Delete ${o.name}? Their submitted events will remain but become unassigned.`)) {
    DB.deleteOrganizer(organizerId);
    toast("Organizer deleted.", "success");
    renderOrganizers();
  }
}

/* ================= EVENTS ================= */
function populateEventCategoryFilter() {
  const sel = document.getElementById("eventCategoryFilter");
  sel.innerHTML = DB.categories().map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function statusBadge(status) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return `<span class="status-badge ${status}">${label}</span>`;
}

function renderEvents() {
  const query = document.getElementById("eventSearch").value;
  const category = document.getElementById("eventCategoryFilter").value;
  const status = document.getElementById("eventStatusFilter").value;
  const events = DB.searchEvents(query, category, status).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const wrap = document.getElementById("eventsTableWrap");

  if (events.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><div class="display">No events found</div>Try a different search or filter, or add a new event.</div>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead><tr><th>Title</th><th>Status</th><th>Category</th><th>Date</th><th>Time</th><th>Venue</th><th>Seats</th><th></th></tr></thead>
      <tbody>
        ${events.map((e) => {
          const taken = DB.seatsTaken(e.eventId);
          return `
          <tr>
            <td><strong>${escapeHtml(e.title)}</strong></td>
            <td>${statusBadge(e.status)}</td>
            <td><span class="tag">${escapeHtml(e.category)}</span></td>
            <td>${formatDate(e.date)}</td>
            <td>${formatTimeRange(e.startTime, e.endTime)}</td>
            <td>${escapeHtml(e.venue)}</td>
            <td class="seat-count">${taken} / ${e.maxParticipants}</td>
            <td>
              <div class="row-actions">
                <button class="btn btn-ghost btn-sm" onclick="openEventModal('${e.eventId}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="confirmDeleteEvent('${e.eventId}')">Delete</button>
              </div>
            </td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
}

function openEventModal(eventId) {
  const form = document.getElementById("eventForm");
  form.reset();
  document.getElementById("eventEditingId").value = "";
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
  } else {
    document.getElementById("eventModalTitle").textContent = "Add Event";
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
      DB.addEvent(event, { createdBy: "admin" });
      toast("Event added and approved.", "success");
    }
    closeEventModal();
    populateEventCategoryFilter();
    renderEvents();
  } catch (err) {
    toast(err.message, "error");
  }
}

function confirmDeleteEvent(eventId) {
  const ev = DB.getEvent(eventId);
  if (!ev) return;
  if (confirm(`Delete "${ev.title}"? Registered students will be notified of the cancellation.`)) {
    DB.deleteEvent(eventId);
    toast("Event deleted.", "success");
    populateEventCategoryFilter();
    renderEvents();
  }
}

/* ================= REPORTS ================= */
let currentReportType = "registrations";

function populateReportFilters() {
  const eventSel = document.getElementById("filterEvent");
  eventSel.innerHTML = `<option value="">All events</option>` + DB.getEvents().map((e) => `<option value="${e.eventId}">${escapeHtml(e.title)}</option>`).join("");

  const deptSel = document.getElementById("filterDepartment");
  deptSel.innerHTML = `<option value="">All departments</option>` + DB.departments().map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("");

  const studentSel = document.getElementById("filterStudent");
  studentSel.innerHTML = `<option value="">All students</option>` + DB.getStudents().map((s) => `<option value="${s.studentId}">${escapeHtml(s.name)}</option>`).join("");
}

function setReportType(type) {
  currentReportType = type;
  document.querySelectorAll(".report-tab").forEach((b) => b.classList.toggle("active", b.dataset.report === type));
  renderReport();
}

function clearReportFilters() {
  document.getElementById("filterEvent").value = "";
  document.getElementById("filterDate").value = "";
  document.getElementById("filterDepartment").value = "";
  document.getElementById("filterStudent").value = "";
  renderReport();
}

function currentFilters() {
  return {
    eventId: document.getElementById("filterEvent").value,
    date: document.getElementById("filterDate").value,
    department: document.getElementById("filterDepartment").value,
    studentId: document.getElementById("filterStudent").value,
  };
}

function renderReport() {
  const filters = currentFilters();
  const out = document.getElementById("reportOutput");

  if (currentReportType === "registrations") {
    const rows = DB.reportEventRegistrations(filters);
    if (rows.length === 0) { out.innerHTML = emptyReport(); return; }
    out.innerHTML = `
      <table>
        <thead><tr><th>Event</th><th>Category</th><th>Date</th><th>Registered</th><th>Capacity</th><th>Fill %</th></tr></thead>
        <tbody>
          ${rows.map((r) => `
            <tr>
              <td><strong>${escapeHtml(r.event.title)}</strong></td>
              <td><span class="tag">${escapeHtml(r.event.category)}</span></td>
              <td>${formatDate(r.event.date)}</td>
              <td>${r.registered}</td>
              <td>${r.capacity}</td>
              <td>${Math.round((r.registered / r.capacity) * 100)}%</td>
            </tr>`).join("")}
        </tbody>
      </table>`;
    return;
  }

  if (currentReportType === "participation") {
    const rows = DB.reportStudentParticipation(filters);
    if (rows.length === 0) { out.innerHTML = emptyReport(); return; }
    out.innerHTML = `
      <table>
        <thead><tr><th>Student</th><th>Department</th><th>Events Registered</th><th>Events Attended</th></tr></thead>
        <tbody>
          ${rows.map((r) => `
            <tr>
              <td><strong>${escapeHtml(r.student.name)}</strong> <span class="id-tag">${escapeHtml(r.student.studentId)}</span></td>
              <td><span class="tag">${escapeHtml(r.student.department)}</span></td>
              <td>${r.registered}</td>
              <td>${r.attended}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;
    return;
  }

  if (currentReportType === "attendance") {
    const rows = DB.reportEventAttendance(filters);
    if (rows.length === 0) { out.innerHTML = emptyReport(); return; }
    out.innerHTML = `
      <table>
        <thead><tr><th>Event</th><th>Date</th><th>Registered</th><th>Present</th><th>Absent</th><th>Unmarked</th></tr></thead>
        <tbody>
          ${rows.map((r) => `
            <tr>
              <td><strong>${escapeHtml(r.event.title)}</strong></td>
              <td>${formatDate(r.event.date)}</td>
              <td>${r.total}</td>
              <td>${r.present}</td>
              <td>${r.absent}</td>
              <td>${r.unmarked}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;
    return;
  }

  if (currentReportType === "presentAbsent") {
    const { totals, rows } = DB.reportPresentAbsentStats(filters);
    const pct = (n) => (totals.total ? Math.round((n / totals.total) * 100) : 0);
    out.innerHTML = `
      <div class="summary-strip">
        <div class="summary-pill">Total Registered: <b>${totals.total}</b></div>
        <div class="summary-pill">Present: <b>${totals.present}</b> (${pct(totals.present)}%)</div>
        <div class="summary-pill">Absent: <b>${totals.absent}</b> (${pct(totals.absent)}%)</div>
        <div class="summary-pill">Unmarked: <b>${totals.unmarked}</b> (${pct(totals.unmarked)}%)</div>
      </div>
      ${rows.length === 0 ? emptyReport() : `
      <table>
        <thead><tr><th>Event</th><th>Date</th><th>Present</th><th>Absent</th><th>Unmarked</th></tr></thead>
        <tbody>
          ${rows.map((r) => `
            <tr>
              <td><strong>${escapeHtml(r.event.title)}</strong></td>
              <td>${formatDate(r.event.date)}</td>
              <td>${r.present}</td>
              <td>${r.absent}</td>
              <td>${r.unmarked}</td>
            </tr>`).join("")}
        </tbody>
      </table>`}
    `;
  }
}

function emptyReport() {
  return `<div class="empty-state"><div class="display">No results</div>Try different filters.</div>`;
}

/* ---------------- init ---------------- */
populateEventCategoryFilter();
populateReportFilters();
renderDashboard();
refreshNotifications();
[...document.querySelectorAll("#filterEvent, #filterDate, #filterDepartment, #filterStudent")].forEach((el) => el.addEventListener("change", renderReport));
