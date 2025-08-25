import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type UpdateTaskInput } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword'
};

const testTask = {
  user_id: 1, // Will be set after user creation
  title: 'Original Task',
  description: 'Original description',
  due_date: new Date('2024-12-31'),
  completed: false
};

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update task title only', async () => {
    // Create user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create task
    const [task] = await db.insert(tasksTable)
      .values({ ...testTask, user_id: user.id })
      .returning()
      .execute();

    const updateInput: UpdateTaskInput = {
      id: task.id,
      title: 'Updated Task Title'
    };

    const result = await updateTask(updateInput);

    expect(result.id).toEqual(task.id);
    expect(result.title).toEqual('Updated Task Title');
    expect(result.description).toEqual(testTask.description);
    expect(result.due_date).toEqual(testTask.due_date);
    expect(result.completed).toEqual(false);
    expect(result.user_id).toEqual(user.id);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    // Create user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create task
    const [task] = await db.insert(tasksTable)
      .values({ ...testTask, user_id: user.id })
      .returning()
      .execute();

    const newDueDate = new Date('2025-01-15');
    const updateInput: UpdateTaskInput = {
      id: task.id,
      title: 'Completely Updated Task',
      description: 'New description',
      due_date: newDueDate,
      completed: true
    };

    const result = await updateTask(updateInput);

    expect(result.id).toEqual(task.id);
    expect(result.title).toEqual('Completely Updated Task');
    expect(result.description).toEqual('New description');
    expect(result.due_date).toEqual(newDueDate);
    expect(result.completed).toEqual(true);
    expect(result.user_id).toEqual(user.id);
  });

  it('should update only completed status', async () => {
    // Create user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create task
    const [task] = await db.insert(tasksTable)
      .values({ ...testTask, user_id: user.id })
      .returning()
      .execute();

    const updateInput: UpdateTaskInput = {
      id: task.id,
      completed: true
    };

    const result = await updateTask(updateInput);

    expect(result.id).toEqual(task.id);
    expect(result.title).toEqual(testTask.title);
    expect(result.description).toEqual(testTask.description);
    expect(result.due_date).toEqual(testTask.due_date);
    expect(result.completed).toEqual(true);
  });

  it('should persist changes to database', async () => {
    // Create user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create task
    const [task] = await db.insert(tasksTable)
      .values({ ...testTask, user_id: user.id })
      .returning()
      .execute();

    const updateInput: UpdateTaskInput = {
      id: task.id,
      title: 'Database Persisted Title',
      completed: true
    };

    await updateTask(updateInput);

    // Verify changes are persisted in database
    const persistedTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task.id))
      .execute();

    expect(persistedTasks).toHaveLength(1);
    expect(persistedTasks[0].title).toEqual('Database Persisted Title');
    expect(persistedTasks[0].completed).toEqual(true);
    expect(persistedTasks[0].description).toEqual(testTask.description);
  });

  it('should return existing task when no fields are provided', async () => {
    // Create user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create task
    const [task] = await db.insert(tasksTable)
      .values({ ...testTask, user_id: user.id })
      .returning()
      .execute();

    const updateInput: UpdateTaskInput = {
      id: task.id
      // No fields to update
    };

    const result = await updateTask(updateInput);

    expect(result.id).toEqual(task.id);
    expect(result.title).toEqual(testTask.title);
    expect(result.description).toEqual(testTask.description);
    expect(result.due_date).toEqual(testTask.due_date);
    expect(result.completed).toEqual(false);
  });

  it('should throw error when task not found', async () => {
    const updateInput: UpdateTaskInput = {
      id: 999, // Non-existent task
      title: 'This should fail'
    };

    await expect(updateTask(updateInput)).rejects.toThrow(/Task with id 999 not found/i);
  });

  it('should handle date updates correctly', async () => {
    // Create user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create task
    const [task] = await db.insert(tasksTable)
      .values({ ...testTask, user_id: user.id })
      .returning()
      .execute();

    const newDueDate = new Date('2025-06-15T10:30:00Z');
    const updateInput: UpdateTaskInput = {
      id: task.id,
      due_date: newDueDate
    };

    const result = await updateTask(updateInput);

    expect(result.due_date).toEqual(newDueDate);
    expect(result.due_date).toBeInstanceOf(Date);

    // Verify the date is correctly stored in database
    const persistedTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task.id))
      .execute();

    expect(persistedTasks[0].due_date).toBeInstanceOf(Date);
    expect(persistedTasks[0].due_date).toEqual(newDueDate);
  });
});