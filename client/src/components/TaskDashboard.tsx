import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { TaskForm } from '@/components/TaskForm';
import { TaskList } from '@/components/TaskList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckCircle, Clock, ListTodo } from 'lucide-react';
// Using type-only imports for better TypeScript compliance
import type { Task, CreateTaskInput } from '../../../server/src/schema';

interface AuthUser {
  id: number;
  email: string;
  created_at: Date;
}

interface TaskDashboardProps {
  user: AuthUser;
}

export function TaskDashboard({ user }: TaskDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  // Load user tasks
  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const userTasks: Task[] = await trpc.getUserTasks.query({ user_id: user.id });
      setTasks(userTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreateTask = async (taskData: Omit<CreateTaskInput, 'user_id'>) => {
    try {
      const newTask: Task = await trpc.createTask.mutate({
        ...taskData,
        user_id: user.id
      });
      setTasks((prev: Task[]) => [...prev, newTask]);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  };

  const handleUpdateTask = async (taskId: number, updates: Partial<Task>) => {
    try {
      const updatedTask: Task = await trpc.updateTask.mutate({
        id: taskId,
        ...updates
      });
      setTasks((prev: Task[]) =>
        prev.map((task: Task) => task.id === taskId ? updatedTask : task)
      );
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await trpc.deleteTask.mutate({
        id: taskId,
        user_id: user.id
      });
      setTasks((prev: Task[]) => prev.filter((task: Task) => task.id !== taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  };

  const handleShareTask = async (taskId: number) => {
    try {
      const shareResponse = await trpc.shareTask.query({
        id: taskId,
        user_id: user.id
      });
      
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareResponse.shareText);
        alert('Task details copied to clipboard! You can now paste it anywhere.');
      } else {
        // Fallback for browsers without clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = shareResponse.shareText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Task details copied to clipboard! You can now paste it anywhere.');
      }
    } catch (error) {
      console.error('Failed to share task:', error);
      alert('Failed to share task. Please try again.');
    }
  };

  // Filter tasks based on active tab
  const filteredTasks = tasks.filter((task: Task) => {
    switch (activeTab) {
      case 'completed':
        return task.completed;
      case 'pending':
        return !task.completed;
      case 'overdue':
        return !task.completed && new Date(task.due_date) < new Date();
      default:
        return true;
    }
  });

  // Calculate task statistics
  const completedTasks = tasks.filter((task: Task) => task.completed).length;
  const pendingTasks = tasks.filter((task: Task) => !task.completed).length;
  const overdueTasks = tasks.filter((task: Task) => 
    !task.completed && new Date(task.due_date) < new Date()
  ).length;

  return (
    <div className="space-y-6">
      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pendingTasks}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueTasks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Task Interface */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Tasks</CardTitle>
              <CardDescription>
                Manage your personal tasks and stay organized
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="flex items-center gap-2">
                All
                <Badge variant="secondary">{tasks.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                Pending
                <Badge variant="secondary">{pendingTasks}</Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                Completed
                <Badge variant="secondary">{completedTasks}</Badge>
              </TabsTrigger>
              <TabsTrigger value="overdue" className="flex items-center gap-2">
                Overdue
                <Badge variant="destructive">{overdueTasks}</Badge>
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-6">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading your tasks...
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {activeTab === 'all' ? (
                    <>
                      <ListTodo className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No tasks yet. Create your first task to get started!</p>
                    </>
                  ) : (
                    <p>No {activeTab} tasks found.</p>
                  )}
                </div>
              ) : (
                <TaskList
                  tasks={filteredTasks}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onShareTask={handleShareTask}
                />
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Task Form Modal */}
      {showCreateForm && (
        <TaskForm
          onSubmit={handleCreateTask}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
}