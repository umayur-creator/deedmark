import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import ProfileHeader from './ProfileHeader';
import { claimMatter } from '../lib/api';

export default function MatterList({ orgId, uid, role, onSelect, onNewMatter, user }) {
  const [matters, setMatters] = useState(null);
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    getDoc(doc(db, `organizations/${orgId}`)).then((snap) => {
      if (snap.exists()) setOrgName(snap.data().name);
    });
  }, [orgId]);

  useEffect(() => {
    const q = query(
      collection(db, 'matters'),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'desc')
    );
    getDocs(q).then((snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const visible = all.filter((m) => {
        if (role === 'admin') return true;
        if (role === 'partner') return m.status === 'unclaimed' || m.partnerId === uid || (m.associateIds || []).includes(uid);
        if (role === 'associate') return (m.status === 'unclaimed' && m.createdBy === uid) || (m.associateIds || []).includes(uid);
        return false;
      });
      setMatters(visible);
    });
  }, [orgId, uid, role]);

  function matterTitle(m) {
    const parts = [];
    if (m.village) parts.push(m.village);
    if (m.surveyNo) parts.push(`Sy. No. ${m.surveyNo}`);
    return parts.length > 0 ? parts.join(', ') : 'Untitled matter';
  }

    function matterTitle(m) {
    const parts = [];
    if (m.village) parts.push(m.village);
    if (m.surveyNo) parts.push(`Sy. No. ${m.surveyNo}`);
    return parts.length > 0 ? parts.join(', ') : 'Untitled matter';
  }

  async function handleClaim(e, matterId) {
    e.stopPropagation();
    try {
      await claimMatter(matterId);
      window.location.reload();
    } catch (err) {
      alert('Could not claim this matter: ' + err.message);
    }
  }
  if (matters === null) {
    return <p style={{ textAlign: 'center', marginTop: '4rem', fontFamily: 'sans-serif', color: '#666' }}>Loading…</p>;
  }

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 6, background: '#eee',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem', color: '#999', textAlign: 'center', flexShrink: 0,
          }}>
            Logo
          </div>
          <h1 style={{ margin: 0, fontSize: '1.4rem' }}>{orgName}</h1>
        </div>
        <ProfileHeader user={user} role={role} onSignOut={() => signOut(auth)} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Matters</h2>
        <button type="button" onClick={onNewMatter}>+ New Matter</button>
      </div>

      {matters.length === 0 && <p style={{ color: '#666' }}>No matters yet.</p>}

      {matters.map((m) => (
        <div
          key={m.id}
          onClick={() => onSelect(m.id)}
          style={{
            border: '1px solid #ddd',
            borderRadius: 4,
            padding: '0.75rem 1rem',
            marginBottom: '0.5rem',
            cursor: 'pointer',
          }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>{matterTitle(m)}</strong>
            {m.status === 'unclaimed' && (role === 'partner' || role === 'admin') ? (
              <button type="button" onClick={(e) => handleClaim(e, m.id)} style={{ fontSize: '0.8rem' }}>
                Claim
              </button>
            ) : m.status === 'unclaimed' ? (
              <span style={{ color: '#B8860B', fontSize: '0.8rem' }}>Unclaimed</span>
            ) : null}
          </div>
          <div style={{ color: '#666', fontSize: '0.85rem' }}>{m.serviceRequested || 'No description'}</div>
        </div>
      ))}
    </div>
  );
}