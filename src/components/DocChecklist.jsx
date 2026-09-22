import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { jsPDF } from 'jspdf';

export default function DocChecklist({ matterId, checklist = [], onChange, canRemove, matterTitle }) {
  const [newItemText, setNewItemText] = useState('');
  const [saving, setSaving] = useState(false);

  async function exportWord() {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'Documents Needed', bold: true, size: 32 })],
          }),
          new Paragraph({ text: matterTitle || '', spacing: { after: 300 } }),
          ...checklist.map((item) =>
            new Paragraph({
              children: [
                new TextRun({
                  text: `${item.done ? '[Done]' : '[ ]'} ${item.text}`,
                  strike: item.done,
                }),
              ],
              spacing: { after: 150 },
            })
          ),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'documents-needed.docx';
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const pdf = new jsPDF();
    const marginLeft = 15;
    let y = 20;

    pdf.setFontSize(16);
    pdf.text('Documents Needed', marginLeft, y);
    y += 8;

    pdf.setFontSize(11);
    if (matterTitle) {
      pdf.text(matterTitle, marginLeft, y);
      y += 10;
    }

    checklist.forEach((item) => {
      const prefix = item.done ? '[Done] ' : '[ ] ';
      const lines = pdf.splitTextToSize(prefix + item.text, 180);
      lines.forEach((line) => {
        if (y > 280) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(line, marginLeft, y);
        y += 7;
      });
      y += 3;
    });

    pdf.save('documents-needed.pdf');
  }
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Documents Needed</h3>
        {checklist.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={exportWord} style={{ fontSize: '0.85rem', padding: '0.3rem 0.6rem' }}>
              Export Word
            </button>
            <button type="button" onClick={exportPdf} style={{ fontSize: '0.85rem', padding: '0.3rem 0.6rem' }}>
              Export PDF
            </button>
          </div>
        )}
      </div>

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