import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '', emailOrUsername: '' });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.emailOrUsername, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
      toast.success(mode === 'login' ? 'Welcome back! 👋' : 'Account created! 🎉');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-lg mb-4">
            <svg className="w-8 h-8 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground">ChatPulse</h1>
          <p className="text-muted-foreground mt-1">Real-time chat for everyone</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-lg p-8 border border-border">
          {/* Tabs */}
          <Tabs value={mode} onValueChange={setMode} defaultValue="login" className="w-full mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Sign Up</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Username</label>
                <Input
                  placeholder="cooluser123"
                  value={form.username}
                  onChange={update('username')}
                  required minLength={3} maxLength={50}
                />
              </div>
            )}
            {mode === 'register' && (
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={update('email')}
                  required
                />
              </div>
            )}
            {mode === 'login' && (
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Email or Username</label>
                <Input
                  placeholder="Enter email or username"
                  value={form.emailOrUsername}
                  onChange={update('emailOrUsername')}
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={update('password')}
                required minLength={6}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full mt-2 h-11">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </Button>
          </form>
        </div>

        <p className="text-center text-muted-foreground text-sm mt-6">
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-primary hover:text-blue-400">
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
