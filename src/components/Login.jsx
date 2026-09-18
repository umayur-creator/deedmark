import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleGoogleSignIn() {
    setError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>Deedmark</h1>
      <p style={{ color: '#666' }}>Sign in to continue.</p>

      <button type="button" onClick={handleGoogleSignIn} style={{ width: '100%', padding: '0.6rem', marginBottom: '1rem' }}>
        Sign in with Google
      </button>

      <div style={{ textAlign: 'center', color: '#999', margin: '1rem 0' }}>or</div>

      <form onSubmit={handleEmailSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
        />
        {error && <p style={{ color: '#9C3A32', fontSize: '0.85rem' }}>{error}</p>}
        <button type="submit" disabled={submitting} style={{ width: '100%', padding: '0.6rem' }}>
          {submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p style={{ fontSize: '0.85rem', marginTop: '1rem', textAlign: 'center' }}>
        {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
        <button
          type="button"
          onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null); }}
          style={{ border: 'none', background: 'none', color: '#0645AD', cursor: 'pointer', padding: 0 }}
        >
          {mode === 'signup' ? 'Sign in' : 'Sign up'}
        </button>
      </p>
    </div>
  );
}