-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- AlterTable
ALTER TABLE "CustomerProfile" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "profileStatus" "ProfileStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ResellerProfile" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "profileStatus" "ProfileStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
