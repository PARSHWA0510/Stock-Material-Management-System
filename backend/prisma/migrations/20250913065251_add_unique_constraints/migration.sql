/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `companies` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `godowns` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `sites` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "godowns_name_key" ON "godowns"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sites_name_key" ON "sites"("name");
