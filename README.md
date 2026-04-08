# Smart Queue Management System (Version 2.0)

Professional-grade digital token management platform for high-throughput service environments (Clinics, Banks, Customer Support Centers).

## Tech Stack
-   **Frontend**: React (Vite), Framer Motion (Micro-animations), Lucide-React (Iconography), Socket.io-client, Axios, Premium Glassmorphism CSS.
-   **Backend**: Node.js, Express.js, Socket.io (Realtime bidirectional updates), MongoDB (Mongoose), JWT-based Admin Security.
-   **Design**: Modern Dark Mode, Translucent UI components, Responsive Grid Layouts.

## Version 2.0 Enhancements
-   **Atomic Counter Engine**: Guarantees zero-collision token generation even under extreme concurrent loads.
-   **Wait-Time Intelligence**: Dynamic estimation based on average service duration (ASD) per service type.
-   **Admin Suite**: Comprehensive dashboard with live queue analytics, per-token time assignment, and historical reset capabilities.
-   **Digital Ticketing**: Seamless PDF/Digital ticket generation for users without account registration.
-   **SDG Alignment**: Built to support Sustainable Development Goals 3, 9, and 11 by improving health safety and urban efficiency.

## Project Structure
`smart-queue-system/`
-   `backend/`: MVC architecture, MongoDB models, JWT middleware, Express controllers.
-   `frontend/`: Modular React components, Tailwind-like custom CSS utilities, Vite optimization.
-   `docs/`: Comprehensive project reports (PDF, DOCX) and SDS/SRS documentation.
-   `docs/scripts/`: Automation scripts for detailed report generation.

## Running Locally
### Prerequisites
-   Node.js (LTS version recommended)
-   MongoDB Account or local installation (App supports in-memory MongoDB for demo mode).

### Commands
**Backend**:
```bash
cd backend
npm install
npm run start # or node demo_server.js for in-memory DB
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Design Philosophy (Advanced)
1.  **Stateless API Management**: Backend routes are strictly stateless, ensuring Horizontal scalability.
2.  **Concurrency Safe**: Uses `findOneAndUpdate` with `$inc` at the document level to ensure token integrity.
3.  **Authentication**: Multi-layered JWT protection with auto-expiration to secure administrative workflows.
4.  **UX First**: Zero-friction user journey with no-login required for public token actions.

## Deployment
-   **Frontend**: Vercel / Netlify
-   **Backend**: Render / Heroku / AWS EC2
-   **Database**: MongoDB Atlas Cluster
