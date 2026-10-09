-- Additive only. No UPDATE, DELETE, DROP, TRUNCATE or replacement of existing data.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS pickup_detail varchar(200);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS pickup_instructions varchar(500);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS deleted_at timestamp;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS pickup_detail varchar(200);
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS pickup_instructions varchar(500);
-- Legacy NULL deleted_at means a visible vehicle. Existing pickup_location is retained.
