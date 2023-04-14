import { execSync } from 'child_process';

execSync(`npx prisma@4.8.1 generate --schema e2e/prisma/schema-mysql.prisma`);
execSync(`npx prisma@4.8.1 generate --schema e2e/prisma/schema-mongodb.prisma`);
