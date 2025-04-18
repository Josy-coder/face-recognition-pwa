/*
  Warnings:

  - You are about to drop the column `s3FolderPath` on the `District` table. All the data in the column will be lost.
  - You are about to drop the column `s3FolderPath` on the `LLG` table. All the data in the column will be lost.
  - You are about to drop the column `additionalInfo` on the `Person` table. All the data in the column will be lost.
  - You are about to drop the column `contactInfo` on the `Person` table. All the data in the column will be lost.
  - You are about to drop the column `s3FolderPath` on the `Province` table. All the data in the column will be lost.
  - You are about to drop the column `s3FolderPath` on the `Ward` table. All the data in the column will be lost.
  - You are about to drop the `Collection` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_CollectionToPerson` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name,geoRegionId]` on the table `Province` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `geoRegionId` to the `Province` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_CollectionToPerson" DROP CONSTRAINT "_CollectionToPerson_A_fkey";

-- DropForeignKey
ALTER TABLE "_CollectionToPerson" DROP CONSTRAINT "_CollectionToPerson_B_fkey";

-- DropIndex
DROP INDEX "Province_name_s3FolderPath_key";

-- AlterTable
ALTER TABLE "District" DROP COLUMN "s3FolderPath";

-- AlterTable
ALTER TABLE "LLG" DROP COLUMN "s3FolderPath";

-- AlterTable
ALTER TABLE "Person" DROP COLUMN "additionalInfo",
DROP COLUMN "contactInfo",
ADD COLUMN     "albumId" TEXT,
ADD COLUMN     "clan" TEXT,
ADD COLUMN     "denomination" TEXT,
ADD COLUMN     "driversLicense" TEXT,
ADD COLUMN     "electorId" TEXT,
ADD COLUMN     "nid" TEXT,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "passport" TEXT,
ADD COLUMN     "pathType" TEXT,
ADD COLUMN     "religion" TEXT;

-- AlterTable
ALTER TABLE "Province" DROP COLUMN "s3FolderPath",
ADD COLUMN     "geoRegionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "clan" TEXT,
ADD COLUMN     "denomination" TEXT,
ADD COLUMN     "driversLicense" TEXT,
ADD COLUMN     "electorId" TEXT,
ADD COLUMN     "nid" TEXT,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "passport" TEXT,
ADD COLUMN     "religion" TEXT;

-- AlterTable
ALTER TABLE "Ward" DROP COLUMN "s3FolderPath",
ADD COLUMN     "villages" TEXT[];

-- DropTable
DROP TABLE "Collection";

-- DropTable
DROP TABLE "_CollectionToPerson";

-- CreateTable
CREATE TABLE "Album" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoRegion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoRegion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "geoRegionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbgDistrict" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbgDistrict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Constituency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "villages" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Constituency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MkaRegion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "geoRegionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MkaRegion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MkaWard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "sections" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MkaWard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Album_ownerId_name_key" ON "Album"("ownerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "GeoRegion_name_key" ON "GeoRegion"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Region_name_geoRegionId_key" ON "Region"("name", "geoRegionId");

-- CreateIndex
CREATE UNIQUE INDEX "AbgDistrict_name_regionId_key" ON "AbgDistrict"("name", "regionId");

-- CreateIndex
CREATE UNIQUE INDEX "Constituency_name_districtId_key" ON "Constituency"("name", "districtId");

-- CreateIndex
CREATE UNIQUE INDEX "MkaRegion_name_geoRegionId_key" ON "MkaRegion"("name", "geoRegionId");

-- CreateIndex
CREATE UNIQUE INDEX "MkaWard_name_regionId_key" ON "MkaWard"("name", "regionId");

-- CreateIndex
CREATE UNIQUE INDEX "Province_name_geoRegionId_key" ON "Province"("name", "geoRegionId");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Province" ADD CONSTRAINT "Province_geoRegionId_fkey" FOREIGN KEY ("geoRegionId") REFERENCES "GeoRegion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_geoRegionId_fkey" FOREIGN KEY ("geoRegionId") REFERENCES "GeoRegion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbgDistrict" ADD CONSTRAINT "AbgDistrict_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Constituency" ADD CONSTRAINT "Constituency_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "AbgDistrict"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MkaRegion" ADD CONSTRAINT "MkaRegion_geoRegionId_fkey" FOREIGN KEY ("geoRegionId") REFERENCES "GeoRegion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MkaWard" ADD CONSTRAINT "MkaWard_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "MkaRegion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
