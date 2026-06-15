export type DocumentRecord = {
  id: string;
  user_id: string;
  title: string;
  file_path: string;
  file_name: string;
  created_at: string;
};

export type WorkspaceRecord = {
  id: string;
  user_id: string;
  title: string;
  note_content_html: string;
  created_at: string;
  updated_at: string;
};

export type WorkspaceDocumentRecord = {
  id: string;
  workspace_id: string;
  document_id: string;
  created_at: string;
};

export type SelectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SelectionAnchor = {
  pageWidth: number;
  pageHeight: number;
};

export type CitationRecord = {
  id: string;
  workspace_id: string;
  document_id: string;
  page_number: number;
  selected_text: string;
  selection_rects: SelectionRect[];
  selection_anchor: SelectionAnchor;
  citation_label: string;
  citation_order: number;
  created_at: string;
};

export type PdfSelection = {
  pageNumber: number;
  selectedText: string;
  rects: SelectionRect[];
  anchor: SelectionAnchor;
};

export type DocumentSearchResult = {
  documentId: string;
  documentTitle: string;
  fileName: string;
  pageNumber: number;
  searchQuery: string;
  snippet: string;
};

export type ViewerPageJump = {
  pageNumber: number;
  jumpKey: number;
  searchQuery?: string | null;
};
