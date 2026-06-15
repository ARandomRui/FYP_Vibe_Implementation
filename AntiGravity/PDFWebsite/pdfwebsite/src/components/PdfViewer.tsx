import { useState, useEffect } from 'react';
import { PdfLoader, PdfHighlighter, Highlight, AreaHighlight } from 'react-pdf-highlighter';
import 'react-pdf-highlighter/dist/style.css';
import { supabase } from '../lib/supabase';

// Setup worker for PDF.js - Loaded from CDN (version must match pdfjs-dist 4.4.168)
const workerUrl = "https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.mjs";

export default function PdfViewer({ activePdf }: { activePdf: any }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scrollRef, setScrollRef] = useState<Function | null>(null);
  const [activeCitationHighlight, setActiveCitationHighlight] = useState<any>(null);
  const [pendingJump, setPendingJump] = useState<any>(null);

  useEffect(() => {
    if (!activePdf) {
        setUrl(null);
        setError(null);
        return;
    }
    const fetchUrl = async () => {
      const { data, error } = await supabase.storage.from('pdfs').createSignedUrl(activePdf.file_url, 3600);
      if (error) {
          setError(error.message);
      } else if (data) {
          setUrl(data.signedUrl);
      }
    };
    fetchUrl();
  }, [activePdf]);

  const executeJump = (citation: any) => {
    const { pageNumber, boundingRect, rects } = citation;
    
    const activeHighlightId = 'citation-' + Date.now();
    
    // Show a temporary visual highlight for the citation
    setActiveCitationHighlight({
      id: activeHighlightId,
      position: { boundingRect, pageNumber, rects: rects || [] },
      content: {},
      comment: { text: '', emoji: '' }
    });

    // Clear the visual highlight after 3 seconds so it's not permanently stuck
    setTimeout(() => setActiveCitationHighlight(null), 3000);

    // We are completely bypassing the buggy react-pdf-highlighter internal scroller.
    // Instead, we use pure geometry and native DOM scrolling for bulletproof reliability!
    setTimeout(() => {
      const pageElement = document.querySelector(`.page[data-page-number="${pageNumber}"]`) as HTMLElement;
      if (!pageElement) return;
      
      const container = pageElement.parentElement?.parentElement as HTMLElement;
      if (!container) return;

      // Calculate the exact pixel offset from the top of the page down to the highlight
      let pixelOffset = 0;
      if (boundingRect && boundingRect.y1 !== undefined && boundingRect.height) {
         // boundingRect.height is the original viewport height. y1 is the original y position.
         // This gives us the exact percentage down the page, which we multiply by current page height.
         pixelOffset = pageElement.clientHeight * (boundingRect.y1 / boundingRect.height);
      } else if (boundingRect && boundingRect.top !== undefined) {
         // Fallback for older citations
         pixelOffset = boundingRect.top; 
      }

      // Calculate absolute scroll position within the container
      const scrollToY = pageElement.offsetTop + pixelOffset;
      
      // Smoothly scroll the container so the highlight is perfectly centered on screen!
      container.scrollTo({ 
         top: Math.max(0, scrollToY - container.clientHeight / 2), 
         behavior: 'smooth' 
      });

      // Search Term Highlighting - Robust Native Selection Fallback
      if (searchTerm) {
          let attempts = 0;
          const searchAndHighlight = () => {
              // Wait until ANY text layer is present, meaning pdf.js has rendered text
              const anyTextLayer = pageElement.querySelector('.textLayer, [class*="textLayer"]');
              if (anyTextLayer && anyTextLayer.children.length > 5) {
                  // Text layer is ready!
                  
                  // Strategy 1: Use native browser window.find() to bypass fragmented spans
                  const selection = window.getSelection();
                  selection?.removeAllRanges();
                  
                  const range = document.createRange();
                  range.selectNodeContents(pageElement);
                  selection?.addRange(range);
                  selection?.collapseToStart();
                  
                  const found = window.find(searchTerm, false, false, true, false, true, false);
                  
                  if (found && selection && selection.rangeCount > 0) {
                      const foundRange = selection.getRangeAt(0);
                      
                      // Verify the found text is inside our page container
                      if (pageElement.contains(foundRange.commonAncestorContainer)) {
                          const rects = foundRange.getClientRects();
                          const pageRect = pageElement.getBoundingClientRect();
                          
                          // Ensure pageElement can host absolute children
                          if (getComputedStyle(pageElement).position === 'static') {
                              pageElement.style.position = 'relative';
                          }
                          
                          const createdBoxes: HTMLDivElement[] = [];
                          
                          Array.from(rects).forEach(rect => {
                              const box = document.createElement('div');
                              box.className = 'temp-search-highlight-box';
                              box.style.position = 'absolute';
                              box.style.left = `${rect.left - pageRect.left}px`;
                              box.style.top = `${rect.top - pageRect.top}px`;
                              box.style.width = `${rect.width}px`;
                              box.style.height = `${rect.height}px`;
                              box.style.backgroundColor = 'rgba(250, 204, 21, 0.5)';
                              box.style.borderBottom = '3px solid rgba(250, 204, 21, 1)';
                              box.style.borderRadius = '2px';
                              box.style.pointerEvents = 'none';
                              box.style.zIndex = '9999';
                              box.style.boxShadow = '0 0 10px rgba(250, 204, 21, 0.8)';
                              box.style.transition = 'opacity 0.5s ease-out';
                              
                              pageElement.appendChild(box);
                              createdBoxes.push(box);
                          });
                          
                          if (createdBoxes.length > 0) {
                              const firstBox = createdBoxes[0];
                              const boxTop = parseFloat(firstBox.style.top);
                              container.scrollTo({
                                  top: Math.max(0, pageElement.offsetTop + boxTop - container.clientHeight / 2),
                                  behavior: 'smooth'
                              });
                          }
                          
                          selection.removeAllRanges();
                          
                          setTimeout(() => {
                              createdBoxes.forEach(box => {
                                  box.style.opacity = '0';
                                  setTimeout(() => box.remove(), 500);
                              });
                          }, 2500);
                          return; // Success!
                      }
                  }
                  
                  // Strategy 2: Fallback to strict DOM node search if window.find fails or isn't contained
                  const walker = document.createTreeWalker(pageElement, NodeFilter.SHOW_TEXT, null);
                  let node;
                  let foundNodes = false;
                  while ((node = walker.nextNode())) {
                      if (node.nodeValue?.toLowerCase().includes(searchTerm.toLowerCase())) {
                          const span = document.createElement('span');
                          span.className = 'temp-search-highlight';
                          span.innerHTML = node.nodeValue!.replace(new RegExp(`(${searchTerm})`, 'gi'), '<mark style="background-color: rgba(250, 204, 21, 0.8); color: inherit; padding: 2px; border-radius: 4px; box-shadow: 0 0 8px rgba(250, 204, 21, 0.8);">$1</mark>');
                          node.parentNode?.replaceChild(span, node);
                          foundNodes = true;
                      }
                  }
                  
                  if (foundNodes) {
                      const firstMark = pageElement.querySelector('mark');
                      if (firstMark) firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      
                      setTimeout(() => {
                          const tempHighlights = pageElement.querySelectorAll('.temp-search-highlight');
                          tempHighlights.forEach(el => {
                              const rawText = document.createTextNode(el.textContent || '');
                              el.parentNode?.replaceChild(rawText, el);
                          });
                      }, 3000);
                  } else {
                     if (attempts < 50) {
                        attempts++;
                        setTimeout(searchAndHighlight, 100);
                     }
                  }
                  
              } else if (attempts < 50) { // Poll for up to 5 seconds
                  attempts++;
                  setTimeout(searchAndHighlight, 100);
              }
          };
          setTimeout(searchAndHighlight, 200);
      }
    }, 50);
  };

  useEffect(() => {
    const handleNavigate = (e: any) => {
      const { pdfId } = e.detail;
      if (String(pdfId) === String(activePdf?.id)) {
        if (scrollRef) {
          executeJump(e.detail);
        } else {
          setPendingJump(e.detail);
        }
      } else {
        // PDF mismatch! Workspace will change activePdf. Store the jump for when it loads.
        setPendingJump(e.detail);
      }
    };
    window.addEventListener('navigate-citation', handleNavigate);
    return () => window.removeEventListener('navigate-citation', handleNavigate);
  }, [activePdf, scrollRef]);

  // Handle pending jumps when scrollRef becomes available for the matching PDF
  useEffect(() => {
    if (pendingJump && scrollRef && String(pendingJump.pdfId) === String(activePdf?.id)) {
      executeJump(pendingJump);
      setPendingJump(null);
    }
  }, [scrollRef, activePdf, pendingJump]);

  if (!activePdf) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', paddingTop: '40vh' }}>Select a PDF from the top menu to start reviewing.</div>;
  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: 'red', paddingTop: '40vh' }}>Error: {error}</div>;
  if (!url) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', paddingTop: '40vh' }}>Loading Secure PDF...</div>;

  const addCitation = (selection: any, hideTipAndSelection?: Function) => {
    const { boundingRect, pageNumber, content, rects } = selection;
    const event = new CustomEvent('create-citation', {
      detail: {
        pdfId: activePdf.id,
        pageNumber,
        boundingRect,
        rects,
        text: content?.text || 'selection'
      }
    });
    window.dispatchEvent(event);
    if (typeof hideTipAndSelection === 'function') {
        hideTipAndSelection();
    }
  };

  return (
    <div style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}>
      <PdfLoader url={url} beforeLoad={<div style={{padding:'2rem', color:'#64748b'}}>Loading document...</div>} workerSrc={workerUrl}>
        {(pdfDocument) => (
          <PdfHighlighter
            pdfDocument={pdfDocument}
            enableAreaSelection={event => event.altKey}
            onScrollChange={() => {}}
            pdfScaleValue="page-width"
            scrollRef={scrollTo => {
              setScrollRef(() => scrollTo);
            }}
            onSelectionFinished={(position, content, hideTipAndSelection) => {
              return (
                <div style={{ background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: 'var(--border-radius-sm)', boxShadow: 'var(--glass-shadow)', border: '1px solid var(--border-color)', position: 'relative' }}>
                    <button className="btn-primary" style={{ fontSize: '0.875rem', cursor: 'pointer' }} onClick={() => addCitation({ ...position, content }, hideTipAndSelection)}>
                      Cite this selection
                    </button>
                </div>
              );
            }}
            highlightTransform={(highlight: any, index, _setTip, _hideTip, _viewportToScaled, _screenshot, isScrolledTo) => {
              if (!highlight.position.rects || highlight.position.rects.length === 0) {
                 return (
                    <div id={`highlight-${highlight.id}`} key={index} style={{
                        position: 'absolute',
                        background: 'rgba(250, 204, 21, 0.4)',
                        border: '3px solid rgba(250, 204, 21, 0.8)',
                        borderRadius: '6px',
                        pointerEvents: 'none',
                        boxShadow: '0 4px 15px rgba(250, 204, 21, 0.3)',
                        left: `${highlight.position.boundingRect.left}px`,
                        top: `${highlight.position.boundingRect.top}px`,
                        width: `${highlight.position.boundingRect.width}px`,
                        height: `${highlight.position.boundingRect.height}px`
                    }} />
                 );
              }

              const isTextHighlight = !Boolean(highlight.content && highlight.content.image);
              const component = isTextHighlight ? (
                <div id={`highlight-${highlight.id}`} className="highlight-wrapper">
                  <Highlight isScrolledTo={isScrolledTo} position={highlight.position} comment={highlight.comment} />
                </div>
              ) : (
                <div id={`highlight-${highlight.id}`} className="highlight-wrapper">
                  <AreaHighlight isScrolledTo={isScrolledTo} highlight={highlight} onChange={() => {}} />
                </div>
              );
              return <div key={index}>{component}</div>;
            }}
            highlights={activeCitationHighlight ? [activeCitationHighlight] : []}
          />
        )}
      </PdfLoader>
    </div>
  );
}
