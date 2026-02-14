# Software Requirements Specification (SRS)

**Project:** Smart Queue Management System  
**Prepared for:** Final Year Review (30 Jan)  
**Version:** 1.0  
**Date:** 2026-01-27

---
## 1. Introduction
### 1.1 Purpose
Document the functional and non-functional requirements for the Smart Queue Management System so stakeholders (students, advisors, evaluators, and future developers) share a common understanding of scope and acceptance criteria.

### 1.2 Scope
A web-based queue management platform where users take tokens for a service and track progress, while admins control the queue, view analytics, and manage timing estimates. Target deployments: frontend (Vercel/Netlify), backend (Render), database (MongoDB Atlas).

### 1.3 Definitions, Acronyms, Abbreviations
- **Token**: A numbered ticket representing a user's position in the queue.
- **Service Type**: Category selected by user (e.g., Billing, Support, Admissions).
- **Admin**: Authenticated staff member managing the queue.
- **Waiting/Serving/Served**: Queue states for a token.

### 1.4 References
- Project README (tech stack, setup, endpoints).
- MongoDB Atlas documentation.
- Express.js, React, Vite documentation.

### 1.5 Intended Audience and Reading Suggestions
- **Evaluators/Advisors:** Read sections 2–4 for scope and compliance.
- **Developers:** Read sections 4–6 for implementation guidance.
- **Testers:** Focus on section 7 for test coverage expectations.

---
## 2. Overall Description
### 2.1 Product Perspective
- Three-tier web app: React SPA frontend, Node/Express REST API, MongoDB database.
- Stateless frontend communicates with REST endpoints; polling every 5s for live status.
- JWT-secured admin area; public user area.

### 2.2 Product Functions (High-Level)
- Users request a token for a chosen service type.
- Users view current serving token, waiting count, estimated wait time, and their own token status.
- Admins authenticate, advance the queue, reset queues, assign expected service times, and view analytics (totals, served count, timing stats).

### 2.3 User Classes and Characteristics
- **User (Anonymous):** Needs quick token issuance and status visibility; non-technical.
- **Admin (Staff):** Authorized personnel; comfortable with web dashboards; responsible for queue operations and reporting.

### 2.4 Operating Environment
- Frontend: Modern browsers (Chrome/Firefox/Edge/Safari), desktop and mobile.
- Backend: Node.js 18+, Express server, hosted on Render or equivalent.
- Database: MongoDB Atlas.

### 2.5 Design and Implementation Constraints
- Network latency may affect polling responsiveness; fallback estimates must remain conservative.
- One active serving token at a time enforced by controller logic and atomic counter updates.
- Environment variables required: `MONGODB_URI`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `PORT`, and frontend `VITE_API_URL` for deployments.
- Authentication limited to admins (no user auth).

### 2.6 Assumptions and Dependencies
- Reliable internet connectivity for both frontend and backend hosts.
- MongoDB Atlas availability and proper IP allowlisting.
- Admin credentials are provisioned and securely stored in environment variables or seeded securely.
- Average wait time estimation depends on historical served tokens; early usage uses fallback (5 min per token).

---
## 3. System Features (Functional Requirements)
Each requirement is testable via UI or API.

### 3.1 User Token Generation
- The system shall allow a user to request a token by providing `serviceType`.
- The system shall reject token creation when `serviceType` is missing.
- The system shall return the assigned `tokenNumber` and `serviceType` on success.

### 3.2 User Status View
- The system shall display the current serving token (or null when none).
- The system shall display the count of waiting tokens.
- The system shall compute and show estimated wait time in minutes using historical averages or a 5-minute fallback per token.
- The system shall show the requesting user their token status when `tokenNumber` is supplied.
- The frontend shall refresh status every 5 seconds without a full page reload.

### 3.3 Admin Authentication
- The system shall authenticate admins via username/password and issue a JWT valid for 8 hours.
- The system shall reject login when required fields are missing or credentials are invalid.
- The system shall require a configured `JWT_SECRET`; otherwise, login fails with server error.

### 3.4 Admin Queue Control
- The system shall allow an admin to move to the next token, marking the current serving token as served and promoting the earliest waiting token to serving.
- The system shall respond with the new `currentServingToken` or indicate when none are waiting.
- The system shall allow an admin to reset the queue (clears tokens, resets counter to zero).

### 3.5 Admin Analytics and Monitoring
- The system shall provide total tokens generated, tokens served, and average waiting time (createdAt → servedAt) in minutes.
- The system shall provide a waiting list ordered by `tokenNumber` with `tokenNumber`, `serviceType`, and `createdAt`.
- The system shall provide timing statistics for served tokens: average, min, max, median, total served (last 50 served for performance) and recent served list with duration, `assignedServiceTime`, and timestamps.

### 3.6 Admin Service-Time Assignment
- The system shall allow an admin to assign an expected service time (minutes) to any token by `tokenNumber`.
- The system shall validate that `assignedServiceTime` is a non-negative number and that the token exists.
- The system shall return the updated token with the assigned time.

### 3.7 Token Retrieval for Admin UI
- The system shall return all tokens ordered by `tokenNumber` with status, service type, `assignedServiceTime`, and creation time for dropdowns or selection lists.

