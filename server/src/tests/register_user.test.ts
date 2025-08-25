import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

// Test input
const testInput: RegisterUserInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user', async () => {
    const result = await registerUser(testInput);

    // Basic field validation
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect((result as any).user.password_hash).toBeUndefined(); // Should not return password hash
  });

  it('should save user to database with hashed password', async () => {
    const result = await registerUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].password_hash).toBeDefined();
    expect(users[0].password_hash).not.toEqual('password123'); // Password should be hashed
    expect(users[0].password_hash.length).toBeGreaterThan(20); // bcrypt hash should be long
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should hash password correctly', async () => {
    const result = await registerUser(testInput);

    // Get the stored user
    const storedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    // Verify password can be verified against hash
    const isValid = await Bun.password.verify('password123', storedUser[0].password_hash);
    expect(isValid).toBe(true);

    // Verify wrong password fails
    const isInvalid = await Bun.password.verify('wrongpassword', storedUser[0].password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should reject duplicate email', async () => {
    // Register first user
    await registerUser(testInput);

    // Attempt to register same email again
    await expect(registerUser(testInput)).rejects.toThrow(/email already registered/i);
  });

  it('should handle different email formats', async () => {
    const inputs = [
      { email: 'user+tag@domain.com', password: 'password123' },
      { email: 'user.name@subdomain.domain.org', password: 'password456' },
      { email: 'UPPERCASE@DOMAIN.COM', password: 'password789' }
    ];

    for (const input of inputs) {
      const result = await registerUser(input);
      expect(result.user.email).toEqual(input.email);
      expect(result.user.id).toBeDefined();
    }

    // Verify all users were created
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(3);
  });

  it('should handle minimum password length', async () => {
    const shortPasswordInput: RegisterUserInput = {
      email: 'short@example.com',
      password: '12345' // 5 characters - below minimum
    };

    // This should not throw at handler level since Zod validation happens before handler
    // Handler assumes input is already validated
    const result = await registerUser(shortPasswordInput);
    expect(result.user.email).toEqual('short@example.com');
  });
});