import { db } from '../db';
import { tasksTable, usersTable } from '../db/schema';
import { type CreateTaskInput, type Task } from '../schema';
import { eq } from 'drizzle-orm';

export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  try {
    // 1. Validate that the user_id exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (users.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // 2. Insert task record
    const result = await db.insert(tasksTable)
      .values({
        user_id: input.user_id,
        title: input.title,
        description: input.description,
        due_date: input.due_date,
        completed: input.completed
      })
      .returning()
      .execute();

    // 3. Return the created task
    const task = result[0];
    return {
      ...task,
      due_date: new Date(task.due_date),
      created_at: new Date(task.created_at)
    };
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
};