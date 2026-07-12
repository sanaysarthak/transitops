# TransitOps — Smart Transport Operations Platform

A full-stack fleet management dashboard built with Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase (Postgres + Auth + RLS), and Recharts.

## User Review Required

> [!IMPORTANT]
> **Supabase Project Setup**: You must have a Supabase project created before we begin. We need the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase dashboard. Do you already have a project, or should I guide you through creating one?

> [!IMPORTANT]
> **Role Assignment**: The plan uses a `role` column on `auth.users` metadata + a `public.users` table synced via trigger. On signup, users select their role (Fleet Manager, Driver, Safety Officer, Financial Analyst). Is this acceptable, or do you want an admin-only role assignment flow?

> [!WARNING]
> **Supabase Free Tier**: Row Level Security policies + Postgres triggers are fully supported on free tier. However, if you need Edge Functions for complex server-side logic, ensure your plan supports it.

## Open Questions

1. **Revenue Tracking**: The ROI formula requires `Revenue` per vehicle, but there's no `revenue` entity in the schema. Should we add a `revenue_logs` table, or derive revenue from completed trips (e.g., a `fare` or `revenue` column on trips)?
2. **Seed Data Auth**: Should seed users have real Supabase Auth accounts, or just DB records for testing?
3. **Dark Mode**: You mentioned dark mode as a bonus. Should I implement it from the start (using shadcn's built-in dark mode support) or defer it?

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js 14 App                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Auth     │  │  Pages   │  │  Server  │              │
│  │  Middleware│  │  (App    │  │  Actions │              │
│  │           │  │  Router) │  │          │              │
│  └─────┬─────┘  └─────┬────┘  └─────┬────┘              │
│        │              │              │                   │
│  ┌─────┴──────────────┴──────────────┴────┐              │
│  │         Supabase Client (SSR)          │              │
│  └─────────────────┬──────────────────────┘              │
└────────────────────┼────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │    Supabase Cloud     │
         │  ┌─────────────────┐  │
         │  │  Auth + RLS     │  │
         │  │  Postgres DB    │  │
         │  │  Triggers       │  │
         │  └─────────────────┘  │
         └───────────────────────┘
```

---

## Proposed Changes

### Step 1: Supabase Schema + RLS + Seed Data

#### [NEW] [schema.sql](file:///d:/Odoo/transit-ops/supabase/schema.sql)

Complete Postgres schema including:

**Tables:**
- `public.users` — synced from `auth.users` via trigger, contains `id`, `email`, `role`, `created_at`
- `public.vehicles` — fleet registry with `registration_number UNIQUE`, status enum, region, odometer, etc.
- `public.drivers` — driver profiles with license tracking, safety scores, status enum
- `public.trips` — trip lifecycle with foreign keys to vehicles/drivers, status enum, cargo/fuel tracking
- `public.maintenance_logs` — maintenance records tied to vehicles with auto-status changes
- `public.fuel_logs` — fuel consumption records per vehicle
- `public.expenses` — operational expense tracking per vehicle

**Enums:**
- `vehicle_status`: Available, On Trip, In Shop, Retired
- `driver_status`: Available, On Trip, Off Duty, Suspended
- `trip_status`: Draft, Dispatched, Completed, Cancelled
- `maintenance_status`: Active, Closed
- `user_role`: fleet_manager, driver, safety_officer, financial_analyst

**Constraints (Business Rules 1-5):**
- `UNIQUE(registration_number)` on vehicles
- `CHECK(cargo_weight > 0)` on trips
- Server-side validation for cargo_weight ≤ vehicle.max_load_capacity (via trigger/action)

**Triggers (Business Rules 6-10):**
- `on_trip_dispatch`: Sets vehicle + driver status to 'On Trip'
- `on_trip_complete`: Sets vehicle + driver status to 'Available'
- `on_trip_cancel`: Restores vehicle + driver status to 'Available' (only from Dispatched)
- `on_maintenance_create`: Sets vehicle status to 'In Shop'
- `on_maintenance_close`: Sets vehicle status to 'Available' (unless Retired)

**RLS Policies:**
- Fleet Manager: full CRUD on all tables
- Driver: CRUD on trips (own), read on vehicles/drivers
- Safety Officer: CRUD on drivers, read on trips
- Financial Analyst: read-only on all tables

#### [NEW] [seed.sql](file:///d:/Odoo/transit-ops/supabase/seed.sql)

Sample data: 2 vehicles, 2 drivers, 1 completed trip, 1 maintenance log, 1 fuel log, 1 expense.

---

### Step 2: Next.js Project Scaffold + Auth

#### [NEW] Next.js 14 project at `d:\Odoo\transit-ops\`

Created via `npx create-next-app@latest` with TypeScript, Tailwind CSS, App Router, `@/` import alias.

**Key dependencies:**
- `@supabase/supabase-js`, `@supabase/ssr` — Supabase client
- `recharts` — charts
- shadcn/ui components (Button, Card, Table, Dialog, Badge, Input, Select, Label, Tabs, DropdownMenu, Sheet, Separator, Tooltip, Avatar)

#### [NEW] [utils/supabase/server.ts](file:///d:/Odoo/transit-ops/src/utils/supabase/server.ts)
Server-side Supabase client using `@supabase/ssr` with cookie handling.

#### [NEW] [utils/supabase/client.ts](file:///d:/Odoo/transit-ops/src/utils/supabase/client.ts)
Browser-side Supabase client using `createBrowserClient`.

#### [NEW] [middleware.ts](file:///d:/Odoo/transit-ops/src/middleware.ts)
Auth middleware that:
- Refreshes Supabase auth tokens on every request
- Redirects unauthenticated users to `/login`
- Protects all `/dashboard/*` routes
- Fetches user role and blocks access to role-restricted routes

#### [NEW] [app/(auth)/login/page.tsx](file:///d:/Odoo/transit-ops/src/app/(auth)/login/page.tsx)
Login page with email/password form, link to signup.

#### [NEW] [app/(auth)/signup/page.tsx](file:///d:/Odoo/transit-ops/src/app/(auth)/signup/page.tsx)
Signup page with email/password + role selection dropdown.

#### [NEW] [app/(auth)/actions.ts](file:///d:/Odoo/transit-ops/src/app/(auth)/actions.ts)
Server actions for `login`, `signup`, `logout`.

---

### Step 3: Dashboard Layout + Vehicle & Driver CRUD

#### [NEW] [app/dashboard/layout.tsx](file:///d:/Odoo/transit-ops/src/app/dashboard/layout.tsx)
Dashboard shell with:
- **Sidebar navigation**: Logo, nav links (Dashboard, Vehicles, Drivers, Trips, Maintenance, Fuel & Expenses, Reports), user info, logout
- **Top bar**: Page title, user avatar/role badge
- Responsive: collapsible sidebar on mobile (Sheet component)
- Role-based nav hiding (e.g., Financial Analyst doesn't see Maintenance link)

#### [NEW] [app/dashboard/page.tsx](file:///d:/Odoo/transit-ops/src/app/dashboard/page.tsx)
KPI dashboard (placeholder, built fully in Step 6).

#### [NEW] [app/dashboard/vehicles/page.tsx](file:///d:/Odoo/transit-ops/src/app/dashboard/vehicles/page.tsx)
Vehicle registry page:
- Data table with columns: Registration #, Name, Type, Status (color-coded badge), Region, Odometer, Max Load, Acquisition Cost
- Filters: by type, status, region
- Create/Edit modal (Dialog) with form validation
- Status badges: 🟢 Available, 🔵 On Trip, 🟠 In Shop, ⚫ Retired

#### [NEW] [app/dashboard/vehicles/actions.ts](file:///d:/Odoo/transit-ops/src/app/dashboard/vehicles/actions.ts)
Server actions: `createVehicle`, `updateVehicle`, `getVehicles`, `getAvailableVehicles`.

#### [NEW] [app/dashboard/drivers/page.tsx](file:///d:/Odoo/transit-ops/src/app/dashboard/drivers/page.tsx)
Driver management page:
- Data table: Name, License #, Category, License Expiry (⚠️ highlighted if <30 days or expired), Contact, Safety Score, Status
- Create/Edit modal with validation
- License expiry badges: 🔴 Expired, 🟡 Expiring Soon (<30 days), 🟢 Valid

#### [NEW] [app/dashboard/drivers/actions.ts](file:///d:/Odoo/transit-ops/src/app/dashboard/drivers/actions.ts)
Server actions: `createDriver`, `updateDriver`, `getDrivers`, `getAvailableDrivers`.

---

### Step 4: Trip Lifecycle (Core Business Logic)

#### [NEW] [app/dashboard/trips/page.tsx](file:///d:/Odoo/transit-ops/src/app/dashboard/trips/page.tsx)
Trip management page:
- Data table: ID, Source → Destination, Vehicle, Driver, Cargo Weight, Distance, Fuel, Status, Created
- Status badges: Draft (gray), Dispatched (blue), Completed (green), Cancelled (red)
- Create Trip form/modal:
  - Vehicle dropdown: **only** vehicles with status `Available` (Rules 2, 4)
  - Driver dropdown: **only** drivers with status `Available` AND valid license (Rules 3, 4)
  - Cargo weight with real-time validation against vehicle's `max_load_capacity` (Rule 5)
- Action buttons per row:
  - **Dispatch** (Draft → Dispatched): triggers DB trigger for Rule 6
  - **Complete** (Dispatched → Completed): requires actual_distance, fuel_consumed; triggers Rule 7
  - **Cancel** (Dispatched → Cancelled): triggers Rule 8

#### [NEW] [app/dashboard/trips/actions.ts](file:///d:/Odoo/transit-ops/src/app/dashboard/trips/actions.ts)
Server actions with **transactional validation**:
- `createTrip`: Validates vehicle/driver availability, cargo weight ≤ max_load
- `dispatchTrip`: Updates trip status, triggers set vehicle/driver to On Trip
- `completeTrip`: Updates trip with actuals, triggers restore statuses
- `cancelTrip`: Restores statuses via trigger

---

### Step 5: Maintenance + Fuel/Expense Logging

#### [NEW] [app/dashboard/maintenance/page.tsx](file:///d:/Odoo/transit-ops/src/app/dashboard/maintenance/page.tsx)
Maintenance log page:
- Table: Vehicle, Description, Cost, Status, Created, Closed At
- Create maintenance log: selects vehicle, description, cost → auto-sets vehicle to "In Shop" (Rule 9)
- Close maintenance button → restores vehicle to "Available" unless Retired (Rule 10)

#### [NEW] [app/dashboard/maintenance/actions.ts](file:///d:/Odoo/transit-ops/src/app/dashboard/maintenance/actions.ts)
Server actions: `createMaintenanceLog`, `closeMaintenanceLog`.

#### [NEW] [app/dashboard/fuel-expenses/page.tsx](file:///d:/Odoo/transit-ops/src/app/dashboard/fuel-expenses/page.tsx)
Fuel & Expense logging page:
- Tabs: Fuel Logs | Expenses
- Fuel log form: Vehicle, Liters, Cost, Date
- Expense form: Vehicle, Type (dropdown), Amount, Date, Notes
- Per-vehicle summary: Total fuel cost, total maintenance cost, total operational cost

#### [NEW] [app/dashboard/fuel-expenses/actions.ts](file:///d:/Odoo/transit-ops/src/app/dashboard/fuel-expenses/actions.ts)
Server actions: `createFuelLog`, `createExpense`, `getVehicleCostSummary`.

---

### Step 6: Dashboard KPIs + Reports & Analytics

#### [MODIFY] [app/dashboard/page.tsx](file:///d:/Odoo/transit-ops/src/app/dashboard/page.tsx)
Full KPI dashboard:
- **Cards**: Active Vehicles, Available Vehicles, In Maintenance, Active Trips, Pending Trips, Drivers On Duty, Fleet Utilization %
- **Filters**: Vehicle type, status, region
- Fleet Utilization % = (Vehicles On Trip / Total Active Vehicles) × 100

#### [NEW] [app/dashboard/reports/page.tsx](file:///d:/Odoo/transit-ops/src/app/dashboard/reports/page.tsx)
Reports & Analytics page with Recharts:
- **Fuel Efficiency**: Bar chart of distance/fuel per vehicle
- **Fleet Utilization**: Line chart over time (daily snapshot)
- **Operational Cost Breakdown**: Pie chart (fuel vs. maintenance vs. other expenses)
- **Vehicle ROI**: Table showing (Revenue - (Maintenance + Fuel)) / Acquisition Cost per vehicle
- **CSV Export** button for each report/table

#### [NEW] [app/dashboard/reports/actions.ts](file:///d:/Odoo/transit-ops/src/app/dashboard/reports/actions.ts)
Server actions: `getFuelEfficiency`, `getFleetUtilization`, `getOperationalCosts`, `getVehicleROI`.

---

### Step 7: Polish & Dark Mode

#### [MODIFY] Various files
- Dark mode toggle using `next-themes` + shadcn dark mode support
- Loading skeletons on data tables
- Toast notifications for all CRUD operations
- Responsive polish for mobile views
- CSV export utility function

---

## Project Structure

```
transit-ops/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── actions.ts
│   │   ├── dashboard/
│   │   │   ├── layout.tsx          # Sidebar + top bar shell
│   │   │   ├── page.tsx            # KPI dashboard
│   │   │   ├── vehicles/
│   │   │   │   ├── page.tsx
│   │   │   │   └── actions.ts
│   │   │   ├── drivers/
│   │   │   │   ├── page.tsx
│   │   │   │   └── actions.ts
│   │   │   ├── trips/
│   │   │   │   ├── page.tsx
│   │   │   │   └── actions.ts
│   │   │   ├── maintenance/
│   │   │   │   ├── page.tsx
│   │   │   │   └── actions.ts
│   │   │   ├── fuel-expenses/
│   │   │   │   ├── page.tsx
│   │   │   │   └── actions.ts
│   │   │   └── reports/
│   │   │       ├── page.tsx
│   │   │       └── actions.ts
│   │   ├── layout.tsx
│   │   └── page.tsx                # Redirect to /login or /dashboard
│   ├── components/
│   │   ├── ui/                     # shadcn components
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   └── topbar.tsx
│   │   ├── vehicles/
│   │   │   ├── vehicle-table.tsx
│   │   │   └── vehicle-form.tsx
│   │   ├── drivers/
│   │   │   ├── driver-table.tsx
│   │   │   └── driver-form.tsx
│   │   ├── trips/
│   │   │   ├── trip-table.tsx
│   │   │   └── trip-form.tsx
│   │   ├── dashboard/
│   │   │   ├── kpi-card.tsx
│   │   │   └── filters.tsx
│   │   └── reports/
│   │       └── charts.tsx
│   ├── lib/
│   │   ├── types.ts                # TypeScript types matching DB schema
│   │   ├── constants.ts            # Enums, status colors, role permissions
│   │   └── utils.ts                # CSV export, date helpers, formatters
│   ├── utils/
│   │   └── supabase/
│   │       ├── server.ts
│   │       ├── client.ts
│   │       └── middleware.ts
│   └── middleware.ts
├── supabase/
│   ├── schema.sql                  # Full DDL + triggers + RLS
│   └── seed.sql                    # Sample data
├── .env.local.example
├── tailwind.config.ts
├── next.config.js
└── package.json
```

---

## Design System

| Element | Color / Style |
|---------|--------------|
| Available status | `bg-emerald-100 text-emerald-700` (green) |
| On Trip status | `bg-blue-100 text-blue-700` (blue) |
| In Shop status | `bg-amber-100 text-amber-700` (orange) |
| Retired status | `bg-gray-100 text-gray-500` (gray) |
| Draft trip | `bg-slate-100 text-slate-600` |
| Dispatched trip | `bg-blue-100 text-blue-700` |
| Completed trip | `bg-emerald-100 text-emerald-700` |
| Cancelled trip | `bg-red-100 text-red-700` |
| License Expired | `bg-red-100 text-red-700` with ⚠️ icon |
| License Expiring <30d | `bg-amber-100 text-amber-700` with ⚠️ icon |
| Sidebar | Dark slate `bg-slate-900` with white text |
| Cards | shadcn Card with subtle border, hover shadow |
| Primary action | Brand blue `bg-blue-600` |

---

## Verification Plan

### After Each Step:

**Step 1 (Schema):**
- Run schema.sql in Supabase SQL editor
- Run seed.sql
- Verify tables, triggers, and RLS via Supabase dashboard

**Step 2 (Auth):**
- Sign up with each role
- Verify login/logout
- Verify protected routes redirect to login
- Verify role is stored in `public.users`

**Step 3 (CRUD):**
- Create, edit vehicles and drivers
- Verify unique registration_number constraint
- Verify license expiry highlighting

**Step 4 (Trips):**
- Create trip → verify only Available vehicles/drivers shown
- Verify cargo weight validation
- Dispatch → verify vehicle/driver go to "On Trip"
- Complete → verify statuses restored to "Available"
- Cancel dispatched trip → verify statuses restored

**Step 5 (Maintenance/Fuel):**
- Create maintenance → verify vehicle goes "In Shop"
- Close maintenance → verify vehicle goes "Available"
- Create fuel/expense logs → verify per-vehicle totals

**Step 6 (Dashboard/Reports):**
- Verify KPI numbers match actual data
- Verify charts render correctly
- Test CSV export downloads valid file

### Manual Verification
- Test responsive layout on mobile viewport
- Verify role-based nav visibility
- Test all status transitions end-to-end
