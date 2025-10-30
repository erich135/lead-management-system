import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Notification } from '../types';
import {
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  Users,
  FileText,
  Calendar,
  Mail,
  ExternalLink
} from 'lucide-react';

interface DailyTask {
  lead_id: string;
  lead_number: string;
  client_name: string;
  current_status: string;
  days_in_status: number;
  is_overdue: boolean;
  requires_action: string;
}

interface NotificationSystemProps {
  onLeadClick?: (leadId: string) => void;
}

export function NotificationSystem({ onLeadClick }: NotificationSystemProps) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notifications' | 'tasks'>('notifications');
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    loadData();
    
    // Set up real-time subscriptions
    const notificationSubscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile?.id}`
        },
        () => loadNotifications()
      )
      .subscribe();

    return () => {
      notificationSubscription.unsubscribe();
    };
  }, [profile?.id]);

  async function loadData() {
    await Promise.all([
      loadNotifications(),
      loadDailyTasks()
    ]);
    setLoading(false);
  }

  async function loadNotifications() {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*, lead:leads(*)')
        .eq('user_id', profile?.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  async function loadDailyTasks() {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .rpc('get_daily_tasks', { user_uuid: profile.id });

      if (error) throw error;
      if (data) setDailyTasks(data);
    } catch (error) {
      console.error('Error loading daily tasks:', error);
    }
  }

  async function markNotificationRead(id: string) {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function markAllNotificationsRead() {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile?.id)
        .eq('is_read', false);

      setNotifications([]);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  async function sendDailyEmailSummary() {
    if (dailyTasks.length === 0) return;

    try {
      // This would typically integrate with your email service
      // For now, we'll simulate the email content generation
      const emailContent = generateEmailSummary();
      
      // In a real implementation, you would call your email service API here
      console.log('Daily email summary:', emailContent);
      
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
    } catch (error) {
      console.error('Error sending email summary:', error);
    }
  }

  function generateEmailSummary(): string {
    const overdueTasks = dailyTasks.filter(t => t.is_overdue);
    const regularTasks = dailyTasks.filter(t => !t.is_overdue);

    let content = `Daily Task Summary for ${profile?.full_name}\n\n`;
    
    if (overdueTasks.length > 0) {
      content += `🚨 OVERDUE TASKS (${overdueTasks.length}):\n`;
      overdueTasks.forEach(task => {
        content += `- ${task.lead_number} - ${task.client_name}\n`;
        content += `  Status: ${task.current_status} (${task.days_in_status} days)\n`;
        content += `  Action: ${task.requires_action}\n\n`;
      });
    }

    if (regularTasks.length > 0) {
      content += `📋 TODAY'S TASKS (${regularTasks.length}):\n`;
      regularTasks.forEach(task => {
        content += `- ${task.lead_number} - ${task.client_name}\n`;
        content += `  Status: ${task.current_status} (${task.days_in_status} days)\n`;
        content += `  Action: ${task.requires_action}\n\n`;
      });
    }

    return content;
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'assignment':
        return <Users className="w-5 h-5 text-blue-500" />;
      case 'status_change':
        return <FileText className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  }

  function getNotificationPriority(notification: Notification): 'high' | 'medium' | 'low' {
    if (notification.type === 'alert') return 'high';
    if (notification.type === 'assignment') return 'medium';
    return 'low';
  }

  const unreadCount = notifications.length;
  const overdueTasksCount = dailyTasks.filter(t => t.is_overdue).length;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Notifications & Tasks</h3>
          <div className="flex items-center gap-2">
            {emailSent && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Email sent!
              </span>
            )}
            <button
              onClick={sendDailyEmailSummary}
              disabled={dailyTasks.length === 0 || emailSent}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 flex items-center gap-1"
            >
              <Mail className="w-4 h-4" />
              Send Summary
            </button>
          </div>
        </div>

        <div className="flex mt-4">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
              activeTab === 'notifications'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
              activeTab === 'tasks'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Daily Tasks
              {overdueTasksCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                  {overdueTasksCount}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {activeTab === 'notifications' ? (
          <div className="p-4">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No unread notifications</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-gray-600">
                    {notifications.length} unread notification{notifications.length !== 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Mark all read
                  </button>
                </div>

                {notifications
                  .sort((a, b) => {
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return priorityOrder[getNotificationPriority(b)] - priorityOrder[getNotificationPriority(a)];
                  })
                  .map((notification) => {
                    const priority = getNotificationPriority(notification);
                    return (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          priority === 'high' 
                            ? 'bg-red-50 border-red-200 hover:bg-red-100'
                            : priority === 'medium'
                            ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                        onClick={() => {
                          if (notification.lead_id && onLeadClick) {
                            onLeadClick(notification.lead_id);
                          }
                          markNotificationRead(notification.id);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {getNotificationIcon(notification.type)}
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-4 mt-1">
                                <p className="text-xs text-gray-500">
                                  {new Date(notification.created_at).toLocaleDateString()} at{' '}
                                  {new Date(notification.created_at).toLocaleTimeString()}
                                </p>
                                {notification.lead && (
                                  <div className="flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs text-gray-500">
                                      {notification.lead.lead_number}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markNotificationRead(notification.id);
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            {dailyTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tasks for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  {dailyTasks.length} task{dailyTasks.length !== 1 ? 's' : ''} assigned to you
                </p>

                {dailyTasks
                  .sort((a, b) => (b.is_overdue ? 1 : 0) - (a.is_overdue ? 1 : 0))
                  .map((task) => (
                    <div
                      key={task.lead_id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        task.is_overdue
                          ? 'bg-red-50 border-red-200 hover:bg-red-100'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => onLeadClick?.(task.lead_id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {task.is_overdue ? (
                            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                          ) : (
                            <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-gray-900">
                                {task.lead_number}
                              </p>
                              <span className="text-xs text-gray-500">•</span>
                              <p className="text-sm text-gray-700">{task.client_name}</p>
                            </div>
                            <p className="text-xs text-gray-500 mb-2">
                              Status: {task.current_status} ({task.days_in_status} days)
                            </p>
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Action needed:</span> {task.requires_action}
                            </p>
                            {task.is_overdue && (
                              <div className="flex items-center gap-1 mt-2">
                                <AlertTriangle className="w-3 h-3 text-red-500" />
                                <span className="text-xs font-medium text-red-600">OVERDUE</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}