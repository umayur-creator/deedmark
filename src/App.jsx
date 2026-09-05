import { useState } from 'react';
import DocumentUpload from './components/DocumentUpload';
import MatterBrief from './components/MatterBrief';
import OverallAssessment from './components/OverallAssessment';

const DEMO_MATTER_ID = 'demo-matter';

export default function App() {
  const [results, setResults] = useState([]);
  const [overallAssessment, setOverallAssessment] = useState(null);
  const [overallStatus, setOverallStatus] = useState('idle');
  const [showDetails, setShowDetails] = useState(false);

  function handleResult(result, file) {
    setResults((prev) => [...prev, { result, fileName: file.name }]);
  }

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Deedmark</h1>
      <p>Upload a property document to get a brief, chain of title, and missing docs.</p>
      <DocumentUpload
        matterId={DEMO_MATTER_ID}
        onResult={handleResult}
        onOverallResult={setOverallAssessment}
        onOverallStatus={setOverallStatus}
      />

      <OverallAssessment assessment={overallAssessment} status={overallStatus} />

      {results.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <button type="button" onClick={() => setShowDetails((v) => !v)}>
            {showDetails ? 'Hide' : 'Show'} per-document details
          </button>
          {showDetails && results.map((r, i) => (
            <MatterBrief key={i} result={r.result} fileName={r.fileName} />
          ))}
        </div>
      )}
    </div>
  );
}