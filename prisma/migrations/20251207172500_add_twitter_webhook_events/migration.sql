-- CreateTable
CREATE TABLE "twitter_webhook_events" (
    "id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "headers" JSONB NOT NULL,
    "queryParams" JSONB,
    "body" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "eventType" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "twitter_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "twitter_webhook_events_method_idx" ON "twitter_webhook_events"("method");

-- CreateIndex
CREATE INDEX "twitter_webhook_events_eventType_idx" ON "twitter_webhook_events"("eventType");

-- CreateIndex
CREATE INDEX "twitter_webhook_events_receivedAt_idx" ON "twitter_webhook_events"("receivedAt");
