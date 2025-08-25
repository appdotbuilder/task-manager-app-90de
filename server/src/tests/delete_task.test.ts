import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type DeleteTaskInput } from '../schema';
import { deleteTask } from '../handlers/delete_task';
import { eq, and } from 'drizzle-orm';

describe('deleteTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a task successfully', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a test task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: userId,
        title: 'Test Task',
        description: 'A task for testing deletion',
        due_date: new Date('2024-12-31'),
        completed: false
      })
      .returning()
      .execute();

    const taskId = taskResult[0].id;

    const input: DeleteTaskInput = {
      id: taskId,
      user_id: userId
    };

    // Delete the task
    const result = await deleteTask(input);

    // Verify successful response
    expect(result.success).toBe(true);

    // Verify task was actually deleted from database
    const deletedTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(deletedTasks).toHaveLength(0);
  });

  it('should throw error when task does not exist', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const input: DeleteTaskInput = {
      id: 999, // Non-existent task ID
      user_id: userId
    };

    // Attempt to delete non-existent task
    await expect(deleteTask(input)).rejects.toThrow(/task not found or access denied/i);
  });

  it('should throw error when user tries to delete another users task', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password1'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password2'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create a task for user1
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: user1Id,
        title: 'User1 Task',
        description: 'A task belonging to user1',
        due_date: new Date('2024-12-31'),
        completed: false
      })
      .returning()
      .execute();

    const taskId = taskResult[0].id;

    // Try to delete user1's task as user2
    const input: DeleteTaskInput = {
      id: taskId,
      user_id: user2Id
    };

    // Should throw error for access denied
    await expect(deleteTask(input)).rejects.toThrow(/task not found or access denied/i);

    // Verify the task still exists in database
    const existingTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(existingTasks).toHaveLength(1);
    expect(existingTasks[0].title).toBe('User1 Task');
  });

  it('should handle database constraint properly', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple tasks for the user
    const task1Result = await db.insert(tasksTable)
      .values({
        user_id: userId,
        title: 'Task 1',
        description: 'First task',
        due_date: new Date('2024-12-31'),
        completed: false
      })
      .returning()
      .execute();

    const task2Result = await db.insert(tasksTable)
      .values({
        user_id: userId,
        title: 'Task 2',
        description: 'Second task',
        due_date: new Date('2024-12-31'),
        completed: true
      })
      .returning()
      .execute();

    const task1Id = task1Result[0].id;
    const task2Id = task2Result[0].id;

    // Delete first task
    const input1: DeleteTaskInput = {
      id: task1Id,
      user_id: userId
    };

    const result1 = await deleteTask(input1);
    expect(result1.success).toBe(true);

    // Verify only task1 was deleted, task2 remains
    const remainingTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.user_id, userId))
      .execute();

    expect(remainingTasks).toHaveLength(1);
    expect(remainingTasks[0].id).toBe(task2Id);
    expect(remainingTasks[0].title).toBe('Task 2');
  });

  it('should delete completed tasks', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a completed task
    const taskResult = await db.insert(tasksTable)
      .values({
        user_id: userId,
        title: 'Completed Task',
        description: 'A completed task for testing deletion',
        due_date: new Date('2024-01-01'),
        completed: true
      })
      .returning()
      .execute();

    const taskId = taskResult[0].id;

    const input: DeleteTaskInput = {
      id: taskId,
      user_id: userId
    };

    // Delete the completed task
    const result = await deleteTask(input);

    // Verify successful response
    expect(result.success).toBe(true);

    // Verify task was deleted from database
    const deletedTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(deletedTasks).toHaveLength(0);
  });
});