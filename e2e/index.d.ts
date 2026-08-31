declare module '*prisma/generated/mongodb/index.js' {
  class PrismaClient {
    $runCommandRaw(command: unknown): any;
  }
}

declare module '*prisma/generated/mysql/index.js' {
  class PrismaClient {
    $queryRawUnsafe(query: string): any;
  }
}
