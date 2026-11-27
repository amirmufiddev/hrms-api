import * as bcrypt from 'bcrypt';

export function usersMissingPassword<T extends { passwordHash: string | null }>(
  users: T[],
): T[] {
  return users.filter((user) => user.passwordHash == null);
}

export function hashLocalPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}