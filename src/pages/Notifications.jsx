import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Trash2, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('unread');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allNotifications = [] } = useQuery({
    queryKey: ['allNotifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return base44.entities.Notification.filter({ user_id: user.id }, '-created_date');
    },
    enabled: !!user?.id,
  });

  const unread = allNotifications.filter(n => !n.is_read);
  const read = allNotifications.filter(n => n.is_read);

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) =>
      base44.entities.Notification.update(notificationId, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allNotifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId) => {
      // For now, just mark as read. In production, you might want soft-delete.
      return base44.entities.Notification.update(notificationId, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allNotifications'] });
    },
  });

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
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

  const NotificationCard = ({ notification }) => (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start gap-4">
        <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
        <div
          className="flex-1 min-w-0"
          onClick={() => handleNotificationClick(notification)}
        >
          <h3 className={`font-medium ${notification.is_read ? 'text-slate-600' : 'text-slate-900'}`}>
            {notification.title}
          </h3>
          <p className="text-sm text-slate-600 mt-1 line-clamp-2">{notification.message}</p>
          <p className="text-xs text-slate-400 mt-2">
            {format(new Date(notification.created_date), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
        <div className="flex gap-2">
          {!notification.is_read && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                markAsReadMutation.mutate(notification.id);
              }}
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              deleteNotificationMutation.mutate(notification.id);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 mt-1">Manage your notification center</p>
        </div>
        <Button
          onClick={() => navigate(createPageUrl('Admin'))}
          variant="outline"
        >
          Notification Settings
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="unread">
            Unread ({unread.length})
          </TabsTrigger>
          <TabsTrigger value="read">
            Read ({read.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({allNotifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unread" className="space-y-3 mt-6">
          {unread.length === 0 ? (
            <Card className="p-12 text-center">
              <Bell className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No unread notifications</p>
            </Card>
          ) : (
            unread.map(notification => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
          )}
        </TabsContent>

        <TabsContent value="read" className="space-y-3 mt-6">
          {read.length === 0 ? (
            <Card className="p-12 text-center">
              <Bell className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No read notifications</p>
            </Card>
          ) : (
            read.map(notification => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3 mt-6">
          {allNotifications.length === 0 ? (
            <Card className="p-12 text-center">
              <Bell className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No notifications yet</p>
            </Card>
          ) : (
            allNotifications.map(notification => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}