/* ============================================================
   UEMS Data Layer
   Simulates the relational schema described in schema.sql using
   localStorage. Table shapes mirror the SQL tables exactly, so
   swapping this file for real fetch() calls to a MySQL/PHP or
   Node backend later is a drop-in replacement — nothing in
   admin.js / student.js / auth.js needs to change if you keep
   the same function names and return shapes.
   ============================================================ */

const DB_KEY = "uems_db_v1";

function _uid(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function _seed() {
  const now = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const future = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return iso(d);
  };

  const students = [
    { studentId: "STU-1001", name: "Ayesha Khan", rollNumber: "BSSE-021", email: "ayesha.khan@szabist.pk", department: "Computer Science", semester: 6 },
    { studentId: "STU-1002", name: "Bilal Ahmed", rollNumber: "BSSE-045", email: "bilal.ahmed@szabist.pk", department: "Software Engineering", semester: 4 },
    { studentId: "STU-1003", name: "Sara Farooq", rollNumber: "BSCS-012", email: "sara.farooq@szabist.pk", department: "Computer Science", semester: 2 },
  ];

  const users = [
    { userId: _uid("usr"), username: "admin", password: "admin123", role: "admin", studentId: null },
    { userId: _uid("usr"), username: "ayesha.khan", password: "student123", role: "student", studentId: "STU-1001" },
    { userId: _uid("usr"), username: "bilal.ahmed", password: "student123", role: "student", studentId: "STU-1002" },
    { userId: _uid("usr"), username: "sara.farooq", password: "student123", role: "student", studentId: "STU-1003" },
  ];

  const events = [
    {
      eventId: _uid("evt"), title: "AI & Robotics Symposium", category: "Technology",
      description: "A department-wide symposium covering applied AI, robotics demos, and a panel with industry speakers.",
      date: future(7), startTime: "10:00", endTime: "13:00", venue: "Auditorium A", maxParticipants: 120,
    },
    {
      eventId: _uid("evt"), title: "Inter-University Football Cup", category: "Sports",
      description: "Knockout football tournament between CS, SE, and Business departments. Open to all students.",
      date: future(14), startTime: "16:00", endTime: "19:00", venue: "Sports Ground", maxParticipants: 60,
    },
    {
      eventId: _uid("evt"), title: "Battle of Bands", category: "Cultural",
      description: "Annual music competition — student bands compete for the SZABIST trophy.",
      date: future(21), startTime: "18:00", endTime: "21:30", venue: "Open Air Theatre", maxParticipants: 200,
    },
    {
      eventId: _uid("evt"), title: "Resume & LinkedIn Workshop", category: "Career",
      description: "Hands-on workshop on building a hire-ready resume and LinkedIn profile, run by the careers office.",
      date: future(3), startTime: "14:00", endTime: "15:30", venue: "Seminar Room 2", maxParticipants: 40,
    },
  ];

  return { users, students, events, registrations: [] };
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

  // ---------- users ----------
  findUser(username, password, role) {
    const db = _read();
    return db.users.find(
      (u) => u.username.toLowerCase() === String(username).toLowerCase() && u.password === password && u.role === role
    ) || null;
  },
  userExists(username) {
    const db = _read();
    return db.users.some((u) => u.username.toLowerCase() === String(username).toLowerCase());
  },

  // ---------- students ----------
  getStudents() {
    return _read().students.slice();
  },
  getStudent(studentId) {
    return _read().students.find((s) => s.studentId === studentId) || null;
  },
  addStudent(student, credentials) {
    const db = _read();
    if (db.students.some((s) => s.studentId === student.studentId)) {
      throw new Error("A student with this Student ID already exists.");
    }
    if (db.students.some((s) => s.email.toLowerCase() === student.email.toLowerCase())) {
      throw new Error("A student with this email already exists.");
    }
    db.students.push(student);
    if (credentials) {
      if (db.users.some((u) => u.username.toLowerCase() === credentials.username.toLowerCase())) {
        throw new Error("That login username is already taken.");
      }
      db.users.push({
        userId: _uid("usr"),
        username: credentials.username,
        password: credentials.password,
        role: "student",
        studentId: student.studentId,
      });
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
    _write(db);
  },
  searchStudents(query) {
    const q = query.trim().toLowerCase();
    if (!q) return this.getStudents();
    return _read().students.filter((s) =>
      [s.studentId, s.name, s.rollNumber, s.email, s.department].some((f) => String(f).toLowerCase().includes(q))
    );
  },

  // ---------- events ----------
  getEvents() {
    return _read().events.slice();
  },
  getEvent(eventId) {
    return _read().events.find((e) => e.eventId === eventId) || null;
  },
  addEvent(event) {
    const db = _read();
    const eventId = _uid("evt");
    const record = { ...event, eventId };
    db.events.push(record);
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
    db.events = db.events.filter((e) => e.eventId !== eventId);
    db.registrations = db.registrations.filter((r) => r.eventId !== eventId);
    _write(db);
  },
  searchEvents(query, category) {
    let list = _read().events.slice();
    const q = (query || "").trim().toLowerCase();
    if (q) {
      list = list.filter((e) =>
        [e.title, e.description, e.category, e.venue].some((f) => String(f).toLowerCase().includes(q))
      );
    }
    if (category && category !== "All") {
      list = list.filter((e) => e.category === category);
    }
    return list;
  },
  upcomingEvents() {
    const today = new Date().toISOString().slice(0, 10);
    return _read()
      .events.filter((e) => e.date >= today)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  },
  categories() {
    const set = new Set(_read().events.map((e) => e.category));
    return ["All", ...Array.from(set).sort()];
  },

  // ---------- registrations ----------
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
    if (db.registrations.some((r) => r.studentId === studentId && r.eventId === eventId)) {
      throw new Error("You are already registered for this event.");
    }
    const takenCount = db.registrations.filter((r) => r.eventId === eventId).length;
    if (takenCount >= event.maxParticipants) {
      throw new Error("This event is full.");
    }
    const record = { id: _uid("reg"), studentId, eventId, registeredAt: new Date().toISOString() };
    db.registrations.push(record);
    _write(db);
    return record;
  },
  cancelRegistration(studentId, eventId) {
    const db = _read();
    db.registrations = db.registrations.filter((r) => !(r.studentId === studentId && r.eventId === eventId));
    _write(db);
  },
};
