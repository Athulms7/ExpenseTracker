import { useState } from 'react';
import { ArrowRight, LockKeyhole, Wallet } from 'lucide-react';
import { apiRequest } from '../../lib/api.js';

export default function AuthScreen({ initialError = '', onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);
  const registering = mode === 'register';

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await apiRequest(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, password }),
      });
      setPassword('');
      onAuthenticated(user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="auth-page">
    <section className="auth-card">
      <a className="brand auth-brand" href="#top"><span className="brand-mark"><Wallet size={20}/></span><span>spendly<span className="brand-period">.</span></span></a>
      <div className="auth-eyebrow"><LockKeyhole size={14}/>{registering ? 'CREATE YOUR ACCOUNT' : 'YOUR PERSONAL EXPENSES'}</div>
      <h1>{registering ? 'Create your account' : 'Welcome back'}</h1>
      <p className="auth-subtitle">{registering ? 'Choose a user ID and password to get started.' : 'Log in to see and manage your expenses.'}</p>

      {error && <div className="auth-error" role="alert">{error}</div>}

      <form className="auth-form" onSubmit={submit}>
        <label>User ID
          <input
            autoComplete="username"
            autoFocus
            minLength="3"
            maxLength="32"
            pattern="[A-Za-z0-9_-]+"
            placeholder="e.g. alex_01"
            required
            value={userId}
            onChange={event => setUserId(event.target.value)}
          />
          {registering && <small>3–32 characters: letters, numbers, underscore, or hyphen.</small>}
        </label>
        <label>Password
          <input
            autoComplete={registering ? 'new-password' : 'current-password'}
            minLength={registering ? 8 : 1}
            maxLength="128"
            type="password"
            required
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
          {registering && <small>Use at least 8 characters.</small>}
        </label>
        <button className="auth-submit" disabled={submitting}>
          {submitting ? 'Please wait…' : registering ? 'Create account' : 'Log in'}
          {!submitting && <ArrowRight size={17}/>}
        </button>
      </form>

      <div className="auth-switch">
        {registering ? 'Already have an account?' : 'New to Spendly?'}
        <button type="button" onClick={() => { setMode(registering ? 'login' : 'register'); setError(''); setPassword(''); }}>
          {registering ? 'Log in' : 'Create an account'}
        </button>
      </div>
      <p className="auth-privacy">Your password is securely hashed and never stored as plain text.</p>
    </section>
  </main>;
}
