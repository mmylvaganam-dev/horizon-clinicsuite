import React, { useState, useEffect } from 'react';
import { Bell, X, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const all = await base44.entities.Notification.filter({ user_id: user.id }, '-created_date');
      return all.slice(0, 20);
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) =>
      base44.entities.Notification.update(notificationId, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(
        unread.map(n => base44.entities.Notification.update(n.id, { is_read: true }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const clearNotificationMutation = useMutation({
    mutationFn: async (notificationId) => {
      // Archive by creating a deletion record or soft delete
      // For now, we'll just mark as read and archived
      return base44.entities.Notification.update(notificationId, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (notification) => {
    markAsReadMutation.mutate(notification.id);
    if (notification.action_url) {
      navigate(notification.action_url);
      setOpen(false);
    }
  };

  const getNotificationColor = (type) => {
    const colors = {
      task_assigned: 'bg-blue-50 border-blue-200',
      appointment_upcoming: 'bg-purple-50 border-purple-200',
      appointment_missed: 'bg-red-50 border-red-200',
      patient_update: 'bg-green-50 border-green-200',
      lab_result: 'bg-amber-50 border-amber-200',
      prescription: 'bg-pink-50 border-pink-200',
      critical_alert: 'bg-red-100 border-red-300',
    };
    return colors[type] || 'bg-slate-50 border-slate-200';
  };

  const getNotificationIcon = (type) => {
    const icons = {
      task_assigned: '📋',
      appointment_upcoming: '📅',
      appointment_missed: '❌',
      patient_update: '👤',
      lab_result: '🔬',
      prescription: '💊',
      critical_alert: '🚨',
    };
    return icons[type] || '📢';
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
          <div className="border-b border-slate-200 p-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-l-4 ${getNotificationColor(
                      notification.type
                    )} cursor-pointer hover:bg-slate-50 transition-colors`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium ${
                                notification.is_read ? 'text-slate-600' : 'text-slate-900'
                              }`}
                            >
                              {notification.title}
                            </p>
                            <p className="text-xs text-slate-500 line-clamp-2">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-1" />
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotificationMutation.mutate(notification.id);
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-3">
            <button
              onClick={() => {
                navigate(createPageUrl('Notifications'));
                setOpen(false);
              }}
              className="w-full text-sm text-teal-600 hover:text-teal-700 font-medium text-center py-2"
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}