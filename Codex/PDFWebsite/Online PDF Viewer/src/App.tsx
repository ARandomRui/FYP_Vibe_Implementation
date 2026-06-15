import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { pdfjs } from 'react-pdf';
import { AuthPanel } from './components/AuthPanel';
import { ConfigNotice } from './components/ConfigNotice';
import { DocumentLibrary } from './components/DocumentLibrary';
import { PdfViewer } from './components/PdfViewer';
import { RichTextEditor, type RichTextEditorHandle } from './components/RichTextEditor';
import { isSupabaseConfigured, requireSupabase } from './lib/supabase';
import type {
  CitationRecord,
  DocumentSearchResult,
  DocumentRecord,
  PdfSelection,
  ViewerPageJump,
  WorkspaceRecord,
} from './types';

const EMPTY_WORKSPACE_NOTE_HTML = '<p></p>';

type IndexedDocumentPage = {
  pageNumber: number;
  text: string;
  normalizedText: string;
};

function normalizeSearchText(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSearchSnippet(text: string, matchIndex: number, matchLength: number) {
  const snippetRadius = 58;
  const snippetStart = Math.max(0, matchIndex - snippetRadius);
  const snippetEnd = Math.min(text.length, matchIndex + matchLength + snippetRadius);
  const prefix = snippetStart > 0 ? '...' : '';
  const suffix = snippetEnd < text.length ? '...' : '';

  return `${prefix}${text.slice(snippetStart, snippetEnd).trim()}${suffix}`;
}

function renderHighlightedSnippet(snippet: string, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return snippet;
  }

  const tokens = Array.from(
    new Set([normalizedQuery, ...normalizedQuery.split(' ').filter(Boolean)]),
  ).sort((left, right) => right.length - left.length);

  if (tokens.length === 0) {
    return snippet;
  }

  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi');
  const segments = snippet.split(pattern);

  if (segments.length === 1) {
    return snippet;
  }

  return segments.map((segment, index) =>
    tokens.includes(segment.toLowerCase()) ? (
      <mark className="search-snippet-hit" key={`hit-${index}`}>
        {segment}
      </mark>
    ) : (
      <span key={`text-${index}`}>{segment}</span>
    ),
  );
}

