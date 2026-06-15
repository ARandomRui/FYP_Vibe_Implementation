import { useState, type FormEvent } from 'react';
import { requireSupabase } from '../lib/supabase';

type AuthPanelProps = {
  errorMessage?: string | null;
  onError: (message: string | null) => void;
};

export function AuthPanel({ errorMessage = null, onError }: AuthPanelProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      const client = requireSupabase();

      if (mode === 'signin') {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }
      } else {
        const { error } = await client.auth.signUp({ email, password });
        if (error) {
          throw error;
        }

        setMessage('Account created. If email confirmation is enabled, check your inbox.');
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div>
          <p className="eyebrow">PaperTrail Notes</p>
          <h1>Read, cite, and write in one workspace</h1>
          <p className="auth-copy">
            Build private workspaces with one rich-text note, many PDFs, and citation chips that
            jump back to the exact source text.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>

          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>

          {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
          {message ? <p className="inline-message">{message}</p> : null}
        </form>

        <button
          className="ghost-link"
          onClick={() => {
            setMode((current) => (current === 'signin' ? 'signup' : 'signin'));
            setMessage(null);
            onError(null);
          }}
          type="button"
        >
          {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
