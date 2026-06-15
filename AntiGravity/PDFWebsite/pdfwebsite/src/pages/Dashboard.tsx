import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogOut, FileText, Upload, Plus } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user) return;
    const [notesRes, pdfsRes] = await Promise.all([
      supabase.from('notes').select('*').order('updated_at', { ascending: false }),
      supabase.from('pdfs').select('*').order('created_at', { ascending: false })
    ]);
    if (notesRes.data) setNotes(notesRes.data);
    if (pdfsRes.data) setPdfs(pdfsRes.data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login'; 
  };

  const createNote = async () => {
    const title = prompt("Enter note title:", "Untitled Research");
    if (!title) return;
    const { data, error } = await supabase.from('notes').insert([{ title, user_id: user?.id }]).select().single();
    if (data) {
      navigate(`/workspace/${data.id}`);
    } else {
      alert("Error creating note: " + error?.message);
    }
  };

  const extractTextFromPdf = async (file: File) => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.mjs";
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const text = textContent.items.map((item: any) => item.str).join(' ');
          pages.push({ page_number: i, content_text: text });
      }
      return pages;
    } catch (err) {
      console.error("Error extracting text:", err);
      return [];
    }
  };

  const uploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${Math.random()}.${fileExt}`;
    
    // 1. Upload file to storage
    const { error: uploadError } = await supabase.storage.from('pdfs').upload(filePath, file);
    if (!uploadError) {
      // 2. Insert into pdfs table
      const { data: pdfData, error: dbError } = await supabase.from('pdfs').insert([{ user_id: user.id, filename: file.name, file_url: filePath }]).select().single();
      
      if (pdfData && !dbError) {
          // 3. Extract text natively in browser
          const pages = await extractTextFromPdf(file);
          // 4. Bulk insert pages into pdf_pages
          if (pages.length > 0) {
              const insertData = pages.map(p => ({
                  pdf_id: pdfData.id,
                  user_id: user.id,
                  page_number: p.page_number,
                  content_text: p.content_text
              }));
              // Batch insert
              const { error: pagesError } = await supabase.from('pdf_pages').insert(insertData);
              if (pagesError) console.error("Error inserting pdf pages:", pagesError);
          }
      } else {
         console.error(dbError);
      }
      fetchData();
    } else {
      alert("Error uploading PDF: " + uploadError.message);
    }
    setUploading(false);
  };

  const indexExistingPdfs = async () => {
    setUploading(true);
    let indexed = 0;
    try {
      const { data: unindexedPdfs } = await supabase.from('pdfs').select('*');
      if (unindexedPdfs) {
         for (const pdf of unindexedPdfs) {
            // Check if already indexed
            const { count } = await supabase.from('pdf_pages').select('id', { count: 'exact', head: true }).eq('pdf_id', pdf.id);
            if (count && count > 0) continue;
            
            // Need to download it and parse it!
            const { data: urlData } = await supabase.storage.from('pdfs').createSignedUrl(pdf.file_url, 60);
            if (urlData) {
               const res = await fetch(urlData.signedUrl);
               const blob = await res.blob();
               const file = new File([blob], pdf.filename, { type: 'application/pdf' });
               const pages = await extractTextFromPdf(file);
               
               if (pages.length > 0) {
                  const insertData = pages.map(p => ({
                      pdf_id: pdf.id,
                      user_id: user?.id,
                      page_number: p.page_number,
                      content_text: p.content_text
                  }));
                  await supabase.from('pdf_pages').insert(insertData);
                  indexed++;
               }
            }
         }
      }
      alert(`Successfully indexed ${indexed} legacy PDFs for global search!`);
    } catch (e: any) {
      alert("Error indexing: " + e.message);
    }
    setUploading(false);
  };

  return (
    <div className="app-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><FileText color="var(--accent-primary)"/> Research Dashboard</h1>
        <button onClick={handleLogout} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LogOut size={16} /> Sign Out
        </button>
      </header>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
             <h2>Research Notes</h2>
             <button className="btn-primary" onClick={createNote}><Plus size={16}/> New Note</button>
           </div>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             {notes.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No notes yet.</p> : null}
             {notes.map(note => (
               <div key={note.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div>
                   <h3 style={{ margin: 0 }}>{note.title}</h3>
                   <small style={{ color: 'var(--text-secondary)' }}>Last updated: {new Date(note.updated_at).toLocaleDateString()}</small>
                 </div>
                 <button className="btn-secondary" onClick={() => navigate(`/workspace/${note.id}`)}>Open</button>
               </div>
             ))}
           </div>
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
             <h2>PDF Library</h2>
             <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-secondary" onClick={indexExistingPdfs} disabled={uploading}>
                    {uploading ? 'Processing...' : 'Index Existing PDFs'}
                </button>
                <input type="file" accept="application/pdf" id="pdf-upload" style={{ display: 'none' }} onChange={uploadPdf} />
                <label htmlFor="pdf-upload" className="btn-primary" style={{ cursor: 'pointer', margin: 0 }}>
                   <Upload size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }}/> 
                   {uploading ? 'Uploading...' : 'Upload PDF'}
                </label>
             </div>
           </div>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             {pdfs.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No PDFs uploaded yet.</p> : null}
             {pdfs.map(pdf => (
               <div key={pdf.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                 <h3 style={{ margin: 0, fontSize: '1rem' }}>{pdf.filename}</h3>
                 <small style={{ color: 'var(--text-secondary)' }}>Added: {new Date(pdf.created_at).toLocaleDateString()}</small>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
