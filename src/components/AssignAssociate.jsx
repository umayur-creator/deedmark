import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export default function AssignAssociate({ matterId, currentAssociateIds = [], onAssigned }) {
  const [members, setMembers] = useState(null);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const call = httpsCallable(functions, 'listOrgMembers');
    call()
      .then((result) => {
        setMembers(result.data.members.filter((m) => m.role === 'associate'));
      })
      .catch((err) => {
        console.error('Failed to load org members', err);
        setMembers([]);
      });
  }, []);

  async function handleAssign(e) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setSubmitting(true);
    try {
      const call = httpsCallable(functions, 'assignAssociate');
      await call({ matterId, associateUid: selected });
      setSelected('');
      onAssigned();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (members === null) return null;

  const availableAssociates = members.filter((m) => !currentAssociateIds.includes(m.uid));

  if (availableAssociates.length === 0) return null;

  return (
    <form onSubmit={handleAssign} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem' }}>
      <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ padding: '0.4rem' }}>
        <option value="">Assign an associate…</option>
        {availableAssociates.map((m) => (
          <option key={m.uid} value={m.uid}>{m.email}</option>
        ))}
      </select>
      <button type="submit" disabled={!selected || submitting} style={{ padding: '0.4rem 0.8rem' }}>
        {submitting ? 'Assigning…' : 'Assign'}
      </button>
      {error && <span style={{ color: '#9C3A32', fontSize: '0.85rem' }}>{error}</span>}
    </form>
  );
}