export default function App() {
  const editorRef = useRef<RichTextEditorHandle | null>(null);
  const documentSearchIndexRef = useRef<Record<string, IndexedDocumentPage[]>>({});
  const searchRunIdRef = useRef(0);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [citations, setCitations] = useState<CitationRecord[]>([]);
  const [linkedDocumentIds, setLinkedDocumentIds] = useState<string[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [workspaceTitleDraft, setWorkspaceTitleDraft] = useState('');
  const [workspaceNoteDraft, setWorkspaceNoteDraft] = useState(EMPTY_WORKSPACE_NOTE_HTML);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [appError, setAppError] = useState<string | null>(null);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null);
  const [activeCitationJumpKey, setActiveCitationJumpKey] = useState(0);
  const [activePageJump, setActivePageJump] = useState<ViewerPageJump | null>(null);
  const [pendingPdfSelection, setPendingPdfSelection] = useState<PdfSelection | null>(null);
  const [isWorkspacePickerOpen, setIsWorkspacePickerOpen] = useState(false);
  const [isDocumentSearchOpen, setIsDocumentSearchOpen] = useState(false);
  const [renamingWorkspaceId, setRenamingWorkspaceId] = useState<string | null>(null);
  const [workspaceRenameDraft, setWorkspaceRenameDraft] = useState('');
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');
  const [documentSearchResults, setDocumentSearchResults] = useState<DocumentSearchResult[]>([]);
  const [documentSearchLoading, setDocumentSearchLoading] = useState(false);

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null,
    [workspaces, selectedWorkspaceId],
  );
  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId) ?? null,
    [documents, selectedDocumentId],
  );
  const workspaceDocuments = useMemo(
    () => documents.filter((document) => linkedDocumentIds.includes(document.id)),
    [documents, linkedDocumentIds],
  );
  const activeCitation = useMemo(
    () => citations.find((citation) => citation.id === activeCitationId) ?? null,
    [citations, activeCitationId],
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }

    const client = requireSupabase();

    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          setAppError(error.message);
        }
        setSession(data.session ?? null);
      })
      .finally(() => setAuthLoading(false));

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setWorkspaces([]);
        setDocuments([]);
        setCitations([]);
        setLinkedDocumentIds([]);
        setSelectedWorkspaceId(null);
        setSelectedDocumentId(null);
        setDocumentUrls({});
        setWorkspaceTitleDraft('');
        setWorkspaceNoteDraft(EMPTY_WORKSPACE_NOTE_HTML);
        setIsWorkspacePickerOpen(false);
        setIsDocumentSearchOpen(false);
        setRenamingWorkspaceId(null);
        setWorkspaceRenameDraft('');
        setActiveCitationId(null);
        setActiveCitationJumpKey(0);
        setActivePageJump(null);
        setDocumentSearchQuery('');
        setDocumentSearchResults([]);
        setDocumentSearchLoading(false);
        documentSearchIndexRef.current = {};
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadWorkspaceData(session.user.id);
  }, [session]);

  useEffect(() => {
    if (!selectedDocument) {
      setPendingPdfSelection(null);
      setActiveCitationId(null);
      setActiveCitationJumpKey(0);
      setActivePageJump(null);
      return;
    }

    if (documentUrls[selectedDocument.id]) {
      return;
    }

    void ensureDocumentUrl(selectedDocument).catch((error) => {
      setAppError(error instanceof Error ? error.message : 'Failed to load PDF.');
    });
  }, [selectedDocument, documentUrls]);

  useEffect(() => {
    if (!selectedWorkspace) {
      setWorkspaceTitleDraft('');
      setWorkspaceNoteDraft(EMPTY_WORKSPACE_NOTE_HTML);
      setCitations([]);
      setLinkedDocumentIds([]);
      setPendingPdfSelection(null);
      setActiveCitationId(null);
      setActiveCitationJumpKey(0);
      setActivePageJump(null);
      setDocumentSearchQuery('');
      setDocumentSearchResults([]);
      setDocumentSearchLoading(false);
      setIsDocumentSearchOpen(false);
      return;
    }

    setWorkspaceTitleDraft(selectedWorkspace.title);
    setWorkspaceNoteDraft(selectedWorkspace.note_content_html || EMPTY_WORKSPACE_NOTE_HTML);
    setWorkspaceRenameDraft(selectedWorkspace.title);
    setActiveCitationId(null);
    setActiveCitationJumpKey(0);
    setActivePageJump(null);
    setDocumentSearchQuery('');
    setDocumentSearchResults([]);
    setDocumentSearchLoading(false);
    setIsWorkspacePickerOpen(false);
    setIsDocumentSearchOpen(false);
    setRenamingWorkspaceId(null);
    void loadWorkspaceContext(selectedWorkspace.id);
  }, [selectedWorkspace?.id]);

  useEffect(() => {
    if (!selectedWorkspace) {
      return;
    }

    const hasChanges =
      workspaceTitleDraft !== selectedWorkspace.title ||
      workspaceNoteDraft !==
        (selectedWorkspace.note_content_html || EMPTY_WORKSPACE_NOTE_HTML);

    if (!hasChanges) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setSaveState('saving');
        const client = requireSupabase();
        const { data, error } = await client
          .from('workspaces')
          .update({
            title: workspaceTitleDraft.trim() || 'Untitled workspace',
            note_content_html: workspaceNoteDraft || EMPTY_WORKSPACE_NOTE_HTML,
          })
          .eq('id', selectedWorkspace.id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        await syncDeletedCitations(selectedWorkspace.id, workspaceNoteDraft || EMPTY_WORKSPACE_NOTE_HTML);
        setWorkspaces((current) =>
          current.map((workspace) =>
            workspace.id === selectedWorkspace.id ? (data as WorkspaceRecord) : workspace,
          ),
        );
        setSaveState('saved');
      } catch (error) {
        setSaveState('error');
        setAppError(error instanceof Error ? error.message : 'Failed to save workspace.');
      }
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [workspaceTitleDraft, workspaceNoteDraft, selectedWorkspace]);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setDocumentSearchResults([]);
      setDocumentSearchLoading(false);
      return;
    }

    const trimmedQuery = documentSearchQuery.trim();
    if (!trimmedQuery) {
      setDocumentSearchResults([]);
      setDocumentSearchLoading(false);
      return;
    }

    let isCancelled = false;
    const runId = searchRunIdRef.current + 1;
    searchRunIdRef.current = runId;

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          setDocumentSearchLoading(true);

          const resultGroups = await Promise.all(
            workspaceDocuments.map(async (document) => {
              try {
                const pages = await indexDocumentText(document);
                return buildDocumentSearchResults(document, pages, trimmedQuery);
              } catch (error) {
                console.error('Failed to index document for search.', error);
                return [];
              }
            }),
          );

          if (isCancelled || searchRunIdRef.current !== runId) {
            return;
          }

          setDocumentSearchResults(resultGroups.flat().slice(0, 40));
          setDocumentSearchLoading(false);
        } catch (error) {
          if (isCancelled || searchRunIdRef.current !== runId) {
            return;
          }

          setDocumentSearchLoading(false);
          setAppError(error instanceof Error ? error.message : 'Failed to search PDFs.');
        }
      })();
    }, 250);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [documentSearchQuery, selectedWorkspaceId, workspaceDocuments]);

  async function loadWorkspaceData(userId: string) {
    try {
      setWorkspaceLoading(true);
      setAppError(null);

      const client = requireSupabase();
      const [workspacesResult, documentsResult] = await Promise.all([
        client
          .from('workspaces')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false }),
        client
          .from('documents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      if (workspacesResult.error) {
        throw workspacesResult.error;
      }

      if (documentsResult.error) {
        throw documentsResult.error;
      }

      const nextWorkspaces = (workspacesResult.data as WorkspaceRecord[]) ?? [];
      const nextDocuments = (documentsResult.data as DocumentRecord[]) ?? [];

      setWorkspaces(nextWorkspaces);
      setDocuments(nextDocuments);
      setActiveCitationId(null);
      setActiveCitationJumpKey(0);
      setActivePageJump(null);
      setDocumentSearchResults([]);
      setDocumentSearchLoading(false);
      setIsDocumentSearchOpen(false);
      documentSearchIndexRef.current = {};

      setSelectedWorkspaceId((current) => {
        if (current && nextWorkspaces.some((workspace) => workspace.id === current)) {
          return current;
        }
        return nextWorkspaces[0]?.id ?? null;
      });
      setSelectedDocumentId(null);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Failed to load workspace data.');
    } finally {
      setWorkspaceLoading(false);
    }
  }

  async function loadWorkspaceContext(workspaceId: string) {
    try {
      const client = requireSupabase();
      const [linksResult, citationsResult] = await Promise.all([
        client
          .from('workspace_documents')
          .select('document_id')
          .eq('workspace_id', workspaceId),
        client
          .from('citations')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('citation_order', { ascending: true }),
      ]);

      if (linksResult.error) {
        throw linksResult.error;
      }

      if (citationsResult.error) {
        throw citationsResult.error;
      }

      const nextLinkedIds = linksResult.data?.map((row) => row.document_id as string) ?? [];
      const nextCitations = (citationsResult.data as CitationRecord[]) ?? [];

      setLinkedDocumentIds(nextLinkedIds);
      setCitations(nextCitations);
      setActiveCitationId(null);
      setActiveCitationJumpKey(0);

      setSelectedDocumentId((current) => {
        if (current && nextLinkedIds.includes(current)) {
          return current;
        }
        return nextLinkedIds[0] ?? null;
      });
    } catch (error) {
      setAppError(
        error instanceof Error ? error.message : 'Failed to load workspace details.',
      );
    }
  }

  async function ensureDocumentUrl(document: DocumentRecord) {
    if (documentUrls[document.id]) {
      return documentUrls[document.id];
    }

    const client = requireSupabase();
    const { data, error } = await client.storage
      .from('pdfs')
      .createSignedUrl(document.file_path, 3600);
    if (error) {
      throw error;
    }

    setDocumentUrls((current) => ({
      ...current,
      [document.id]: data.signedUrl,
    }));

    return data.signedUrl;
  }

  async function indexDocumentText(document: DocumentRecord) {
    const cachedPages = documentSearchIndexRef.current[document.id];
    if (cachedPages) {
      return cachedPages;
    }

    const signedUrl = await ensureDocumentUrl(document);
    const loadingTask = pdfjs.getDocument(signedUrl);
    const pdfDocument = await loadingTask.promise;

    try {
      const pages: IndexedDocumentPage[] = [];

      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        const page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const text = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        pages.push({
          pageNumber,
          text,
          normalizedText: normalizeSearchText(text),
        });
      }

      documentSearchIndexRef.current[document.id] = pages;
      return pages;
    } finally {
      await pdfDocument.destroy();
    }
  }

  function buildDocumentSearchResults(
    document: DocumentRecord,
    pages: IndexedDocumentPage[],
    query: string,
  ) {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
      return [];
    }

    const queryTerms = normalizedQuery.split(' ').filter(Boolean);
    const results: DocumentSearchResult[] = [];

    for (const page of pages) {
      if (!page.normalizedText) {
        continue;
      }

      let matchIndex = page.normalizedText.indexOf(normalizedQuery);
      let matchLength = normalizedQuery.length;

      if (matchIndex < 0) {
        const matchedTerms = queryTerms.filter((term) => page.normalizedText.includes(term));
        if (matchedTerms.length !== queryTerms.length || matchedTerms.length === 0) {
          continue;
        }

        const firstMatchedTerm = matchedTerms
          .map((term) => ({
            term,
            index: page.normalizedText.indexOf(term),
          }))
          .filter((entry) => entry.index >= 0)
          .sort((left, right) => left.index - right.index)[0];

        if (!firstMatchedTerm) {
          continue;
        }

        matchIndex = firstMatchedTerm.index;
        matchLength = firstMatchedTerm.term.length;
      }

      results.push({
        documentId: document.id,
        documentTitle: document.title,
        fileName: document.file_name,
        pageNumber: page.pageNumber,
        searchQuery: query,
        snippet: buildSearchSnippet(page.text, matchIndex, matchLength),
      });
    }

    return results;
  }

  async function syncDeletedCitations(workspaceId: string, html: string) {
    const parser = new DOMParser();
    const document = parser.parseFromString(html || EMPTY_WORKSPACE_NOTE_HTML, 'text/html');
    const citationIdsInNote = new Set(
      Array.from(document.querySelectorAll('[data-citation-id]'))
        .map((element) => element.getAttribute('data-citation-id'))
        .filter((value): value is string => Boolean(value)),
    );

    const removedIds = citations
      .filter((citation) => citation.workspace_id === workspaceId)
      .map((citation) => citation.id)
      .filter((citationId) => !citationIdsInNote.has(citationId));

    if (removedIds.length === 0) {
      return;
    }

    const client = requireSupabase();
    const { error } = await client.from('citations').delete().in('id', removedIds);
    if (error) {
      throw error;
    }

    setCitations((current) => current.filter((citation) => !removedIds.includes(citation.id)));
    if (activeCitationId && removedIds.includes(activeCitationId)) {
      setActiveCitationId(null);
    }
  }

  async function handleCreateWorkspace() {
    if (!session) {
      return;
    }

    try {
      setBusyMessage('Creating workspace...');
      const client = requireSupabase();
      const { data, error } = await client
        .from('workspaces')
        .insert({
          user_id: session.user.id,
          title: 'Untitled workspace',
          note_content_html: EMPTY_WORKSPACE_NOTE_HTML,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      const nextWorkspace = data as WorkspaceRecord;
      setWorkspaces((current) => [nextWorkspace, ...current]);
      setSelectedWorkspaceId(nextWorkspace.id);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Failed to create workspace.');
    } finally {
      setBusyMessage(null);
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || !session) {
      return;
    }

    if (!selectedWorkspaceId) {
      setAppError('Choose a workspace before uploading PDFs.');
      return;
    }

    try {
      setBusyMessage('Uploading PDF...');
      const client = requireSupabase();

      for (const file of Array.from(files)) {
        const storagePath = `${session.user.id}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await client.storage.from('pdfs').upload(storagePath, file, {
          contentType: file.type,
        });

        if (uploadError) {
          throw uploadError;
        }

        const { data, error } = await client
          .from('documents')
          .insert({
            user_id: session.user.id,
            title: file.name.replace(/\.pdf$/i, ''),
            file_path: storagePath,
            file_name: file.name,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        const nextDocument = data as DocumentRecord;
        const { error: workspaceLinkError } = await client.from('workspace_documents').insert({
          workspace_id: selectedWorkspaceId,
          document_id: nextDocument.id,
        });

        if (workspaceLinkError) {
          throw workspaceLinkError;
        }

        setDocuments((current) => [nextDocument, ...current]);
        setLinkedDocumentIds((current) =>
          current.includes(nextDocument.id) ? current : [...current, nextDocument.id],
        );
        setSelectedDocumentId(nextDocument.id);
        setActiveCitationId(null);
        setActiveCitationJumpKey(0);
        setActivePageJump(null);
        setPendingPdfSelection(null);
        await ensureDocumentUrl(nextDocument);
      }
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Failed to upload PDF.');
    } finally {
      setBusyMessage(null);
    }
  }

  async function handleOpenDocument(
    documentId: string,
    options?: {
      citationId?: string | null;
      pageNumber?: number | null;
      searchQuery?: string | null;
    },
  ) {
    try {
      const document = documents.find((item) => item.id === documentId);
      if (!document) {
        return;
      }

      await ensureDocumentUrl(document);
      setSelectedDocumentId(documentId);
      setActiveCitationId(options?.citationId ?? null);
      if (options?.citationId) {
        setActiveCitationJumpKey((current) => current + 1);
        setActivePageJump(null);
      } else if (options?.pageNumber) {
        setActiveCitationJumpKey(0);
        setActivePageJump((current) => ({
          pageNumber: options.pageNumber ?? 1,
          jumpKey: (current?.jumpKey ?? 0) + 1,
          searchQuery: options.searchQuery ?? null,
        }));
      } else {
        setActiveCitationJumpKey(0);
        setActivePageJump(null);
      }
      setPendingPdfSelection(null);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Failed to open document.');
    }
  }

  async function handleCreateCitation() {
    if (!selectedWorkspaceId || !selectedDocumentId || !pendingPdfSelection) {
      setAppError('Choose both a workspace and a PDF before creating a citation.');
      return;
    }

    try {
      if (!linkedDocumentIds.includes(selectedDocumentId)) {
        setAppError('This PDF is not part of the current workspace.');
        return;
      }

      const nextOrder =
        citations.reduce(
          (highest, citation) => Math.max(highest, citation.citation_order),
          0,
        ) + 1;

      const payload = {
        workspace_id: selectedWorkspaceId,
        document_id: selectedDocumentId,
        page_number: pendingPdfSelection.pageNumber,
        selected_text: pendingPdfSelection.selectedText,
        selection_rects: pendingPdfSelection.rects,
        selection_anchor: pendingPdfSelection.anchor,
        citation_label: `[${nextOrder}]`,
        citation_order: nextOrder,
      };

      const client = requireSupabase();
      const { data, error } = await client
        .from('citations')
        .insert(payload)
        .select()
        .single();
      if (error) {
        throw error;
      }

      const nextCitation = data as CitationRecord;
      setCitations((current) =>
        [...current, nextCitation].sort((a, b) => a.citation_order - b.citation_order),
      );
      setActiveCitationId(nextCitation.id);
      editorRef.current?.insertCitation({
        citationId: nextCitation.id,
        citationLabel: nextCitation.citation_label,
      });
      setPendingPdfSelection(null);
      setSaveState('saving');
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Failed to create citation.');
    }
  }

  async function handleOpenCitation(citationId: string) {
    const citation = citations.find((item) => item.id === citationId);
    if (!citation) {
      return;
    }

    await handleOpenDocument(citation.document_id, { citationId: citation.id });
  }

  async function handleOpenSearchResult(result: DocumentSearchResult) {
    setIsDocumentSearchOpen(false);
    await handleOpenDocument(result.documentId, {
      pageNumber: result.pageNumber,
      searchQuery: result.searchQuery,
    });
  }

  async function handleSignOut() {
    try {
      const client = requireSupabase();
      await client.auth.signOut();
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Failed to sign out.');
    }
  }

  function handleStartWorkspaceRename(workspace: WorkspaceRecord) {
    setWorkspaceRenameDraft(workspace.title || '');
    setRenamingWorkspaceId(workspace.id);
  }

  function handleSaveWorkspaceRename(workspaceId: string) {
    const nextTitle = workspaceRenameDraft.trim() || 'Untitled workspace';
    setWorkspaces((current) =>
      current.map((workspace) =>
        workspace.id === workspaceId
          ? { ...workspace, title: nextTitle }
          : workspace,
      ),
    );

    if (selectedWorkspaceId === workspaceId) {
      setWorkspaceTitleDraft(nextTitle);
    }

    setRenamingWorkspaceId(null);
  }

  if (!isSupabaseConfigured) {
    return <ConfigNotice />;
  }

  if (authLoading) {
    return <div className="loading-screen">Checking session...</div>;
  }

  if (!session) {
    return <AuthPanel errorMessage={appError} onError={setAppError} />;
  }

  return (
    <div className="app-shell">
      {appError ? <div className="error-banner">{appError}</div> : null}
      {busyMessage ? <div className="info-banner">{busyMessage}</div> : null}

      <main className="workspace-grid">
        <aside className="sidebar">
          <section className="panel utility-panel">
            <div className="control-section">
              <div className="session-header">
                <p className="section-label">Session</p>
                <div className={`status-pill ${saveState}`}>
                  {saveState === 'saving'
                    ? 'Saving...'
                    : saveState === 'error'
                      ? 'Save failed'
                      : 'Saved'}
                </div>
              </div>
              <div className="session-actions">
                <button
                  className="secondary-button"
                  onClick={() => setIsWorkspacePickerOpen(true)}
                  type="button"
                >
                  Workspace
                </button>
                <button className="ghost-button" onClick={() => void handleSignOut()} type="button">
                  Sign out
                </button>
              </div>
            </div>
          </section>

          <DocumentLibrary
            documents={workspaceDocuments}
            onOpenDocument={handleOpenDocument}
            onOpenSearch={() => setIsDocumentSearchOpen(true)}
            onUpload={handleUpload}
            selectedDocumentId={selectedDocumentId}
            selectedWorkspaceId={selectedWorkspaceId}
          />
        </aside>

        <PdfViewer
          activeCitation={activeCitation}
          activeCitationJumpKey={activeCitationJumpKey}
          activePageJump={activePageJump}
          documentTitle={selectedDocument?.title ?? null}
          fileUrl={selectedDocument ? documentUrls[selectedDocument.id] ?? null : null}
          onSelectionChange={setPendingPdfSelection}
        />

        <section className="notes-panel">
          <div className="panel note-editor-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Note</p>
                <h2>Workspace note</h2>
              </div>
              <div className="note-actions">
                {pendingPdfSelection ? <span className="meta-badge">PDF text selected</span> : null}
                {workspaceLoading ? <span className="meta-badge">Loading...</span> : null}
                <button
                  className="primary-button"
                  disabled={!selectedWorkspace || !selectedDocumentId || !pendingPdfSelection}
                  onClick={() => void handleCreateCitation()}
                  type="button"
                >
                  Cite
                </button>
              </div>
            </div>

            <RichTextEditor
              disabled={!selectedWorkspace}
              onChange={setWorkspaceNoteDraft}
              onCitationClick={(citationId) => void handleOpenCitation(citationId)}
              ref={editorRef}
              value={workspaceNoteDraft}
            />
          </div>
        </section>
      </main>

      {isWorkspacePickerOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => setIsWorkspacePickerOpen(false)}
          role="presentation"
        >
          <section
            className="modal-card workspace-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="workspace-picker-header">
              <div>
                <p className="section-label">Choose Workspace</p>
                <h2>Switch workspace</h2>
              </div>
              <div className="workspace-modal-actions">
                <button
                  className="secondary-button"
                  onClick={() => void handleCreateWorkspace()}
                  type="button"
                >
                  New
                </button>
                <button
                  className="ghost-button"
                  onClick={() => setIsWorkspacePickerOpen(false)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="workspace-modal-list scroll-list">
              {workspaces.length === 0 ? (
                <div className="empty-card">
                  <p>Create your first workspace to start taking notes.</p>
                </div>
              ) : null}

              {workspaces.map((workspace) => (
                <div
                  className={`workspace-mini-row ${
                    selectedWorkspaceId === workspace.id ? 'active' : ''
                  }`}
                  key={workspace.id}
                >
                  {renamingWorkspaceId === workspace.id ? (
                    <div className="workspace-row-edit">
                      <input
                        onChange={(event) => setWorkspaceRenameDraft(event.target.value)}
                        placeholder="Workspace name"
                        type="text"
                        value={workspaceRenameDraft}
                      />
                      <div className="workspace-row-actions">
                        <button
                          className="secondary-button"
                          onClick={() => handleSaveWorkspaceRename(workspace.id)}
                          type="button"
                        >
                          Save
                        </button>
                        <button
                          className="ghost-button"
                          onClick={() => {
                            setRenamingWorkspaceId(null);
                            setWorkspaceRenameDraft(workspace.title || '');
                          }}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        className="workspace-select-button"
                        onClick={() => setSelectedWorkspaceId(workspace.id)}
                        type="button"
                      >
                        <strong>{workspace.title || 'Untitled workspace'}</strong>
                        <span>{new Date(workspace.updated_at).toLocaleString()}</span>
                      </button>
                      <button
                        className="ghost-button workspace-rename-button"
                        onClick={() => handleStartWorkspaceRename(workspace)}
                        type="button"
                      >
                        Rename
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {isDocumentSearchOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => setIsDocumentSearchOpen(false)}
          role="presentation"
        >
          <section
            className="modal-card document-search-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="workspace-picker-header">
              <h2 className="document-search-title">Search PDFs</h2>
              <div className="workspace-modal-actions">
                <button
                  className="ghost-button"
                  onClick={() => setIsDocumentSearchOpen(false)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="document-search-section">
              <div className="document-search">
                <input
                  autoFocus
                  disabled={!selectedWorkspaceId || workspaceDocuments.length === 0}
                  onChange={(event) => setDocumentSearchQuery(event.target.value)}
                  placeholder={
                    !selectedWorkspaceId
                      ? 'Choose a workspace to search'
                      : workspaceDocuments.length === 0
                        ? 'Upload a PDF to search'
                        : 'Search across PDFs'
                  }
                  type="text"
                  value={documentSearchQuery}
                />
              </div>

              {!selectedWorkspaceId ? (
                <div className="empty-card document-search-status">
                  <p>Choose a workspace before searching its PDFs.</p>
                </div>
              ) : workspaceDocuments.length === 0 ? (
                <div className="empty-card document-search-status">
                  <p>Upload at least one PDF to this workspace to start searching.</p>
                </div>
              ) : documentSearchQuery.trim() ? (
                <div className="document-search-results scroll-list">
                  {documentSearchLoading ? (
                    <div className="empty-card document-search-status">
                      <p>Searching through workspace PDFs...</p>
                    </div>
                  ) : documentSearchResults.length === 0 ? (
                    <div className="empty-card document-search-status">
                      <p>No matches found in this workspace.</p>
                    </div>
                  ) : (
                    documentSearchResults.map((result, index) => (
                      <button
                        className="search-result-row"
                        key={`${result.documentId}-${result.pageNumber}-${index}`}
                        onClick={() => void handleOpenSearchResult(result)}
                        type="button"
                      >
                        <div className="search-result-meta">
                          <strong>{result.documentTitle}</strong>
                          <span>
                            Page {result.pageNumber} - {result.fileName}
                          </span>
                        </div>
                        <p>{renderHighlightedSnippet(result.snippet, result.searchQuery)}</p>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <div className="empty-card document-search-status">
                  <p>Type a word or phrase to search across the PDFs linked to this workspace.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
