/**
 * Mock for next-auth module
 * Used in Jest tests to avoid ESM import issues
 */

export const getServerSession = jest.fn();

// Mock NextAuth function
const NextAuth = jest.fn(() => ({
  handlers: {
    GET: jest.fn(),
    POST: jest.fn(),
  },
  signIn: jest.fn(),
  signOut: jest.fn(),
  auth: getServerSession,
}));

export default NextAuth;
