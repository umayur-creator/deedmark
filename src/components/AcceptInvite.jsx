import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export default function AcceptInvite({ invite, onAccepted }) {
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAccept() {
    setError(null);
    setSubmitting(true);
    try {
      const call = httpsCallable(functions, 'acceptInvite');
      await call({ orgId: invite.orgId, inviteId: invite.id });
      onAccepted();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Deedmark</h1>
      <p>You've been invited to join <strong>{invite.orgName}</strong> as a <strong>{invite.role}</strong>.</p>
      {error && <p style={{ color: '#9C3A32', fontSize: '0.85rem' }}>{error}</p>}
      <button type="button" onClick={handleAccept} disabled={submitting} style={{ padding: '0.6rem 1.2rem' }}>
        {submitting ? 'Joining…' : `Accept and join ${invite.orgName}`}
      </button>
    </div>
  );
}