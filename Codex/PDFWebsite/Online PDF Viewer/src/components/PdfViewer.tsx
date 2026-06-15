import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import type { CitationRecord, PdfSelection, ViewerPageJump } from '../types';

type PdfViewerProps = {
  fileUrl: string | null;
  documentTitle: string | null;
  activeCitation: CitationRecord | null;
  activeCitationJumpKey: number;
  activePageJump: ViewerPageJump | null;
  onSelectionChange: (selection: PdfSelection | null) => void;
};

type HighlightRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type TextNodeOffset = {
  end: number;
  node: Text;
  start: number;
};

function getSearchTokens(query: string | null | undefined) {
  const trimmedQuery = query?.trim().toLowerCase();
  if (!trimmedQuery) {
    return [];
  }

  return Array.from(
    new Set([trimmedQuery, ...trimmedQuery.split(/\s+/)].filter(Boolean)),
  ).sort((left, right) => right.length - left.length);
}

function findNodeOffset(nodes: TextNodeOffset[], targetOffset: number) {
  return nodes.find((entry) => targetOffset >= entry.start && targetOffset < entry.end) ?? null;
}

function buildSearchHighlightRects(
  pageElement: HTMLElement,
  measureElement: HTMLElement,
  query: string,
) {
  const textLayer = pageElement.querySelector<HTMLElement>('.react-pdf__Page__textContent');
  if (!textLayer) {
    return [];
  }

  const walker = document.createTreeWalker(textLayer, NodeFilter.SHOW_TEXT);
  const textNodes: TextNodeOffset[] = [];
  let textNode = walker.nextNode();
  let fullText = '';

  while (textNode) {
    const nextNode = textNode as Text;
    const text = nextNode.textContent ?? '';
    if (text) {
      const start = fullText.length;
      fullText += text;
      textNodes.push({
        end: fullText.length,
        node: nextNode,
        start,
      });
    }

    textNode = walker.nextNode();
  }

  if (!textNodes.length || !fullText) {
    return [];
  }

  const loweredText = fullText.toLowerCase();
  const tokens = getSearchTokens(query);
  const matches: Array<{ start: number; end: number }> = [];

  for (const token of tokens) {
    let fromIndex = 0;

    while (fromIndex < loweredText.length) {
      const matchIndex = loweredText.indexOf(token, fromIndex);
      if (matchIndex < 0) {
        break;
      }

      const matchEnd = matchIndex + token.length;
      const overlapsExisting = matches.some(
        (match) => matchIndex < match.end && matchEnd > match.start,
      );

      if (!overlapsExisting) {
        matches.push({
          start: matchIndex,
          end: matchEnd,
        });
      }

      fromIndex = matchIndex + token.length;
    }
  }

  if (!matches.length) {
    return [];
  }

  const pageBounds = measureElement.getBoundingClientRect();
  const rects: HighlightRect[] = [];

  for (const match of matches.sort((left, right) => left.start - right.start)) {
    const startNode = findNodeOffset(textNodes, match.start);
    const endNode = findNodeOffset(textNodes, match.end - 1);

    if (!startNode || !endNode) {
      continue;
    }

    const range = document.createRange();
    range.setStart(startNode.node, match.start - startNode.start);
    range.setEnd(endNode.node, match.end - endNode.start);

    rects.push(
      ...Array.from(range.getClientRects())
        .map((rect) => ({
          left: rect.left - pageBounds.left,
          top: rect.top - pageBounds.top,
          width: rect.width,
          height: rect.height,
        }))
        .filter((rect) => rect.width > 0 && rect.height > 0),
    );
  }

  return rects;
}

function getClosestPageShell(node: Node | null) {
  if (!node) {
    return null;
  }

  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return element?.closest<HTMLElement>('[data-page-number]') ?? null;
}

function getPageMeasureElement(pageShell: HTMLElement | null) {
  if (!pageShell) {
    return null;
  }

  return (
    pageShell.querySelector<HTMLElement>('.react-pdf__Page') ??
    pageShell.firstElementChild as HTMLElement | null
  );
}

