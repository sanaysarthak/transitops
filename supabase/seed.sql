-- ============================================================
-- TransitOps — Seed Data
-- Sample: 2 vehicles, 2 drivers, 1 completed trip,
--         1 maintenance log, 1 fuel log, 1 expense
-- ============================================================

-- Vehicles
INSERT INTO public.vehicles (id, registration_number, name, type, max_load_capacity, odometer, acquisition_cost, status, region) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'MH-12-AB-1234', 'Tata Ace Gold', 'Truck', 1500.00, 45230.50, 850000.00, 'Available', 'West'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'KA-01-CD-5678', 'Ashok Leyland Dost', 'Van', 750.00, 32100.00, 620000.00, 'Available', 'South');

-- Drivers
INSERT INTO public.drivers (id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, status) VALUES
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Rajesh Kumar', 'DL-0420110012345', 'CE', '2027-06-15', '+91-9876543210', 92.5, 'Available'),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', 'Priya Sharma', 'MH-0320150067890', 'C', '2026-08-30', '+91-9123456780', 88.0, 'Available');

-- Completed Trip (already completed, so vehicle/driver are Available)
INSERT INTO public.trips (id, source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, actual_distance, fuel_consumed, revenue, status, created_at) VALUES
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'Mumbai', 'Pune', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 1200.00, 150.00, 148.50, 22.30, 15000.00, 'Completed', now() - interval '3 days');

-- Maintenance Log (Closed)
INSERT INTO public.maintenance_logs (id, vehicle_id, description, cost, status, created_at, closed_at) VALUES
  ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Regular service — oil change, brake inspection, tire rotation', 4500.00, 'Closed', now() - interval '7 days', now() - interval '5 days');

-- Fuel Log
INSERT INTO public.fuel_logs (id, vehicle_id, liters, cost, date) VALUES
  ('a7b8c9d0-e1f2-3456-abcd-567890123456', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 35.00, 3500.00, CURRENT_DATE - 3);

-- Expense
INSERT INTO public.expenses (id, vehicle_id, type, amount, date, notes) VALUES
  ('b8c9d0e1-f2a3-4567-bcde-678901234567', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Tolls', 1200.00, CURRENT_DATE - 3, 'Mumbai-Pune expressway toll charges');
