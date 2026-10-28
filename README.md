# Smart Garbage Management System (SGMS)

A full-stack, enterprise-grade municipal waste management, circular economy composting, and bio-fertilizer marketplace platform.

---

## 1. Tech Stack Overview

- **Backend**: Node.js, Express.js, `mysql2/promise` (raw prepared SQL, strictly no ORM), `bcryptjs`, `jsonwebtoken`, `cors`, `dotenv`.
- **Database**: MySQL 8.x (`sgms_db`).
- **Frontend**: React 18, Vite 5, `react-router-dom` v6, `axios`, `recharts`, `leaflet` + `react-leaflet`, `lucide-react`, plain semantic CSS with custom Soft UI design tokens (strictly NO Tailwind, NO component libraries).
- **Default Ports**:
  - Backend: `http://localhost:5000`
  - Frontend: `http://localhost:5173`

---

## 2. Installation & Quick Start

### 2.1 Prerequisites
1. **Node.js** (v18 or higher recommended)
2. **MySQL Server 8.x** (installed and running locally)

### 2.2 MySQL Database Setup
Open your MySQL terminal or client (e.g. MySQL Workbench, phpMyAdmin, or `mysql` CLI) and create the database:
```sql
CREATE DATABASE sgms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2.3 Backend Setup & Configuration
1. Navigate to the backend directory:
   ```bash
   cd sgms/backend
   ```
2. Create or verify your `.env` configuration file (`sgms/backend/.env`):
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=sgms_db
   JWT_SECRET=sgms_secret_key
   JWT_EXPIRES_IN=7d
   ```
3. Install backend dependencies:
   ```bash
   npm install
   ```
4. Initialize the database schema and populate comprehensive seed data:
   ```bash
   npm run seed
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The backend will boot up on `http://localhost:5000` and confirm database connectivity.*

### 2.4 Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd sgms/frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will launch on `http://localhost:5173`. The Vite proxy automatically routes `/api/*` requests to `http://localhost:5000`.*

---

## 3. Demo Credentials Cheat Sheet

| Role | Email | Password | Access Portal |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@sgms.com` | `Admin@123` | `http://localhost:5173/admin` |
| **Municipal Driver** | `driver1@sgms.com` | `Driver@123` | `http://localhost:5173/driver` |
| **Citizen User** | `user@sgms.com` | `User@123` | `http://localhost:5173/app` |

*(Note: Additional drivers `driver2@sgms.com` and `driver3@sgms.com` are also available with password `Driver@123`)*

Expiry reminder demo users are also seeded. Use the email as the username and `User@123` as the password:
- `expiry7@sgms.com` (7 days remaining)
- `expiry5@sgms.com` (5 days remaining)
- `expiry3@sgms.com` (3 days remaining)
- `expiry1@sgms.com` (1 day remaining / ends tomorrow)
- `expiry0@sgms.com` (ends today)
- `expired@sgms.com` (expired yesterday / 1 day after end of subscription)
- `expired3@sgms.com` (expired 3 days ago / after end of subscription)

---

## 4. Key Features by Role

### 🏛️ Municipal Administrator (`/admin`)
- **Executive Operations Dashboard**: Real-time KPI StatCards, 6-month historical waste volume Recharts BarChart, waste category breakdown PieChart, dispatch lifecycle status PieChart, and instant alerts for full bins.
- **Smart Bins Fleet Directory**: System-wide inspection of citizen bins with location markers, GPS coordinates, and live fill status indicators.
- **Dynamic Collection Dispatcher**: Review incoming citizen collection requests. Approve requests and dispatch nearby available drivers using real-time Haversine distance calculations with an automated *"Recommended"* driver badge.
- **Driver Fleet Management**: Register new municipal drivers with driving license, vehicle plate number, service zone, and depot GPS pin using interactive Leaflet map picker. Toggle driver account activations.
- **Waste Records & Scale Auditing**: Audit collection weights logged by drivers with weight adjustment capabilities.
- **Circular Composting Management**: Group collected organic waste records into municipal composting batches, track 21-day curing cycles, and complete batches to credit packaged compost yields directly to marketplace store inventory.
- **Marketplace & Category Administration**: Create and edit bio-fertilizers, soil conditioners, and compost products with crop suitability tags (`soil`, `crops`, `plants`, `vegetables`, `flowers`) and manage category taxonomies.
- **Store Order Fulfillment**: Manage citizen fertilizer orders through the fulfillment pipeline (`pending` &rarr; `paid` &rarr; `shipped` &rarr; `delivered`) and verify COD receipts.
- **Audit & Financial Ledgers**: Read-only unified payment audit trail (`TXN...`) and recurring citizen subscription rosters.
- **Citizen Grievance Redressal**: Support desk to resolve citizen complaints with official municipal responses and track driver service ratings.
- **Monthly Analytics & CSV Exports**: Monthly reporting on waste throughput, driver pickups, and revenue with one-click CSV download and print stylesheets.

