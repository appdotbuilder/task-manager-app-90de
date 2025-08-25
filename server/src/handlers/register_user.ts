import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';

export const registerUser = async (input: RegisterUserInput): Promise<AuthResponse> => {
  try {
    // 1. Check if email is already registered
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('Email already registered');
    }

    // 2. Hash the password (using Bun's built-in password hashing)
    const passwordHash = await Bun.password.hash(input.password, {
      algorithm: 'bcrypt',
      cost: 10
    });

    // 3. Insert the new user
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: passwordHash
      })
      .returning()
      .execute();

    const user = result[0];

    // 4. Return user info without password hash
    return {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};