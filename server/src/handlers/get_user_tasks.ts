import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type GetUserTasksInput, type Task } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getUserTasks = async (input: GetUserTasksInput): Promise<Task[]> => {
  try {
    // Query tasks for the specific user, ordered by due_date
    const results = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.user_id, input.user_id))
      .orderBy(asc(tasksTable.due_date))
      .execute();

    // Return the tasks (no numeric field conversions needed for this schema)
    return results;
  } catch (error) {
    console.error('Get user tasks failed:', error);
    throw error;
  }
};