export function PdfViewer({
  fileUrl,
  documentTitle,
  activeCitation,
  activeCitationJumpKey,
  activePageJump,
  onSelectionChange,
}: PdfViewerProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [renderWidth, setRenderWidth] = useState(760);
  const [pageCount, setPageCount] = useState(0);
  const [renderedPages, setRenderedPages] = useState<Record<number, number>>({});
  const [searchHighlightRects, setSearchHighlightRects] = useState<Record<number, HighlightRect[]>>({});

  useEffect(() => {
    const element = frameRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width ?? 760;
      setRenderWidth(Math.max(320, Math.floor(nextWidth - 36)));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    onSelectionChange(null);
    window.getSelection()?.removeAllRanges();
    setRenderedPages({});
    setSearchHighlightRects({});
  }, [fileUrl, onSelectionChange]);

  useEffect(() => {
    if (!activeCitation) {
      return;
    }

    const pageElement = pageRefs.current[activeCitation.page_number];
    const measureElement = getPageMeasureElement(pageElement);
    const frameElement = frameRef.current;
    if (!pageElement || !measureElement || !frameElement || !renderedPages[activeCitation.page_number]) {
      return;
    }

    const anchor = activeCitation.selection_anchor;
    const pageHeight =
      measureElement.clientHeight || measureElement.getBoundingClientRect().height;
    const scaleY = anchor.pageHeight ? pageHeight / anchor.pageHeight : 1;
    const firstRect = activeCitation.selection_rects[0];

    if (!firstRect) {
      pageElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      return;
    }

    const targetTop =
      pageElement.offsetTop +
      firstRect.y * scaleY -
      Math.max(40, frameElement.clientHeight * 0.25);

    frameElement.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });
  }, [activeCitation, activeCitationJumpKey, fileUrl, pageCount, renderWidth, renderedPages]);

  useEffect(() => {
    if (!activePageJump || activeCitation) {
      return;
    }

    const pageElement = pageRefs.current[activePageJump.pageNumber];
    const frameElement = frameRef.current;
    if (!pageElement || !frameElement || !renderedPages[activePageJump.pageNumber]) {
      return;
    }

    const targetTop =
      pageElement.offsetTop - Math.max(32, frameElement.clientHeight * 0.18);

    frameElement.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });
  }, [activePageJump, activeCitation, fileUrl, renderedPages]);

  useEffect(() => {
    if (activeCitation || !activePageJump?.searchQuery) {
      setSearchHighlightRects({});
      return;
    }

    const pageNumber = activePageJump.pageNumber;
    const pageElement = pageRefs.current[pageNumber];
    const measureElement = getPageMeasureElement(pageElement);

    if (!pageElement || !measureElement || !renderedPages[pageNumber]) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const nextRects = buildSearchHighlightRects(
        pageElement,
        measureElement,
        activePageJump.searchQuery ?? '',
      );

      setSearchHighlightRects((current) => ({
        ...current,
        [pageNumber]: nextRects,
      }));
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [
    activeCitation,
    activePageJump?.jumpKey,
    activePageJump?.pageNumber,
    activePageJump?.searchQuery,
    fileUrl,
    renderedPages,
    renderWidth,
  ]);

  const pageNumbers = useMemo(
    () => Array.from({ length: pageCount }, (_value, index) => index + 1),
    [pageCount],
  );

  function getHighlightRects(pageNumber: number): HighlightRect[] {
    if (!activeCitation || activeCitation.page_number !== pageNumber) {
      return [];
    }

    const pageElement = pageRefs.current[pageNumber];
    const measureElement = getPageMeasureElement(pageElement);
    if (!pageElement || !measureElement || !renderedPages[pageNumber]) {
      return [];
    }

    const pageWidth = measureElement.clientWidth || measureElement.getBoundingClientRect().width;
    const pageHeight =
      measureElement.clientHeight || measureElement.getBoundingClientRect().height;
    const anchor = activeCitation.selection_anchor;
    const scaleX = anchor.pageWidth ? pageWidth / anchor.pageWidth : 1;
    const scaleY = anchor.pageHeight ? pageHeight / anchor.pageHeight : 1;

    return activeCitation.selection_rects.map((rect) => ({
      left: rect.x * scaleX,
      top: rect.y * scaleY,
      width: rect.width * scaleX,
      height: rect.height * scaleY,
    }));
  }

  function getSearchHighlightRects(pageNumber: number): HighlightRect[] {
    if (activeCitation || activePageJump?.pageNumber !== pageNumber) {
      return [];
    }

    return searchHighlightRects[pageNumber] ?? [];
  }

  function captureSelection() {
    const browserSelection = window.getSelection();

    if (!browserSelection || browserSelection.rangeCount === 0) {
      onSelectionChange(null);
      return;
    }

    const selectedText = browserSelection.toString().trim();
    if (!selectedText) {
      onSelectionChange(null);
      return;
    }

    const range = browserSelection.getRangeAt(0);
    const pageElement = getClosestPageShell(range.commonAncestorContainer);
    if (!pageElement) {
      onSelectionChange(null);
      return;
    }

    const pageNumber = Number(pageElement.dataset.pageNumber);
    if (!pageNumber) {
      onSelectionChange(null);
      return;
    }

    const measureElement = getPageMeasureElement(pageElement);
    if (!measureElement) {
      onSelectionChange(null);
      return;
    }

    const pageBounds = measureElement.getBoundingClientRect();
    const rects = Array.from(range.getClientRects())
      .map((rect) => ({
        x: rect.left - pageBounds.left,
        y: rect.top - pageBounds.top,
        width: rect.width,
        height: rect.height,
      }))
      .filter((rect) => rect.width > 0 && rect.height > 0);

    if (rects.length === 0) {
      onSelectionChange(null);
      return;
    }

    onSelectionChange({
      pageNumber,
      selectedText,
      rects,
      anchor: {
        pageWidth: pageBounds.width,
        pageHeight: pageBounds.height,
      },
    });
  }

  return (
    <section className="viewer-panel">
      <div className="viewer-toolbar">
        <div>
          <p className="section-label">PDF Viewer</p>
          <h2>{documentTitle || 'Choose a document'}</h2>
        </div>

        {fileUrl ? <span className="page-indicator">{pageCount} pages</span> : null}
      </div>

      <div className="viewer-frame" onMouseUp={captureSelection} ref={frameRef}>
        {!fileUrl ? (
          <div className="viewer-empty">
            <p>Open a linked PDF to start reading and citing.</p>
          </div>
        ) : (
          <Document
            file={fileUrl}
            loading={
              <div className="viewer-empty">
                <p>Loading document...</p>
              </div>
            }
            onLoadError={(error) => {
              console.error(error);
            }}
            onLoadSuccess={({ numPages }) => {
              setPageCount(numPages);
              setRenderedPages({});
            }}
          >
            <div className="document-stack">
              {pageNumbers.map((pageNumber) => {
                const highlightRects = getHighlightRects(pageNumber);
                const searchRects = getSearchHighlightRects(pageNumber);
                const searchQueryForPage =
                  !activeCitation && activePageJump?.pageNumber === pageNumber
                    ? activePageJump.searchQuery ?? null
                    : null;

                return (
                  <div
                    className="page-shell"
                    data-page-number={pageNumber}
                    key={pageNumber}
                    ref={(node) => {
                      pageRefs.current[pageNumber] = node;
                    }}
                  >
                    <Page
                      key={`${fileUrl ?? 'pdf'}-${pageNumber}-${renderWidth}`}
                      onRenderSuccess={() => {
                        setRenderedPages((current) => ({
                          ...current,
                          [pageNumber]: (current[pageNumber] ?? 0) + 1,
                        }));
                      }}
                      pageNumber={pageNumber}
                      renderAnnotationLayer
                      renderTextLayer
                      width={renderWidth}
                    />

                    {highlightRects.length || searchRects.length ? (
                      <div className="highlight-layer">
                        {searchRects.map((rect, index) => (
                          <div
                            className="search-highlight-rect"
                            key={`search-${pageNumber}-${index}`}
                            style={{
                              left: rect.left,
                              top: rect.top,
                              width: rect.width,
                              height: rect.height,
                            }}
                          />
                        ))}
                        {highlightRects.map((rect, index) => (
                          <div
                            className="highlight-rect"
                            key={`${activeCitation?.id ?? 'highlight'}-${pageNumber}-${index}`}
                            style={{
                              left: rect.left,
                              top: rect.top,
                              width: rect.width,
                              height: rect.height,
                            }}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Document>
        )}
      </div>
    </section>
  );
}
