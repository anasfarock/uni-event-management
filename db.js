/* ============================================================
   UEMS Data Layer (v2)
   Extends the Assignment 2 schema with:
     - organizers          (Event Organizer accounts)
     - events.status       ('pending' | 'approved' | 'rejected')
     - events.organizerId  (who created it, null = created by admin)
     - attendance           (per-event, per-student present/absent)
     - notifications        (registration, approval, cancellation,
                              reminder, certificate availability)
     - certificates          (issued on 'present' attendance)
   Table shapes still mirror a relational schema 1:1 (see
   schema.sql) so a real backend can replace this file without
   touching admin.js / organizer.js / student.js.
   ============================================================ */

const DB_KEY = "uems_db_v2";

function _uid(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function _today() {
  return new Date().toISOString().slice(0, 10);
}

function _seed() {
  const now = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const future = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return iso(d);
  };
  const past = (days) => future(-days);

  const students = [
    { studentId: "STU-1001", name: "Ayesha Khan", rollNumber: "BSSE-021", email: "ayesha.khan@szabist.pk", department: "Computer Science", semester: 6 },
    { studentId: "STU-1002", name: "Bilal Ahmed", rollNumber: "BSSE-045", email: "bilal.ahmed@szabist.pk", department: "Software Engineering", semester: 4 },
    { studentId: "STU-1003", name: "Sara Farooq", rollNumber: "BSCS-012", email: "sara.farooq@szabist.pk", department: "Computer Science", semester: 2 },
  ];

  const organizers = [
    { organizerId: "ORG-2001", name: "Hassan Raza", email: "hassan.raza@szabist.pk", department: "Student Affairs" },
    { organizerId: "ORG-2002", name: "Mehreen Ali", email: "mehreen.ali@szabist.pk", department: "Computer Science" },
  ];

  const users = [
    { userId: _uid("usr"), username: "admin", password: "admin123", role: "admin", studentId: null, organizerId: null },
    { userId: _uid("usr"), username: "ayesha.khan", password: "student123", role: "student", studentId: "STU-1001", organizerId: null },
    { userId: _uid("usr"), username: "bilal.ahmed", password: "student123", role: "student", studentId: "STU-1002", organizerId: null },
    { userId: _uid("usr"), username: "sara.farooq", password: "student123", role: "student", studentId: "STU-1003", organizerId: null },
    { userId: _uid("usr"), username: "hassan.raza", password: "organizer123", role: "organizer", studentId: null, organizerId: "ORG-2001" },
    { userId: _uid("usr"), username: "mehreen.ali", password: "organizer123", role: "organizer", studentId: null, organizerId: "ORG-2002" },
  ];

  const events = [
    {
      eventId: _uid("evt"), title: "AI & Robotics Symposium", category: "Technology",
      description: "A department-wide symposium covering applied AI, robotics demos, and a panel with industry speakers.",
      date: future(7), startTime: "10:00", endTime: "13:00", venue: "Auditorium A", maxParticipants: 120,
      status: "approved", organizerId: "ORG-2002", createdBy: "organizer", rejectionReason: null, createdAt: new Date().toISOString(),
    },
    {
      eventId: _uid("evt"), title: "Inter-University Football Cup", category: "Sports",
      description: "Knockout football tournament between CS, SE, and Business departments. Open to all students.",
      date: future(14), startTime: "16:00", endTime: "19:00", venue: "Sports Ground", maxParticipants: 60,
      status: "approved", organizerId: "ORG-2001", createdBy: "organizer", rejectionReason: null, createdAt: new Date().toISOString(),
    },
    {
      eventId: _uid("evt"), title: "Battle of Bands", category: "Cultural",
      description: "Annual music competition — student bands compete for the SZABIST trophy.",
      date: future(21), startTime: "18:00", endTime: "21:30", venue: "Open Air Theatre", maxParticipants: 200,
      status: "pending", organizerId: "ORG-2001", createdBy: "organizer", rejectionReason: null, createdAt: new Date().toISOString(),
    },
    {
      eventId: _uid("evt"), title: "Resume & LinkedIn Workshop", category: "Career",
      description: "Hands-on workshop on building a hire-ready resume and LinkedIn profile, run by the careers office.",
      date: future(3), startTime: "14:00", endTime: "15:30", venue: "Seminar Room 2", maxParticipants: 40,
      status: "approved", organizerId: null, createdBy: "admin", rejectionReason: null, createdAt: new Date().toISOString(),
    },
    {
      eventId: _uid("evt"), title: "Freshers' Orientation Walkthrough", category: "Orientation",
      description: "Completed orientation session — used here to seed attendance & certificate history for the demo.",
      date: past(10), startTime: "09:00", endTime: "11:00", venue: "Auditorium A", maxParticipants: 150,
      status: "approved", organizerId: "ORG-2002", createdBy: "organizer", rejectionReason: null, createdAt: new Date().toISOString(),
    },
  ];

  const pastEvent = events[4];
  const registrations = [
    { id: _uid("reg"), studentId: "STU-1001", eventId: pastEvent.eventId, registeredAt: new Date().toISOString() },
    { id: _uid("reg"), studentId: "STU-1002", eventId: pastEvent.eventId, registeredAt: new Date().toISOString() },
  ];

  const attendance = [
    { id: _uid("att"), eventId: pastEvent.eventId, studentId: "STU-1001", status: "present", markedAt: new Date().toISOString() },
    { id: _uid("att"), eventId: pastEvent.eventId, studentId: "STU-1002", status: "absent", markedAt: new Date().toISOString() },
  ];

  const certificates = [
    {
      id: _uid("cert"), certificateNumber: "SZBT-CERT-2026-1001",
      studentId: "STU-1001", eventId: pastEvent.eventId, issueDate: _today(),
    },
  ];

  const notifications = [
    {
      id: _uid("ntf"), audienceType: "student", audienceId: "STU-1001", type: "certificate",
      message: `Your certificate for "${pastEvent.title}" is ready to download.`, createdAt: new Date().toISOString(), read: false,
    },
  ];

  return { users, students, organizers, events, registrations, attendance, certificates, notifications, certSeq: 1002 };
}

