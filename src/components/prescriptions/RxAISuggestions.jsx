import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Star, StarOff, Loader2, ChevronDown, ChevronUp, BookmarkPlus } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Shown below the drug search field.
 * - AI suggestions (from condition or partial drug name via InvokeLLM)
 * - Saved favorites (clinic-wide + doctor's own)
 * Clicking a suggestion fills the whole Rx form.
 */
export default function RxAISuggestions({ drugSearch, onSelect, organizationId, staffId }) {
  const queryClient = useQueryClient();
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showFavs, setShowFavs] = useState(true);
  const debounceRef = useRef(null);

  // Load saved favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ['rxFavorites', organizationId, staffId],
    queryFn: async () => {
      if (!organizationId) return [];
      const all = await base44.entities.RxFavorite.filter({ organization_id: organizationId });
      // clinic-wide + this doctor's
      return all.filter(f => f.scope === 'clinic' || f.staff_id === staffId);
    },
    enabled: !!organizationId,
  });

  // AI suggestions — debounced when drug name >= 3 chars or looks like a condition
  useEffect(() => {
    if (!drugSearch || drugSearch.length < 3) {
      setAiSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setAiLoading(true);
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a clinical pharmacology assistant. The user typed: "${drugSearch}".
This could be a drug name OR a medical condition/diagnosis.

Return up to 4 typical prescription templates as a JSON array.
Each item: { drug_name, strength, dosage_form, directions, quantity, refills, condition_tag, label }
- directions: full SIG e.g. "Take 1 tablet orally twice daily with food for 7 days"
- quantity: integer number
- label: short e.g. "Amoxicillin 500mg – 7d course"
Only return valid medical prescriptions. If input is a condition, suggest standard first-line drugs.
If input is a drug name, suggest common dosing regimens.`,
          response_json_schema: {
            type: 'object',
            properties: {
              suggestions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    drug_name: { type: 'string' },
                    strength: { type: 'string' },
                    dosage_form: { type: 'string' },
                    directions: { type: 'string' },
                    quantity: { type: 'number' },
                    refills: { type: 'number' },
                    condition_tag: { type: 'string' },
                    label: { type: 'string' },
                  }
                }
              }
            }
          }
        });
        setAiSuggestions(res?.suggestions || []);
      } catch {
        setAiSuggestions([]);
      }
      setAiLoading(false);
    }, 800);
    return () => clearTimeout(debounceRef.current);
  }, [drugSearch]);

  const saveFavMutation = useMutation({
    mutationFn: async ({ suggestion, scope }) => {
      return base44.entities.RxFavorite.create({
        ...suggestion,
        organization_id: organizationId,
        staff_id: scope === 'doctor' ? staffId : null,
        scope,
        use_count: 0,
      });
    },
    onSuccess: (_, { scope }) => {
      queryClient.invalidateQueries({ queryKey: ['rxFavorites', organizationId, staffId] });
      toast.success(`Saved as ${scope === 'doctor' ? 'my' : 'clinic'} favorite`);
    },
  });

  const removeFavMutation = useMutation({
    mutationFn: (id) => base44.entities.RxFavorite.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rxFavorites', organizationId, staffId] });
      toast.success('Favorite removed');
    },
  });

  const applyFavorite = (fav) => {
    onSelect({
      drug_name: fav.drug_name,
      strength: fav.strength || '',
      dosage_form: fav.dosage_form || '',
      directions: fav.directions || '',
      quantity: fav.quantity || '',
      refills: fav.refills || 0,
    });
    // bump use count
    base44.entities.RxFavorite.update(fav.id, { use_count: (fav.use_count || 0) + 1 }).catch(() => {});
  };

  const filteredFavs = favorites.filter(f => {
    if (!drugSearch) return true;
    const q = drugSearch.toLowerCase();
    return (
      f.drug_name?.toLowerCase().includes(q) ||
      f.condition_tag?.toLowerCase().includes(q) ||
      f.label?.toLowerCase().includes(q)
    );
  });

  if (!drugSearch && filteredFavs.length === 0) return null;

  return (
    <div className="mt-2 space-y-3">
      {/* AI Suggestions */}
      {(aiLoading || aiSuggestions.length > 0) && (
        <div className="border border-violet-200 rounded-lg bg-violet-50 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-violet-100 border-b border-violet-200">
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            <span className="text-xs font-semibold text-violet-700">AI Suggestions</span>
            {aiLoading && <Loader2 className="w-3 h-3 text-violet-500 animate-spin ml-auto" />}
          </div>
          {aiLoading && aiSuggestions.length === 0 && (
            <div className="px-3 py-3 text-xs text-violet-500 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Generating suggestions...
            </div>
          )}
          {aiSuggestions.map((s, i) => (
            <div key={i} className="flex items-start justify-between px-3 py-2.5 hover:bg-violet-100 border-b border-violet-100 last:border-0 group">
              <button
                type="button"
                className="flex-1 text-left"
                onMouseDown={() => onSelect({
                  drug_name: s.drug_name,
                  strength: s.strength || '',
                  dosage_form: s.dosage_form || '',
                  directions: s.directions || '',
                  quantity: s.quantity || '',
                  refills: s.refills || 0,
                })}
              >
                <div className="text-sm font-medium text-slate-800">{s.label || `${s.drug_name} ${s.strength}`}</div>
                <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{s.directions}</div>
                {s.condition_tag && (
                  <Badge className="mt-1 text-[10px] bg-violet-100 text-violet-700 border-violet-200 h-4">
                    {s.condition_tag}
                  </Badge>
                )}
              </button>
              {/* Save as favorite buttons */}
              <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  type="button"
                  title="Save as my favorite"
                  className="p-1 rounded hover:bg-violet-200 text-violet-600"
                  onMouseDown={() => saveFavMutation.mutate({ suggestion: s, scope: 'doctor' })}
                >
                  <Star className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Save as clinic favorite"
                  className="p-1 rounded hover:bg-violet-200 text-violet-600"
                  onMouseDown={() => saveFavMutation.mutate({ suggestion: s, scope: 'clinic' })}
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Saved Favorites */}
      {filteredFavs.length > 0 && (
        <div className="border border-amber-200 rounded-lg bg-amber-50 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 bg-amber-100 border-b border-amber-200 hover:bg-amber-150"
            onClick={() => setShowFavs(v => !v)}
          >
            <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-400" />
            <span className="text-xs font-semibold text-amber-700">Favorites ({filteredFavs.length})</span>
            {showFavs ? <ChevronUp className="w-3 h-3 text-amber-500 ml-auto" /> : <ChevronDown className="w-3 h-3 text-amber-500 ml-auto" />}
          </button>
          {showFavs && filteredFavs.sort((a, b) => (b.use_count || 0) - (a.use_count || 0)).map((fav) => (
            <div key={fav.id} className="flex items-start justify-between px-3 py-2.5 hover:bg-amber-100 border-b border-amber-100 last:border-0 group">
              <button
                type="button"
                className="flex-1 text-left"
                onMouseDown={() => applyFavorite(fav)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">{fav.label || `${fav.drug_name} ${fav.strength || ''}`}</span>
                  <Badge className={`text-[10px] h-4 ${fav.scope === 'doctor' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {fav.scope === 'doctor' ? 'Mine' : 'Clinic'}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{fav.directions}</div>
                {fav.condition_tag && (
                  <Badge className="mt-1 text-[10px] bg-amber-100 text-amber-700 border-amber-200 h-4">
                    {fav.condition_tag}
                  </Badge>
                )}
              </button>
              <button
                type="button"
                title="Remove favorite"
                className="ml-2 p-1 rounded hover:bg-red-100 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                onMouseDown={() => removeFavMutation.mutate(fav.id)}
              >
                <StarOff className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}