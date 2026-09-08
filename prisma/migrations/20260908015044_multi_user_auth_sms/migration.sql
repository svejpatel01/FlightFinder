-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "invitedBy" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" DATETIME
);

-- CreateTable
CREATE TABLE "LoginToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NotificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "originIata" TEXT NOT NULL,
    "destIata" TEXT NOT NULL,
    "departDate" TEXT NOT NULL,
    "returnDate" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "priceUsd" REAL NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_NotificationLog" ("departDate", "destIata", "id", "originIata", "priceUsd", "returnDate", "sentAt", "triggerType", "userId") SELECT "departDate", "destIata", "id", "originIata", "priceUsd", "returnDate", "sentAt", "triggerType", "userId" FROM "NotificationLog";
DROP TABLE "NotificationLog";
ALTER TABLE "new_NotificationLog" RENAME TO "NotificationLog";
CREATE INDEX "NotificationLog_userId_originIata_destIata_departDate_returnDate_triggerType_channel_sentAt_idx" ON "NotificationLog"("userId", "originIata", "destIata", "departDate", "returnDate", "triggerType", "channel", "sentAt");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME,
    "budgetUsd" REAL NOT NULL DEFAULT 0,
    "weeksAhead" INTEGER NOT NULL DEFAULT 12,
    "alertOnBudget" BOOLEAN NOT NULL DEFAULT true,
    "alertOnPriceDrop" BOOLEAN NOT NULL DEFAULT true,
    "scanEnabled" BOOLEAN NOT NULL DEFAULT true,
    "phone" TEXT,
    "smsOptIn" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_User" ("alertOnBudget", "alertOnPriceDrop", "budgetUsd", "createdAt", "email", "id", "updatedAt", "weeksAhead") SELECT "alertOnBudget", "alertOnPriceDrop", "budgetUsd", "createdAt", "email", "id", "updatedAt", "weeksAhead" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Invite_email_key" ON "Invite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LoginToken_tokenHash_key" ON "LoginToken"("tokenHash");

-- CreateIndex
CREATE INDEX "LoginToken_email_createdAt_idx" ON "LoginToken"("email", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_originIata_destIata_departDate_returnDate_checkedAt_idx" ON "PriceSnapshot"("originIata", "destIata", "departDate", "returnDate", "checkedAt");
