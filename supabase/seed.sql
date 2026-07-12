-- Seed Vehicles
INSERT INTO public.vehicles (registration_number, name, type, status, region, odometer, max_load_capacity, acquisition_cost) VALUES
('MH-12-PQ-1234', 'Volvo FH16 Heavy Duty', 'Truck', 'Available', 'West Region', 45000, 25000, 120000),
('DL-01-AB-5678', 'Tata Intra V30', 'Van', 'Available', 'North Region', 12000, 1300, 15000),
('KA-03-XY-9012', 'Mahindra Blazo X', 'Truck', 'In Shop', 'South Region', 85000, 18000, 85000),
('MH-02-CD-4567', 'Force Traveller 3050', 'Van', 'On Trip', 'West Region', 32000, 3500, 22000);

-- Seed Drivers
INSERT INTO public.drivers (name, license_number, license_category, license_expiry, contact_number, safety_score, status) VALUES
('Rajesh Kumar', 'DL-1420180098765', 'Class A', '2028-12-31', '+91 98765 43210', 95, 'Available'),
('Amit Sharma', 'MH-1220150043210', 'Class B', '2026-08-15', '+91 87654 32109', 88, 'Available'),
('Suresh Patel', 'KA-0320100067890', 'Class A', '2025-05-20', '+91 76543 21098', 75, 'Off Duty'),
('Vijay Yadav', 'MH-0420200012345', 'Class B', '2030-01-01', '+91 65432 10987', 98, 'On Trip');

-- Seed Trips
INSERT INTO public.trips (source, destination, vehicle_id, driver_id, cargo_weight, distance, fuel_consumed, status) VALUES
('Mumbai', 'Pune', 
  (SELECT id FROM public.vehicles WHERE registration_number = 'MH-12-PQ-1234' LIMIT 1), 
  (SELECT id FROM public.drivers WHERE name = 'Rajesh Kumar' LIMIT 1), 
  15000, 150, 45, 'Completed'),
('Delhi', 'Jaipur', 
  (SELECT id FROM public.vehicles WHERE registration_number = 'MH-02-CD-4567' LIMIT 1), 
  (SELECT id FROM public.drivers WHERE name = 'Vijay Yadav' LIMIT 1), 
  2500, NULL, NULL, 'Dispatched'),
('Bangalore', 'Chennai', 
  (SELECT id FROM public.vehicles WHERE registration_number = 'DL-01-AB-5678' LIMIT 1), 
  (SELECT id FROM public.drivers WHERE name = 'Amit Sharma' LIMIT 1), 
  1000, NULL, NULL, 'Draft');

-- Seed Maintenance Logs
INSERT INTO public.maintenance_logs (vehicle_id, description, cost, status, created_at) VALUES
((SELECT id FROM public.vehicles WHERE registration_number = 'KA-03-XY-9012' LIMIT 1), 'Engine Overhaul & Oil Filter Replacement', 2500, 'Active', timezone('utc'::text, now() - interval '2 days')),
((SELECT id FROM public.vehicles WHERE registration_number = 'MH-12-PQ-1234' LIMIT 1), 'Brake Pad Replacement & Tyre Rotation', 800, 'Closed', timezone('utc'::text, now() - interval '10 days'));

-- Seed Fuel Logs
INSERT INTO public.fuel_logs (vehicle_id, liters, cost, date) VALUES
((SELECT id FROM public.vehicles WHERE registration_number = 'MH-12-PQ-1234' LIMIT 1), 120, 1200, CURRENT_DATE - 5),
((SELECT id FROM public.vehicles WHERE registration_number = 'MH-02-CD-4567' LIMIT 1), 50, 500, CURRENT_DATE - 3);

-- Seed Expenses
INSERT INTO public.expenses (vehicle_id, type, amount, date, notes) VALUES
((SELECT id FROM public.vehicles WHERE registration_number = 'MH-12-PQ-1234' LIMIT 1), 'Toll', 150, CURRENT_DATE - 5, 'Mumbai-Pune expressway toll'),
((SELECT id FROM public.vehicles WHERE registration_number = 'MH-02-CD-4567' LIMIT 1), 'Permit', 300, CURRENT_DATE - 8, 'State border entry permit fee'),
((SELECT id FROM public.vehicles WHERE registration_number = 'KA-03-XY-9012' LIMIT 1), 'Other', 100, CURRENT_DATE - 2, 'Towing charges to workshop');
