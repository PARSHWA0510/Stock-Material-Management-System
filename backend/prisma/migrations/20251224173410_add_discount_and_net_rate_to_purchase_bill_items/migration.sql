-- Add discount_percent column with default 0
ALTER TABLE "purchase_bill_items" ADD COLUMN "discount_percent" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- Add net_rate column as nullable first
ALTER TABLE "purchase_bill_items" ADD COLUMN "net_rate" DECIMAL(65,30);

-- Update existing rows: set net_rate = rate (since discount is 0 for existing bills)
UPDATE "purchase_bill_items" SET "net_rate" = "rate" WHERE "net_rate" IS NULL;

-- Now make net_rate NOT NULL
ALTER TABLE "purchase_bill_items" ALTER COLUMN "net_rate" SET NOT NULL;
