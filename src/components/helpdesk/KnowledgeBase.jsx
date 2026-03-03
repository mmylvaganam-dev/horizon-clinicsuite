import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, BookOpen, Eye, Ticket, Plus, Archive, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import CreateKBArticleDialog from './CreateKBArticleDialog';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

export default function KnowledgeBase() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewArticle, setViewArticle] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['kb_articles'],
    queryFn: () => base44.entities.KnowledgeBaseArticle.list('-created_date'),
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => base44.entities.KnowledgeBaseArticle.update(id, { status: 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['kb_articles']);
      toast.success('Article archived');
    }
  });

  const incrementView = (article) => {
    base44.entities.KnowledgeBaseArticle.update(article.id, { view_count: (article.view_count || 0) + 1 }).catch(() => {});
    setViewArticle(article);
  };

  const filtered = articles.filter(a => {
    const matchSearch = !search ||
      a.title?.toLowerCase().includes(search.toLowerCase()) ||
      a.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchCat = categoryFilter === 'all' || a.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const published = filtered.filter(a => a.status === 'published');
  const drafts = filtered.filter(a => a.status === 'draft');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-teal-600" />
          <h2 className="text-lg font-bold text-slate-900">Knowledge Base</h2>
          <Badge className="bg-teal-100 text-teal-700">{published.length} articles</Badge>
        </div>
        <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />New Article
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="software">Software</SelectItem>
            <SelectItem value="hardware">Hardware</SelectItem>
            <SelectItem value="network">Network</SelectItem>
            <SelectItem value="billing">Billing</SelectItem>
            <SelectItem value="access">Access</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Article List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : published.length === 0 && drafts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No articles yet</p>
            <p className="text-slate-400 text-sm mt-1">Create articles manually or from resolved tickets</p>
            <Button className="mt-4 bg-teal-600 hover:bg-teal-700" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />New Article
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {published.map(article => (
            <Card key={article.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className="capitalize text-xs">{article.category}</Badge>
                      {article.source_ticket_number && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          <Ticket className="w-3 h-3 mr-1" />{article.source_ticket_number}
                        </Badge>
                      )}
                      {article.tags?.map(t => (
                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                    <h3 className="font-semibold text-slate-900 truncate">{article.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(article.created_date), 'MMM d, yyyy')} · {article.view_count || 0} views · by {article.created_by}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => incrementView(article)}>
                      <Eye className="w-3 h-3 mr-1" />View
                    </Button>
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-red-500" onClick={() => archiveMutation.mutate(article.id)}>
                      <Archive className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Article Dialog */}
      <Dialog open={!!viewArticle} onOpenChange={() => setViewArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-600" />
              {viewArticle?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 flex flex-wrap gap-2 mb-3">
            <Badge variant="outline" className="capitalize">{viewArticle?.category}</Badge>
            {viewArticle?.tags?.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
            {viewArticle?.source_ticket_number && (
              <Badge className="bg-blue-100 text-blue-700">
                <Ticket className="w-3 h-3 mr-1" />From {viewArticle.source_ticket_number}
              </Badge>
            )}
          </div>
          <div className="prose prose-sm max-w-none text-slate-800">
            <ReactMarkdown>{viewArticle?.content || ''}</ReactMarkdown>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Created {viewArticle && format(new Date(viewArticle.created_date), 'PPP')} · {viewArticle?.view_count || 0} views
          </p>
        </DialogContent>
      </Dialog>

      {/* Create Article Dialog */}
      <CreateKBArticleDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        ticket={null}
      />
    </div>
  );
}