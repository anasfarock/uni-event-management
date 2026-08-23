const session = Auth.requireRole("admin");
if (session) document.getElementById("sessionName").textContent = session.username;

/* ---------------- View switching ---------------- */
function showView(view) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById("view-" + view).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  if (view === "students") renderStudents();
  if (view === "events") renderEvents();
}

function handleLogout() {
  Auth.logout();
  window.location.href = "index.html";
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
      <thead>
        <tr>
          <th>Student ID</th><th>Name</th><th>Roll No.</th><th>Email</th><th>Department</th><th>Sem.</th><th></th>
        </tr>
      </thead>
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
    document.getElementById("sf-studentId").disabled = true; // primary key, not editable
    document.getElementById("sf-rollNumber").value = s.rollNumber;
    document.getElementById("sf-name").value = s.name;
    document.getElementById("sf-email").value = s.email;
    document.getElementById("sf-department").value = s.department;
    document.getElementById("sf-semester").value = s.semester;
    document.getElementById("loginFieldsGroup").style.display = "none"; // login managed separately when editing
  } else {
    document.getElementById("studentModalTitle").textContent = "Add Student";
  }
  document.getElementById("studentModalBackdrop").classList.add("open");
}

function closeStudentModal() {
  document.getElementById("studentModalBackdrop").classList.remove("open");
}

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
      const credentials = username && password ? { username, password } : null;
      DB.addStudent(student, credentials);
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
  if (confirm(`Delete ${s.name} (${s.studentId})? This also removes their registrations and login.`)) {
    DB.deleteStudent(studentId);
    toast("Student deleted.", "success");
    renderStudents();
  }
}

/* ================= EVENTS ================= */

function populateEventCategoryFilter() {
  const sel = document.getElementById("eventCategoryFilter");
  const cats = DB.categories();
  sel.innerHTML = cats.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function renderEvents() {
  const query = document.getElementById("eventSearch").value;
  const category = document.getElementById("eventCategoryFilter").value;
  const events = DB.searchEvents(query, category).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const wrap = document.getElementById("eventsTableWrap");

  if (events.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><div class="display">No events found</div>Try a different search or filter, or add a new event.</div>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr><th>Title</th><th>Category</th><th>Date</th><th>Time</th><th>Venue</th><th>Seats</th><th></th></tr>
      </thead>
      <tbody>
        ${events.map((e) => {
          const taken = DB.seatsTaken(e.eventId);
          return `
          <tr>
            <td><strong>${escapeHtml(e.title)}</strong></td>
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

function closeEventModal() {
  document.getElementById("eventModalBackdrop").classList.remove("open");
}

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
      DB.addEvent(event);
      toast("Event added.", "success");
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
  if (confirm(`Delete "${ev.title}"? This also removes all student registrations for it.`)) {
    DB.deleteEvent(eventId);
    toast("Event deleted.", "success");
    populateEventCategoryFilter();
    renderEvents();
  }
}

/* ---------------- init ---------------- */
populateEventCategoryFilter();
renderStudents();
renderEvents();
