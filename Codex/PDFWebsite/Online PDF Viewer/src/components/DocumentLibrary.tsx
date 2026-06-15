import type { ChangeEvent } from 'react';
import type { DocumentRecord } from '../types';

type DocumentLibraryProps = {
  documents: DocumentRecord[];
  selectedDocumentId: string | null;
  selectedWorkspaceId: string | null;
  onOpenSearch: () => void;
  onUpload: (files: FileList | null) => Promise<void>;
  onOpenDocument: (documentId: string) => Promise<void>;
};

export function DocumentLibrary({
  documents,
  selectedDocumentId,
  selectedWorkspaceId,
  onOpenSearch,
  onUpload,
  onOpenDocument,
}: DocumentLibraryProps) {
  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    await onUpload(event.target.files);
    event.target.value = '';
  }

  return (
    <section className="panel sidebar-panel document-panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">Documents</p>
          <h2>PDF list</h2>
        </div>
        <div className="document-header-actions">
          <button
            aria-label="Search PDFs"
            className="ghost-button icon-button"
            onClick={onOpenSearch}
            title="Search PDFs"
            type="button"
          >
            &#8981;
          </button>
          <label className="secondary-button upload-button-inline">
            Upload
            <input accept="application/pdf" multiple onChange={handleUpload} type="file" />
          </label>
        </div>
      </div>

      <div className="document-list scroll-list">
        {documents.length === 0 ? (
          <div className="empty-card">
            <p>
              {selectedWorkspaceId
                ? 'Upload PDFs to add them to this workspace.'
                : 'Choose a workspace first.'}
            </p>
          </div>
        ) : null}

        {documents.map((document) => (
          <button
            className={`document-row ${selectedDocumentId === document.id ? 'active' : ''}`}
            key={document.id}
            onClick={() => void onOpenDocument(document.id)}
            type="button"
          >
            <div className="document-meta">
              <strong>{document.title}</strong>
              <p>{document.file_name}</p>
            </div>

            <span className="document-row-hint">
              {selectedDocumentId === document.id ? 'Viewing' : 'Open'}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
