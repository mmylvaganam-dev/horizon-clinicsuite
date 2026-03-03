import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateKBArticleDialog({ open, onClose, ticket }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(ticket?.title || '');
  const [content, setContent] = useState(
    ticket?.resolution_notes
      ? `**Problem:**\n${ticket.description}\n\n**Solution:**\n${ticket.resolution_notes}`
      : ticket?.description
      ? `**Problem:**\n${ticket.description}\n\n**Solution:**\n`
      : ''
  );
  const [category, setCategory] = useState(ticket?.category || 'software');
  const [tags, setTags] = useState('');
  const [generating, setGenerating] = useState(false);

  const createMutation = useMutation({
    mutationFn: () => base44.entities.KnowledgeBaseArticle.create({
      title,
      content,
      category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      status: 'published',
      source_ticket_id: ticket?.id || null,
      source_ticket_number: ticket?.ticket_number || null,
      view_count: 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['kb_articles']);
      toast.success('KB article created!');
      onClose();
    },
    onError: () => toast.error('Failed to create article')
  });

  const handleAutoGenerate = async () => {
    if (!ticket) return;
    setGenerating(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a technical support knowledge base writer. 
Create a clear, concise KB article from this resolved support ticket.

Ticket Title: ${ticket.title}
Category: ${ticket.category}
Description: ${ticket.description}
Error Message: ${ticket.error_message || 'None'}
Resolution Notes: ${ticket.resolution_notes || 'Not provided'}

Return a JSON with: { "title": "...", "content": "...", "tags": ["tag1", "tag2"] }
The content should be formatted markdown with Problem, Root Cause, and Solution sections.`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } }
          }
        }
      });
      if (res.title) setTitle(res.title);
      if (res.content) setContent(res.content);
      if (res.tags?.length) setTags(res.tags.join(', '));
      toast.success('AI draft generated!');
    } catch {
      toast.error('AI generation failed');
    }
    setGenerating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-600" />
            Create Knowledge Base Article
            {ticket && <span className="text-sm font-normal text-slate-400">from {ticket.ticket_number}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {ticket && (
            <Button
              variant="outline"
              className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
              onClick={handleAutoGenerate}
              disabled={generating}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : 'Auto-generate with AI'}
            </Button>
          )}

          <div>
            <Label className="text-xs">Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. How to reset pharmacy POS login" />
          </div>

          <div>
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="software">Software</SelectItem>
                <SelectItem value="hardware">Hardware</SelectItem>
                <SelectItem value="network">Network</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="access">Access</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Content *</Label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={10}
              placeholder="Describe the problem and solution..."
              className="font-mono text-sm"
            />
          </div>

          <div>
            <Label className="text-xs">Tags (comma-separated)</Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="login, pharmacy, POS" />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => createMutation.mutate()}
              disabled={!title || !content || createMutation.isPending}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              {createMutation.isPending ? 'Creating...' : 'Publish Article'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}