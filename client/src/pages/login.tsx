import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginRequest } from '@shared/schema';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false); // State to control overlay

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginRequest) {
    setIsLoading(true); // Show overlay
    try {
      const response = await api.post('/auth/login', data);

      const responseData = await response.data;
      if (!responseData.token) {
           throw new Error('Login failed: Token not received');
      }

      login(responseData.token);

      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });

      setLocation('/dashboard');

    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message || "An unexpected error",
        variant: 'destructive',
      });
      
       setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative"> {/* Added relative for overlay positioning context if needed */}

      {/* --- Loading Overlay --- */}
      {isLoading && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
          data-testid="loading-overlay"
        >
          <Loader2 className="h-16 w-16 animate-spin text-primary" /> {/* Larger spinner */}
        </div>
      )}
      {/* --- End Loading Overlay --- */}

      <Card className="w-full max-w-md"> {/* Ensure card isn't obscured by overlay initially */}
        <CardHeader className="space-y-2 text-center">
          {/* ... Card Header content ... */}
           <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
             <Shield className="w-6 h-6 text-primary" />
           </div>
           <CardTitle className="text-3xl font-bold">MediChain EHR</CardTitle>
           <CardDescription className="text-base">
             Secure, decentralized electronic health records
           </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your username"
                        data-testid="input-username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        data-testid="input-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading} 
                data-testid="button-login"
              >
                
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setLocation('/register')}
                  className="text-primary hover:underline font-medium"
                  data-testid="link-register"
                >
                  Register here
                </button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

