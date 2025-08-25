import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';
import { createHash, timingSafeEqual } from 'crypto';

// Simple password hashing using crypto module
function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(password + salt).digest('hex');
}

function verifyPassword(password: string, storedHash: string): boolean {
  // Extract salt from stored hash (assuming format: salt:hash)
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) {
    return false;
  }
  
  const hashedInput = hashPassword(password, salt);
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hashedInput, 'hex'));
  } catch {
    return false;
  }
}

export async function loginUser(input: LoginUserInput): Promise<AuthResponse> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    // Check if user exists
    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Verify password against stored hash
    const isValidPassword = verifyPassword(input.password, user.password_hash);

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Return user info (without password hash)
    return {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
      // Note: JWT token implementation would go here in a real application
      // token: jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' })
    };
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
}