import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export default function InviteTeamMember({ onClose }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('associate');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const call = httpsCallable(functions, 'inviteToOrg');
      await call({ email: email.trim(), role });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 6, width: 360, fontFamily: 'sans-serif' }}>
        <h2 style={{ marginTop: 0 }}>Invite team member</h2>

        {success ? (
          <>
            <p style={{ color: '#2E7D32' }}>Invite created. Share the app link with them — when they sign in with this email, they'll be prompted to join.</p>
            <button type="button" onClick={onClose} style={{ width: '100%', padding: '0.5rem' }}>Close</button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
            />
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}>
              <option value="partner">Partner</option>
              <option value="associate">Associate</option>
            </select>
            {error && <p style={{ color: '#9C3A32', fontSize: '0.85rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.5rem' }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{ flex: 1, padding: '0.5rem' }}>
                {submitting ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}