---

### 🚛 Municipal Driver Portal (`/driver`)
- **Driver Operations Dashboard**: View assigned jobs count, total completed collections, verified waste collected (kg), and average star rating.
- **Availability Toggle**: Instant toggle switch ("Available for collection") allowing drivers to mark themselves online or offline for dispatch allocation.
- **Assigned Collection Pickups**:
  - Cards sorted by assignment time with citizen name, direct `tel:` phone call links, address, waste type, and bin fill status.
  - Interactive Leaflet route map thumbnail (height 180px) centered on citizen collection coordinates.
  - One-click *"Open in Google Maps"* button launching turn-by-turn navigation directions.
  - *"Mark as Collected"* modal: verified weight scale input (0.1 to 500 kg) and optional collection notes. Submitting automatically resets the citizen's smart bin to Empty, logs the municipal waste record, and notifies the citizen.
- **Collection History**: Complete historical ledger of past pickups with customer details, address, verified kilograms collected, and citizen star ratings (1-5 stars).
- **Driver Profile & Vehicle Credentials**: Read-only display of verified driving license number, vehicle plate, service zone, and depot GPS coordinates. Editable contact telephone and residential address, plus secure password change.

---

### 🏡 Citizen Resident Portal (`/app`)
- **Citizen Dashboard**: Overview of active subscriptions, registered smart bins, pending collection dispatches, and circular compost yield metrics.
- **Smart Bins Management (`/app/bins`)**: Register up to 5 smart bins with physical address and interactive Leaflet map pin placement. Simulated RFID sensor fill status toggles (`Empty`, `Half`, `Full`) and fill status history audit log.
- **Subscription Plans (`/app/subscription`)**: Purchase Monthly or Yearly waste collection plans via simulated mock payment modal with instant transaction receipt generation.
- **Request Collection (`/app/request`)**:
  - Real-time 3-condition status checker: (1) Active subscription, (2) Bin is Half or Full, (3) No open request for this bin.
  - Interactive Leaflet map prefilled with bin coordinates, address, and remarks.
- **My Requests & Lifecycle Tracking (`/app/requests`)**:
  - Filter requests by status: `All`, `Pending`, `Approved`, `Driver Assigned`, `Collected`, `Cancelled`.
  - 4-step visual progress Stepper (`Pending` &rarr; `Approved` &rarr; `Driver Assigned` &rarr; `Collected`) showing assigned driver name and vehicle registration.
  - Post-collection service rating modal (1 to 5 stars) with driver performance feedback.
- **Bio-Fertilizer Marketplace (`/app/marketplace`)**:
  - Filter by category, text search, price bounds, and *"Suggest for me"* smart crop selector (`plants`, `vegetables`, `flowers`, `soil`, `crops`).
  - Persistent shopping cart drawer with quantity steppers and mock checkout (UPI, Card, Wallet, COD).
- **My Orders (`/app/orders`)**: View past fertilizer orders, tracking numbers, and cancellation options for pending orders.
- **Monthly Waste & Compost Analytics (`/app/reports`)**: Interactive Recharts BarChart visualizing waste collected over 3, 6, or 12 months with estimated circular compost yield calculations (~40%).
- **Support & Complaints Desk (`/app/support`)**: File municipal grievance tickets associated with collection pickups and view admin resolution responses.
- **Notifications Feed (`/app/notifications`)**: Live notification alerts with unread counter and batch "Mark all as read" capability.

---

## 5. Security & Architecture Principles
- **Strict Role Isolation**: Route guards on `/admin/*`, `/driver/*`, and `/app/*` redirect unauthorized access attempts immediately.
- **Raw SQL Prepared Statements**: All database queries strictly utilize parameterized MySQL statements via `mysql2/promise` preventing SQL injection.
- **Stateless JWT Authorization**: JWT payload `{ id, role }` validated on all protected endpoints.
- **Transactional State Transitions**: All multi-table workflows (such as subscriptions, collections, order checkout, and batch completions) run within atomic database transactions with automatic rollback on error.
