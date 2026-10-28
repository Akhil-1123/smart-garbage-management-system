# Smart Garbage Management System (SGMS) - Project Context

## 1. Project Name & Overview
**Smart Garbage Management System (SGMS)** is an MVP web application for municipal solid waste management, door-to-door organic waste collection tracking, automated composting unit batch accounting, and eco-friendly compost/fertilizer e-commerce sales.

---

## 2. Technology Stack (Fixed)
- **Backend**: Node.js + Express
  - Database Driver: `mysql2/promise` (Raw SQL queries only; strictly **NO ORM**)
  - Authentication: `jsonwebtoken` (JWT), `bcryptjs`
  - Utility & Middleware: `cors`, `dotenv`
  - Dev Tooling: `nodemon`
- **Database**: MySQL (Version 8.0+ / 8.4 LTS, InnoDB engine, utf8mb4 charset)
- **Frontend** *(To be implemented in later phases)*:
  - Framework: React + Vite
  - Routing: `react-router-dom`
  - HTTP Client: `axios`
  - Visualizations & Charts: `recharts`
  - Maps: `react-leaflet` + `leaflet`
  - Icons: `lucide-react`
  - Styling: Plain CSS (no heavy utility frameworks)
- **Network Ports**:
  - Backend: `5000`
  - Frontend: `5173`

---

## 3. User Roles
The system defines 3 distinct roles:
1. **`admin`**: System Administrator with complete control over driver management, request approvals, inventory, composting batches, and reports.
2. **`driver`**: Assigned waste collection vehicle driver handling pickups, updates, route navigation, and waste entry.
3. **`user`**: Registered household or citizen requesting collections, managing smart bins, subscribing to plans, and ordering organic compost products.

---

## 4. Seeded Login Credentials
| Role | Name | Email | Password | Details |
|---|---|---|---|---|
| **Admin** | System Admin | `admin@sgms.com` | `Admin@123` | SGMS Headquarters |
| **Driver 1** | Rajesh Kumar | `driver1@sgms.com` | `Driver@123` | License: KL-DL-1001, Vehicle: KL-30-A-1111, Area: Chengannur |
| **Driver 2** | Anil Thomas | `driver2@sgms.com` | `Driver@123` | License: KL-DL-1002, Vehicle: KL-30-B-2222, Area: Mavelikkara |
| **Driver 3** | Sibin Varghese | `driver3@sgms.com` | `Driver@123` | License: KL-DL-1003, Vehicle: KL-30-C-3333, Area: Thiruvalla |

*Note: Public users register directly via the website. No users with role `user` are seeded.*

---

## 5. Database Schema & Tables (sgms_db)
The database contains 22 relational tables with foreign keys and cascade rules:
1. `roles` - System roles (`admin`, `driver`, `user`).
2. `users` - Registered accounts with role references, encrypted passwords, and contact info.
3. `drivers` - Driver profiles linked 1-to-1 with `users`, vehicle details, coordinates, and service areas.
4. `bins` - Waste bins with capacity (kg), current level (%), fill status (`empty`, `half`, `full`), and coordinates.
5. `user_bins` - Association table between users and their assigned bins.
6. `bin_status_history` - Audit log tracking every bin fill level update over time.
7. `subscription_plans` - Available waste collection subscription plans (e.g. Monthly, Yearly).
8. `subscriptions` - User subscriptions with active/expired statuses and date ranges.
9. `collection_requests` - Door-to-door or bin waste pickup requests with lifecycle statuses.
10. `driver_assignments` - Audit and tracking of driver dispatches per collection request.
11. `waste_records` - Logged waste weight (kg), type, and processing status upon driver pickup.
12. `composting_units` - Composting facilities (e.g., Chengannur Composting Unit).
13. `compost_batches` - Composting batch batches with input waste, output compost, and status.
14. `compost_batch_waste` - Association linking waste collection records to a compost batch.
15. `product_categories` - Categories for bio-fertilizers and compost products.
16. `products` - Products for sale in the marketplace with stock, pricing, and suitability tags.
17. `orders` - User purchase orders for fertilizers and compost.
18. `order_items` - Line items for individual products in an order.
19. `payments` - Unified mock payment transaction ledger for orders and subscriptions.
20. `feedback_complaints` - Grievances, complaints, or feedback from citizens.
21. `notifications` - User alert messages for collections, orders, and system events.
22. `reports` - Generated summary reports (monthly collection, waste, revenue).

---

## 6. Implementation Notes & Environment
- **Local MySQL Environment**: The host machine runs MySQL 8.4 on port `3307`. The `.env` configuration file is set with `DB_PORT=3307`, `DB_USER=root`, and `DB_PASSWORD=root123`.
- **`src/config/db.js`**: Uses `mysql2/promise` pool with fallback to port 3307/3306 and proper environment variable resolution.
- **Seeding Execution**: `npm run seed` executes `schema.sql` via multiple statements and populates required seed data.

