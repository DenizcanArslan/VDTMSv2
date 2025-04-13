-- CreateEnum
CREATE TYPE "ScrCpuStatus" AS ENUM ('SCRCPUNOK', 'SCROK', 'CPUOK');

-- CreateEnum
CREATE TYPE "ScrCpuColor" AS ENUM ('RED', 'ORANGE', 'GREEN');

-- AlterTable
ALTER TABLE "Transport" ADD COLUMN     "requiresScrCpu" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "scrCpuColor" "ScrCpuColor" DEFAULT 'RED',
ADD COLUMN     "scrCpuStatus" "ScrCpuStatus" DEFAULT 'SCRCPUNOK';
