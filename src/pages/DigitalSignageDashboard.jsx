import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Play, AlertTriangle, LayoutGrid, Activity, Wifi, WifiOff, Clock, GraduationCap, BarChart3, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { formatDistanceToNow } from 'date-fns';

const OFFLINE_MS = 5 * 60 * 1000;

function getHbStatus(screen) {
  if (!screen.last_seen_at) return 'never';
  return Date.now() - new Date(screen.last_seen_at).getTime() > OFFLINE_MS ? 'offline' : 'online';
}

export default function DigitalSignageDashboard() {
  const [auditPage, setAuditPage] = useState(0);
  const PAGE_SIZE = 8;

  const { data: screens = [] } = useQuery({ queryKey: ['clinicScreens'], queryFn: () => base44.entities.ClinicScreen.list(), refetchInterval: 30000 });
  const { data: playlists = [] } = useQuery({ queryKey: ['signagePlaylists'], queryFn: () => base44.entities.Playlist.list() });
  const { data: banners = [] } = useQuery({ queryKey: ['emergencyBanners'], queryFn: () => base44.entities.EmergencyBanner.list() });
  const { data: items = [] } = useQuery({ queryKey: ['signageItems'], queryFn: () => base44.entities.SignageItem.list() });
  const { data: auditLogs = [] } = useQuery({ queryKey: ['signageAuditLogs'], queryFn: () => base44.entities.SignageAuditLog.list('-created_date', 50) });

  const activeBanners = banners.filter(b => b.is_active);
  const onlineScreens = screens.filter(s => getHbStatus(s) === 'online');
  const offlineScreens = screens.filter(s => getHbStatus(s) === 'offline');
  const eduItems = items.filter(i => i.is_health_education);
  const eduPlaylists = playlists.filter(p => p.health_edu_mode);

  const stats = [
    { label: 'Total Screens', value: screens.length, icon: Monitor, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Online Now', value: onlineScreens.length, icon: Wifi, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Offline (>5 min)', value: offlineScreens.length, icon: WifiOff, color: offlineScreens.length > 0 ? 'text-red-600' : 'text-slate-400', bg: offlineScreens.length > 0 ? 'bg-red-50' : 'bg-slate-50' },
    { label: 'Active Banners', value: activeBanners.length, icon: AlertTriangle, color: activeBanners.length > 0 ? 'text-red-600' : 'text-slate-400', bg: activeBanners.length > 0 ? 'bg-red-50' : 'bg-slate-50' },
    { label: 'Playlists', value: playlists.length, icon: Play, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Edu Content', value: eduItems.length, icon: GraduationCap, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  const recentScreens = [...screens].sort((a, b) => new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0));

  const auditSlice = auditLogs.slice(auditPage * PAGE_SIZE, (auditPage + 1) * PAGE_SIZE);

  const ACTION_COLORS = { created: 'text-green-700 bg-green-50', updated: 'text-blue-700 bg-blue-50', deleted: 'text-red-700 bg-red-50' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Monitor className="w-7 h-7 text-teal-600" /> Digital Signage
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage clinic TV displays, playlists, and emergency alerts · Heartbeat online = seen in last 5 min</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-500 leading-tight">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Emergency Banners */}
      {activeBanners.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
            <span className="font-semibold text-red-800">⚠ Active Emergency Banners — Displaying on all screens</span>
          </div>
          {activeBanners.map(b => (
            <div key={b.id} className="flex items-center justify-between bg-white rounded-lg p-3 mb-2 border border-red-100">
              <div>
                <p className="font-semibold text-slate-900">{b.title}</p>
                <p className="text-sm text-slate-600 mt-0.5">{b.message}</p>
              </div>
              <Badge className={b.severity === 'urgent' ? 'bg-red-600 text-white' : b.severity === 'warning' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}>
                {b.severity}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Offline Screens Alert */}
      {offlineScreens.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <WifiOff className="w-5 h-5 text-orange-600" />
            <span className="font-semibold text-orange-800">{offlineScreens.length} screen{offlineScreens.length > 1 ? 's' : ''} offline (no heartbeat for 5+ min)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {offlineScreens.map(s => (
              <Badge key={s.id} className="bg-orange-100 text-orange-800">{s.name} · {s.last_seen_at ? formatDistanceToNow(new Date(s.last_seen_at), { addSuffix: true }) : 'never seen'}</Badge>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Screen Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Screen Heartbeat Status</CardTitle>
            <Link to={createPageUrl('SignageScreens')}><Button size="sm" variant="outline">Manage</Button></Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentScreens.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No screens configured yet</p>
            ) : recentScreens.map(screen => {
              const hb = getHbStatus(screen);
              return (
                <div key={screen.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${hb === 'online' ? 'bg-green-500 animate-pulse' : hb === 'offline' ? 'bg-red-400' : 'bg-slate-300'}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{screen.name}</p>
                      <p className="text-xs text-slate-400">{screen.clinic_name} · {screen.location_type?.replace(/_/g, ' ')} · {screen.orientation || 'landscape'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={hb === 'online' ? 'bg-green-100 text-green-700' : hb === 'offline' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}>
                      {hb === 'online' ? 'Online' : hb === 'offline' ? 'Offline' : 'Never'}
                    </Badge>
                    <p className="text-xs text-slate-400 mt-0.5">{screen.last_seen_at ? formatDistanceToNow(new Date(screen.last_seen_at), { addSuffix: true }) : '—'}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Quick Actions + Analytics */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Manage Signage</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { to: 'SignageScreens', icon: Monitor, label: 'Screens', sub: `${screens.length} screens · ${onlineScreens.length} online`, color: 'text-teal-600' },
                { to: 'SignageContent', icon: LayoutGrid, label: 'Content Library', sub: `${items.length} items · ${eduItems.length} edu`, color: 'text-blue-600' },
                { to: 'SignagePlaylists', icon: Play, label: 'Playlists', sub: `${playlists.length} playlists · ${eduPlaylists.length} edu mode`, color: 'text-purple-600' },
                { to: 'SignageEmergencyBanner', icon: AlertTriangle, label: 'Emergency Banners', sub: activeBanners.length > 0 ? `${activeBanners.length} ACTIVE` : 'None active', color: activeBanners.length > 0 ? 'text-red-600' : 'text-slate-400' },
              ].map(link => (
                <Link key={link.to} to={createPageUrl(link.to)}>
                  <Button variant="outline" className="w-full h-16 flex flex-col items-start justify-center px-3 gap-0.5">
                    <div className="flex items-center gap-2">
                      <link.icon className={`w-4 h-4 ${link.color}`} />
                      <span className="font-medium text-sm">{link.label}</span>
                    </div>
                    <span className="text-xs text-slate-500 pl-6">{link.sub}</span>
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Playlist Analytics mini */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-600" /> Screens per Playlist</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {playlists.length === 0 ? <p className="text-slate-400 text-sm text-center py-3">No playlists yet</p> : playlists.map(pl => {
                const count = screens.filter(s => s.assigned_playlist_id === pl.id).length;
                const pct = screens.length > 0 ? Math.round((count / screens.length) * 100) : 0;
                return (
                  <div key={pl.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-medium flex items-center gap-1">
                        {pl.name}
                        {pl.health_edu_mode && <GraduationCap className="w-3 h-3 text-green-600" />}
                      </span>
                      <span className="text-slate-500">{count} screen{count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full">
                      <div className="h-1.5 bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Audit Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4 text-slate-500" /> Signage Audit Log</CardTitle>
          <span className="text-xs text-slate-400">{auditLogs.length} total changes</span>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">No changes logged yet. Changes to screens, playlists, and content will appear here.</p>
          ) : (
            <>
              <div className="space-y-2">
                {auditSlice.map(log => (
                  <div key={log.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                    <Badge className={ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600'}>{log.action}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{log.entity_name || log.entity_id}</p>
                      <p className="text-xs text-slate-500">{log.entity_type} · {log.changes_summary}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-500">{log.changed_by_email}</p>
                      <p className="text-xs text-slate-400">{log.created_date ? formatDistanceToNow(new Date(log.created_date), { addSuffix: true }) : '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
              {auditLogs.length > PAGE_SIZE && (
                <div className="flex justify-between mt-3">
                  <Button size="sm" variant="outline" disabled={auditPage === 0} onClick={() => setAuditPage(p => p - 1)}>← Newer</Button>
                  <span className="text-xs text-slate-400 self-center">Page {auditPage + 1} / {Math.ceil(auditLogs.length / PAGE_SIZE)}</span>
                  <Button size="sm" variant="outline" disabled={(auditPage + 1) * PAGE_SIZE >= auditLogs.length} onClick={() => setAuditPage(p => p + 1)}>Older →</Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}