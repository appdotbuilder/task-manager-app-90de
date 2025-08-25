import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type GetUserTasksInput } from '../schema';
import { getUserTasks } from '../handlers/get_user_tasks';

describe('getUserTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no tasks', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const user = userResult[0];
    const input: GetUserTasksInput = { user_id: user.id };

    const result = await getUserTasks(input);

    expect(result).toEqual([]);
  });

  it('should return tasks for specific user only', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const user1 = user1Result[0];
    const user2 = user2Result[0];

    // Create tasks for both users
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await db.insert(tasksTable)
      .values([
        {
          user_id: user1.id,
          title: 'User 1 Task',
          description: 'Task for user 1',
          due_date: tomorrow,
          completed: false
        },
        {
          user_id: user2.id,
          title: 'User 2 Task',
          description: 'Task for user 2',
          due_date: tomorrow,
          completed: false
        }
      ])
      .execute();

    const input: GetUserTasksInput = { user_id: user1.id };
    const result = await getUserTasks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('User 1 Task');
    expect(result[0].user_id).toEqual(user1.id);
  });

  it('should return tasks ordered by due_date', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create tasks with different due dates
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    await db.insert(tasksTable)
      .values([
        {
          user_id: user.id,
          title: 'Future Task',
          description: 'Task due next week',
          due_date: nextWeek,
          completed: false
        },
        {
          user_id: user.id,
          title: 'Urgent Task',
          description: 'Task due today',
          due_date: today,
          completed: false
        },
        {
          user_id: user.id,
          title: 'Tomorrow Task',
          description: 'Task due tomorrow',
          due_date: tomorrow,
          completed: false
        }
      ])
      .execute();

    const input: GetUserTasksInput = { user_id: user.id };
    const result = await getUserTasks(input);

    expect(result).toHaveLength(3);
    expect(result[0].title).toEqual('Urgent Task'); // Due today (earliest)
    expect(result[1].title).toEqual('Tomorrow Task'); // Due tomorrow
    expect(result[2].title).toEqual('Future Task'); // Due next week (latest)
  });

  it('should return all task fields correctly', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create a task
    const dueDate = new Date('2024-12-31');
    await db.insert(tasksTable)
      .values({
        user_id: user.id,
        title: 'Test Task',
        description: 'A test task description',
        due_date: dueDate,
        completed: true
      })
      .execute();

    const input: GetUserTasksInput = { user_id: user.id };
    const result = await getUserTasks(input);

    expect(result).toHaveLength(1);
    const task = result[0];
    
    expect(task.id).toBeDefined();
    expect(task.user_id).toEqual(user.id);
    expect(task.title).toEqual('Test Task');
    expect(task.description).toEqual('A test task description');
    expect(task.due_date).toBeInstanceOf(Date);
    expect(task.due_date.toISOString()).toEqual(dueDate.toISOString());
    expect(task.completed).toEqual(true);
    expect(task.created_at).toBeInstanceOf(Date);
  });

  it('should handle both completed and incomplete tasks', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create tasks with different completion status
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await db.insert(tasksTable)
      .values([
        {
          user_id: user.id,
          title: 'Completed Task',
          description: 'This task is done',
          due_date: tomorrow,
          completed: true
        },
        {
          user_id: user.id,
          title: 'Pending Task',
          description: 'This task is pending',
          due_date: tomorrow,
          completed: false
        }
      ])
      .execute();

    const input: GetUserTasksInput = { user_id: user.id };
    const result = await getUserTasks(input);

    expect(result).toHaveLength(2);
    
    const completedTask = result.find(task => task.completed);
    const pendingTask = result.find(task => !task.completed);
    
    expect(completedTask).toBeDefined();
    expect(completedTask!.title).toEqual('Completed Task');
    expect(pendingTask).toBeDefined();
    expect(pendingTask!.title).toEqual('Pending Task');
  });

  it('should return empty array for non-existent user', async () => {
    const input: GetUserTasksInput = { user_id: 999 };
    const result = await getUserTasks(input);

    expect(result).toEqual([]);
  });
});