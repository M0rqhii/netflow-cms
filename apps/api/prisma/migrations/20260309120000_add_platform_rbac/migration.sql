-- CreateTable
CREATE TABLE "platform_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "isImmutable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_role_capabilities" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_role_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_roles_name_key" ON "platform_roles"("name");

-- CreateIndex
CREATE INDEX "platform_roles_type_idx" ON "platform_roles"("type");

-- CreateIndex
CREATE INDEX "platform_role_capabilities_roleId_idx" ON "platform_role_capabilities"("roleId");

-- CreateIndex
CREATE INDEX "platform_role_capabilities_capabilityId_idx" ON "platform_role_capabilities"("capabilityId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_role_capabilities_roleId_capabilityId_key" ON "platform_role_capabilities"("roleId", "capabilityId");

-- CreateIndex
CREATE INDEX "platform_user_roles_userId_idx" ON "platform_user_roles"("userId");

-- CreateIndex
CREATE INDEX "platform_user_roles_roleId_idx" ON "platform_user_roles"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_user_roles_userId_roleId_key" ON "platform_user_roles"("userId", "roleId");

-- AddForeignKey
ALTER TABLE "platform_role_capabilities" ADD CONSTRAINT "platform_role_capabilities_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "platform_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_role_capabilities" ADD CONSTRAINT "platform_role_capabilities_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_user_roles" ADD CONSTRAINT "platform_user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "platform_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
