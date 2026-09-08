-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "budgetUsd" REAL NOT NULL,
    "weeksAhead" INTEGER NOT NULL DEFAULT 12,
    "alertOnBudget" BOOLEAN NOT NULL DEFAULT true,
    "alertOnPriceDrop" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Origin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "iataCode" TEXT NOT NULL,
    CONSTRAINT "Origin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WishlistDestination" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "iataCode" TEXT,
    "countryCode" TEXT,
    "label" TEXT,
    "resolvedAirports" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WishlistDestination_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeekendPattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    CONSTRAINT "WeekendPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originIata" TEXT NOT NULL,
    "destIata" TEXT NOT NULL,
    "departDate" TEXT NOT NULL,
    "returnDate" TEXT NOT NULL,
    "weekendPattern" TEXT NOT NULL,
    "priceUsd" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "originIata" TEXT NOT NULL,
    "destIata" TEXT NOT NULL,
    "departDate" TEXT NOT NULL,
    "returnDate" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "priceUsd" REAL NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Origin_userId_iataCode_key" ON "Origin"("userId", "iataCode");

-- CreateIndex
CREATE UNIQUE INDEX "WeekendPattern_userId_pattern_key" ON "WeekendPattern"("userId", "pattern");

-- CreateIndex
CREATE INDEX "PriceSnapshot_originIata_destIata_weekendPattern_checkedAt_idx" ON "PriceSnapshot"("originIata", "destIata", "weekendPattern", "checkedAt");

-- CreateIndex
CREATE INDEX "NotificationLog_userId_originIata_destIata_departDate_returnDate_triggerType_sentAt_idx" ON "NotificationLog"("userId", "originIata", "destIata", "departDate", "returnDate", "triggerType", "sentAt");
