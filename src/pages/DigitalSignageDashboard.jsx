import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Play, AlertTriangle, LayoutGrid, Activity, Wifi } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { formatDistanceToNow } from 'date-fns';

export default function DigitalSignageDashboard() {
  const { data: screens = [] } = useQuery({ queryKey: ['clinicScreens'], queryFn: () => base44.entities.ClinicScreen.list() });
  const { data: playlists = [] } = useQuery({ queryKey: ['signagePlaylists'], queryFn: () => base44.entities.Playlist.list() });
  const { data: banners = [] } = useQuery({ queryKey: ['emergencyBanners'], queryFn: () => base44.entities.EmergencyBanner.list() });
  const { data: items = [] } = useQuery({ queryKey: ['signageItems'], queryFn: () => base44.entities.SignageItem.list() });

  const activeScreens = screens.filter(s => s.status === 'active');
  const activeBanners = banners.filter(b => b.is_active);

  const stats = [
    { label: 'Total Screens', value: screens.length, icon: Monitor, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Active Screens', value: activeScreens.length, icon: Wifi, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Playlists', value: playlists.length, icon: Play, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Emergency Banners', value: activeBanners.length, icon: AlertTriangle, color: activeBanners.length > 0 ? 'text-red-600' : 'text-slate-400', bg: activeBanners.length > 0 ? 'bg-red-50' : 'bg-slate-50' },
  ];

  const recentScreens = [...screens].sort((a, b) => new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0)).slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Monitor className="w-7 h-7 text-teal-600" /> Digital Signage
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage clinic TV displays, playlists, and emergency alerts</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
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
            <AlertTriangle className="w-5 h-5 text-red-600" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Screen Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Screen Activity</CardTitle>
            <Link to={createPageUrl('SignageScreens')}>
              <Button size="sm" variant="outline">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentScreens.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No screens configured yet</p>
            ) : recentScreens.map(screen => (
              <div key={screen.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${screen.status === 'active' ? 'bg-green-500' : screen.status === 'offline' ? 'bg-red-400' : 'bg-slate-300'}`} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{screen.name}</p>
                    <p className="text-xs text-slate-400">{screen.clinic_name} · {screen.location_type?.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {screen.last_seen_at ? formatDistanceToNow(new Date(screen.last_seen_at), { addSuffix: true }) : 'Never seen'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Manage Signage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to={createPageUrl('SignageScreens')}>
              <Button variant="outline" className="w-full justify-start gap-3 h-12">
                <Monitor className="w-5 h-5 text-teal-600" />
                <div className="text-left">
                  <p className="font-medium">Screens</p>
                  <p className="text-xs text-slate-500">{screens.length} screens · {activeScreens.length} active</p>
                </div>
              </Button>
            </Link>
            <Link to={createPageUrl('SignageContent')}>
              <Button variant="outline" className="w-full justify-start gap-3 h-12">
                <LayoutGrid className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium">Content Library</p>
                  <p className="text-xs text-slate-500">{items.length} items</p>
                </div>
              </Button>
            </Link>
            <Link to={createPageUrl('SignagePlaylists')}>
              <Button variant="outline" className="w-full justify-start gap-3 h-12">
                <Play className="w-5 h-5 text-purple-600" />
                <div className="text-left">
                  <p className="font-medium">Playlist Builder</p>
                  <p className="text-xs text-slate-500">{playlists.length} playlists</p>
                </div>
              </Button>
            </Link>
            <Link to={createPageUrl('SignageEmergencyBanner')}>
              <Button variant="outline" className={`w-full justify-start gap-3 h-12 ${activeBanners.length > 0 ? 'border-red-300 bg-red-50' : ''}`}>
                <AlertTriangle className={`w-5 h-5 ${activeBanners.length > 0 ? 'text-red-600' : 'text-slate-400'}`} />
                <div className="text-left">
                  <p className="font-medium">Emergency Banners</p>
                  <p className="text-xs text-slate-500">{activeBanners.length > 0 ? `${activeBanners.length} ACTIVE` : 'No active banners'}</p>
                </div>
                {activeBanners.length > 0 && <Badge className="ml-auto bg-red-600 text-white">{activeBanners.length}</Badge>}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}