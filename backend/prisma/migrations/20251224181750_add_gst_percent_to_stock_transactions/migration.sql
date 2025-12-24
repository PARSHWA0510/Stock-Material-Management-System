-- Add gst_percent column with default 18%
ALTER TABLE "stock_transactions" ADD COLUMN "gst_percent" DECIMAL(65,30) NOT NULL DEFAULT 18;

-- Update all existing records to 18% GST
UPDATE "stock_transactions" SET "gst_percent" = 18 WHERE "gst_percent" = 0 OR "gst_percent" IS NULL;
