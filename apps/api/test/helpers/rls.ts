import { PrismaService } from '../../src/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

export async function withOrgContext<T>(
  prisma: PrismaService,
  orgId: string,
  fn: (tx: PrismaService) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${orgId}'`);
    return fn(tx as PrismaService);
  });
}

export async function withSiteContext<T>(
  prisma: PrismaService,
  siteId: string,
  fn: (tx: PrismaService) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_site_id = '${siteId}'`);
    return fn(tx as PrismaService);
  });
}

export async function createUserWithOrg(
  prisma: PrismaService,
  args: Prisma.UserCreateArgs,
) {
  const data = args.data as Prisma.UserUncheckedCreateInput;
  if (!data.orgId) {
    throw new Error('createUserWithOrg requires args.data.orgId');
  }
  return withOrgContext(prisma, data.orgId, (tx) => tx.user.create(args));
}