export default function ProfileHeader({ user, role, onSignOut }) {
  const initial = (user.displayName || user.email || '?').charAt(0).toUpperCase();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.displayName || user.email}</div>
        <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'capitalize' }}>{role}</div>
      </div>
      {user.photoURL ? (
        <img
          src={user.photoURL}
          alt=""
          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: '#ddd',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 600, color: '#555',
        }}>
          {initial}
        </div>
      )}
      <button type="button" onClick={onSignOut} style={{ fontSize: '0.8rem' }}>Sign out</button>
    </div>
  );
}