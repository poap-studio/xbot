-- AlterTable: Add scanned tracking fields to valid_codes table
ALTER TABLE "valid_codes"
ADD COLUMN "isScanned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "scannedAt" TIMESTAMP(3);

-- CreateIndex: Add index for isScanned field
CREATE INDEX "valid_codes_isScanned_idx" ON "valid_codes"("isScanned");
