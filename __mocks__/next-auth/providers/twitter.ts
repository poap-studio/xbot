/**
 * Mock for next-auth Twitter provider
 * Used in Jest tests to avoid ESM import issues
 */

export default jest.fn(() => ({
  id: 'twitter',
  name: 'Twitter',
  type: 'oauth',
}));
