declare module '*prisma/generated/mongodb' {
  class PrismaClient {
    $runCommandRaw(command: unknown): any;
  }
}

declare module '*prisma/generated/mysql' {
  class PrismaClient {
    $queryRawUnsafe(query: string): any;
  }
}
