/*
  Warnings:

  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `smsOptIn` on the `User` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "scanEnabled" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_User" ("alertOnBudget", "alertOnPriceDrop", "budgetUsd", "createdAt", "email", "id", "lastLoginAt", "name", "scanEnabled", "updatedAt", "weeksAhead") SELECT "alertOnBudget", "alertOnPriceDrop", "budgetUsd", "createdAt", "email", "id", "lastLoginAt", "name", "scanEnabled", "updatedAt", "weeksAhead" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
