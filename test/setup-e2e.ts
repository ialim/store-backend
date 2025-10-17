// Increase default Jest timeout to give Nest bootstrapping and Prisma connection
// enough headroom in the e2e suite.
jest.setTimeout(30000);
