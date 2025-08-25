import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable, usersTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password_123'
};

// Test task input
const testTaskInput: CreateTaskInput = {
  user_id: 1, // Will be updated after user creation
  title: 'Test Task',
  description: 'A task for testing purposes',
  due_date: new Date('2024-12-31T23:59:59Z'),
  completed: false
};

describe('createTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a task successfully', async () => {
    // First create a user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user = userResult[0];
    const taskInput = { ...testTaskInput, user_id: user.id };

    // Create the task
    const result = await createTask(taskInput);

    // Verify the returned task
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.user_id).toEqual(user.id);
    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('A task for testing purposes');
    expect(result.due_date).toBeInstanceOf(Date);
    expect(result.due_date.toISOString()).toEqual('2024-12-31T23:59:59.000Z');
    expect(result.completed).toBe(false);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeTruthy();
  });

  it('should save task to database', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user = userResult[0];
    const taskInput = { ...testTaskInput, user_id: user.id };

    // Create the task
    const result = await createTask(taskInput);

    // Query the database to verify the task was saved
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toEqual(result.id);
    expect(tasks[0].user_id).toEqual(user.id);
    expect(tasks[0].title).toEqual('Test Task');
    expect(tasks[0].description).toEqual('A task for testing purposes');
    expect(tasks[0].due_date).toBeInstanceOf(Date);
    expect(tasks[0].completed).toBe(false);
    expect(tasks[0].created_at).toBeInstanceOf(Date);
  });

  it('should create task with completed true', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user = userResult[0];
    const taskInput: CreateTaskInput = {
      ...testTaskInput,
      user_id: user.id,
      completed: true
    };

    // Create the task
    const result = await createTask(taskInput);

    expect(result.completed).toBe(true);

    // Verify in database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks[0].completed).toBe(true);
  });

  it('should handle Zod default for completed field', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user = userResult[0];
    
    // Create task input without completed field (should use Zod default)
    const taskInput = {
      user_id: user.id,
      title: 'Task without completed field',
      description: 'Testing Zod defaults',
      due_date: new Date('2024-12-31T23:59:59Z')
    } as CreateTaskInput;

    const result = await createTask(taskInput);

    expect(result.completed).toBe(false); // Should use Zod default
  });

  it('should throw error when user does not exist', async () => {
    const taskInput = { ...testTaskInput, user_id: 999 }; // Non-existent user ID

    await expect(createTask(taskInput)).rejects.toThrow(/user with id 999 not found/i);
  });

  it('should handle different date formats correctly', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user = userResult[0];
    
    // Test with different due date
    const futureDate = new Date('2025-06-15T10:30:00Z');
    const taskInput: CreateTaskInput = {
      ...testTaskInput,
      user_id: user.id,
      due_date: futureDate
    };

    const result = await createTask(taskInput);

    expect(result.due_date).toBeInstanceOf(Date);
    expect(result.due_date.toISOString()).toEqual('2025-06-15T10:30:00.000Z');
  });

  it('should create multiple tasks for same user', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user = userResult[0];

    // Create first task
    const task1Input: CreateTaskInput = {
      user_id: user.id,
      title: 'First Task',
      description: 'First task description',
      due_date: new Date('2024-12-01T12:00:00Z'),
      completed: false
    };

    // Create second task
    const task2Input: CreateTaskInput = {
      user_id: user.id,
      title: 'Second Task',
      description: 'Second task description',
      due_date: new Date('2024-12-15T15:30:00Z'),
      completed: true
    };

    const result1 = await createTask(task1Input);
    const result2 = await createTask(task2Input);

    // Verify both tasks were created with different IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.user_id).toEqual(user.id);
    expect(result2.user_id).toEqual(user.id);
    expect(result1.title).toEqual('First Task');
    expect(result2.title).toEqual('Second Task');
    expect(result1.completed).toBe(false);
    expect(result2.completed).toBe(true);

    // Verify both tasks exist in database
    const allTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.user_id, user.id))
      .execute();

    expect(allTasks).toHaveLength(2);
  });
});