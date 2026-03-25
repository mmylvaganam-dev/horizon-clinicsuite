import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import {
  ShoppingBag,
  FileText,
  ChevronDown,
  ChevronUp,
  Pill,
  Stethoscope,
  Filter,
  Calendar
} from 'lucide-react';
import { getNoteTypeBadgeClass } from '@/components/emr/ClinicalNoteEditor';

function SaleEvent({ sale }) {
  const [expanded, setExpanded] = useState(false);

  const { data: saleItems = [] } = useQuery({
    queryKey: ['saleItems', sale.id],
    queryFn: () => base44.entities.PharmacySaleItem.filter({ sale_id: sale.id }),
    enabled: expanded,
  });

  return (
    <div className="bg-white rounded-xl border border-emerald-200 p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <ShoppingBag className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-900 text-sm">Pharmacy Sale</span>
              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                LKR {(sale.total_amount || sale.net_amount || 0).toLocaleString()}
              </Badge>
              {sale.payment_method && (
                <Badge variant="outline" className="text-xs capitalize">{sale.payment_method}</Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
              className="h-6 px-2 text-slate-500"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span className="text-xs ml-1">{expanded ? 'Hide' : 'Items'}</span>
            </Button>
          </div>
          {sale.sale_number && (
            <p className="text-xs text-slate-400 mt-0.5">#{sale.sale_number}</p>
          )}
          {expanded && (
            <div className="mt-3 border-t pt-3 space-y-1.5">
              {saleItems.length === 0 ? (
                <p className="text-xs text-slate-400">Loading items...</p>
              ) : (
                saleItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                    <Pill className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    <span className="font-medium">{item.product_name || item.display_name}</span>
                    <span className="text-slate-400">×{item.quantity}</span>
                    {item.unit_price && (
                      <span className="text-slate-400 ml-auto">@ LKR {item.unit_price}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NoteEvent({ note }) {
  const [expanded, setExpanded] = useState(false);

  const preview = note.rich_content
    ? note.rich_content.replace(/<[^>]+>/g, '').substring(0, 120)
    : note.subjective?.substring(0, 120) || '';

  return (
    <div className="bg-white rounded-xl border border-violet-200 p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-4 h-4 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-900 text-sm">Clinical Note</span>
              {note.note_type && (
                <Badge className={`${getNoteTypeBadgeClass(note.note_type)} border-0 text-xs`}>
                  {note.note_type}
                </Badge>
              )}
              <Badge className={
                note.status === 'signed' ? 'bg-emerald-100 text-emerald-700 border-0 text-xs' :
                note.status === 'archived' ? 'bg-slate-100 text-slate-500 border-0 text-xs' :
                'bg-amber-100 text-amber-700 border-0 text-xs'
              }>
                {note.status}
              </Badge>
              {note.ai_generated && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">AI</Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
              className="h-6 px-2 text-slate-500"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span className="text-xs ml-1">{expanded ? 'Hide' : 'View'}</span>
            </Button>
          </div>

          {!expanded && preview && (
            <p className="text-xs text-slate-500 mt-1 truncate">{preview}{preview.length >= 120 ? '...' : ''}</p>
          )}

          {expanded && (
            <div className="mt-3 border-t pt-3 space-y-2">
              {note.rich_content ? (
                <div
                  className="text-sm text-slate-700 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: note.rich_content }}
                />
              ) : (
                <>
                  {note.subjective && <div><p className="text-xs font-semibold text-teal-700 uppercase mb-1">Subjective</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{note.subjective}</p></div>}
                  {note.objective && <div><p className="text-xs font-semibold text-teal-700 uppercase mb-1">Objective</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{note.objective}</p></div>}
                  {note.assessment && <div><p className="text-xs font-semibold text-teal-700 uppercase mb-1">Assessment</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{note.assessment}</p></div>}
                  {note.plan && <div><p className="text-xs font-semibold text-teal-700 uppercase mb-1">Plan</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{note.plan}</p></div>}
                </>
              )}
              {note.icd10_codes?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {note.icd10_codes.map((code, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{code}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PatientCareTimeline({ patientId }) {
  const [filter, setFilter] = useState('all'); // all | sales | notes

  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ['patientSalesTimeline', patientId],
    queryFn: () => base44.entities.PharmacySale.filter({ patient_id: patientId }, '-created_date'),
    enabled: !!patientId,
  });

  const { data: saleHeaders = [], isLoading: loadingHeaders } = useQuery({
    queryKey: ['patientSaleHeadersTimeline', patientId],
    queryFn: () => base44.entities.PharmacySaleHeader.filter({ patient_id: patientId }, '-created_date'),
    enabled: !!patientId,
  });

  const { data: notes = [], isLoading: loadingNotes } = useQuery({
    queryKey: ['patientSOAPTimeline', patientId],
    queryFn: () => base44.entities.SOAPNote.filter({ patient_id: patientId }, '-note_date'),
    enabled: !!patientId,
  });

  const isLoading = loadingSales || loadingNotes || loadingHeaders;

  // Merge all sales sources, deduplicate by id
  const allSalesRaw = [...sales, ...saleHeaders];
  const seenSaleIds = new Set();
  const allSales = allSalesRaw.filter(s => {
    if (seenSaleIds.has(s.id)) return false;
    seenSaleIds.add(s.id);
    return true;
  });

  // Build unified timeline events
  const events = [];

  if (filter !== 'notes') {
    allSales.forEach(sale => {
      const rawDate = sale.sale_date || sale.created_date;
      events.push({
        id: `sale-${sale.id}`,
        type: 'sale',
        date: rawDate ? new Date(rawDate) : new Date(0),
        data: sale,
      });
    });
  }

  if (filter !== 'sales') {
    notes
      .filter(n => n.status !== 'archived')
      .forEach(note => {
        events.push({
          id: `note-${note.id}`,
          type: 'note',
          date: note.note_date ? new Date(note.note_date) : new Date(0),
          data: note,
        });
      });
  }

  // Sort newest first
  events.sort((a, b) => b.date - a.date);

  // Group by date label
  const grouped = {};
  events.forEach(ev => {
    const label = isNaN(ev.date) ? 'Unknown Date' : format(ev.date, 'EEEE, MMMM d, yyyy');
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(ev);
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400" />
        {[
          { key: 'all', label: 'All Events' },
          { key: 'notes', label: `Clinical Notes (${notes.filter(n => n.status !== 'archived').length})` },
          { key: 'sales', label: `Pharmacy Sales (${allSales.length})` },
        ].map(({ key, label }) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? 'default' : 'outline'}
            onClick={() => setFilter(key)}
            className={filter === key ? 'bg-teal-600 hover:bg-teal-700' : ''}
          >
            {label}
          </Button>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No events found</p>
          <p className="text-sm mt-1">Pharmacy sales and clinical notes will appear here</p>
        </div>
      ) : (
        Object.entries(grouped).map(([dateLabel, dayEvents]) => (
          <div key={dateLabel} className="space-y-2">
            {/* Date separator */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold text-slate-500 px-2 whitespace-nowrap">{dateLabel}</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {dayEvents.map(ev => (
              <div key={ev.id}>
                {ev.type === 'sale' ? (
                  <SaleEvent sale={ev.data} />
                ) : (
                  <NoteEvent note={ev.data} />
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}