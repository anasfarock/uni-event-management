-- ============================================================
-- University Event Management System — MySQL Schema (v2)
-- Extends the Assignment 2 schema with the Organizer role, event
-- approval workflow, attendance, notifications, and certificates.
-- Mirrors the localStorage data layer in js/db.js so the front
-- end can be pointed at a real backend later with the same field
-- names and relationships.
-- ============================================================

CREATE DATABASE IF NOT EXISTS uems;
USE uems;

-- Login accounts for admins, organizers, and students.
CREATE TABLE users (
  user_id      INT AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(50) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,   -- store a hash (e.g. bcrypt), not plain text
  role         ENUM('admin', 'organizer', 'student') NOT NULL,
  student_id   VARCHAR(20) NULL,        -- set only when role = 'student'
  organizer_id VARCHAR(20) NULL,        -- set only when role = 'organizer'
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student records managed by admins.
CREATE TABLE students (
  student_id   VARCHAR(20) PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  roll_number  VARCHAR(30) NOT NULL UNIQUE,
  email        VARCHAR(100) NOT NULL UNIQUE,
  department   VARCHAR(80) NOT NULL,
  semester     TINYINT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event Organizer accounts managed by admins.
CREATE TABLE organizers (
  organizer_id VARCHAR(20) PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(100) NOT NULL UNIQUE,
  department   VARCHAR(80) NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
  ADD CONSTRAINT fk_users_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_users_organizer FOREIGN KEY (organizer_id) REFERENCES organizers(organizer_id) ON DELETE CASCADE;

-- Campus events. Organizer-submitted events start 'pending' and
-- need admin approval; admin-created events are auto-approved.
CREATE TABLE events (
  event_id          INT AUTO_INCREMENT PRIMARY KEY,
  title             VARCHAR(150) NOT NULL,
  description       TEXT NOT NULL,
  category          VARCHAR(50) NOT NULL,
  event_date        DATE NOT NULL,
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  venue             VARCHAR(100) NOT NULL,
  max_participants  INT NOT NULL,
  status            ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  organizer_id      VARCHAR(20) NULL,   -- NULL when created directly by admin
  created_by        ENUM('admin', 'organizer') NOT NULL,
  rejection_reason  VARCHAR(255) NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES organizers(organizer_id) ON DELETE SET NULL,
  CHECK (end_time > start_time)
);

-- Registrations link students to events (many-to-many).
CREATE TABLE registrations (
  registration_id  INT AUTO_INCREMENT PRIMARY KEY,
  student_id       VARCHAR(20) NOT NULL,
  event_id         INT NOT NULL,
  registered_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  UNIQUE KEY uq_student_event (student_id, event_id)  -- blocks duplicate registration
);

-- One attendance record per (event, student), set by the organizer.
CREATE TABLE attendance (
  attendance_id    INT AUTO_INCREMENT PRIMARY KEY,
  event_id         INT NOT NULL,
  student_id       VARCHAR(20) NOT NULL,
  status           ENUM('present', 'absent') NOT NULL,
  marked_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  UNIQUE KEY uq_attendance_event_student (event_id, student_id)
);

-- Certificates are issued automatically once attendance = 'present'.
CREATE TABLE certificates (
  certificate_id      INT AUTO_INCREMENT PRIMARY KEY,
  certificate_number  VARCHAR(50) NOT NULL UNIQUE,
  student_id          VARCHAR(20) NOT NULL,
  event_id            INT NOT NULL,
  issue_date          DATE NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  UNIQUE KEY uq_certificate_event_student (event_id, student_id)
);

-- Notifications: registration confirmation, approval/rejection,
-- cancellation, reminders, and certificate availability.
CREATE TABLE notifications (
  notification_id  INT AUTO_INCREMENT PRIMARY KEY,
  audience_type     ENUM('admin', 'organizer', 'student') NOT NULL,
  audience_id        VARCHAR(20) NULL, -- organizer_id or student_id; NULL for admin broadcast
  type               ENUM('registration', 'approval', 'rejection', 'approval_needed', 'cancellation', 'reminder', 'certificate') NOT NULL,
  message            VARCHAR(255) NOT NULL,
  is_read            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed an admin account (replace the password hash before real use).
INSERT INTO users (username, password, role, student_id, organizer_id)
VALUES ('admin', 'admin123', 'admin', NULL, NULL);
