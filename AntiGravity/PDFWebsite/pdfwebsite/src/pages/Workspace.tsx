import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import NoteEditor from '../components/NoteEditor';
import PdfViewer from '../components/PdfViewer';
import GlobalSearch from '../components/GlobalSearch';

export default function Workspace() {
  const { noteId } = useParams();
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [activePdf, setActivePdf] = useState<any | null>(null);

  useEffect(() => {
    const fetchPdfs = async () => {
      const { data } = await supabase.from('pdfs').select('*');
      if (data) setPdfs(data);
    };
    fetchPdfs();
  }, []);

  const handleSearchNavigate = (pdfId: string, pageNumber: number, searchTerm: string) => {
      // Create a fake citation event to trigger navigation
      const eventDetail = { pdfId, pageNumber, boundingRect: null, rects: [], searchTerm };
      window.dispatchEvent(new CustomEvent('navigate-citation', { detail: eventDetail }));
  };

  useEffect(() => {
    const handleNavigate = (e: any) => {
      const { pdfId } = e.detail;
      if (pdfId && activePdf?.id !== pdfId) {
        const targetPdf = pdfs.find(p => p.id === pdfId);
        if (targetPdf) {
            setActivePdf(targetPdf);
            // Delay scroll slightly to allow the new PDF to load
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('navigate-citation', { detail: e.detail }));
            }, 1500); 
        }
      }
    };
    window.addEventListener('navigate-citation', handleNavigate);
    return () => window.removeEventListener('navigate-citation', handleNavigate);
  }, [activePdf, pdfs]);

  return (
    <div className="app-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '0.75rem 1.5rem', borderBottom: 'var(--glass-border)', display: 'flex', gap: '1.5rem', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', zIndex: 10 }}>
         <Link to="/" className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>Back</Link>
         <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Research Workspace</h2>
         <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
             <GlobalSearch onNavigate={handleSearchNavigate} />
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Library:</span>
            <select 
               className="input-field" 
               style={{ width: '300px', padding: '0.35rem 0.5rem', backgroundColor: 'var(--bg-primary)' }}
               value={activePdf?.id || ''} 
               onChange={e => setActivePdf(pdfs.find(p => p.id === e.target.value) || null)}
            >
               <option value="">-- Select a PDF to view --</option>
               {pdfs.map(pdf => (
                  <option key={pdf.id} value={pdf.id}>{pdf.filename}</option>
               ))}
            </select>
         </div>
      </header>
      <div className="main-content" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
         <div style={{ flex: 1, borderRight: 'var(--glass-border)', position: 'relative', backgroundColor: '#e2e8f0' }}>
            <PdfViewer activePdf={activePdf} />
         </div>
         <div style={{ width: '40%', minWidth: '400px', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
            <NoteEditor noteId={noteId!} />
         </div>
      </div>
    </div>
  );
}