function _read() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    const seeded = _seed();
    localStorage.setItem(DB_KEY, JSON.stringify(seeded));
    return seeded;
  }
  return JSON.parse(raw);
}

function _write(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

const DB = {
  reset() {
    localStorage.removeItem(DB_KEY);
    return _read();
  },

  // ================= USERS / AUTH =================
  findUser(username, password, role) {
    const db = _read();
    return db.users.find(
      (u) => u.username.toLowerCase() === String(username).toLowerCase() && u.password === password && u.role === role
    ) || null;
  },

  // ================= STUDENTS =================
  getStudents() {
    return _read().students.slice();
  },
  getStudent(studentId) {
    return _read().students.find((s) => s.studentId === studentId) || null;
  },
  departments() {
    const db = _read();
    return Array.from(new Set(db.students.map((s) => s.department))).sort();
  },
  addStudent(student, credentials) {
    const db = _read();
    if (db.students.some((s) => s.studentId === student.studentId)) throw new Error("A student with this Student ID already exists.");
    if (db.students.some((s) => s.email.toLowerCase() === student.email.toLowerCase())) throw new Error("A student with this email already exists.");
    db.students.push(student);
    if (credentials) {
      if (db.users.some((u) => u.username.toLowerCase() === credentials.username.toLowerCase())) throw new Error("That login username is already taken.");
      db.users.push({ userId: _uid("usr"), username: credentials.username, password: credentials.password, role: "student", studentId: student.studentId, organizerId: null });
    }
    _write(db);
    return student;
  },
  updateStudent(studentId, updates) {
    const db = _read();
    const idx = db.students.findIndex((s) => s.studentId === studentId);
    if (idx === -1) throw new Error("Student not found.");
    db.students[idx] = { ...db.students[idx], ...updates, studentId };
    _write(db);
    return db.students[idx];
  },
  deleteStudent(studentId) {
    const db = _read();
    db.students = db.students.filter((s) => s.studentId !== studentId);
    db.users = db.users.filter((u) => u.studentId !== studentId);
    db.registrations = db.registrations.filter((r) => r.studentId !== studentId);
    db.attendance = db.attendance.filter((a) => a.studentId !== studentId);
    db.certificates = db.certificates.filter((c) => c.studentId !== studentId);
    db.notifications = db.notifications.filter((n) => !(n.audienceType === "student" && n.audienceId === studentId));
    _write(db);
  },
  searchStudents(query) {
    const q = query.trim().toLowerCase();
    if (!q) return this.getStudents();
    return _read().students.filter((s) => [s.studentId, s.name, s.rollNumber, s.email, s.department].some((f) => String(f).toLowerCase().includes(q)));
  },

  // ================= ORGANIZERS =================
  getOrganizers() {
    return _read().organizers.slice();
  },
  getOrganizer(organizerId) {
    return _read().organizers.find((o) => o.organizerId === organizerId) || null;
  },
  addOrganizer(organizer, credentials) {
    const db = _read();
    if (db.organizers.some((o) => o.organizerId === organizer.organizerId)) throw new Error("An organizer with this Organizer ID already exists.");
    if (db.organizers.some((o) => o.email.toLowerCase() === organizer.email.toLowerCase())) throw new Error("An organizer with this email already exists.");
    if (db.users.some((u) => u.username.toLowerCase() === credentials.username.toLowerCase())) throw new Error("That login username is already taken.");
    db.organizers.push(organizer);
    db.users.push({ userId: _uid("usr"), username: credentials.username, password: credentials.password, role: "organizer", studentId: null, organizerId: organizer.organizerId });
    _write(db);
    return organizer;
  },
  deleteOrganizer(organizerId) {
    const db = _read();
    db.organizers = db.organizers.filter((o) => o.organizerId !== organizerId);
    db.users = db.users.filter((u) => u.organizerId !== organizerId);
    db.events = db.events.map((e) => (e.organizerId === organizerId ? { ...e, organizerId: null } : e));
    db.notifications = db.notifications.filter((n) => !(n.audienceType === "organizer" && n.audienceId === organizerId));
    _write(db);
  },
  searchOrganizers(query) {
    const q = query.trim().toLowerCase();
    if (!q) return this.getOrganizers();
    return _read().organizers.filter((o) => [o.organizerId, o.name, o.email, o.department].some((f) => String(f).toLowerCase().includes(q)));
  },

  // ================= EVENTS =================
  getEvents() {
    return _read().events.slice();
  },
  getEvent(eventId) {
    return _read().events.find((e) => e.eventId === eventId) || null;
  },
  addEvent(event, creator) {
    const db = _read();
    const eventId = _uid("evt");
    const isAdmin = creator.createdBy === "admin";
    const record = {
      ...event, eventId,
      organizerId: creator.organizerId || null,
      createdBy: creator.createdBy,
      status: isAdmin ? "approved" : "pending",
      rejectionReason: null,
      createdAt: new Date().toISOString(),
    };
    db.events.push(record);
    if (!isAdmin) {
      db.notifications.push({
        id: _uid("ntf"), audienceType: "admin", audienceId: null, type: "approval_needed",
        message: `New event "${record.title}" was submitted and needs approval.`, createdAt: new Date().toISOString(), read: false,
      });
    }
    _write(db);
    return record;
  },
  updateEvent(eventId, updates) {
    const db = _read();
    const idx = db.events.findIndex((e) => e.eventId === eventId);
    if (idx === -1) throw new Error("Event not found.");
    db.events[idx] = { ...db.events[idx], ...updates, eventId };
    _write(db);
    return db.events[idx];
  },
  deleteEvent(eventId) {
    const db = _read();
    const event = db.events.find((e) => e.eventId === eventId);
    if (event) {
      const affected = db.registrations.filter((r) => r.eventId === eventId);
      affected.forEach((r) => {
        db.notifications.push({
          id: _uid("ntf"), audienceType: "student", audienceId: r.studentId, type: "cancellation",
          message: `"${event.title}" scheduled for ${event.date} has been cancelled.`, createdAt: new Date().toISOString(), read: false,
        });
      });
    }
    db.events = db.events.filter((e) => e.eventId !== eventId);
    db.registrations = db.registrations.filter((r) => r.eventId !== eventId);
    db.attendance = db.attendance.filter((a) => a.eventId !== eventId);
    db.certificates = db.certificates.filter((c) => c.eventId !== eventId);
    _write(db);
  },
  approveEvent(eventId) {
    const db = _read();
    const ev = db.events.find((e) => e.eventId === eventId);
    if (!ev) throw new Error("Event not found.");
    ev.status = "approved";
    ev.rejectionReason = null;
    if (ev.organizerId) {
      db.notifications.push({
        id: _uid("ntf"), audienceType: "organizer", audienceId: ev.organizerId, type: "approval",
        message: `Your event "${ev.title}" was approved and is now visible to students.`, createdAt: new Date().toISOString(), read: false,
      });
    }
    _write(db);
    return ev;
  },
  rejectEvent(eventId, reason) {
    const db = _read();
    const ev = db.events.find((e) => e.eventId === eventId);
    if (!ev) throw new Error("Event not found.");
    ev.status = "rejected";
    ev.rejectionReason = reason || "No reason given.";
    if (ev.organizerId) {
      db.notifications.push({
        id: _uid("ntf"), audienceType: "organizer", audienceId: ev.organizerId, type: "rejection",
        message: `Your event "${ev.title}" was rejected. Reason: ${ev.rejectionReason}`, createdAt: new Date().toISOString(), read: false,
      });
    }
    _write(db);
    return ev;
  },
  getPendingEvents() {
    return _read().events.filter((e) => e.status === "pending").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  getEventsByOrganizer(organizerId) {
    return _read().events.filter((e) => e.organizerId === organizerId);
  },
  searchEvents(query, category, statusFilter) {
    let list = _read().events.slice();
    const q = (query || "").trim().toLowerCase();
    if (q) list = list.filter((e) => [e.title, e.description, e.category, e.venue].some((f) => String(f).toLowerCase().includes(q)));
    if (category && category !== "All") list = list.filter((e) => e.category === category);
    if (statusFilter && statusFilter !== "All") list = list.filter((e) => e.status === statusFilter);
    return list;
  },
  upcomingEvents() {
    const today = _today();
    return _read().events.filter((e) => e.status === "approved" && e.date >= today).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  },
  completedEvents() {
    const today = _today();
    return _read().events.filter((e) => e.status === "approved" && e.date < today);
  },
  categories(approvedOnly) {
    const db = _read();
    const source = approvedOnly ? db.events.filter((e) => e.status === "approved") : db.events;
    return ["All", ...Array.from(new Set(source.map((e) => e.category))).sort()];
  },

  // ================= REGISTRATIONS =================
  getRegistrationsForStudent(studentId) {
    const db = _read();
    return db.registrations
      .filter((r) => r.studentId === studentId)
      .map((r) => ({ ...r, event: db.events.find((e) => e.eventId === r.eventId) || null }))
      .filter((r) => r.event !== null);
  },
  getRegistrationsForEvent(eventId) {
    return _read().registrations.filter((r) => r.eventId === eventId);
  },
  seatsTaken(eventId) {
    return this.getRegistrationsForEvent(eventId).length;
  },
  isRegistered(studentId, eventId) {
    return _read().registrations.some((r) => r.studentId === studentId && r.eventId === eventId);
  },
  register(studentId, eventId) {
    const db = _read();
    const event = db.events.find((e) => e.eventId === eventId);
    if (!event) throw new Error("Event not found.");
    if (event.status !== "approved") throw new Error("This event is not open for registration.");
    if (db.registrations.some((r) => r.studentId === studentId && r.eventId === eventId)) throw new Error("You are already registered for this event.");
    const taken = db.registrations.filter((r) => r.eventId === eventId).length;
    if (taken >= event.maxParticipants) throw new Error("This event is full.");
    const record = { id: _uid("reg"), studentId, eventId, registeredAt: new Date().toISOString() };
    db.registrations.push(record);
    db.notifications.push({
      id: _uid("ntf"), audienceType: "student", audienceId: studentId, type: "registration",
      message: `You're registered for "${event.title}" on ${event.date}.`, createdAt: new Date().toISOString(), read: false,
    });
    _write(db);
    return record;
  },
  cancelRegistration(studentId, eventId) {
    const db = _read();
    db.registrations = db.registrations.filter((r) => !(r.studentId === studentId && r.eventId === eventId));
    _write(db);
  },

  // ================= ATTENDANCE =================
  getAttendanceForEvent(eventId) {
    const db = _read();
    const regs = db.registrations.filter((r) => r.eventId === eventId);
    return regs.map((r) => {
      const student = db.students.find((s) => s.studentId === r.studentId) || null;
      const att = db.attendance.find((a) => a.eventId === eventId && a.studentId === r.studentId) || null;
      return { studentId: r.studentId, student, status: att ? att.status : "unmarked" };
    });
  },
  getAttendanceForStudent(studentId) {
    return _read().attendance.filter((a) => a.studentId === studentId);
  },
  markAttendance(eventId, studentId, status) {
    const db = _read();
    if (!db.registrations.some((r) => r.eventId === eventId && r.studentId === studentId)) {
      throw new Error("This student is not registered for the event.");
    }
    let record = db.attendance.find((a) => a.eventId === eventId && a.studentId === studentId);
    if (record) {
      record.status = status;
      record.markedAt = new Date().toISOString();
    } else {
      record = { id: _uid("att"), eventId, studentId, status, markedAt: new Date().toISOString() };
      db.attendance.push(record);
    }
    _write(db);
    if (status === "present") this.issueCertificateIfEligible(studentId, eventId);
    return record;
  },
  attendanceStats(eventId) {
    const rows = this.getAttendanceForEvent(eventId);
    return {
      total: rows.length,
      present: rows.filter((r) => r.status === "present").length,
      absent: rows.filter((r) => r.status === "absent").length,
      unmarked: rows.filter((r) => r.status === "unmarked").length,
    };
  },

  // ================= CERTIFICATES =================
  issueCertificateIfEligible(studentId, eventId) {
    const db = _read();
    const existing = db.certificates.find((c) => c.studentId === studentId && c.eventId === eventId);
    if (existing) return existing;
    const event = db.events.find((e) => e.eventId === eventId);
    if (!event) return null;
    const year = new Date().getFullYear();
    const seq = db.certSeq++;
    const cert = { id: _uid("cert"), certificateNumber: `SZBT-CERT-${year}-${seq}`, studentId, eventId, issueDate: _today() };
    db.certificates.push(cert);
    db.notifications.push({
      id: _uid("ntf"), audienceType: "student", audienceId: studentId, type: "certificate",
      message: `Your certificate for "${event.title}" is ready to download.`, createdAt: new Date().toISOString(), read: false,
    });
    _write(db);
    return cert;
  },
  getCertificatesForStudent(studentId) {
    const db = _read();
    return db.certificates
      .filter((c) => c.studentId === studentId)
      .map((c) => ({ ...c, event: db.events.find((e) => e.eventId === c.eventId) || null }))
      .filter((c) => c.event !== null);
  },
  getCertificate(certId) {
    const db = _read();
    const c = db.certificates.find((x) => x.id === certId);
    if (!c) return null;
    return { ...c, event: db.events.find((e) => e.eventId === c.eventId), student: db.students.find((s) => s.studentId === c.studentId) };
  },

  // ================= NOTIFICATIONS =================
  getNotificationsForStudent(studentId) {
    return _read().notifications.filter((n) => n.audienceType === "student" && n.audienceId === studentId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  getNotificationsForOrganizer(organizerId) {
    return _read().notifications.filter((n) => n.audienceType === "organizer" && n.audienceId === organizerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  getNotificationsForAdmin() {
    return _read().notifications.filter((n) => n.audienceType === "admin").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  markNotificationRead(notificationId) {
    const db = _read();
    const n = db.notifications.find((x) => x.id === notificationId);
    if (n) n.read = true;
    _write(db);
  },
  markAllRead(list) {
    const db = _read();
    const ids = new Set(list.map((n) => n.id));
    db.notifications.forEach((n) => { if (ids.has(n.id)) n.read = true; });
    _write(db);
  },
  sendReminder(eventId) {
    const db = _read();
    const event = db.events.find((e) => e.eventId === eventId);
    if (!event) throw new Error("Event not found.");
    const regs = db.registrations.filter((r) => r.eventId === eventId);
    regs.forEach((r) => {
      db.notifications.push({
        id: _uid("ntf"), audienceType: "student", audienceId: r.studentId, type: "reminder",
        message: `Reminder: "${event.title}" is coming up on ${event.date} at ${event.startTime}.`, createdAt: new Date().toISOString(), read: false,
      });
    });
    _write(db);
    return regs.length;
  },
  autoGenerateReminders(studentId) {
    const db = _read();
    const today = new Date();
    const regs = db.registrations.filter((r) => r.studentId === studentId);
    let created = 0;
    regs.forEach((r) => {
      const event = db.events.find((e) => e.eventId === r.eventId);
      if (!event || event.status !== "approved") return;
      const eventDate = new Date(event.date + "T00:00:00");
      const diffDays = (eventDate - today) / (1000 * 60 * 60 * 24);
      if (diffDays >= 0 && diffDays <= 2) {
        const already = db.notifications.some((n) => n.audienceType === "student" && n.audienceId === studentId && n.type === "reminder" && n.message.includes(event.title));
        if (!already) {
          db.notifications.push({
            id: _uid("ntf"), audienceType: "student", audienceId: studentId, type: "reminder",
            message: `Reminder: "${event.title}" is coming up on ${event.date} at ${event.startTime}.`, createdAt: new Date().toISOString(), read: false,
          });
          created++;
        }
      }
    });
    if (created) _write(db);
    return created;
  },

  // ================= DASHBOARD =================
  getDashboardStats() {
    const db = _read();
    return {
      totalEvents: db.events.length,
      upcomingEvents: this.upcomingEvents().length,
      completedEvents: this.completedEvents().length,
      totalStudents: db.students.length,
      totalRegistrations: db.registrations.length,
      totalParticipants: db.attendance.filter((a) => a.status === "present").length,
    };
  },
  getEventStatusBreakdown() {
    const db = _read();
    return {
      approved: db.events.filter((e) => e.status === "approved").length,
      pending: db.events.filter((e) => e.status === "pending").length,
      rejected: db.events.filter((e) => e.status === "rejected").length,
    };
  },
  getRegistrationsByCategory() {
    const db = _read();
    const map = {};
    db.registrations.forEach((r) => {
      const event = db.events.find((e) => e.eventId === r.eventId);
      if (!event) return;
      map[event.category] = (map[event.category] || 0) + 1;
    });
    return Object.entries(map).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
  },
  getAttendanceBreakdown() {
    const db = _read();
    return { present: db.attendance.filter((a) => a.status === "present").length, absent: db.attendance.filter((a) => a.status === "absent").length };
  },

  // ================= REPORTS =================
  _filteredRegistrations(filters) {
    const db = _read();
    let regs = db.registrations.map((r) => ({
      ...r, event: db.events.find((e) => e.eventId === r.eventId), student: db.students.find((s) => s.studentId === r.studentId),
    })).filter((r) => r.event && r.student);

    if (filters.eventId) regs = regs.filter((r) => r.eventId === filters.eventId);
    if (filters.date) regs = regs.filter((r) => r.event.date === filters.date);
    if (filters.department) regs = regs.filter((r) => r.student.department === filters.department);
    if (filters.studentId) regs = regs.filter((r) => r.studentId === filters.studentId);
    return regs;
  },

  reportEventRegistrations(filters = {}) {
    const regs = this._filteredRegistrations(filters);
    const byEvent = {};
    regs.forEach((r) => {
      if (!byEvent[r.eventId]) byEvent[r.eventId] = { event: r.event, count: 0 };
      byEvent[r.eventId].count++;
    });
    return Object.values(byEvent).map((row) => ({ event: row.event, registered: row.count, capacity: row.event.maxParticipants })).sort((a, b) => a.event.date.localeCompare(b.event.date));
  },

  reportStudentParticipation(filters = {}) {
    const db = _read();
    const regs = this._filteredRegistrations(filters);
    const byStudent = {};
    regs.forEach((r) => {
      if (!byStudent[r.studentId]) byStudent[r.studentId] = { student: r.student, registered: 0, attended: 0 };
      byStudent[r.studentId].registered++;
      const att = db.attendance.find((a) => a.studentId === r.studentId && a.eventId === r.eventId);
      if (att && att.status === "present") byStudent[r.studentId].attended++;
    });
    return Object.values(byStudent).sort((a, b) => a.student.name.localeCompare(b.student.name));
  },

  reportEventAttendance(filters = {}) {
    const db = _read();
    let events = db.events.filter((e) => e.status === "approved");
    if (filters.eventId) events = events.filter((e) => e.eventId === filters.eventId);
    if (filters.date) events = events.filter((e) => e.date === filters.date);
    return events.map((event) => {
      let regs = db.registrations.filter((r) => r.eventId === event.eventId);
      if (filters.department) {
        regs = regs.filter((r) => { const s = db.students.find((x) => x.studentId === r.studentId); return s && s.department === filters.department; });
      }
      if (filters.studentId) regs = regs.filter((r) => r.studentId === filters.studentId);
      const att = regs.map((r) => db.attendance.find((a) => a.eventId === event.eventId && a.studentId === r.studentId));
      return {
        event, total: regs.length,
        present: att.filter((a) => a && a.status === "present").length,
        absent: att.filter((a) => a && a.status === "absent").length,
        unmarked: att.filter((a) => !a).length,
      };
    }).sort((a, b) => a.event.date.localeCompare(b.event.date));
  },

  reportPresentAbsentStats(filters = {}) {
    const rows = this.reportEventAttendance(filters);
    const totals = rows.reduce((acc, r) => {
      acc.present += r.present; acc.absent += r.absent; acc.unmarked += r.unmarked; acc.total += r.total;
      return acc;
    }, { present: 0, absent: 0, unmarked: 0, total: 0 });
    return { totals, rows };
  },
};
