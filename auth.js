/* ============================================================
   UEMS Auth / Session Layer
   Uses sessionStorage so each browser tab keeps its own logged-in
   user, and the session naturally clears when the tab is closed —
   the client-side analogue of a server session.
   ============================================================ */

const SESSION_KEY = "uems_session_v1";

const Auth = {
  login(username, password, role) {
    const user = DB.findUser(username, password, role);
    if (!user) throw new Error("Invalid username or password.");
    const session = {
      userId: user.userId,
      username: user.username,
      role: user.role,
      studentId: user.studentId,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },
  logout() {
    sessionStorage.removeItem(SESSION_KEY);
  },
  current() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  requireRole(role) {
    const session = this.current();
    if (!session || session.role !== role) {
      window.location.href = "index.html";
      return null;
    }
    return session;
  },
};
