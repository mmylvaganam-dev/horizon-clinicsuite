import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Monitor, CheckCircle, Edit3, Save, RefreshCw, Info, Image } from 'lucide-react';
import toast from 'react-hot-toast';
import TemplateSlide from '../components/signage/TemplateSlide';

const TEMPLATE_TYPES = ['health_tip', 'promo', 'emergency', 'service_ad', 'queue', 'general_announcement'];
const LAYOUT_STYLES = ['hero', 'split', 'banner', 'sidebar', 'fullscreen'];

const LAYOUT_DESCRIPTIONS = {
  hero: 'Large centered headline — best for announcements and health tips',
  split: 'Text on left, image/color on right — best for promos and services',
  banner: 'Image background with text overlay at bottom — cinematic look',
  sidebar: 'Main content with info sidebar — good for health education',
  fullscreen: 'Full bleed image with optional overlay text — visual impact',
};

export default function SignageContentCreator() {
  const qc = useQueryClient();

  const [rawInput, setRawInput] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [targetLocation, setTargetLocation] = useState('waiting_room');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState(null); // AI-generated draft
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);

  const { data: screens = [] } = useQuery({ queryKey: ['clinicScreens'], queryFn: () => base44.entities.ClinicScreen.list() });
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const clinics = [...new Set(screens.map(s => s.clinic_name).filter(Boolean))];

  const handleGenerate = async () => {
    if (!rawInput.trim()) { toast.error('Enter some raw content first'); return; }
    setIsGenerating(true);
    setDraft(null);
    setSavedId(null);
    try {
      const { data: result } = await base44.functions.invoke('invokeOpenAI', {
        prompt: `You are a healthcare signage designer. Convert this raw clinic information into professional, concise TV signboard copy.

RAW INPUT FROM STAFF:
"${rawInput}"

CONTEXT:
- Clinic: ${clinicName || 'General Clinic'}
- Target location: ${targetLocation?.replace(/_/g, ' ')}
- Branding: teal and gold healthcare theme

RULES:
- Headline: max 8 words, bold and impactful
- Body: max 20 words, clear and readable from across the room
- CTA: max 6 words (action-oriented, e.g. "Ask at Reception", "Book Today", "See Our Team")
- Language: friendly, professional, no jargon
- Choose the best template_type from: health_tip, promo, emergency, service_ad, queue, general_announcement
- Choose the best layout_style from: hero (centered headline), split (text + image side by side), banner (image with bottom text), sidebar (content + info panel), fullscreen (full bleed)
- Choose a background_color hex that suits the content (teal palette preferred: #0d9488, #115e59, #0f766e, or gold: #d4a017)
- Write designer_notes explaining your choices in 1-2 sentences

Respond with valid JSON only, no markdown:`,
        response_json_schema: {
          type: 'object',
          properties: {
            headline: { type: 'string' },
            body_text: { type: 'string' },
            cta_text: { type: 'string' },
            template_type: { type: 'string' },
            layout_style: { type: 'string' },
            background_color: { type: 'string' },
            designer_notes: { type: 'string' },
          }
        }
      });

      const title = rawInput.slice(0, 50).trim() + (rawInput.length > 50 ? '...' : '');
      setDraft({
        title,
        type: 'text',
        headline: result.headline || '',
        body_text: result.body_text || '',
        cta_text: result.cta_text || '',
        background_color: result.background_color || '#0d9488',
        template_type: result.template_type || 'general_announcement',
        layout_style: result.layout_style || 'hero',
        media_url: mediaUrl,
        raw_input: rawInput,
        ai_generated_headline: result.headline || '',
        ai_generated_body: result.body_text || '',
        ai_suggested_template_type: result.template_type || '',
        ai_suggested_layout_style: result.layout_style || '',
        ai_suggested_cta: result.cta_text || '',
        designer_notes: result.designer_notes || '',
        approval_status: 'draft',
        is_active: false, // stays inactive until approved
        is_health_education: result.template_type === 'health_tip',
      });
    } catch (err) {
      toast.error('AI generation failed: ' + err.message);
    }
    setIsGenerating(false);
  };

  const handleSaveDraft = async () => {
    if (!draft) return;
    setIsSaving(true);
    try {
      const item = await base44.entities.SignageItem.create({
        ...draft,
        title: draft.title,
      });
      await base44.entities.SignageAuditLog.create({
        entity_type: 'item', entity_id: item.id, entity_name: draft.title,
        action: 'created', changed_by_email: user?.email || 'unknown',
        changes_summary: 'AI-generated draft saved — pending approval'
      });
      qc.invalidateQueries({ queryKey: ['signageItems'] });
      setSavedId(item.id);
      toast.success('Draft saved! An admin can now approve it in the Content Library.');
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-teal-600" /> AI Content Creator
          </h1>
          <p className="text-slate-500 text-sm mt-1">Paste raw information — AI turns it into polished clinic signboard copy</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── INPUT PANEL ─────────────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-slate-500" /> Step 1 — Enter Raw Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Raw Content *</Label>
                <Textarea
                  rows={5}
                  value={rawInput}
                  onChange={e => setRawInput(e.target.value)}
                  placeholder="Paste anything — e.g. 'We now offer extended pharmacy hours Mon-Sat until 9pm. Walk-ins welcome. Ask at the counter for more information about our new services.'"
                  className="mt-1"
                />
                <p className="text-xs text-slate-400 mt-1">AI will rewrite this into concise, TV-readable signage copy</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Clinic Name</Label>
                  <Input
                    value={clinicName}
                    onChange={e => setClinicName(e.target.value)}
                    placeholder="e.g. Main Clinic"
                    list="clinic-list"
                    className="mt-1"
                  />
                  <datalist id="clinic-list">
                    {clinics.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <Label>Target Location</Label>
                  <Select value={targetLocation} onValueChange={setTargetLocation}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['waiting_room', 'reception', 'hallway', 'exam_room', 'pharmacy'].map(l => (
                        <SelectItem key={l} value={l}>{l.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Media / Image URL (optional)</Label>
                <Input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://... (used in split/banner/fullscreen layouts)" className="mt-1" />
              </div>

              <Button
                className="w-full gap-2 h-12 text-base"
                onClick={handleGenerate}
                disabled={!rawInput.trim() || isGenerating}
              >
                {isGenerating ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" /> Generating Signage Draft...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Generate Signage Draft</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Template Style Info */}
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Layout Styles</p>
              <div className="space-y-1.5">
                {LAYOUT_STYLES.map(l => (
                  <div key={l} className="flex gap-2 text-xs">
                    <span className="font-semibold text-teal-700 w-20 flex-shrink-0 capitalize">{l}</span>
                    <span className="text-slate-500">{LAYOUT_DESCRIPTIONS[l]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── DRAFT / PREVIEW PANEL ─────────────────────────────── */}
        <div className="space-y-4">
          {!draft && !isGenerating && (
            <Card className="border-dashed border-2 border-slate-200">
              <CardContent className="p-16 flex flex-col items-center justify-center text-center">
                <Monitor className="w-16 h-16 text-slate-200 mb-4" />
                <p className="text-slate-400 font-medium">AI draft will appear here</p>
                <p className="text-slate-300 text-sm mt-1">Enter raw content and click Generate</p>
              </CardContent>
            </Card>
          )}

          {isGenerating && (
            <Card className="border-teal-200 bg-teal-50">
              <CardContent className="p-16 flex flex-col items-center justify-center text-center">
                <Sparkles className="w-12 h-12 text-teal-400 mb-4 animate-pulse" />
                <p className="text-teal-700 font-semibold">AI is crafting your signboard...</p>
                <p className="text-teal-500 text-sm mt-1">Generating headline, layout, and copy</p>
              </CardContent>
            </Card>
          )}

          {draft && (
            <>
              {/* TV Preview */}
              <Card className="overflow-hidden">
                <CardHeader className="py-3 px-4 bg-slate-800 flex-row items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-slate-400 text-xs ml-2">TV Preview — {draft.layout_style} layout</span>
                </CardHeader>
                <div className="relative overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
                  <div className="absolute inset-0">
                    <TemplateSlide item={draft} />
                  </div>
                </div>
              </Card>

              {/* Editable Draft Fields */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2"><Edit3 className="w-4 h-4" /> Step 2 — Review & Edit Draft</span>
                    <Badge className="bg-amber-100 text-amber-800">Draft</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Title (internal)</Label>
                    <Input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Template Type</Label>
                      <Select value={draft.template_type} onValueChange={v => setDraft({ ...draft, template_type: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{TEMPLATE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Layout Style</Label>
                      <Select value={draft.layout_style} onValueChange={v => setDraft({ ...draft, layout_style: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{LAYOUT_STYLES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Headline</Label>
                    <Input value={draft.headline} onChange={e => setDraft({ ...draft, headline: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label>Body Text</Label>
                    <Textarea rows={2} value={draft.body_text} onChange={e => setDraft({ ...draft, body_text: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label>Call to Action</Label>
                    <Input value={draft.cta_text} onChange={e => setDraft({ ...draft, cta_text: e.target.value })} className="mt-1" />
                  </div>
                  <div className="flex gap-2 items-center">
                    <Label>Background Color</Label>
                    <input type="color" value={draft.background_color} onChange={e => setDraft({ ...draft, background_color: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                    <Input value={draft.background_color} onChange={e => setDraft({ ...draft, background_color: e.target.value })} className="font-mono w-32" />
                  </div>

                  {draft.designer_notes && (
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 flex gap-2">
                      <Info className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                      <p className="text-teal-700 text-sm">{draft.designer_notes}</p>
                    </div>
                  )}

                  {savedId ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-green-800 font-semibold">Draft saved successfully!</p>
                        <p className="text-green-600 text-sm">An admin can now approve it in the Content Library before it goes live.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" onClick={handleGenerate} disabled={isGenerating} className="gap-2">
                        <RefreshCw className="w-4 h-4" /> Regenerate
                      </Button>
                      <Button onClick={handleSaveDraft} disabled={isSaving || !draft.title} className="flex-1 gap-2">
                        <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save as Draft'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}