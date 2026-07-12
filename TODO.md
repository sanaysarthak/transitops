# TransitOps Project Status & Roadmap

This document outlines the current implementation status of **TransitOps — Smart Transport Operations Platform** and lists the remaining tasks and database structures that need to be completed.

---

## 🟢 Completed So Far

### 1. Database & Backend (Supabase/Postgres)
- **Supabase Schema (`/supabase/schema.sql`)**: Defined tables, enums, indexes, triggers, and Row Level Security (RLS) policies.
  - Tables: `users`, `vehicles`, `drivers`, `trips`, `maintenance_logs`, `fuel_logs`, `expenses`.
  - Triggers & Rules implemented in DDL:
    - Sync `auth.users` to `public.users` via trigger.
    - **Trip Dispatch Trigger (Rule 6)**: Transitioning trip from `Draft` to `Dispatched` updates vehicle and driver statuses to `On Trip`.
    - **Trip Completion Trigger (Rule 7)**: Transitioning from `Dispatched` to `Completed` sets statuses back to `Available`.
    - **Trip Cancellation Trigger (Rule 8)**: Transitioning from `Dispatched` to `Cancelled` restores statuses to `Available`.
    - **Maintenance Create Trigger (Rule 9)**: Creating an active maintenance log sets vehicle to `In Shop`.
    - **Maintenance Close Trigger (Rule 10)**: Closing a maintenance log restores vehicle to `Available` (unless `Retired`).
    - **Trip Validation Trigger (Rules 2-5)**: Prevents assigning retired/in-shop vehicles, suspended/expired license drivers, double-booking, or exceeding vehicle cargo weight.
  - **RLS Policies**: Implemented role-based policies for `fleet_manager`, `driver`, `safety_officer`, and `financial_analyst`.
- **Seed Data (`/supabase/seed.sql`)**: Seed records for 2 vehicles, 2 drivers, 1 completed trip, 1 closed maintenance log, 1 fuel log, and 1 expense.

### 2. Next.js Scaffold & Configuration
- Set up Next.js 14 App Router project with TypeScript and Tailwind CSS.
- **Supabase Clients (`/src/utils/supabase/`)**: Configured SSR cookie-based auth server client (`server.ts`) and client-side browser client (`client.ts`).
- **Auth Middleware (`/src/middleware.ts`)**: Handles token refreshes, protects `/dashboard` routes, and redirects unauthenticated users to `/login`.
- **Theme Provider (`/src/components/theme-provider.tsx`)**: Support for dark/light mode toggles.

### 3. Authentication Flow
- **Signup Page (`/src/app/(auth)/signup/page.tsx`)**: Interactive registration form with a role selector (`fleet_manager`, `driver`, `safety_officer`, `financial_analyst`) stored in user metadata.
- **Login Page (`/src/app/(auth)/login/page.tsx`)**: Secure email/password login.
- **Auth Server Actions (`/src/app/(auth)/actions.ts`)**: Server actions for signup, login, and sign-out.

### 4. Layout and Navigation
- **Dashboard Shell (`/src/app/dashboard/layout.tsx`)**: Sidebar and Topbar structure.
- **Sidebar Component (`/src/components/layout/sidebar.tsx`)**: Responsive, collapsible menu with role-based navigation guards (hides pages users do not have permissions to access).
- **Topbar Component (`/src/components/layout/topbar.tsx`)**: Features theme toggle (Sun/Moon) and responsive mobile hamburger menu.

---

## 🟡 Remaining Tasks (Next Steps)

### Step 3: Vehicle & Driver Registry Pages
- [ ] Create vehicle management page `/dashboard/vehicles/page.tsx`
  - Show all vehicles in a table.
  - Create/edit dialog modal.
  - Filters by vehicle type, status, and region.
- [ ] Create driver management page `/dashboard/drivers/page.tsx`
  - Show drivers list.
  - Highlight license validity (warn if expiry < 30 days, error if expired).
  - Create/edit dialog modal.
- [ ] Write server actions for vehicle and driver CRUD operations.

### Step 4: Trip Lifecycle Management
- [ ] Create trip management page `/dashboard/trips/page.tsx`
  - Data table showing all trips and status badges.
  - Create Trip form: only show *Available* vehicles/drivers and non-expired license drivers.
  - Dispatch, Complete, and Cancel action triggers.
- [ ] Write transactional server actions in `/src/app/dashboard/trips/actions.ts` to manage status changes safely.

### Step 5: Maintenance, Fuel, & Expense Tracking
- [ ] Create maintenance logs page `/dashboard/maintenance/page.tsx`
  - Add active logs (locks vehicle to `In Shop`).
  - Close logs (releases vehicle back to `Available`).
- [ ] Create fuel and expense tracking page `/dashboard/fuel-expenses/page.tsx`
  - Forms for logging fuel purchases and extra operational expenses.
  - Show vehicle operational cost breakdown (Fuel + Maintenance).

### Step 6: Dashboard KPIs & Reports
- [ ] Implement KPI metric cards in `/src/app/dashboard/page.tsx`:
  - Active/Available/In Maintenance vehicles.
  - Active/Pending trips.
  - Drivers On Duty.
  - Fleet Utilization % = (Vehicles On Trip / Total Active Vehicles) * 100.
- [ ] Create analytics reports page `/dashboard/reports/page.tsx` using **Recharts**:
  - Fuel efficiency chart.
  - Fleet utilization chart.
  - Operational cost breakdown pie chart.
  - Vehicle ROI list: `(Revenue - (Maintenance + Fuel)) / Acquisition Cost`.
  - CSV export button for report data.

### Step 7: Final Polish
- [ ] Add loading skeletons for better user experience.
- [ ] Toast notifications via `sonner` on successful actions.
- [ ] Responsive design adjustments for tablet and mobile views.