---

## 7. Mandatory Development Rules for Later Phases
All subsequent phases MUST strictly adhere to the following 8 architectural and UI rules:

1. **Collection Request Lifecycle**:
   Collection request statuses must strictly transition through:
   `pending` ➔ `approved` ➔ `driver_assigned` ➔ `collected`
   *(or `cancelled` at any allowed stage before collection).*

2. **Bin Fill Status & Level Mapping**:
   Bin `fill_status` is updated manually by the user or driver with exact mapping:
   - `empty` = 0% of capacity
   - `half` = 50% of capacity
   - `full` = 100% of capacity
   Every change in bin status or fill level MUST insert an audit record into `bin_status_history`.

3. **Standardized API Response Contract**:
   All API endpoints must return uniform JSON structures:
   - Success: `{ "success": true, "data": ... }`
   - Failure / Error: `{ "success": false, "message": "..." }`
   *(With appropriate HTTP status codes like 200, 201, 400, 401, 403, 404, 500).*

4. **Authentication & Authorization**:
   - Token format: JWT passed in HTTP header `Authorization: Bearer <token>`.
   - Roles: `admin`, `driver`, `user`.
   - Driver creation: Only administrators (`admin`) can create driver profiles.
   - Public registration: The public signup endpoint creates accounts with role `user` only.

5. **Mock Payment Flow**:
   No external payment gateway integration. A payment transaction is created directly with status `success` and a uniquely generated transaction ID format: `"TXN" + Date.now() + Math.floor(1000 + Math.random() * 9000)`.

6. **Maps & Geographic Navigation**:
   - Map displays use Leaflet with OpenStreetMap tiles.
   - Driver navigation views must provide an "Open in Google Maps" direct link:
     `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`

7. **Units & Formatting**:
   - Currency: Indian Rupee (₹ symbol, e.g., ₹299.00).
   - Weights: Kilograms (kg, e.g., 20.00 kg).

8. **Soft UI Design System**:
   - Background: Light soothing `#f3f6f4`.
   - Card containers: Solid white `#ffffff`, rounded corners `border-radius: 16px`, soft subtle box shadows (`0 4px 20px rgba(0, 0, 0, 0.05)`).
   - Primary Accent Color: Nature green `#2e7d4f`.
   - Borders: Avoid harsh/heavy borders; use subtle tints or elevation instead.

---

## 8. API LIST

