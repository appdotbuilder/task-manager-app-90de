import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';
import { TaskDashboard } from '@/components/TaskDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Using type-only imports for better TypeScript compliance
import type { User, AuthResponse } from '../../server/src/schema';

interface AuthUser {
  id: number;
  email: string;
  created_at: Date;
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for stored user session on app load
  useEffect(() => {
    const storedUser = localStorage.getItem('taskapp_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser({
          ...parsedUser,
          created_at: new Date(parsedUser.created_at)
        });
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('taskapp_user');
      }
    }
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response: AuthResponse = await trpc.loginUser.mutate({ email, password });
      const authUser: AuthUser = {
        id: response.user.id,
        email: response.user.email,
        created_at: response.user.created_at
      };
      setUser(authUser);
      localStorage.setItem('taskapp_user', JSON.stringify(authUser));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRegister = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response: AuthResponse = await trpc.registerUser.mutate({ email, password });
      const authUser: AuthUser = {
        id: response.user.id,
        email: response.user.email,
        created_at: response.user.created_at
      };
      setUser(authUser);
      localStorage.setItem('taskapp_user', JSON.stringify(authUser));
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('taskapp_user');
  }, []);

  // If user is logged in, show the task dashboard
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">✅ Task Manager</h1>
              <p className="text-gray-600">Welcome back, {user.email}!</p>
            </div>
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
            >
              Sign Out
            </Button>
          </div>
          <TaskDashboard user={user} />
        </div>
      </div>
    );
  }

  // If not logged in, show login/register forms
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            ✅ Task Manager
          </CardTitle>
          <CardDescription>
            Organize your tasks and boost productivity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4">
              <LoginForm onLogin={handleLogin} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="register" className="mt-4">
              <RegisterForm onRegister={handleRegister} isLoading={isLoading} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;