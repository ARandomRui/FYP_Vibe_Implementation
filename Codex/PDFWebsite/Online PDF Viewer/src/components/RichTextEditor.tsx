import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

const CARET_GUARD = '\u200B';

type CitationInsertPayload = {
  citationId: string;
  citationLabel: string;
};

export type RichTextEditorHandle = {
  insertCitation: (payload: CitationInsertPayload) => void;
  removeCitation: (citationId: string) => void;
};

type RichTextEditorProps = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onCitationClick: (citationId: string) => void;
};

function createCitationNode(payload: CitationInsertPayload) {
  const chip = document.createElement('span');
  chip.className = 'citation-chip';
  chip.contentEditable = 'false';
  chip.dataset.citationId = payload.citationId;
  chip.setAttribute('role', 'button');
  chip.setAttribute('tabindex', '0');
  chip.textContent = payload.citationLabel;
  return chip;
}

function isCaretGuardNode(node: Node | null) {
  return node?.nodeType === Node.TEXT_NODE && node.textContent === CARET_GUARD;
}

function ensureCaretGuards(editor: HTMLElement) {
  editor.querySelectorAll('[data-citation-id]').forEach((node) => {
    if (!isCaretGuardNode(node.previousSibling)) {
      node.before(document.createTextNode(CARET_GUARD));
    }

    if (!isCaretGuardNode(node.nextSibling)) {
      node.after(document.createTextNode(CARET_GUARD));
    }
  });
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor({ value, disabled = false, onChange, onCitationClick }, ref) {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const lastSelectionRef = useRef<Range | null>(null);

    useEffect(() => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      if (editor.innerHTML !== value) {
        editor.innerHTML = value || '<p></p>';
        ensureCaretGuards(editor);
      }
    }, [value]);

    function emitChange() {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      ensureCaretGuards(editor);
      onChange(editor.innerHTML);
    }

    function rememberSelection() {
      const selection = window.getSelection();
      const editor = editorRef.current;

      if (!selection || selection.rangeCount === 0 || !editor) {
        return;
      }

      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        lastSelectionRef.current = range.cloneRange();
      }
    }

    function runCommand(command: string, valueArg?: string) {
      editorRef.current?.focus();
      document.execCommand(command, false, valueArg);
      emitChange();
    }

    useImperativeHandle(ref, () => ({
      insertCitation(payload) {
        const editor = editorRef.current;
        if (!editor) {
          return;
        }

        editor.focus();

        let range = lastSelectionRef.current;
        if (!range || !editor.contains(range.commonAncestorContainer)) {
          range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
        }

        const button = createCitationNode(payload);
        range.deleteContents();
        const afterGuard = document.createTextNode(CARET_GUARD);
        range.insertNode(afterGuard);
        range.insertNode(button);
        range.insertNode(document.createTextNode(CARET_GUARD));

        const nextRange = document.createRange();
        nextRange.setStart(afterGuard, afterGuard.textContent?.length ?? 1);
        nextRange.collapse(true);

        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(nextRange);
        lastSelectionRef.current = nextRange.cloneRange();

        emitChange();
      },

      removeCitation(citationId) {
        const editor = editorRef.current;
        if (!editor) {
          return;
        }

        editor.querySelectorAll(`[data-citation-id="${citationId}"]`).forEach((element) => {
          const trailingNode = element.nextSibling;
          const leadingNode = element.previousSibling;
          element.remove();
          if (trailingNode && isCaretGuardNode(trailingNode)) {
            trailingNode.remove();
          }
          if (leadingNode && isCaretGuardNode(leadingNode)) {
            leadingNode.remove();
          }
        });

        emitChange();
      },
    }));

    return (
      <div className={`editor-shell ${disabled ? 'disabled' : ''}`}>
        <div className="editor-toolbar">
          <button className="ghost-button" disabled={disabled} onClick={() => runCommand('formatBlock', '<h1>')} type="button">
            H1
          </button>
          <button className="ghost-button" disabled={disabled} onClick={() => runCommand('formatBlock', '<h2>')} type="button">
            H2
          </button>
          <button className="ghost-button" disabled={disabled} onClick={() => runCommand('bold')} type="button">
            Bold
          </button>
          <button className="ghost-button" disabled={disabled} onClick={() => runCommand('italic')} type="button">
            Italic
          </button>
          <button className="ghost-button" disabled={disabled} onClick={() => runCommand('formatBlock', '<p>')} type="button">
            Body
          </button>
        </div>

        <div
          className="editor-surface"
          contentEditable={!disabled}
          onClick={(event) => {
            const target = event.target as HTMLElement;
            const button = target.closest('[data-citation-id]') as HTMLElement | null;
            if (button?.dataset.citationId) {
              event.preventDefault();
              onCitationClick(button.dataset.citationId);
            }
          }}
          onMouseDown={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest('[data-citation-id]')) {
              event.preventDefault();
            }
          }}
          onInput={emitChange}
          onKeyUp={rememberSelection}
          onKeyDown={(event) => {
            const target = event.target as HTMLElement;
            const chip = target.closest?.('[data-citation-id]') as HTMLElement | null;
            if (chip?.dataset.citationId && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              onCitationClick(chip.dataset.citationId);
            }
          }}
          onMouseUp={rememberSelection}
          onPaste={(event) => {
            event.preventDefault();
            const text = event.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
            emitChange();
          }}
          ref={editorRef}
          suppressContentEditableWarning
        />
      </div>
    );
  },
);
