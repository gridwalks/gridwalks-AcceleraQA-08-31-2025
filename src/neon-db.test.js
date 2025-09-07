import { handleAddTrainingResource, handleGetTrainingResources } from '../netlify/functions/neon-db.js';

describe('training resource handlers', () => {
  test('add_training_resource includes user_id', async () => {
    const calls = [];
    const sql = async (strings, ...values) => {
      calls.push({ query: strings.join(''), values });
      return [{ id: 1, user_id: values[0], name: values[1], description: values[2], url: values[3], tag: values[4], created_at: '', updated_at: '' }];
    };
    const res = await handleAddTrainingResource(sql, 'user1', { name: 'Doc', description: 'd', url: 'http://x', tag: 'tag1' });
    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(201);
    expect(body.resource.user_id).toBe('user1');
    expect(calls[1].values[0]).toBe('user1');
  });

  test('get_training_resources filters by user_id', async () => {
    const sql = async (strings, ...values) => {
      return [{ id: 2, user_id: values[0], name: 'Doc', description: '', url: 'http://x', tag: null, created_at: '', updated_at: '' }];
    };
    const res = await handleGetTrainingResources(sql, 'user2');
    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.resources.every(r => r.user_id === 'user2')).toBe(true);
  });

  test('add_training_resource creates table if missing', async () => {
    const calls = [];
    const sql = async (strings, ...values) => {
      const query = strings.join('');
      calls.push(query);
      if (query.includes('INSERT INTO training_resources')) {
        return [{ id: 1, user_id: values[0], name: values[1], description: values[2], url: values[3], tag: values[4], created_at: '', updated_at: '' }];
      }
      return [];
    };
    const res = await handleAddTrainingResource(sql, 'user1', { name: 'Doc', url: 'http://x' });
    expect(res.statusCode).toBe(201);
    expect(calls[0]).toMatch(/CREATE TABLE IF NOT EXISTS training_resources/);
    expect(calls[1]).toMatch(/INSERT INTO training_resources/);
  });

  test('get_training_resources handles missing column', async () => {
    const sql = async () => {
      const err = new Error('column "user_id" does not exist');
      err.code = '42703';
      throw err;
    };
    const res = await handleGetTrainingResources(sql, 'user1');
    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(500);
    expect(body.error).toMatch(/column/i);
  });
});
