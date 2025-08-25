import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type ShareTaskInput, type ShareTaskResponse } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function shareTask(input: ShareTaskInput): Promise<ShareTaskResponse> {
  try {
    // Find the task by ID and verify it belongs to the specified user
    const tasks = await db.select()
      .from(tasksTable)
      .where(and(
        eq(tasksTable.id, input.id),
        eq(tasksTable.user_id, input.user_id)
      ))
      .execute();

    // Check if task exists and belongs to the user
    if (tasks.length === 0) {
      throw new Error('Task not found or access denied');
    }

    const task = tasks[0];

    // Format the task into a shareable text snippet
    const shareText = `Check out my task: "${task.title}"\n\nDescription: ${task.description}\n\n#TaskManagement #Productivity`;

    return {
      shareText
    };
  } catch (error) {
    console.error('Task sharing failed:', error);
    throw error;
  }
}