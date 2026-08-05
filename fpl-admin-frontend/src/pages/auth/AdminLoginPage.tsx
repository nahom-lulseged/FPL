import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { getErrorMessage, getFieldErrors } from '@/types/api';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAdminAuthStore((state) => state.login);
  const isLoading = useAdminAuthStore((state) => state.isLoading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;

  async function handleCredentialsSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    setFieldErrors({});

    try {
      await login(email, password);
      navigate(from ?? '/dashboard', { replace: true });
    } catch (error) {
      setFieldErrors(getFieldErrors(error));
      setFormError(getErrorMessage(error, 'Login failed'));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-fpl-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg border border-fpl-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-fpl-gray-900">FPL Admin</h1>
          <p className="mt-1 text-sm text-fpl-gray-500">Sign in with an admin account</p>
        </div>

        <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors.email}
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
            required
          />
          {formError ? (
            <p className="rounded-md bg-fpl-pink/10 px-3 py-2 text-sm text-fpl-pink">{formError}</p>
          ) : null}
          <Button type="submit" fullWidth isLoading={isLoading}>
            Log in
          </Button>
        </form>
      </div>
    </div>
  );
}
