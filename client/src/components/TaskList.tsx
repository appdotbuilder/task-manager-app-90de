import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TaskForm } from '@/components/TaskForm';
import { 
  Calendar, 
  Clock, 
  Edit, 
  Trash2, 
  Share2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
// Using type-only imports for better TypeScript compliance
import type { Task, CreateTaskInput } from '../../../server/src/schema';

interface TaskListProps {
  tasks: Task[];
  onUpdateTask: (taskId: number, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
  onShareTask: (taskId: number) => Promise<void>;
}

export function TaskList({ tasks, onUpdateTask, onDeleteTask, onShareTask }: TaskListProps) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleComplete = async (task: Task) => {
    setIsLoading(true);
    try {
      await onUpdateTask(task.id, { completed: !task.completed });
    } catch (error) {
      console.error('Failed to toggle task completion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTask = async (taskData: Omit<CreateTaskInput, 'user_id'>) => {
    if (!editingTask) return;
    
    setIsLoading(true);
    try {
      await onUpdateTask(editingTask.id, taskData);
      setEditingTask(null);
    } catch (error) {
      console.error('Failed to edit task:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTaskId) return;
    
    setIsLoading(true);
    try {
      await onDeleteTask(deletingTaskId);
      setDeletingTaskId(null);
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDueDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const isOverdue = (task: Task) => {
    return !task.completed && new Date(task.due_date) < new Date();
  };

  const getDueDateStatus = (task: Task) => {
    if (task.completed) return 'completed';
    
    const now = new Date();
    const dueDate = new Date(task.due_date);
    const timeDiff = dueDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);

    if (hoursDiff < 0) return 'overdue';
    if (hoursDiff < 24) return 'due-soon';
    return 'normal';
  };

  const getStatusBadge = (task: Task) => {
    const status = getDueDateStatus(task);
    
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        );
      case 'due-soon':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            Due Soon
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Calendar className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        );
    }
  };

  return (
    <>
      <div className="space-y-4">
        {tasks.map((task: Task) => (
          <Card key={task.id} className={`transition-all ${
            task.completed ? 'bg-gray-50 border-gray-200' : 
            isOverdue(task) ? 'border-red-200 bg-red-50' : ''
          }`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <div className="flex items-center pt-1">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => handleToggleComplete(task)}
                    disabled={isLoading}
                    className="h-5 w-5"
                  />
                </div>

                {/* Task Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium text-gray-900 ${
                        task.completed ? 'line-through text-gray-500' : ''
                      }`}>
                        {task.title}
                      </h3>
                      <p className={`text-sm mt-1 ${
                        task.completed ? 'text-gray-400 line-through' : 'text-gray-600'
                      }`}>
                        {task.description}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusBadge(task)}
                        <span className="text-xs text-gray-500">
                          Due: {formatDueDate(task.due_date)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onShareTask(task.id)}
                        className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                        title="Share task"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTask(task)}
                        disabled={isLoading}
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                        title="Edit task"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingTaskId(task.id)}
                        disabled={isLoading}
                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                        title="Delete task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <TaskForm
          onSubmit={handleEditTask}
          onCancel={() => setEditingTask(null)}
          initialTask={editingTask}
          isEditing={true}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingTaskId !== null} onOpenChange={() => setDeletingTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}