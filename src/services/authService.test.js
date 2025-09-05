import { jest } from '@jest/globals';
import { hasAdminRole } from '../utils/auth';

describe('AuthService getUser', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns user data with roles when claim is present', async () => {
    process.env.REACT_APP_AUTH0_ROLES_CLAIM = 'https://example.com/roles';
    const authService = require('./authService').default;

    authService.auth0Client = {
      getUser: jest.fn().mockResolvedValue({ sub: 'user123', name: 'Test User' }),
      getIdTokenClaims: jest.fn().mockResolvedValue({
        'https://example.com/roles': ['admin', 'editor']
      })
    };
    authService.isAuthenticated = jest.fn().mockResolvedValue(true);

    const result = await authService.getUser();

    expect(authService.auth0Client.getUser).toHaveBeenCalled();
    expect(result).toEqual({
      sub: 'user123',
      name: 'Test User',
      roles: ['admin', 'editor']
    });
  });
});

describe('hasAdminRole', () => {
  it('handles mixed-case role names consistently', () => {
    expect(hasAdminRole({ roles: ['Admin'] })).toBe(true);
    expect(hasAdminRole({ roles: ['Administrator'] })).toBe(true);
    expect(hasAdminRole({ roles: ['administrator'] })).toBe(true);
    expect(hasAdminRole({ roles: ['editor'] })).toBe(false);
  });
});
