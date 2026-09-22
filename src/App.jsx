import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './firebase';
import Login from './components/Login';
import CreateOrganization from './components/CreateOrganization';
import AcceptInvite from './components/AcceptInvite';
import NewMatter from './components/NewMatter';
import MatterList from './components/MatterList';
import DocumentUpload from './components/DocumentUpload';
import MatterBrief from './components/MatterBrief';
import OverallAssessment from './components/OverallAssessment';
import DocumentViewer from './components/DocumentViewer';
import ProfileHeader from './components/ProfileHeader';
import AssignAssociate from './components/AssignAssociate';
import MatterWorkspace from './components/MatterWorkspace';

export default function App() {
  const [user, setUser] = useState(undefined);
  const [membership, setMembership] = useState(undefined);
  const [pendingInvite, setPendingInvite] = useState(undefined);
  const [matterId, setMatterId] = useState(null);
  const [showNewMatterForm, setShowNewMatterForm] = useState(false);
  const [results, setResults] = useState([]);
  const [overallAssessment, setOverallAssessment] = useState(null);
  const [overallStatus, setOverallStatus] = useState('idle');
  const [showDetails, setShowDetails] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [matterData, setMatterData] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    setMatterId(null);
    setShowNewMatterForm(false);
    if (!user) {
      setMembership(undefined);
      return;
    }

    getDoc(doc(db, `userOrgMembership/${user.uid}`))
      .then((snap) => {
        setMembership(snap.exists() ? snap.data() : null);
      })
      .catch((err) => {
        console.error('Failed to check org membership', err);
        setMembership(null);
      });
  }, [user]);
  useEffect(() => {
    if (!matterId) {
      setResults([]);
      setOverallAssessment(null);
      setOverallStatus('idle');
      return;
    }
    let cancelled = false;

    async function loadMatterData() {
      const [docsSnap, analysisSnap, matterSnap] = await Promise.all([
        getDocs(collection(db, `matters/${matterId}/documents`)),
        getDocs(collection(db, `matters/${matterId}/analysis`)),
        getDoc(doc(db, `matters/${matterId}`)),
      ]);
      if (cancelled) return;

      const docsById = new Map(docsSnap.docs.map((d) => [d.id, d.data()]));
      const loadedResults = analysisSnap.docs.map((a) => {
        const analysis = a.data();
        const docData = docsById.get(analysis.documentId) || {};
        return {
          fileName: docData.fileName || 'Unknown file',
          result: {
            documentId: analysis.documentId,
            storagePath: docData.storagePath,
            docType: docData.docType,
            brief: analysis.brief,
            chainOfTitle: analysis.chainOfTitle,
            missingDocs: analysis.missingDocs,
            flags: analysis.flags,
          },
        };
      });
      setResults(loadedResults);

           if (matterSnap.exists() && matterSnap.data().overallAssessment) {
        setOverallAssessment(matterSnap.data().overallAssessment);
        setOverallStatus('done');
      } else {
        setOverallAssessment(null);
        setOverallStatus('idle');
      }

            const matter = matterSnap.exists() ? matterSnap.data() : null;
      if (matter && matter.clientId) {
        const clientSnap = await getDoc(doc(db, `organizations/${matter.orgId}/clients/${matter.clientId}`));
        matter.clientName = clientSnap.exists()
          ? `${clientSnap.data().salutation || ''} ${clientSnap.data().firstName} ${clientSnap.data().lastName || ''}`.trim()
          : '';
      }
      setMatterData(matter);
    }
    

    loadMatterData().catch((err) => {
      console.error('Failed to load matter data', err);
    });

    return () => { cancelled = true; };
  }, [matterId]);

      useEffect(() => {
    if (membership !== null || !user) {
      setPendingInvite(undefined);
      return;
    }
    const call = httpsCallable(functions, 'checkPendingInvite');
    call()
      .then((result) => {
        setPendingInvite(result.data.invite || null);
      })
      .catch((err) => {
        console.error('Failed to check pending invites', err);
        setPendingInvite(null);
      });
  }, [membership, user]);

  useEffect(() => {
    if (!user) return;
    const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of no activity
    let timer = setTimeout(() => signOut(auth), TIMEOUT_MS);

    function resetTimer() {
      clearTimeout(timer);
      timer = setTimeout(() => signOut(auth), TIMEOUT_MS);
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetTimer));

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      clearTimeout(timer);
    };
  }, [user]);

    if (user === undefined) {
    return <p style={{ textAlign: 'center', marginTop: '4rem', fontFamily: 'sans-serif', color: '#666' }}>Loading…</p>;
  }

  if (!user) {
    return <Login />;
  }

  if (membership === undefined) {
    return <p style={{ textAlign: 'center', marginTop: '4rem', fontFamily: 'sans-serif', color: '#666' }}>Loading…</p>;
  }

  if (!membership) {
    if (pendingInvite === undefined) {
      return <p style={{ textAlign: 'center', marginTop: '4rem', fontFamily: 'sans-serif', color: '#666' }}>Loading…</p>;
    }
    if (pendingInvite) {
      return <AcceptInvite invite={pendingInvite} onAccepted={() => window.location.reload()} />;
    }
    return <CreateOrganization onCreated={() => window.location.reload()} />;
  }

  if (showNewMatterForm) {
    return (
      <NewMatter
        orgId={membership.orgId}
        role={membership.role}
        onCreated={(newId) => {
          setShowNewMatterForm(false);
          setMatterId(newId);
        }}
      />
    );
  }

  if (!matterId) {
    return (
      <MatterList
        orgId={membership.orgId}
        uid={user.uid}
        role={membership.role}
        user={user}
        onSelect={(id) => setMatterId(id)}
        onNewMatter={() => setShowNewMatterForm(true)}
      />
    );
  }

  function handleResult(result, file) {
    setResults((prev) => [...prev, { result, fileName: file.name }]);
  }

  function handleViewLocation({ documentId, storagePath, fileName, page, quote }) {
    setViewingDocument({ documentId, storagePath, fileName, initialPage: page, searchQuote: quote });
  }

  function resolveSource(sourceIndex) {
    const match = results[sourceIndex];
    if (!match) return null;
    return { documentId: match.result.documentId, storagePath: match.result.storagePath, fileName: match.fileName };
  }

   return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.75rem 1.5rem', borderBottom: '1px solid #eee',
      }}>
        <button type="button" onClick={() => setMatterId(null)}>← All matters</button>
        <ProfileHeader user={user} role={membership.role} onSignOut={() => signOut(auth)} />
      </div>

      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #eee' }}>
                <DocumentUpload
          matterId={matterId}
          onResult={handleResult}
          onOverallResult={async (assessment) => {
            setOverallAssessment(assessment);
            const snap = await getDoc(doc(db, `matters/${matterId}`));
            setMatterData(snap.exists() ? snap.data() : null);
          }}
          onOverallStatus={setOverallStatus}
        />

        {matterData && (membership.role === 'admin' || matterData.partnerId === user.uid) && (
          <AssignAssociate
            matterId={matterId}
            currentAssociateIds={matterData.associateIds || []}
            onAssigned={async () => {
              const snap = await getDoc(doc(db, `matters/${matterId}`));
              setMatterData(snap.exists() ? snap.data() : null);
            }}
          />
        )}
      </div>

                      <MatterWorkspace
        matterData={matterData}
        results={results}
        overallAssessment={overallAssessment}
        overallStatus={overallStatus}
        resolveSource={resolveSource}
        matterId={matterId}
        orgId={membership.orgId}
        role={membership.role}
        onChecklistChange={(updatedChecklist) => {
          setMatterData((prev) => ({ ...prev, docChecklist: updatedChecklist }));
        }}
      />
    </div>
  );
}
