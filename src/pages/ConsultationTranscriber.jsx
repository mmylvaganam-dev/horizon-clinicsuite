import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, Search, User, FileText } from 'lucide-react';
import VoiceTranscriber from '@/components/emr/VoiceTranscriber';
import { useOrganization } from '@/components/OrganizationProvider';

export default function ConsultationTranscriber() {
  const { selectedOrgId } = useOrganization();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [search, setSearch] = useState('');
  const [savedCount, setSavedCount] = useState(0);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', selectedOrgId],
    queryFn: () => {
      const filter = selectedOrgId ? { organization_id: selectedOrgId } : {};
      return base44.entities.Patient.filter(filter, '-created_date');
    },
  });

  const filtered = patients.filter(p => {
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    const s = search.toLowerCase();
    return name.includes(s) || p.mrn?.toLowerCase().includes(s) || p.phn?.toLowerCase().includes(s);
  }).slice(0, 50);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg">
          <Mic className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consultation Transcriber</h1>
          <p className="text-slate-500 text-sm mt-0.5">Voice-to-SOAP — speak during consultation, AI structures the note</p>
        </div>
        {savedCount > 0 && (
          <Badge className="ml-auto bg-emerald-100 text-emerald-700">{savedCount} note{savedCount > 1 ? 's' : ''} saved this session</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient selector */}
        <div className="lg:col-span-1">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" /> Select Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="Search patient..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>

              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {filtered.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No patients found</p>
                )}
                {filtered.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                      selectedPatient?.id === p.id
                        ? 'bg-teal-50 border-teal-300'
                        : 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {p.first_name?.[0]}{p.last_name?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{p.first_name} {p.last_name}</p>
                        <p className="text-xs text-slate-400 truncate">{p.phn || p.mrn || ''}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transcriber panel */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm min-h-[500px]">
            <CardContent className="pt-6">
              {selectedPatient ? (
                <VoiceTranscriber
                  patientId={selectedPatient.id}
                  patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
                  onNoteSaved={() => setSavedCount(c => c + 1)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-80 text-center gap-4 text-slate-400">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-slate-300" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-600">Select a patient to begin</p>
                    <p className="text-sm mt-1">Choose a patient from the list to start transcribing their consultation</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}