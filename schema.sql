-- ============================================================
-- University Event Management System — MySQL Schema
-- Mirrors the localStorage data layer used in js/db.js so the
-- front end can be pointed at a real backend later with the
-- same field names and relationships.
-- ============================================================

CREATE DATABASE IF NOT EXISTS uems;
USE uems;

-- Login accounts for both admins and students.
CREATE TABLE users (
  user_id      INT AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(50) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,   -- store a hash (e.g. bcrypt), not plain text
  role         ENUM('admin', 'student') NOT NULL,
  student_id   VARCHAR(20) NULL,        -- set only when role = 'student'
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

ALTER TABLE users
  ADD CONSTRAINT fk_users_student
  FOREIGN KEY (student_id) REFERENCES students(student_id)
  ON DELETE CASCADE;

-- Campus events created by admins.
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
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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

-- Seed an admin account (replace the password hash before real use).
INSERT INTO users (username, password, role, student_id)
VALUES ('admin', 'admin123', 'admin', NULL);
