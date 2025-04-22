/*
  Warnings:

  - A unique constraint covering the columns `[path]` on the table `AbgDistrict` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[path]` on the table `Constituency` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[path]` on the table `District` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[path]` on the table `LLG` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[path]` on the table `Location` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[path]` on the table `MkaRegion` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[path]` on the table `MkaWard` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[path]` on the table `Province` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[path]` on the table `Region` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[path]` on the table `Ward` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `path` to the `AbgDistrict` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `Constituency` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `District` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `LLG` table without a default value. This is not possible if the table is not empty.
  - Added the required column `level` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `MkaRegion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `MkaWard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `Province` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `Region` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `Ward` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AbgDistrict" ADD COLUMN     "code" TEXT,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "path" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Constituency" ADD COLUMN     "code" TEXT,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "path" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "District" ADD COLUMN     "code" TEXT,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "path" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "GeoRegion" ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LLG" ADD COLUMN     "code" TEXT,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "path" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "level" INTEGER NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "path" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MkaRegion" ADD COLUMN     "code" TEXT,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "path" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MkaWard" ADD COLUMN     "code" TEXT,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "path" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Province" ADD COLUMN     "code" TEXT,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "path" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Region" ADD COLUMN     "code" TEXT,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "path" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Ward" ADD COLUMN     "code" TEXT,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "path" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "NodeMovementHistory" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "oldParentId" TEXT NOT NULL,
    "newParentId" TEXT NOT NULL,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" TEXT NOT NULL,
    "oldPath" TEXT NOT NULL,
    "newPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NodeMovementHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AbgDistrict_path_key" ON "AbgDistrict"("path");

-- CreateIndex
CREATE INDEX "AbgDistrict_path_idx" ON "AbgDistrict"("path");

-- CreateIndex
CREATE UNIQUE INDEX "Constituency_path_key" ON "Constituency"("path");

-- CreateIndex
CREATE INDEX "Constituency_path_idx" ON "Constituency"("path");

-- CreateIndex
CREATE UNIQUE INDEX "District_path_key" ON "District"("path");

-- CreateIndex
CREATE INDEX "District_path_idx" ON "District"("path");

-- CreateIndex
CREATE UNIQUE INDEX "LLG_path_key" ON "LLG"("path");

-- CreateIndex
CREATE INDEX "LLG_path_idx" ON "LLG"("path");

-- CreateIndex
CREATE UNIQUE INDEX "Location_path_key" ON "Location"("path");

-- CreateIndex
CREATE INDEX "Location_path_idx" ON "Location"("path");

-- CreateIndex
CREATE UNIQUE INDEX "MkaRegion_path_key" ON "MkaRegion"("path");

-- CreateIndex
CREATE INDEX "MkaRegion_path_idx" ON "MkaRegion"("path");

-- CreateIndex
CREATE UNIQUE INDEX "MkaWard_path_key" ON "MkaWard"("path");

-- CreateIndex
CREATE INDEX "MkaWard_path_idx" ON "MkaWard"("path");

-- CreateIndex
CREATE UNIQUE INDEX "Province_path_key" ON "Province"("path");

-- CreateIndex
CREATE INDEX "Province_path_idx" ON "Province"("path");

-- CreateIndex
CREATE UNIQUE INDEX "Region_path_key" ON "Region"("path");

-- CreateIndex
CREATE INDEX "Region_path_idx" ON "Region"("path");

-- CreateIndex
CREATE UNIQUE INDEX "Ward_path_key" ON "Ward"("path");

-- CreateIndex
CREATE INDEX "Ward_path_idx" ON "Ward"("path");

-- AddForeignKey
ALTER TABLE "NodeMovementHistory" ADD CONSTRAINT "NodeMovementHistory_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
