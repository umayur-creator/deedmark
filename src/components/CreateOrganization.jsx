import { useState } from 'react';
import { createOrganization } from '../lib/api';

export default function CreateOrganization({ onCreated }) {
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!orgName.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await createOrganization(orgName.trim());
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>Set up your organization</h1>
      <p style={{ color: '#666' }}>This could be your firm's name, or just your own name if you're practicing solo.</p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Organization name"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          required
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
        />
        {error && <p style={{ color: '#9C3A32', fontSize: '0.85rem' }}>{error}</p>}
        <button type="submit" disabled={submitting} style={{ width: '100%', padding: '0.6rem' }}>
          {submitting ? 'Creating…' : 'Create organization'}
        </button>
      </form>
    </div>
  );
}