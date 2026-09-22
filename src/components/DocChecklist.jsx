import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function DocChecklist({ matterId, checklist = [], onChange, canRemove }) {
  const [newItemText, setNewItemText] = useState('');
  const [saving, setSaving] = useState(false);

  async function toggleDone(item) {
    const updated = checklist.map((i) =>
      i.id === item.id ? { ...i, done: !i.done } : i
    );
    await updateDoc(doc(db, `matters/${matterId}`), { docChecklist: updated });
    onChange?.(updated);
  }

  async function deleteItem(item) {
    const updated = checklist.filter((i) => i.id !== item.id);
    await updateDoc(doc(db, `matters/${matterId}`), { docChecklist: updated });
    onChange?.(updated);
  }

  async function addCustomItem(e) {
    e.preventDefault();
    if (!newItemText.trim()) return;
    setSaving(true);
    const newItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: newItemText.trim(),
      done: false,
      source: 'custom',
    };
    const updated = [...checklist, newItem];
    await updateDoc(doc(db, `matters/${matterId}`), { docChecklist: updated });
    onChange?.(updated);
    setNewItemText('');
    setSaving(false);
  }

  return (
    <div style={{ marginTop: '2rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
      <h3>Documents Needed</h3>

      {checklist.length === 0 && (
        <p style={{ color: '#999', fontSize: '0.9rem' }}>No outstanding documents.</p>
      )}

      {checklist.map((item) => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <input
            type="checkbox"
            checked={item.done}
            onChange={() => toggleDone(item)}
          />
          <span style={{
            flex: 1,
            textDecoration: item.done ? 'line-through' : 'none',
            color: item.done ? '#999' : '#000',
          }}>
            {item.text}
          </span>
                   {canRemove && (
            <button
              type="button"
              onClick={() => deleteItem(item)}
              style={{ fontSize: '0.75rem', color: '#9C3A32', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              Remove
            </button>
          )}
        </div>
      ))}

      <form onSubmit={addCustomItem} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <input
          type="text"
          placeholder="Add a document to the list…"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          style={{ flex: 1, padding: '0.4rem' }}
        />
        <button type="submit" disabled={saving} style={{ padding: '0.4rem 0.8rem' }}>
          {saving ? 'Adding…' : 'Add'}
        </button>
      </form>
    </div>
  );
}