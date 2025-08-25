import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type ShareTaskInput } from '../schema';
import { shareTask } from '../handlers/share_task';

// Test data setup
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password'
};

const testTask = {
  title: 'Complete project documentation',
  description: 'Write comprehensive documentation for the new feature including API docs and user guides',
  due_date: new Date('2024-02-01'),
  completed: false
};

describe('shareTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate shareable text for valid task', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test task
    const taskResult = await db.insert(tasksTable)
      .values({
        ...testTask,
        user_id: userId
      })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Test sharing the task
    const input: ShareTaskInput = {
      id: taskId,
      user_id: userId
    };

    const result = await shareTask(input);

    // Verify the share text format
    expect(result.shareText).toContain('Check out my task: "Complete project documentation"');
    expect(result.shareText).toContain('Description: Write comprehensive documentation for the new feature including API docs and user guides');
    expect(result.shareText).toContain('#TaskManagement #Productivity');
    
    // Verify proper formatting with line breaks
    const expectedFormat = `Check out my task: "${testTask.title}"\n\nDescription: ${testTask.description}\n\n#TaskManagement #Productivity`;
    expect(result.shareText).toEqual(expectedFormat);
  });

  it('should throw error when task does not exist', async () => {
    // Create test user but no task
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const input: ShareTaskInput = {
      id: 999, // Non-existent task ID
      user_id: userId
    };

    await expect(shareTask(input)).rejects.toThrow(/task not found or access denied/i);
  });

  it('should throw error when user tries to share another user\'s task', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password_2'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create task for user1
    const taskResult = await db.insert(tasksTable)
      .values({
        ...testTask,
        user_id: user1Id
      })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Try to share user1's task as user2
    const input: ShareTaskInput = {
      id: taskId,
      user_id: user2Id // Different user trying to share
    };

    await expect(shareTask(input)).rejects.toThrow(/task not found or access denied/i);
  });

  it('should handle tasks with special characters in title and description', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create task with special characters
    const specialTask = {
      title: 'Fix "critical" bug & update docs',
      description: 'Handle edge cases with special chars: @#$%^&*()_+{}|:"<>?',
      due_date: new Date('2024-02-15'),
      completed: false,
      user_id: userId
    };

    const taskResult = await db.insert(tasksTable)
      .values(specialTask)
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    const input: ShareTaskInput = {
      id: taskId,
      user_id: userId
    };

    const result = await shareTask(input);

    // Verify special characters are preserved
    expect(result.shareText).toContain('Fix "critical" bug & update docs');
    expect(result.shareText).toContain('Handle edge cases with special chars: @#$%^&*()_+{}|:"<>?');
    expect(result.shareText).toContain('#TaskManagement #Productivity');
  });

  it('should handle tasks with empty description', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create task with empty description
    const taskWithEmptyDesc = {
      title: 'Simple task',
      description: '',
      due_date: new Date('2024-02-20'),
      completed: false,
      user_id: userId
    };

    const taskResult = await db.insert(tasksTable)
      .values(taskWithEmptyDesc)
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    const input: ShareTaskInput = {
      id: taskId,
      user_id: userId
    };

    const result = await shareTask(input);

    // Verify the format is still correct even with empty description
    const expectedFormat = 'Check out my task: "Simple task"\n\nDescription: \n\n#TaskManagement #Productivity';
    expect(result.shareText).toEqual(expectedFormat);
  });
});