| Method | Path | Allowed Roles | Description |
|---|---|---|---|
| **Health** | | | |
| `GET` | `/api/health` | Public | System health check returning `{ status: "ok" }` |
| **Authentication & Profile** | | | |
| `POST` | `/api/auth/register` | Public | Register new user account (always role `user`) |
| `POST` | `/api/auth/login` | Public | Authenticate user, return JWT and profile |
| `GET` | `/api/auth/me` | `admin`, `driver`, `user` | Get profile of logged-in user |
| `PUT` | `/api/auth/profile` | `admin`, `driver`, `user` | Update name, phone, address |
| `PUT` | `/api/auth/password` | `admin`, `driver`, `user` | Change account password |
| **Admin User Management** | | | |
| `GET` | `/api/admin/users` | `admin` | List regular users with search, bins count & active plan |
| `PUT` | `/api/admin/users/:id/toggle-active` | `admin` | Toggle user active / deactivated status |
| **Admin Driver Management** | | | |
| `GET` | `/api/admin/drivers` | `admin` | List drivers with ratings and completed collections |
| `POST` | `/api/admin/drivers` | `admin` | Create a new driver account in a transaction |
| `PUT` | `/api/admin/drivers/:id` | `admin` | Update driver details, location, and availability |
| `PUT` | `/api/admin/drivers/:id/toggle-active` | `admin` | Deactivate/activate driver account |
| **Subscriptions** | | | |
| `GET` | `/api/subscription-plans` | Public | List active subscription plans |
| `POST` | `/api/subscriptions` | `user` | Purchase subscription with mock payment |
| `GET` | `/api/subscriptions/my` | `user` | List user's subscriptions newest first |
| `PUT` | `/api/subscriptions/:id/cancel` | `user` | Cancel an active subscription |
| `GET` | `/api/admin/subscriptions` | `admin` | List all user subscriptions |
| **Bins Management** | | | |
| `POST` | `/api/bins` | `user` | Create a smart bin (max 5 per user) |
| `GET` | `/api/bins/my` | `user` | Get user's active bins with status & history |
| `PUT` | `/api/bins/:id` | `user` | Update bin location or capacity (owner only) |
| `PUT` | `/api/bins/:id/status` | `user` | Update bin fill status (`empty`/`half`/`full`) |
| `GET` | `/api/bins/:id/history` | `user` | Get latest 30 fill history records |
| `DELETE` | `/api/bins/:id` | `user` | Soft delete bin (blocked if open requests exist) |
| `GET` | `/api/admin/bins` | `admin` | List all bins across the system with owners |
| **Collection Requests** | | | |
| `POST` | `/api/collections` | `user` | Submit collection request for half/full bin |
| `GET` | `/api/collections/my` | `user` | List user's collection requests newest first |
| `GET` | `/api/collections/:id` | `user` | Get collection request details and timeline |
| `PUT` | `/api/collections/:id/cancel` | `user` | Cancel open collection request |
| `GET` | `/api/admin/collections` | `admin` | List all collection requests filterable by status |
| `PUT` | `/api/admin/collections/:id/approve` | `admin` | Approve pending collection request |
| `GET` | `/api/admin/collections/:id/nearby-drivers` | `admin` | Find nearest available drivers via Haversine |
| `PUT` | `/api/admin/collections/:id/assign` | `admin` | Assign driver to approved collection request |
| `PUT` | `/api/admin/collections/:id/cancel` | `admin` | Cancel open collection request with remarks |
| `GET` | `/api/admin/waste-records` | `admin` | List waste records filtered by month & status |
| `PUT` | `/api/admin/waste-records/:id` | `admin` | Correct recorded waste weight |
| **Driver Operations** | | | |
| `GET` | `/api/driver/profile` | `driver` | Get driver profile and operational stats |
| `PUT` | `/api/driver/availability` | `driver` | Toggle driver availability status |
| `GET` | `/api/driver/collections` | `driver` | Get assigned collection jobs with Google Maps URL |
| `PUT` | `/api/driver/collections/:id/collect` | `driver` | Complete waste collection, log weight, reset bin |
| `GET` | `/api/driver/history` | `driver` | View driver's collected history and ratings |
| **Composting Management** | | | |
| `GET` | `/api/admin/composting/units` | `admin` | List composting units |
| `POST` | `/api/admin/composting/units` | `admin` | Register a new composting facility unit |
| `PUT` | `/api/admin/composting/units/:id` | `admin` | Update composting unit details |
| `GET` | `/api/admin/composting/pending-waste` | `admin` | List unbatched collected organic waste records |
| `GET` | `/api/admin/composting/batches` | `admin` | List compost batches with input/output metrics |
| `POST` | `/api/admin/composting/batches` | `admin` | Create batch from organic waste records |
| `PUT` | `/api/admin/composting/batches/:id/complete` | `admin` | Complete batch and add compost to product stock |
| **Marketplace (Products & Categories)** | | | |
| `GET` | `/api/categories` | Public | List active product categories |
| `GET` | `/api/products` | Public | Browse products with search, category & price filters |
| `GET` | `/api/products/suggest` | Public | Suggest products based on use (`plants`/`soil`/etc.) |
| `GET` | `/api/products/:id` | Public | Get product details by ID |
| `POST` | `/api/admin/categories` | `admin` | Create product category |
| `PUT` | `/api/admin/categories/:id` | `admin` | Update product category |
| `DELETE` | `/api/admin/categories/:id` | `admin` | Soft delete category |
| `GET` | `/api/admin/products` | `admin` | List all products (including inactive) |
| `POST` | `/api/admin/products` | `admin` | Create a new marketplace product |
| `PUT` | `/api/admin/products/:id` | `admin` | Update product details, price, or stock |
| `DELETE` | `/api/admin/products/:id` | `admin` | Soft delete product |
| **Orders & Payments** | | | |
| `POST` | `/api/orders` | `user` | Place order with stock verification and mock payment |
| `GET` | `/api/orders/my` | `user` | List user's orders newest first |
| `GET` | `/api/orders/:id` | `user`, `admin` | Get order details and items |
| `PUT` | `/api/orders/:id/cancel` | `user` | Cancel pending/paid order and restore product stock |
| `GET` | `/api/admin/orders` | `admin` | List all customer orders |
| `PUT` | `/api/admin/orders/:id/status` | `admin` | Update order status (`paid`->`shipped`->`delivered`) |
| `GET` | `/api/admin/payments` | `admin` | Audit log of all payments (subscriptions and orders) |
| **Feedback & Complaints** | | | |
| `POST` | `/api/feedback` | `user` | Submit rating on collected request or general complaint |
| `GET` | `/api/feedback/my` | `user` | View user's submitted feedback and complaints |
| `GET` | `/api/feedback/rateable` | `user` | List collected requests eligible for feedback |
| `GET` | `/api/admin/feedback` | `admin` | List all feedback/complaints with status filter |
| `PUT` | `/api/admin/feedback/:id` | `admin` | Update complaint status and provide admin response |
| **Notifications** | | | |
| `GET` | `/api/notifications` | `admin`, `driver`, `user` | List latest 50 notifications and unread count |
| `PUT` | `/api/notifications/:id/read` | `admin`, `driver`, `user` | Mark a single notification as read |
| `PUT` | `/api/notifications/read-all` | `admin`, `driver`, `user` | Mark all notifications as read |
| **Reports & Dashboards** | | | |
| `GET` | `/api/reports/my/monthly` | `user` | User monthly waste summary & compost yield estimate |
| `GET` | `/api/admin/dashboard` | `admin` | Real-time system analytics and operational KPIs |
| `GET` | `/api/admin/reports/monthly` | `admin` | Monthly waste, collection, and revenue summary |
| `GET` | `/api/admin/reports/export` | `admin` | Export monthly summary report as CSV attachment |

