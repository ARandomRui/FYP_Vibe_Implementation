import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import CitationNode from './CitationNode'

export default Node.create({
  name: 'citation',
  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,

  addAttributes() {
    return {
      pdfId: { default: null },
      pageNumber: { default: null },
      boundingRect: { default: null },
      rects: { default: null },
      text: { default: null }
    }
  },

  parseHTML() {
    return [{ tag: 'citation-token' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['citation-token', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CitationNode)
  },
})
