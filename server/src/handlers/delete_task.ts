import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type DeleteTaskInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function deleteTask(input: DeleteTaskInput): Promise<{ success: boolean }> {
  try {
    // First, verify the task exists and belongs to the user
    const existingTasks = await db.select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.id, input.id),
          eq(tasksTable.user_id, input.user_id)
        )
      )
      .execute();

    if (existingTasks.length === 0) {
      throw new Error('Task not found or access denied');
    }

    // Delete the task
    const result = await db.delete(tasksTable)
      .where(
        and(
          eq(tasksTable.id, input.id),
          eq(tasksTable.user_id, input.user_id)
        )
      )
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Task deletion failed:', error);
    throw error;
  }
}