---

## 9. Phase 5 Implementation: Frontend Foundation & User Pages

### 9.1 Architecture & Setup
- **Framework & Tooling**: React 18 + Vite 5 running on `http://localhost:5173`.
- **API Proxy**: Vite dev server proxies all `/api/*` calls directly to backend at `http://localhost:5000`.
- **Design System**: Implemented in [global.css](file:///d:/garbage-2/sgms/frontend/src/styles/global.css) using CSS variables:
  `--bg: #f3f6f4`, `--card: #ffffff`, `--primary: #2e7d4f`, `--primary-soft: #e4f2ea`, `--text: #1f2d27`, `--muted: #6b7b73`, `--danger: #d9534f`, `--warning: #f0a830`, `--info: #3b82c4`, `--radius: 16px`, `--shadow: 0 6px 20px rgba(46,125,79,0.08)`.
- **Styling Paradigm**: Plain, semantic CSS with custom responsive layout, Soft UI cards, buttons, badges, progress bars, and modal backdrops. Strictly NO Tailwind, NO component libraries.
- **Leaflet Integration**: Leaflet CSS imported with default marker icon fix applied via `L.Icon.Default.mergeOptions` in `main.jsx`.
- **State & Context**:
  - `AuthContext`: Manages user authentication, token storage, and role-based redirects (`admin` -> `/admin`, `driver` -> `/driver`, `user` -> `/app`).
  - `ToastContext`: Custom lightweight toast notifications.
  - `ProtectedRoute`: Role-based route guard redirecting unauthorized access to respective home dashboards or `/login`.

### 9.2 Reusable UI Components (`frontend/src/components/`)
- `Button`: Primary, secondary, and danger variants with loading spinner support.
- `Card`: Soft UI card with rounded corners and subtle drop shadow.
- `StatCard`: Visual KPI display with soft icon background and metric formatting.
- `Badge`: Status badges with soft color coding (`pending`, `approved`, `driver_assigned`, `collected`, `cancelled`, `half`, `full`, `empty`).
- `Modal`: Centered modal dialog with backdrop blur, keyboard ESC dismissal, and header/footer actions.
- `EmptyState`: Placeholder graphics and messages for empty lists.
- `FormField`: Standardized inputs for text, email, password, select, and textarea.
- `Stepper`: Horizontal step progress indicator with step badges and connecting progress tracks.
- `MapPicker`: Interactive Leaflet map picker allowing pin placement, current GPS location retrieval, and lat/lng emission.

### 9.3 Layouts (`frontend/src/layouts/`)
- `PublicLayout`: Clean top navbar with SGMS brand leaf icon, navigation links, and footer.
- `DashboardLayout`: Collapsible left sidebar navigation, mobile drawer with backdrop, top header with unread notification badge, user account pill, and logout action.

### 9.4 Implemented Pages
- **Public**:
  - `/` (`Landing`): Hero section, 4-step "How It Works" workflow, and featured bio-fertilizer products strip.
  - `/login` (`Login`): Authenticated login form with input validation and pre-fillable demo credentials cheat sheet.
  - `/register` (`Register`): Citizen signup form capturing name, email, phone, and collection address.
- **User Portal (`/app/*`)**:
  - `/app` (`UserDashboard`): Welcome card, active subscription KPI, bin count, open collection dispatches, total waste collected, quick bin status overview, and 3 latest requests.
  - `/app/bins` (`MyBins`): Interactive bin cards with soft level progress bars, instant segmented control status toggles (Empty/Half/Full), Add Bin modal with Leaflet map picker, Edit modal, Remove modal, and audit history log.
  - `/app/subscription` (`SubscriptionPage`): Active subscription details with cancellation option, Monthly & Yearly plan selection, simulated 1-second mock payment modal, and subscription history table.
  - `/app/profile` (`ProfilePage`): Profile contact updates and password change forms.
  - `/app/notifications` (`NotificationsPage`): Unread notifications feed with click-to-read and "Mark all as read" batch update.
  - Placeholder pages for incomplete user routes: `/app/request-collection`, `/app/requests`, `/app/marketplace`, `/app/orders`, `/app/report`, `/app/feedback`.
- **Role Portals**:
  - `/admin` (`AdminDashboard`): Protected administration portal placeholder.
  - `/driver` (`DriverDashboard`): Protected driver collection operations placeholder.

---

## 10. Phase 6 Implementation: Complete User Portal & Public Marketplace

### 10.1 Completed User Features & Workflows
- **`/app/request` & `/app/request-collection` (Request Collection)**:
  - Real-time 3-step pre-requisite status checker: (1) Active subscription, (2) Bin is Half or Full, (3) No open request for this bin.
  - Automatic disabled state with dynamic feedback message and contextual quick-link buttons to `/app/subscription` or `/app/bins`.
  - Smart bin select, waste type select, interactive [`MapPicker`](file:///d:/garbage-2/sgms/frontend/src/components/MapPicker.jsx) auto-populated with bin coordinates, address, and remarks.
  - Dispatches `POST /api/collections` and routes to `/app/requests`.

- **`/app/requests` & `/app/history` (My Requests & Collection History)**:
  - Status filter tabs: `All Requests`, `Pending`, `Approved`, `Driver Assigned`, `Collected`, `Cancelled`.
  - Request cards with status Badge, 4-step lifecycle [`Stepper`](file:///d:/garbage-2/sgms/frontend/src/components/Stepper.jsx) (`Pending` -> `Approved` -> `Driver Assigned` -> `Collected`), driver contact details, vehicle registration, and verified waste weight (kg).
  - Cancel button for open dispatches with confirmation dialog.
  - *"Rate this service"* 1-to-5 star rating modal with driver feedback comments submitting to `POST /api/feedback`.
  - Dedicated Collection History tab with completed pickups ledger.

- **`/app/marketplace` & `/marketplace` (Organic Fertilizer Marketplace)**:
  - Filter toolbar with text search, active category chips, min/max price bounds, and *"Suggest for me"* smart crop selector (`plants`, `vegetables`, `flowers`, `soil`, `crops`) interfacing `GET /api/products/suggest`.
  - Product cards with category badge, suitability tags, pricing per kg/unit, stock levels (`In stock`, `Low stock`, `Out of stock`), and quantity steppers.
  - Global `CartContext` with localStorage persistence per citizen user.
  - Slide-in `CartDrawer` with quantity adjustment, item removal, and subtotal calculation.
  - Checkout modal with delivery address prefill, payment method selection (UPI, Card, Wallet, COD), mock transaction processing, and `POST /api/orders` submission.
  - Public `/marketplace` view prompting unauthenticated guests to sign in upon adding to cart.

- **`/app/orders` (My Orders)**:
  - Order cards with order number, order date, total payable (`₹`), items summary, shipping address, and mock transaction reference (`TXN...`).
  - Cancellation flow for `pending`/`paid` orders calling `PUT /api/orders/:id/cancel` and restoring marketplace product stock.

- **`/app/reports` & `/app/report` (Monthly Waste & Compost Analytics)**:
  - Filter by 3, 6, or 12 calendar months (`GET /api/reports/my/monthly?months=...`).
  - Interactive Recharts `BarChart` displaying monthly collected waste weights.
  - StatCards for total waste collected (kg), verified pickups, and estimated circular compost yield (~40% conversion).
  - Monthly breakdown table and clean print stylesheet for `window.print()`.

- **`/app/support` & `/app/feedback` (Citizen Support & Grievance Redressal)**:
  - *"Complaints & Grievances"* tab: ticket filing form with optional collection request association, 10-character minimum message validation, and audit list of submitted tickets showing municipal admin responses.
  - *"My Driver Feedback"* tab: history of 5-star ratings and service reviews submitted for completed pickups.

---

## 11. Phase 7 Implementation: Municipal Administration Portal (`/admin/*`)

### 11.1 Overview & Architecture
- **Role Guard**: Protected by `ProtectedRoute allowedRoles={['admin']}` wrapped within [DashboardLayout.jsx](file:///d:/garbage-2/sgms/frontend/src/layouts/DashboardLayout.jsx).
- **Navigation (14 Nav Items)**: Dashboard, Users, Drivers, Bins, Collection Requests, Waste Records, Composting, Products, Orders, Payments, Subscriptions, Feedback & Complaints, Reports, Notifications.
- **Header & Branding**: Top bar dynamically displays "ADMIN CONSOLE" subtitle with system unread notification counter, role badge, and profile logout. Consumer cart icon is automatically hidden for administrators.
- **Styling**: Strictly adheres to the custom Soft UI design system in [global.css](file:///d:/garbage-2/sgms/frontend/src/styles/global.css) (plain CSS, NO Tailwind, NO component libraries).

### 11.2 Completed Administration Modules & Pages (`frontend/src/pages/admin/`)

1. **`/admin` (Admin Dashboard - [AdminDashboard.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/admin/AdminDashboard.jsx))**:
   - 6 KPI StatCards: Total Users, Total Drivers, Total Active Bins, Pending Requests, Total Waste Collected (kg), Total Store Orders.
   - Interactive Recharts `BarChart`: Monthly collected waste weight (kg) over the rolling 6-month window.
   - Interactive Recharts `PieChart`: Waste distribution by category (`organic`, `recyclable`, `hazardous`).
   - Interactive Recharts `PieChart`: Collection dispatch breakdown by status (`pending`, `approved`, `driver_assigned`, `collected`, `cancelled`).
   - Quick-action tables for Recent Requests (with direct links to `/admin/requests`), Recent Orders, "Full Bins" critical alert list, and Recent Feedback entries.

2. **`/admin/users` (Users Directory - [AdminUsers.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/admin/AdminUsers.jsx))**:
   - Searchable table filtering by resident name, email, or phone.
   - Columns: Avatar/Name, Contact details, Total smart bins registered, Current subscription plan badge, and Account status badge.
   - Confirmation modal to Activate/Deactivate citizen accounts calling `PUT /api/admin/users/:id/toggle-active`.

3. **`/admin/drivers` (Drivers Fleet Management - [AdminDrivers.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/admin/AdminDrivers.jsx))**:
   - Fleet roster displaying driver avatar, contact info, vehicle registration, assigned service area, live availability toggle, average star rating (1-5 stars), total completed pickups, and account status.
   - *"Add Driver"* modal capturing full name, email, phone, initial password, residence address, driving license no, vehicle no, service area, and GPS base depot location using the interactive Leaflet [MapPicker](file:///d:/garbage-2/sgms/frontend/src/components/MapPicker.jsx). Dispatches to `POST /api/admin/drivers`.
   - *"Edit Driver"* modal for profile & service area adjustments (excluding password).
   - Activate/Deactivate modal with confirmation dialog.

4. **`/admin/bins` (Smart Bins Directory - [AdminBins.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/admin/AdminBins.jsx))**:
   - Filter chips: `All`, `Empty`, `Half`, `Full`.
   - Table displaying Bin ID, Citizen owner name and email, physical address and lat/long coordinates, visual fill status progress bar, and timestamp of last telemetry update.

5. **`/admin/requests` (Collection Requests Dispatcher - [AdminRequests.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/admin/AdminRequests.jsx))**:
   - Status filter tabs with live counters: `All`, `Pending`, `Approved`, `Driver Assigned`, `Collected`, `Cancelled`.
   - Dynamic contextual actions:
     - `Pending`: *"Approve"* button calling `PUT /api/admin/collections/:id/approve` and *"Cancel"* button with remarks dialog.
     - `Approved`: *"Assign Driver"* modal interfacing `GET /api/admin/collections/:id/nearby-drivers`. Automatically computes Haversine distances to available drivers, lists current active job queues, highlights the closest driver with a green *"Recommended"* badge, and assigns via `PUT /api/admin/collections/:id/assign`.
     - `Driver Assigned`: *"Reassign"* button reopening the nearby driver dispatch modal.
   - Request Details modal displaying interactive Leaflet pin, citizen notes, driver contact info, and step-by-step lifecycle history.

6. **`/admin/waste` (Waste Records Ledger - [AdminWaste.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/admin/AdminWaste.jsx))**:
   - Filter by calendar month (`YYYY-MM`) and batching status (`all`, `pending`, `batched`).
   - Summary KPI card displaying total verified waste weight (kg).
   - Records table with collection ID, driver name, waste category, scale weight, and composting batch status.
   - Weight correction modal calling `PUT /api/admin/waste-records/:id`.

7. **`/admin/composting` (Compost Processing Plant - [AdminComposting.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/admin/AdminComposting.jsx))**:
   - 3 Operational Tabs:
     - *Batches*: Ledger of active and completed composting batches. *"Complete Batch"* modal on curing batches requiring output weight (kg) and marketplace product selection, automatically incrementing product inventory stock via `PUT /api/admin/composting/batches/:id/complete`.
     - *Create Batch*: Table of unbatched collected organic waste records with multi-select checkboxes, facility unit selector, real-time live sum of selected input weight, and batch creation dispatch to `POST /api/admin/composting/batches`.
     - *Units*: Management of physical municipal composting facilities with Add/Edit modals calling `POST`/`PUT /api/admin/composting/units`.

8. **`/admin/products` (Marketplace Catalog & Categories - [AdminProducts.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/admin/AdminProducts.jsx))**:
   - 2 Management Tabs:
     - *Products*: Catalog table with thumbnail, title, category, price (`₹`), unit, stock level, crop suitability tags, and active status. Add/Edit modal supporting all product attributes. Hide/Show toggle calling soft delete endpoint `DELETE /api/admin/products/:id`.
     - *Categories*: Taxonomy table with Add/Edit modal and Hide/Show toggle calling `DELETE /api/admin/categories/:id`.

9. **`/admin/orders` (E-Commerce Order Fulfillment - [AdminOrders.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/admin/AdminOrders.jsx))**:
   - Status filter tabs: `all`, `pending`, `paid`, `shipped`, `delivered`, `cancelled`.
   - Order cards displaying customer name, delivery address, purchased item quantities, order total (`₹`), and payment transaction reference.
   - Status transition buttons (`Ship`, `Mark Delivered`, `Confirm COD payment`) executing `PUT /api/admin/orders/:id/status`, plus cancellation action.

10. **`/admin/payments` (Unified Revenue Ledger - [AdminPayments.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/admin/AdminPayments.jsx))**:
    - Status filter pills (`all`, `success`, `pending`, `failed`).
    - Total successful collections & sales KPI banner (`₹`).
    - Audit log with Type indicator (`Subscription` / `Order`), transaction reference (`TXN...`), citizen name, amount, payment method (card, upi, wallet, cod), status badge, and execution timestamp.

11. **`/admin/subscriptions` (Subscription Auditing - [AdminSubscriptions.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/admin/AdminSubscriptions.jsx))**:
    - Read-only table of all citizen subscriptions with search by name/email/plan and status filters (`all`, `active`, `expired`, `cancelled`).
    - Metrics overview: Total subscriptions, Active now, Total recurring revenue (`₹`), and Cancelled count.
    - Columns: Subscription ID (`#SUB-...`), Citizen details, Plan type, Billing start/end dates, Price (`₹`), and Status Badge.

12. **`/admin/feedback` (Support & Grievances Desk - [AdminFeedback.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/admin/AdminFeedback.jsx))**:
    - 2 Dedicated Tabs: *"Complaints & Grievances"* (with unresolved counter badge) and *"Driver Feedback & Reviews"*.
    - Status filter pills: `all`, `open`, `in_progress`, `resolved`.
    - Star ratings (1 to 5) for driver reviews.
    - *"Respond"* modal allowing municipal admins to review citizen inquiries, update ticket status (`open` -> `in_progress` -> `resolved`), and submit official responses via `PUT /api/admin/feedback/:id`, triggering automatic notifications to citizens.

13. **`/admin/reports` (Executive Reports & Analytics - [AdminReports.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/admin/AdminReports.jsx))**:
    - Month picker (`YYYY-MM`) defaulting to current month.
    - 6 Comprehensive KPI StatCards: Collections Count, Total Waste (kg), Total Revenue (`₹`), Store Orders, Subscriptions, and Compost Yield (kg).
    - Dual analytics layout:
      - *Waste Breakdown By Type*: Visual progress bars displaying weight (kg) and percentage share per waste category.
      - *Driver Performance Table*: Pickup counts, total kilograms collected, and fleet share per driver.
    - *"Download CSV"* button retrieving formatted CSV export from `GET /api/admin/reports/export?month=YYYY-MM`.
    - Clean *"Print"* button triggering native browser print styling (`window.print()`).

14. **`/admin/notifications` (Admin Notifications Feed - [NotificationsPage.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/user/NotificationsPage.jsx))**:
    - Reused unified notifications view displaying dispatch assignments, new complaints, bin threshold alerts, and order notices with read state management.

### 11.3 Phase 7 Definition of Done Verification
- Automated test suite in [test-phase7.js](file:///d:/garbage-2/sgms/test-phase7.js) executed successfully with **68 / 68 checks passing (100%)**:
  1. Admin authentication with `admin@sgms.com` / `Admin@123` verified.
  2. 4th driver successfully registered via `POST /api/admin/drivers` with full contact, license, vehicle, and depot GPS coordinates; verified in driver roster.
  3. Pending collection request approved via `PUT /api/admin/collections/:id/approve`.
  4. Nearby drivers endpoint `GET /api/admin/collections/:id/nearby-drivers` verified with Haversine distance and `recommended: true` flag on closest driver; driver assigned via `PUT /api/admin/collections/:id/assign`.
  5. Citizen complaint responded to via `PUT /api/admin/feedback/:id` updating status to `resolved` and notifying resident.
  6. New product category and bio-fertilizer product successfully added through admin endpoints.
  7. Admin dashboard KPI endpoints, monthly waste trend Recharts series, and operational tables verified with 0 errors.
  8. CSV export endpoint `GET /api/admin/reports/export?month=YYYY-MM` verified with proper `text/csv` headers and structured data rows.
  9. Frontend build verified cleanly with `npx vite build` (0 compilation errors).

---

## 12. Phase 8 Implementation: Driver Portal & Comprehensive System E2E Verification

### 12.1 Driver Portal Architecture (`/driver/*`)
- **Role Guard**: Protected by `ProtectedRoute allowedRoles={['driver']}` inside [DashboardLayout.jsx](file:///d:/garbage-2/sgms/frontend/src/layouts/DashboardLayout.jsx).
- **Navigation (5 Nav Items)**:
  - `/driver` (Dashboard)
  - `/driver/collections` (My Collections)
  - `/driver/history` (History)
  - `/driver/notifications` (Notifications)
  - `/driver/profile` (Profile)
- **Header & Branding**: Displays "DRIVER PORTAL" badge subtitle with notification counter bell directly linking to `/driver/notifications`.

### 12.2 Driver Pages Implementation (`frontend/src/pages/driver/`)

1. **`/driver` (Driver Dashboard - [DriverDashboard.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/driver/DriverDashboard.jsx))**:
   - 4 StatCards: Assigned Now, Collected Total, Total Waste Collected (kg), and Average Customer Rating (★).
   - Real-time availability toggle switch ("Available for collection") executing `PUT /api/driver/availability` with online/offline badge feedback.
   - Next 3 Assigned Pickups preview section with customer name, waste category, bin fill status, telephone link, and quick jump to collections route.

2. **`/driver/collections` (Assigned Collections - [DriverCollections.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/driver/DriverCollections.jsx))**:
   - Collection cards sorted chronologically by assignment time.
   - Citizen customer name and direct `<a href="tel:...">` click-to-call link.
   - Physical address, waste type badge, bin fill status badge, and optional citizen remarks.
   - Integrated Leaflet map thumbnail (height 180px) centered on customer collection coordinates.
   - *"Open in Google Maps"* button opening turn-by-turn navigation via `google_maps_url`.
   - *"Mark as Collected"* modal: verified weight scale input (0.1 to 500 kg) and driver notes. Submitting calls `PUT /api/driver/collections/:id/collect`, resets the citizen's bin to Empty, logs the waste record, notifies the citizen, and removes the card from view.
   - `EmptyState` component displayed when no collection jobs are pending.

3. **`/driver/history` (Collection History - [DriverHistory.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/driver/DriverHistory.jsx))**:
   - Summary StatCards on top: Total kilograms collected, completed jobs count, and average customer rating.
   - Searchable table of past pickups: date/time, customer name & phone, address, waste type, verified weight (kg), and citizen star rating (1-5 stars or "Not rated").

4. **`/driver/profile` (Driver Profile & Fleet Settings - [DriverProfile.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/driver/DriverProfile.jsx))**:
   - Read-only vehicle & fleet credentials card: Driving license number, vehicle registration plate, assigned service zone, and base depot GPS coordinates with municipal verification badge.
   - Editable personal contact form: name, phone number, and residential address calling `PUT /api/auth/profile`.
   - Security form: change password with current password verification and 6-character validation calling `PUT /api/auth/password`.

5. **`/driver/notifications` (Driver Notifications)**:
   - Reused shared [NotificationsPage.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/user/NotificationsPage.jsx) for assignment dispatches and operational alerts.

### 12.3 Final System Polish Across All Portals
- **404 Not Found Page**: Created [NotFound.jsx](file:///d:/garbage-2/sgms/frontend/src/pages/public/NotFound.jsx) with intelligent home navigation routing authenticated users directly to `/admin`, `/driver`, or `/app` and unauthenticated visitors to `/`.
- **Logged-In Home Redirect**: Accessing public landing page `/` while authenticated automatically redirects users to their designated role portal (`admin` &rarr; `/admin`, `driver` &rarr; `/driver`, `user` &rarr; `/app`).
- **Responsive Layout Support**: Validated layout across 360px (mobile), 768px (tablet with collapsible drawer), and 1280px (desktop expanded sidebar).
- **Comprehensive Documentation**: Detailed setup, MySQL initialization, demo credentials, and feature guides written to [README.md](file:///d:/garbage-2/sgms/README.md).

### 12.4 Complete End-to-End (E2E) Test Verification
- Executed sequential 14-step integration test runner in [test-e2e.js](file:///d:/garbage-2/sgms/test-e2e.js).
- **Result: 14 / 14 Steps Passed (100% Success)**:

| Step | Test Description | Status |
| :--- | :--- | :---: |
| **Step 1** | Register new user "Test User" | **PASS** |
| **Step 2** | Subscribe to Monthly Plan (mock payment) | **PASS** |
| **Step 3** | Add bin with map location | **PASS** |
| **Step 4** | Set bin status to Full | **PASS** |
| **Step 5** | Submit collection request | **PASS** |
| **Step 6** | Login as admin: approve request | **PASS** |
| **Step 7** | Assign driver1 using nearby drivers list | **PASS** |
| **Step 8** | Driver sees request, checks Google Maps URL, marks collected (8.5 kg) | **PASS** |
| **Step 9** | User verifies status Collected, bin Empty, notification, rates 5 stars | **PASS** |
| **Step 10** | Admin creates compost batch, completes with 5 kg, product stock increases | **PASS** |
| **Step 11** | User buys product via UPI (paid), admin marks shipped then delivered | **PASS** |
| **Step 12** | User submits complaint, admin responds, user sees resolution | **PASS** |
| **Step 13** | User report shows 8.5 kg, admin dashboard & CSV export reflect numbers | **PASS** |
| **Step 14** | Forbidden actions blocked: role violations (403) and missing auth (401) | **PASS** |




