import { NodeViewWrapper } from '@tiptap/react'

export default function CitationNode(props: any) {
  const { pdfId, pageNumber, boundingRect, rects } = props.node.attrs

  const handleClick = (e: any) => {
    e.preventDefault()
    e.stopPropagation()
    const event = new CustomEvent('navigate-citation', {
      detail: { pdfId, pageNumber, boundingRect, rects }
    })
    window.dispatchEvent(event)
  }

  return (
    <NodeViewWrapper as="span" style={{ display: 'inline-block' }} contentEditable={false}>
      <span 
        onClick={handleClick}
        style={{ 
          color: 'var(--accent-primary)', 
          cursor: 'pointer', 
          backgroundColor: 'rgba(99, 102, 241, 0.15)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontWeight: 600,
          margin: '0 4px',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          userSelect: 'none'
        }}
        title="Click to jump to this citation in the PDF"
      >
        [Cite: P{pageNumber}]
      </span>
    </NodeViewWrapper>
  )
}
