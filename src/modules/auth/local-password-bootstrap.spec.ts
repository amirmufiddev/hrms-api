import { hashLocalPassword, usersMissingPassword } from './local-password-bootstrap';
import * as bcrypt from 'bcrypt';

describe('local password bootstrap', () => {
  it('selects only users whose password hash is null', () => {
    const users = [
      { id: '1', passwordHash: null },
      { id: '2', passwordHash: 'already-set' },
    ];

    expect(usersMissingPassword(users)).toEqual([{ id: '1', passwordHash: null }]);
  });

  it('hashes with bcrypt cost 10', async () => {
    const hash = await hashLocalPassword('bootstrap-secret');
    expect(hash).toMatch(/^\$2[ab]\$10\$/);
    expect(await bcrypt.compare('bootstrap-secret', hash)).toBe(true);
  });
});