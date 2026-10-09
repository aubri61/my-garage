-- Additive only. Existing price-less vehicles/contracts keep NULL, never synthetic prices.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS hourly_rate bigint;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS power_type varchar(20);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS body_type varchar(20);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS description varchar(2000);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS minimum_rental_hours integer;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS hourly_rate bigint;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS estimated_total bigint;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS billed_hours integer;
