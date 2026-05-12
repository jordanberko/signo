-- Add dispatch evidence photos to orders.
-- Array of JSON objects: [{type, url, uploaded_at}]
-- type is one of: work_before_packing, work_during_packing, sealed_package
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispatch_photo_urls jsonb DEFAULT NULL;

-- Track the insurance acknowledgment from the dispatch form (PR C checkbox).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS insurance_acknowledged boolean DEFAULT NULL;
