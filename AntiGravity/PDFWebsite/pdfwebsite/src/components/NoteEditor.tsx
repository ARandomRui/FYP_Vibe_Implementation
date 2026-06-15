import { useEffect, useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import CitationExtension from './CitationExtension'
import { supabase } from '../lib/supabase'

export default function NoteEditor({ noteId }: { noteId: string }) {
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('Saved')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveNote = async (content: any) => {
    await supabase.from('notes').update({ content, updated_at: new Date().toISOString() }).eq('id', noteId)
    setSaveStatus('Saved')
  }

  const editor = useEditor({
    extensions: [StarterKit, CitationExtension],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose-editor focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      setSaveStatus('Saving...')
      if (saveTimeoutRef.current) {
         clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
         saveNote(editor.getJSON())
      }, 1000)
    }
  })

  useEffect(() => {
    const loadNote = async () => {
      const { data } = await supabase.from('notes').select('content').eq('id', noteId).single()
      if (data && editor && !editor.isDestroyed) {
        editor.commands.setContent(data.content)
      }
      setLoading(false)
    }
    loadNote()
  }, [noteId, editor])



  useEffect(() => {
    const handleCreateCitation = (e: any) => {
      if (editor) {
        editor.chain().focus().insertContent({
          type: 'citation',
          attrs: e.detail
        }).insertContent(' ').run()
      }
    }
    window.addEventListener('create-citation', handleCreateCitation)
    return () => window.removeEventListener('create-citation', handleCreateCitation)
  }, [editor])

  if (loading) return <div style={{ padding: '2rem' }}>Loading note...</div>

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid var(--border-color)', padding: '0.75rem', display: 'flex', gap: '0.5rem', justifyContent: 'space-between', backgroundColor: 'var(--bg-secondary)' }}>
         <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" onClick={() => editor?.chain().focus().toggleBold().run()}>Bold</button>
            <button className="btn-secondary" onClick={() => editor?.chain().focus().toggleItalic().run()}>Italic</button>
            <button className="btn-secondary" onClick={() => editor?.chain().focus().toggleBulletList().run()}>Bullets</button>
         </div>
         <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>{saveStatus}</span>
      </div>
      <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
        <EditorContent editor={editor} style={{ minHeight: '100%' }} />
      </div>
    </div>
  )
}
