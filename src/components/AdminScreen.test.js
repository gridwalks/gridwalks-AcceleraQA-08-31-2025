import { checkStorageHealth } from './AdminScreen';

describe('checkStorageHealth', () => {
  it('returns unknown status when navigator storage is unavailable', async () => {
    const originalNavigator = global.navigator;
    // Simulate environment without navigator
    // @ts-ignore - override for testing
    global.navigator = undefined;

    const result = await checkStorageHealth();
    expect(result.status).toBe('unknown');

    // Restore navigator
    // @ts-ignore
    global.navigator = originalNavigator;
  });
});
