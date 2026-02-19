import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Volume2 } from 'lucide-react';

// Public display board — no layout needed, full screen
// URL: /QueueDisplay?org=<orgId>&counter=<counterId>

export default function QueueDisplay() {
  const urlParams = new URLSearchParams(window.location.search);
  const orgId = urlParams.get('org');
  const counterIdFilter = urlParams.get('counter'); // optional, if not set show all

  const [counters, setCounters] = useState([]);
  const [calledTokens, setCalledTokens] = useState({}); // { counter_id: token }
  const [waitingCounts, setWaitingCounts] = useState({}); // { counter_id: count }
  const [orgName, setOrgName] = useState('');
  const [time, setTime] = useState(new Date());
  const [announcedToken, setAnnouncedToken] = useState(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!orgId) return;
      const orgs = await base44.entities.Organization.filter({ id: orgId });
      if (orgs[0]) setOrgName(orgs[0].name);

      let ctrs = await base44.entities.QueueCounter.filter({ organization_id: orgId, status: 'active' });
      if (counterIdFilter) ctrs = ctrs.filter(c => c.id === counterIdFilter);
      setCounters(ctrs);

      // Load current called/serving tokens for each counter
      const called = {};
      const waiting = {};
      for (const ctr of ctrs) {
        const tokens = await base44.entities.QueueToken.filter({ counter_id: ctr.id, session_date: today });
        const active = tokens.find(t => t.status === 'called' || t.status === 'serving');
        called[ctr.id] = active || null;
        waiting[ctr.id] = tokens.filter(t => t.status === 'waiting').length;
      }
      setCalledTokens(called);
      setWaitingCounts(waiting);
    };
    load();
  }, [orgId, counterIdFilter]);

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.QueueToken.subscribe(async (event) => {
      if (event.data?.organization_id !== orgId) return;
      const counterId = event.data?.counter_id;
      if (!counterId) return;

      // Refresh tokens for that counter
      const tokens = await base44.entities.QueueToken.filter({ counter_id: counterId, session_date: today });
      const active = tokens.find(t => t.status === 'called' || t.status === 'serving');
      setCalledTokens(prev => ({ ...prev, [counterId]: active || null }));
      setWaitingCounts(prev => ({ ...prev, [counterId]: tokens.filter(t => t.status === 'waiting').length }));

      // Trigger announcement if newly called
      if (event.data?.status === 'called') {
        setAnnouncedToken(event.data);
        setTimeout(() => setAnnouncedToken(null), 5000);
      }
    });
    return unsub;
  }, [orgId, today]);

  const counterTypeIcon = {
    opd: '🏥', lab: '🧪', pharmacy: '💊', doctor: '👨‍⚕️',
    consultation: '🩺', registration: '📋', radiology: '📷', other: '🏢',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-slate-900 to-teal-900 text-white flex flex-col" style={{ fontFamily: 'system-ui' }}>
      {/* Now Calling Flash */}
      {announcedToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-600/95 animate-pulse">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <Volume2 className="w-16 h-16 text-white" />
            </div>
            <p className="text-3xl font-bold text-white/80 mb-2">NOW CALLING</p>
            <p className="text-9xl font-black tracking-widest">{announcedToken.token_number}</p>
            <p className="text-2xl mt-4 text-white/80">{announcedToken.patient_name}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/10 bg-black/20">
        <div>
          <h1 className="text-2xl font-bold tracking-wide">{orgName}</h1>
          <p className="text-teal-300 text-sm mt-0.5">Queue Status Board</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-mono font-bold tabular-nums">{format(time, 'HH:mm')}</p>
          <p className="text-teal-300 text-sm">{format(time, 'EEEE, MMMM d yyyy')}</p>
        </div>
      </div>

      {/* Counter Grid */}
      <div className="flex-1 p-8">
        <div className={`grid gap-6 h-full ${counters.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : counters.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {counters.map(ctr => {
            const calledToken = calledTokens[ctr.id];
            const waitingCount = waitingCounts[ctr.id] || 0;
            return (
              <div key={ctr.id} className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{counterTypeIcon[ctr.counter_type] || '🏢'}</span>
                  <div>
                    <h2 className="text-lg font-bold">{ctr.name}</h2>
                    <p className="text-teal-300 text-sm">{waitingCount} waiting</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center">
                  {calledToken ? (
                    <>
                      <p className="text-teal-300 text-sm font-medium uppercase tracking-widest mb-2">
                        {calledToken.status === 'serving' ? '⚡ Now Serving' : '📣 Now Calling'}
                      </p>
                      <p className="text-8xl font-black font-mono tracking-widest text-white">
                        {calledToken.token_number}
                      </p>
                      <p className="text-white/70 text-lg mt-3">{calledToken.patient_name}</p>
                    </>
                  ) : (
                    <p className="text-white/30 text-4xl font-mono">—</p>
                  )}
                </div>

                {ctr.display_message && (
                  <p className="text-center text-teal-300 text-sm mt-4 border-t border-white/10 pt-3">{ctr.display_message}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center py-3 text-white/20 text-xs border-t border-white/10">
        Horizon ClinicSuite Queue Management
      </div>
    </div>
  );
}