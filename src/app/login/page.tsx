'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { loginWithPin, registerUser } from '@/lib/supabase/auth';
import { createDefaultCategories } from '@/lib/supabase/categories';
import { createPunchcard } from '@/lib/supabase/punchcards';
import { setCurrentUserId } from '@/lib/supabase/client';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const router = useRouter();

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');

      // Auto-submit when 4 digits entered
      if (newPin.length === 4) {
        handleLogin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const handleLogin = async (pinCode: string) => {
    setIsLoading(true);
    setError('');

    try {
      // Try to login with PIN
      console.log('Logging in with PIN...');
      const user = await loginWithPin(pinCode);

      if (user) {
        // Existing user - log them in
        await setCurrentUserId(user.id);
        localStorage.setItem('habit_tracker_name', user.name);
        router.push('/');
      } else {
        // New PIN - ask for name
        console.log('New user detected, switching to registration');
        setIsNewUser(true);
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err.message || JSON.stringify(err);
      setError(`Login Error (v1.1): ${msg}`);
      setPin('');
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Register new user
      // Note: The database now automatically creates default categories
      console.log('Registering user...');
      const user = await registerUser(name.trim(), pin);
      console.log('User registered success:', user.id);

      // Log them in immediately
      await setCurrentUserId(user.id);

      localStorage.setItem('habit_tracker_name', user.name);
      router.push('/');
    } catch (err: any) {
      console.error('Registration error detail:', err);
      const message = err.message || JSON.stringify(err);
      setError(`Reg Error (v1.1): ${message.includes('fetch') ? 'Network error' : message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2">
          <div className="text-4xl mb-2">🎯</div>
          <CardTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Habit Tracker
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            {isNewUser ? 'Welcome! Enter your name' : 'Enter your PIN to continue'}
          </p>
          <div className="absolute top-2 right-2 text-[10px] text-muted-foreground opacity-30">v1.2</div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isNewUser ? (
            // New user registration form
            <div className="space-y-4">
              <div className="flex justify-center gap-3 opacity-50">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-primary border-2 border-primary flex items-center justify-center"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                PIN: ****
              </p>
              <Input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-center text-lg"
                autoFocus
              />
              {error && (
                <p className="text-center text-sm text-destructive">{error}</p>
              )}
              <Button
                className="w-full"
                onClick={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setIsNewUser(false);
                  setPin('');
                  setName('');
                  setError('');
                }}
              >
                Use different PIN
              </Button>
            </div>
          ) : (
            // PIN entry
            <>
              {/* PIN Display */}
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                      pin.length > i
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground/30'
                    )}
                  >
                    {pin.length > i && (
                      <div className="w-3 h-3 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <p className="text-center text-sm text-destructive">{error}</p>
              )}

              {/* Number Pad */}
              <div className="grid grid-cols-3 gap-3">
                {digits.map((digit, i) => {
                  if (digit === '') {
                    return <div key={i} />;
                  }

                  if (digit === 'del') {
                    return (
                      <Button
                        key={i}
                        variant="ghost"
                        className="h-14 text-lg"
                        onClick={handleDelete}
                        disabled={isLoading || pin.length === 0}
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
                          />
                        </svg>
                      </Button>
                    );
                  }

                  return (
                    <Button
                      key={i}
                      variant="outline"
                      className="h-14 text-xl font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => handlePinInput(digit)}
                      disabled={isLoading}
                    >
                      {digit}
                    </Button>
                  );
                })}
              </div>

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* New user hint */}
              <p className="text-center text-xs text-muted-foreground">
                First time? Any 4-digit PIN will create your account.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
