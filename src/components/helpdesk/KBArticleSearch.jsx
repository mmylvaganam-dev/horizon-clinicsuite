import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, BookOpen, Link2, X } from 'lucide-react';

export default function KBArticleSearch({ onInsertLink, onClose }) {
  const [search, setSearch] = useState('');

  const { data: articles = [] } = useQuery({
    queryKey: ['kb_articles'],
    queryFn: () => base44.entities.KnowledgeBaseArticle.filter({ status: 'published' }, '-created_date'),
  });

  const filtered = articles.filter(a =>
    !search ||
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.tags?.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
    a.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="border rounded-xl bg-white shadow-lg p-3 space-y-2 w-full">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
          <BookOpen className="w-3 h-3" /> Knowledge Base
        </p>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
        <Input
          className="pl-7 h-7 text-xs"
          placeholder="Search KB articles..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
      </div>
      <div className="max-h-52 overflow-y-auto space-y-1">
        {filtered.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">No articles found</p>
        )}
        {filtered.map(article => (
          <div key={article.id} className="flex items-start justify-between gap-2 p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-800 truncate">{article.title}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">{article.category}</Badge>
                {article.tags?.slice(0, 2).map(t => (
                  <Badge key={t} variant="secondary" className="text-[10px] px-1 py-0">{t}</Badge>
                ))}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs shrink-0"
              onClick={() => onInsertLink(article)}
            >
              <Link2 className="w-3 h-3 mr-1" />Insert
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}