---
## 4. External Interface Requirements
### 4.1 User Interface (UI)
- Responsive web UI with separate views: User page (token request/status) and Admin dashboard (login, controls, analytics).
- Clear status indicators: current serving token, waiting count, estimated wait time, and user token status.
- Admin dashboard panels: next/reset controls, waiting list, analytics cards, timing stats, and token selection for assigning service time.

### 4.2 Application Programming Interfaces (APIs)
- POST `/api/queue/token` — create token (body: `serviceType`).
- GET `/api/queue/status?tokenNumber=` — fetch status and estimated wait time.
- POST `/api/admin/login` — admin JWT.
- POST `/api/admin/next` — advance queue.
- POST `/api/admin/reset` — clear queue and counter.
- GET `/api/admin/analytics` — totals and averages.
- GET `/api/admin/waiting` — waiting tokens list.
- GET `/api/admin/timings` — timing stats and recent served tokens.
- POST `/api/admin/assign-time` — assign expected service time.
- GET `/api/admin/all-tokens` — list all tokens.

### 4.3 Hardware Interfaces
- None beyond standard client devices (desktop/mobile) and cloud-hosted servers.

### 4.4 Software Interfaces
- MongoDB Atlas via Mongoose ODM.
- JWT for authentication; bcrypt for password hashing.
- Axios for frontend HTTP requests.

### 4.5 Communications Interfaces
- HTTPS for all client-server communication in production.
- Polling interval: 5 seconds for user status updates.

---
## 5. System Models
### 5.1 Data Model (Entities)
- **Admin**: `username (unique, required)`, `password (hashed)`.
- **Counter**: `name (unique)`, `seq (Number)`; used for atomic token increments.
- **Queue Token**: `tokenNumber (required, indexed)`, `serviceType (required)`, `status (waiting|serving|served)`, `createdAt`, `servedAt`, `assignedServiceTime`.

### 5.2 State/Workflow (Textual)
1. User requests token → system increments counter → creates token in `waiting` state.
2. Admin logs in → receives JWT → accesses dashboard.
3. Admin clicks "Next" → current `serving` becomes `served`; earliest `waiting` becomes `serving`.
4. Users poll status → see current serving, waiting count, estimated wait, and personal token state.
5. Admin may reset queue → tokens deleted; counter reset to zero.
6. Admin may assign expected service time to any token for better estimates.

---
## 6. Non-Functional Requirements
### 6.1 Performance
- Token creation and status responses should complete within 500 ms under normal load (<50 concurrent users) on typical cloud free-tier instances.
- Polling every 5 seconds should not overload the server; endpoints must be O(1) or O(log n) with indexed queries.
- Admin timing stats limited to last 50 served tokens to keep responses fast.

### 6.2 Reliability and Availability
- Target uptime 99% during demo period; graceful handling when MongoDB is unavailable (clear error messaging).
- Queue state consistency ensured by atomic counter increments and single `serving` token rule in controller logic.

### 6.3 Security
- Admin passwords stored hashed with bcrypt; JWT used for session management.
- All admin endpoints require valid JWT; user endpoints remain public by design.
- Environment secrets not committed to source control; provided via `.env`.
- Use HTTPS in production; restrict CORS to known frontend origin when deployed.

### 6.4 Usability
- Mobile-responsive layout; clear CTAs for requesting token and checking status.
- Admin dashboard actions (Next, Reset, Assign Time) should provide immediate feedback messages.

### 6.5 Maintainability and Supportability
- MVC structure (models/controllers/routes/middleware) with modular React components.
- Codebase uses async/await and centralized error handling middleware.
- .env.example documents required configuration.

### 6.6 Portability
- Frontend portable across modern browsers; backend deployable to any Node.js 18+ host.

### 6.7 Scalability (Future)
- Can replace polling with WebSockets/SSE for real-time updates.
- Horizontal scaling requires sticky sessions or stateless JWT (already stateless); MongoDB cluster can be scaled.

---
## 7. Validation and Testing
- **Unit tests (planned):** Controller logic for token generation, next/reset, analytics calculations, and validation errors.
- **Integration tests (planned):** API endpoints with in-memory MongoDB; verify JWT protection on admin routes.
- **UI tests (planned):** Cypress/Playwright for user token flow and admin dashboard actions.
- **Performance checks:** Manual load test for 50 concurrent users; ensure response times under 500 ms for key endpoints.
- **Acceptance criteria:** All functional requirements in section 3 are demonstrably satisfied; non-functional targets in section 6 are explained and approximated in demo.

---
## 8. Risks and Mitigations
- **DB downtime:** Mitigate with clear error messages and retry logic; consider MongoDB multi-region if needed.
- **Single admin credential compromise:** Rotate credentials; use stronger passwords; consider role-based accounts later.
- **High polling load:** Monitor server metrics; migrate to WebSockets if load increases.

---
## 9. Future Enhancements (Not in Scope for Review)
- Role-based multi-admin accounts with audit logs.
- Push-based realtime updates (WebSockets/SSE) to eliminate polling.
- SMS/email notifications when a token is near serving.
- Service-specific counters and parallel queues.
- Kiosk mode UI for on-prem screens.

---
## 10. Approval
- **Prepared by:** Project Team
- **Reviewed by:** (To be filled during review)
- **Approved by:** (To be filled)
