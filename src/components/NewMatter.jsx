import { useState, useEffect } from 'react';
import { createMatterWithClient, listClients } from '../lib/api';

export default function NewMatter({ orgId, role, onCreated }) {
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [addingNewClient, setAddingNewClient] = useState(false);

  const [salutation, setSalutation] = useState('Mr.');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [mobile1, setMobile1] = useState('');
  const [mobile2, setMobile2] = useState('');

  const [district, setDistrict] = useState('');
  const [taluk, setTaluk] = useState('');
  const [hobli, setHobli] = useState('');
  const [village, setVillage] = useState('');
  const [surveyNo, setSurveyNo] = useState('');
  const [serviceRequested, setServiceRequested] = useState('');

  const [claimForSelf, setClaimForSelf] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listClients(orgId)
      .then((list) => {
        setClients(list);
        if (list.length === 0) setAddingNewClient(true);
      })
      .catch((err) => {
        console.error('Failed to load clients', err);
        setAddingNewClient(true);
      })
      .finally(() => setLoadingClients(false));
  }, [orgId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!addingNewClient && !selectedClientId) {
      setError('Select a client or choose "Add new client."');
      return;
    }
    if (addingNewClient && (!firstName.trim() || !mobile1.trim())) {
      setError('First name and at least one mobile number are required for a new client.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        district: district.trim(),
        taluk: taluk.trim(),
        hobli: hobli.trim(),
        village: village.trim(),
        surveyNo: surveyNo.trim(),
        serviceRequested: serviceRequested.trim(),
        claimForSelf,
      };
      if (addingNewClient) {
        payload.newClient = {
          salutation,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          address: address.trim(),
          mobile1: mobile1.trim(),
          mobile2: mobile2.trim(),
        };
      } else {
        payload.clientId = selectedClientId;
      }

      const { matterId } = await createMatterWithClient(payload);
      onCreated(matterId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>New Matter</h1>
      <form onSubmit={handleSubmit}>
        <h3>Client</h3>
        {!loadingClients && clients.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <select
              value={addingNewClient ? '__new__' : selectedClientId}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  setAddingNewClient(true);
                  setSelectedClientId('');
                } else {
                  setAddingNewClient(false);
                  setSelectedClientId(e.target.value);
                }
              }}
              style={{ width: '100%', padding: '0.5rem' }}
            >
              <option value="">Select existing client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.salutation} {c.firstName} {c.lastName}
                </option>
              ))}
              <option value="__new__">+ Add new client</option>
            </select>
          </div>
        )}

        {addingNewClient && (
          <div style={{ border: '1px solid #ddd', padding: '1rem', marginBottom: '1rem', borderRadius: 4 }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <select value={salutation} onChange={(e) => setSalutation(e.target.value)} style={{ padding: '0.5rem' }}>
                <option>Mr.</option>
                <option>Mrs.</option>
                <option>Ms.</option>
                <option>Dr.</option>
                <option>M/s.</option>
              </select>
              <input
                type="text"
                placeholder="First name *"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required={addingNewClient}
                style={{ flex: 1, padding: '0.5rem' }}
              />
              <input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={{ flex: 1, padding: '0.5rem' }}
              />
            </div>
            <input
              type="text"
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="tel"
                placeholder="Mobile number *"
                value={mobile1}
                onChange={(e) => setMobile1(e.target.value)}
                required={addingNewClient}
                style={{ flex: 1, padding: '0.5rem' }}
              />
              <input
                type="tel"
                placeholder="Mobile number (alt.)"
                value={mobile2}
                onChange={(e) => setMobile2(e.target.value)}
                style={{ flex: 1, padding: '0.5rem' }}
              />
            </div>
          </div>
        )}

        <h3>Case details</h3>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input type="text" placeholder="District" value={district} onChange={(e) => setDistrict(e.target.value)} style={{ flex: 1, padding: '0.5rem' }} />
          <input type="text" placeholder="Taluk" value={taluk} onChange={(e) => setTaluk(e.target.value)} style={{ flex: 1, padding: '0.5rem' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input type="text" placeholder="Hobli" value={hobli} onChange={(e) => setHobli(e.target.value)} style={{ flex: 1, padding: '0.5rem' }} />
          <input type="text" placeholder="Village" value={village} onChange={(e) => setVillage(e.target.value)} style={{ flex: 1, padding: '0.5rem' }} />
        </div>
        <input
          type="text"
          placeholder="Survey No."
          value={surveyNo}
          onChange={(e) => setSurveyNo(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
        />
        <textarea
          placeholder="Service requested (e.g. title study, encumbrance check) and any client preferences"
          value={serviceRequested}
          onChange={(e) => setServiceRequested(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
        />

        {(role === 'partner' || role === 'admin') && (
          <label style={{ display: 'block', marginBottom: '1rem' }}>
            <input type="checkbox" checked={claimForSelf} onChange={(e) => setClaimForSelf(e.target.checked)} />
            {' '}This is my matter — assign it to me now
          </label>
        )}

        {error && <p style={{ color: '#9C3A32', fontSize: '0.85rem' }}>{error}</p>}

        <button type="submit" disabled={submitting} style={{ width: '100%', padding: '0.6rem' }}>
          {submitting ? 'Creating…' : 'Create matter'}
        </button>
      </form>
    </div>
  );
}