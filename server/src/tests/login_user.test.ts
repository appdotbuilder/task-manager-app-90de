import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput } from '../schema';
import { loginUser } from '../handlers/login_user';
import { createHash, randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';

// Helper function to hash password (same logic as in handler)
function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(password + salt).digest('hex');
}

function createPasswordHash(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  return `${salt}:${hash}`;
}

const testUser = {
  email: 'test@example.com',
  password: 'securePassword123'
};

const testLoginInput: LoginUserInput = {
  email: testUser.email,
  password: testUser.password
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login user with valid credentials', async () => {
    // Create test user with hashed password
    const hashedPassword = createPasswordHash(testUser.password);
    const insertResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: hashedPassword
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Attempt login
    const result = await loginUser(testLoginInput);

    // Verify response structure and content
    expect(result.user).toBeDefined();
    expect(result.user.id).toEqual(createdUser.id);
    expect(result.user.email).toEqual(testUser.email);
    expect(result.user.created_at).toBeInstanceOf(Date);
    
    // Ensure password hash is not included in response
    expect((result.user as any).password_hash).toBeUndefined();
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserInput: LoginUserInput = {
      email: 'nonexistent@example.com',
      password: 'somePassword'
    };

    await expect(loginUser(nonExistentUserInput))
      .rejects
      .toThrow(/invalid email or password/i);
  });

  it('should throw error for incorrect password', async () => {
    // Create test user
    const hashedPassword = createPasswordHash(testUser.password);
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: hashedPassword
      })
      .execute();

    // Attempt login with wrong password
    const wrongPasswordInput: LoginUserInput = {
      email: testUser.email,
      password: 'wrongPassword'
    };

    await expect(loginUser(wrongPasswordInput))
      .rejects
      .toThrow(/invalid email or password/i);
  });

  it('should handle case-sensitive email matching', async () => {
    // Create test user with lowercase email
    const hashedPassword = createPasswordHash(testUser.password);
    await db.insert(usersTable)
      .values({
        email: testUser.email.toLowerCase(),
        password_hash: hashedPassword
      })
      .execute();

    // Attempt login with uppercase email
    const uppercaseEmailInput: LoginUserInput = {
      email: testUser.email.toUpperCase(),
      password: testUser.password
    };

    // Should fail because email is case-sensitive
    await expect(loginUser(uppercaseEmailInput))
      .rejects
      .toThrow(/invalid email or password/i);
  });

  it('should verify user exists in database after successful login', async () => {
    // Create test user
    const hashedPassword = createPasswordHash(testUser.password);
    const insertResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: hashedPassword
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Login user
    const loginResult = await loginUser(testLoginInput);

    // Verify user still exists in database with correct data
    const dbUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    expect(dbUsers).toHaveLength(1);
    expect(dbUsers[0].id).toEqual(loginResult.user.id);
    expect(dbUsers[0].email).toEqual(loginResult.user.email);
    expect(dbUsers[0].created_at).toEqual(loginResult.user.created_at);
  });

  it('should handle empty password correctly', async () => {
    // Create test user
    const hashedPassword = createPasswordHash(testUser.password);
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: hashedPassword
      })
      .execute();

    // Attempt login with empty password
    const emptyPasswordInput: LoginUserInput = {
      email: testUser.email,
      password: ''
    };

    await expect(loginUser(emptyPasswordInput))
      .rejects
      .toThrow(/invalid email or password/i);
  });

  it('should handle malformed password hash', async () => {
    // Create test user with malformed password hash (missing salt separator)
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'malformed_hash_without_salt'
      })
      .execute();

    await expect(loginUser(testLoginInput))
      .rejects
      .toThrow(/invalid email or password/i);
  });
});