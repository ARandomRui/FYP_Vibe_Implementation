import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, FileText } from 'lucide-react';

export default function GlobalSearch({ onNavigate }: { onNavigate: (pdfId: string, pageNumber: number, searchTerm: string) => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const [wordCount, setWordCount] = useState(0);

    // close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // debounced search
    useEffect(() => {
        const debounce = setTimeout(async () => {
            if (query.trim().length < 3) {
                setResults([]);
                setWordCount(0);
                return;
            }
            setIsSearching(true);
            
            const { data, error } = await supabase
                .from('pdf_pages')
                .select('id, pdf_id, page_number, content_text, pdfs(filename)')
                .ilike('content_text', `%${query}%`)
                .limit(50);
                
            if (data) {
                // Count exact occurrences of the word across all matched pages
                const regex = new RegExp(query, 'gi');
                const totalWords = data.reduce((sum, page) => {
                    const matches = page.content_text.match(regex);
                    return sum + (matches ? matches.length : 0);
                }, 0);
                
                setWordCount(totalWords);
                setResults(data);
                setIsOpen(true);
            } else if (error) {
                console.error("Search error:", error);
            }
            setIsSearching(false);
        }, 500);
        return () => clearTimeout(debounce);
    }, [query]);

    // Extract ~10 words snippet around the match
    const getSnippet = (text: string, search: string) => {
        const regex = new RegExp(`(${search})`, 'gi');
        const match = regex.exec(text);
        if (!match) return text.substring(0, 100) + '...';
        
        // Find rough word boundaries (approx 10 words is ~60 chars)
        const start = Math.max(0, match.index - 60); 
        const end = Math.min(text.length, match.index + search.length + 60);
        
        let snippet = text.substring(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < text.length) snippet = snippet + '...';
        
        // Highlight the keyword
        const parts = snippet.split(new RegExp(`(${search})`, 'gi'));
        return parts.map((part, i) => 
            part.toLowerCase() === search.toLowerCase() ? 
            <span key={i} style={{ backgroundColor: 'rgba(250, 204, 21, 0.4)', fontWeight: 'bold' }}>{part}</span> : part
        );
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                    type="text" 
                    placeholder="Search all PDFs..." 
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
                    onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                    className="input-field"
                    style={{ paddingLeft: '2.5rem', width: '300px', backgroundColor: 'var(--bg-primary)' }}
                />
            </div>
            
            {isOpen && query.length >= 3 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0, width: '450px', maxHeight: '500px', overflowY: 'auto', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', boxShadow: 'var(--glass-shadow)', zIndex: 100 }}>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', position: 'sticky', top: 0 }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{isSearching ? 'Searching...' : `${wordCount} occurrences found across ${results.length} pages`}</span>
                    </div>
                    {results.length === 0 && !isSearching && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No results found.</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {results.map((result) => (
                            <div 
                                key={result.id} 
                                onClick={() => { onNavigate(result.pdf_id, result.page_number, query); setIsOpen(false); }}
                                style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <FileText size={14} color="var(--accent-primary)" />
                                    <span style={{ fontSize: '0.875rem', fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {result.pdfs?.filename}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Page {result.page_number}</span>
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    {getSnippet(result.content_text, query)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
