# University Event Management System (UEMS)

The University Event Management System (UEMS) is a comprehensive web-based platform designed to manage campus events efficiently. It provides specialized dashboards and tools for administrators, event organizers, and students to streamline event creation, registration, attendance tracking, and certificate issuance.

## 🚀 Features & Modules

- **Role-Based Access Control (RBAC):** Secure authentication and session management for three distinct roles: Admin, Organizer, and Student.
- **Event Lifecycle Management:** 
  - Organizers can propose events.
  - Admins can approve or reject event proposals.
  - Admins can also directly create pre-approved events.
- **Student Registration:** Students can browse upcoming events and register for them seamlessly.
- **QR Code Integration:** Quick check-ins using auto-generated QR codes for event participants.
- **Attendance Tracking:** Organizers can mark attendance during the event.
- **Automated Certificates:** Digital certificates are automatically generated and issued to students marked as 'present'.
- **Notifications Engine:** Real-time updates for registration confirmations, event approvals, cancellations, reminders, and certificate availability.
- **Analytics & Reporting:** Visual charts on the admin dashboard to track registrations, attendance rates, and event popularity.

## 💻 Technology Stack

The project currently uses a pure client-side stack with a simulated local database, designed to be easily connectable to a robust backend later.

- **Frontend:**
  - HTML5 & CSS3 (Vanilla)
  - JavaScript (ES6+)
- **Libraries/Dependencies:**
  - `qrcode.min.js` (for generating QR codes)
- **Database/Storage:**
  - **Development Phase:** Uses a local storage simulation layer (`db.js`) to mimic backend CRUD operations and relationship mapping.
  - **Production/Backend Phase:** A complete MySQL schema (`schema.sql`) is provided to mirror the frontend data structure perfectly.

## 📂 Project Structure

```
uni-event-management/
│
├── index.html            # Login/Authentication page
├── admin.html            # Dashboard for Administrators
├── organizer.html        # Dashboard for Event Organizers
├── student.html          # Dashboard for Students
│
├── style.css             # Main stylesheet for all pages
│
├── auth.js               # Authentication and Session layer
├── db.js                 # Simulated database using localStorage
├── admin.js              # Logic for the admin dashboard
├── organizer.js          # Logic for the organizer dashboard
├── student.js            # Logic for the student dashboard
├── util.js               # Shared utility functions
├── qr.js                 # QR code generation logic
├── notifications.js      # Notification system logic
├── certificate.js        # Certificate generation and rendering logic
├── charts.js             # Data visualization logic
│
├── qrcode.min.js         # Vendor library for QR Code rendering
│
└── schema.sql            # MySQL Database schema definition
```

## 🗄️ Database Schema

The provided MySQL schema (`schema.sql`) includes the following core entities and relationships:

- **`users`**: Manages login credentials and roles. Links to `students` and `organizers`.
- **`students`**: Stores student profiles (Roll Number, Department, Semester).
- **`organizers`**: Stores organizer profiles (Name, Department).
- **`events`**: Details about campus events (Date, Time, Venue, Max Participants, Status).
- **`registrations`**: Many-to-many relationship mapping students to the events they registered for.
- **`attendance`**: Tracks whether a registered student was 'present' or 'absent'.
- **`certificates`**: Automatically issued records linked to an event and a student based on attendance.
- **`notifications`**: Stores alerts sent to specific users or broadcasted by admins.

## ⚙️ Setup & Usage

1. **Clone the repository** (or download the files).
2. **Open `index.html`** in any modern web browser.
3. The simulated database (`db.js`) will automatically initialize.
4. **Login Details:**
   - You can use the default seeded admin account (Username: `admin`, Password: `admin123`).
   - Additional users (Organizers/Students) can be created from the Admin Dashboard.

## 🔧 Future Improvements

- Connect the frontend to a Node.js/Python backend server.
- Implement real authentication using JWT.
- Replace the local `db.js` layer with RESTful API calls interacting with the provided MySQL schema.
