-- CreateTable
CREATE TABLE "login_failures" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "email" CITEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_failures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_failures_ip_created_at_idx" ON "login_failures"("ip", "created_at");

-- CreateIndex
CREATE INDEX "login_failures_email_ip_created_at_idx" ON "login_failures"("email", "ip", "created_at");
