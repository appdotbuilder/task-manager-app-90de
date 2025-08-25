import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, X } from 'lucide-react';
// Using type-only imports for better TypeScript compliance
import type { CreateTaskInput, Task } from '../../../server/src/schema';

interface TaskFormProps {
  onSubmit: (taskData: Omit<CreateTaskInput, 'user_id'>) => Promise<void>;
  onCancel: () => void;
  initialTask?: Task;
  isEditing?: boolean;
}

export function TaskForm({ onSubmit, onCancel, initialTask, isEditing = false }: TaskFormProps) {
  const [formData, setFormData] = useState<Omit<CreateTaskInput, 'user_id'>>({
    title: initialTask?.title || '',
    description: initialTask?.description || '',
    due_date: initialTask?.due_date || new Date(),
    completed: initialTask?.completed || false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Format date for input field
  const formatDateForInput = (date: Date) => {
    const localDate = new Date(date);
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    return localDate.toISOString().slice(0, 16);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Task title is required');
      return;
    }

    if (!formData.description.trim()) {
      setError('Task description is required');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      setError(`Failed to ${isEditing ? 'update' : 'create'} task. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                {isEditing ? 'Edit Task' : 'Create New Task'}
              </CardTitle>
              <CardDescription>
                {isEditing 
                  ? 'Update your task details' 
                  : 'Add a new task to your list'
                }
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="task-title">Task Title *</Label>
              <Input
                id="task-title"
                placeholder="Enter task title..."
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: Omit<CreateTaskInput, 'user_id'>) => ({ 
                    ...prev, 
                    title: e.target.value 
                  }))
                }
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-description">Description *</Label>
              <Textarea
                id="task-description"
                placeholder="Describe your task..."
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: Omit<CreateTaskInput, 'user_id'>) => ({ 
                    ...prev, 
                    description: e.target.value 
                  }))
                }
                disabled={isLoading}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input
                id="task-due-date"
                type="datetime-local"
                value={formatDateForInput(formData.due_date)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: Omit<CreateTaskInput, 'user_id'>) => ({ 
                    ...prev, 
                    due_date: new Date(e.target.value) 
                  }))
                }
                disabled={isLoading}
                required
              />
            </div>

            {isEditing && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="task-completed"
                  checked={formData.completed}
                  onCheckedChange={(checked: boolean) =>
                    setFormData((prev: Omit<CreateTaskInput, 'user_id'>) => ({ 
                      ...prev, 
                      completed: checked 
                    }))
                  }
                  disabled={isLoading}
                />
                <Label 
                  htmlFor="task-completed"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Mark as completed
                </Label>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading 
                  ? (isEditing ? 'Updating...' : 'Creating...')
                  : (isEditing ? 'Update Task' : 'Create Task')
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}