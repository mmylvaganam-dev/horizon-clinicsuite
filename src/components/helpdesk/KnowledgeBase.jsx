import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, BookOpen, Eye, Ticket, Plus, Archive, Pencil, Share2, Zap, Sparkles, Copy, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import CreateKBArticleDialog from './CreateKBArticleDialog';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { RefreshCw } from 'lucide-react';

export default function KnowledgeBase() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewArticle, setViewArticle] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [showAiQA, setShowAiQA] = useState(false);
  const [showAutoGen, setShowAutoGen] = useState(false);
  const [autogenLoading, setAutogenLoading] = useState(false);
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

  const handleShareLink = (article) => {
    const url = `${window.location.origin}/kb/${article.id}`;
    setShareLink(url);
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'));
  };

  const handleAutoGen = async () => {
    setAutogenLoading(true);
    try {
      const result = await base44.functions.invoke('autoGenerateKBFromModules');
      toast.success(`Generated ${result.data.count} KB articles from modules`);
      queryClient.invalidateQueries(['kb_articles']);
      setShowAutoGen(false);
    } catch (error) {
      toast.error('Failed to auto-generate KB articles');
    }
    setAutogenLoading(false);
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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-teal-600" />
          <h2 className="text-lg font-bold text-slate-900">Knowledge Base</h2>
          <Badge className="bg-teal-100 text-teal-700">{published.length} articles</Badge>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 gap-1"
            onClick={() => setShowAutoGen(true)}
          >
            <Sparkles className="w-4 h-4" />Auto-Gen from Modules
          </Button>
          <Button 
            variant="outline"
            size="sm"
            className="border-purple-300 text-purple-700 hover:bg-purple-50 gap-1"
            onClick={() => setShowAiQA(true)}
          >
            <Zap className="w-4 h-4" />Ask AI
          </Button>
          <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />New Article
          </Button>
        </div>
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
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-teal-600" onClick={() => handleShareLink(article)}>
                      <Share2 className="w-3 h-3" />
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

      {/* Share Link Dialog */}
      <Dialog open={!!shareLink} onOpenChange={() => setShareLink(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-teal-600" />
              Shareable Link
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Share this link with your team:</p>
            <div className="flex gap-2 bg-slate-50 p-3 rounded-lg border">
              <input type="text" value={shareLink} readOnly className="flex-1 bg-transparent text-xs font-mono text-slate-700 outline-none" />
              <Button size="sm" variant="ghost" onClick={() => {
                navigator.clipboard.writeText(shareLink);
                toast.success('Copied!');
              }}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={() => setShareLink(null)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto-Generate Dialog */}
      <Dialog open={showAutoGen} onOpenChange={setShowAutoGen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Auto-Generate KB from Modules
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm text-slate-600">
              This will create Knowledge Base articles from all active system modules and their descriptions.
            </p>
            <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
              Existing articles will not be duplicated. Only new modules without KB articles will be added.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAutoGen(false)}>
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700" 
                onClick={handleAutoGen}
                disabled={autogenLoading}
              >
                {autogenLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Q&A Dialog */}
      <Dialog open={showAiQA} onOpenChange={setShowAiQA}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Ask the Support AI
            </DialogTitle>
          </DialogHeader>
          <AIQAPanel articles={articles} onClose={() => setShowAiQA(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AIQAPanel({ articles, onClose }) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const kbContext = articles
        .filter(a => a.status === 'published')
        .map(a => `[${a.title}] ${a.content}`)
        .join('\n\n');
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a helpful support AI assistant. Use the following Knowledge Base articles to answer the question. If the KB doesn't have the answer, provide general helpful guidance.\n\nKB Articles:\n${kbContext}\n\nQuestion: ${query}`,
        response_json_schema: {
          type: 'object',
          properties: {
            answer: { type: 'string' },
            sources: { type: 'array', items: { type: 'string' } }
          }
        }
      });
      setAnswer(result);
    } catch (error) {
      toast.error('Failed to get answer');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Ask a question:</label>
        <textarea 
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="e.g., How do I reset a user password? What are the new modules?"
          className="w-full h-24 p-3 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>
      <Button 
        className="w-full bg-purple-600 hover:bg-purple-700"
        onClick={handleAsk}
        disabled={loading || !query.trim()}
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Searching KB...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 mr-2" />
            Get Answer
          </>
        )}
      </Button>

      {answer && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{answer.answer}</p>
          {answer.sources?.length > 0 && (
            <div className="text-xs text-slate-500 pt-2 border-t">
              <p className="font-medium mb-1">Related KB articles:</p>
              <ul className="space-y-0.5">
                {answer.sources.map((src, i) => <li key={i}>• {src}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}