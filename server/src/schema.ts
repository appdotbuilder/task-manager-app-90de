import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schema for user registration
export const registerUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6) // Minimum password length
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

// Input schema for user login
export const loginUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginUserInput = z.infer<typeof loginUserInputSchema>;

// Task schema
export const taskSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  title: z.string(),
  description: z.string(),
  due_date: z.coerce.date(),
  completed: z.boolean(),
  created_at: z.coerce.date()
});

export type Task = z.infer<typeof taskSchema>;

// Input schema for creating tasks
export const createTaskInputSchema = z.object({
  user_id: z.number(),
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  due_date: z.coerce.date(),
  completed: z.boolean().default(false)
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

// Input schema for updating tasks
export const updateTaskInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  due_date: z.coerce.date().optional(),
  completed: z.boolean().optional()
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

// Input schema for getting user tasks
export const getUserTasksInputSchema = z.object({
  user_id: z.number()
});

export type GetUserTasksInput = z.infer<typeof getUserTasksInputSchema>;

// Input schema for deleting tasks
export const deleteTaskInputSchema = z.object({
  id: z.number(),
  user_id: z.number() // Ensure user can only delete their own tasks
});

export type DeleteTaskInput = z.infer<typeof deleteTaskInputSchema>;

// Input schema for sharing tasks
export const shareTaskInputSchema = z.object({
  id: z.number(),
  user_id: z.number() // Ensure user can only share their own tasks
});

export type ShareTaskInput = z.infer<typeof shareTaskInputSchema>;

// Response schema for sharing tasks
export const shareTaskResponseSchema = z.object({
  shareText: z.string()
});

export type ShareTaskResponse = z.infer<typeof shareTaskResponseSchema>;

// Response schema for user authentication
export const authResponseSchema = z.object({
  user: userSchema.omit({ password_hash: true }), // Don't include password hash in response
  token: z.string().optional() // JWT token for session management
});

export type AuthResponse = z.infer<typeof authResponseSchema>;