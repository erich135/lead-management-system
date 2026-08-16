import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getNotifications,
  markNotificationRead as apiMarkRead,
  markAllNotificationsRead as apiMarkAllRead,
  getDailyTasks,
  sendDailyReminderEmail,
  AppNotification,
  DailyTask,
} from '../lib/api';
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
  ExternalLink,
  Briefcase,
} from 'lucide-react';
import { formatDateTime } from '../utils/dateFormat';

interface NotificationSystemProps {
  onLeadClick?: (leadId: string) => void;
}

const POLL_INTERVAL = 30000; // 30 seconds

export function NotificationSystem({ onLeadClick }: NotificationSystemProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [taskSummary, setTaskSummary] = useState({ total: 0, critical: 0, warning: 0, info: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notifications' | 'tasks'>('notifications');
  const [emailSent, setEmailSent] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    loadData();

    // Poll for updates every 30 seconds
    intervalRef.current = setInterval(loadData, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user?.id]);

  async function loadData() {
    try {
      await Promise.all([loadNotifications(), loadDailyTasks()]);
    } catch (error) {
      console.error('Error loading notification data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadNotifications() {
    try {
      const result = await getNotifications({ unreadOnly: true, limit: 50 });
      setNotifications(result.notifications || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  async function loadDailyTasks() {
    try {
      const result = await getDailyTasks();
      setDailyTasks(result.tasks || []);
      setTaskSummary(result.summary || { total: 0, critical: 0, warning: 0, info: 0 });
    } catch (error) {
      console.error('Error loading daily tasks:', error);
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await apiMarkRead(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function handleMarkAllRead() {
    try {
      await apiMarkAllRead();
      setNotifications([]);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  async function handleSendEmailSummary() {
    if (emailSending) return;

    try {
      setEmailSending(true);
      await sendDailyReminderEmail();
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
    } catch (error) {
      console.error('Error sending email summary:', error);
    } finally {
      setEmailSending(false);
    }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'lead_assigned':
        return <Users className="w-5 h-5 text-blue-500" />;
      case 'lead_status_changed':
        return <FileText className="w-5 h-5 text-green-500" />;
      case 'appointment_created':
      case 'appointment_reminder':
        return <Calendar className="w-5 h-5 text-purple-500" />;
      case 'appointment_attended':
      case 'appointment_no_show':
      case 'attendance_auto_verified':
        return <CheckCircle className="w-5 h-5 text-teal-500" />;
      case 'geofence_alert':
      case 'dwell_time_alert':
      case 'area_overlap_warning':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  }

  function getNotificationPriorityClass(priority: string): string {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'bg-red-50 border-red-200 hover:bg-red-100';
      case 'medium':
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      default:
        return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  }

  function getSeverityBadge(severity: string) {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
            <AlertTriangle className="w-3 h-3" /> OVERDUE
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700">
            <Clock className="w-3 h-3" /> APPROACHING
          </span>
        );
      case 'info':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">
            <Briefcase className="w-3 h-3" /> MONITORED
          </span>
        );
      default:
        return null;
    }
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
            {(user?.isSuperAdmin || user?.role?.name === 'admin') && (
              <button
                onClick={handleSendEmailSummary}
                disabled={emailSending || emailSent}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 flex items-center gap-1"
              >
                <Mail className="w-4 h-4" />
                {emailSending ? 'Sending...' : 'Send Summary'}
              </button>
            )}
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
                    onClick={handleMarkAllRead}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Mark all read
                  </button>
                </div>

                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${getNotificationPriorityClass(notification.priority)}`}
                    onClick={() => {
                      if (notification.actionUrl) {
                        window.location.assign(notification.actionUrl);
                      } else if (notification.leadId && onLeadClick) {
                        onLeadClick(notification.leadId);
                      }
                      handleMarkRead(notification._id);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-700 mt-0.5">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-xs text-gray-500">
                              {formatDateTime(notification.createdAt)}
                            </p>
                            {notification.leadNumber && (
                              <div className="flex items-center gap-1">
                                <ExternalLink className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {notification.leadNumber}
                                  {notification.companyName && ` - ${notification.companyName}`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkRead(notification._id);
                        }}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            {dailyTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tasks requiring attention</p>
                <p className="text-sm mt-1">All jobs are on track!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Summary bar */}
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <span className="text-gray-600">{taskSummary.total} total</span>
                  {taskSummary.critical > 0 && (
                    <span className="text-red-600 font-medium">{taskSummary.critical} overdue</span>
                  )}
                  {taskSummary.warning > 0 && (
                    <span className="text-orange-600 font-medium">{taskSummary.warning} approaching</span>
                  )}
                  {taskSummary.info > 0 && (
                    <span className="text-blue-600 font-medium">{taskSummary.info} monitored</span>
                  )}
                </div>

                {dailyTasks.map((task) => (
                  <div
                    key={task.job_id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      task.severity === 'critical'
                        ? 'bg-red-50 border-red-200 hover:bg-red-100'
                        : task.severity === 'warning'
                        ? 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => onLeadClick?.(task.job_id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {task.severity === 'critical' ? (
                          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                        ) : task.severity === 'warning' ? (
                          <Clock className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                        ) : (
                          <Briefcase className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-bold text-gray-900">
                              {task.job_number}
                            </p>
                            <span className="text-xs text-gray-400">•</span>
                            <p className="text-sm text-gray-700 truncate">{task.client_name}</p>
                            {getSeverityBadge(task.severity)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mb-1.5">
                            <span>Status: <span className="font-medium text-gray-700">{task.current_status}</span></span>
                            <span>{task.days_in_status} day{task.days_in_status !== 1 ? 's' : ''} in status</span>
                            {task.branch_name !== 'N/A' && <span>{task.branch_name}</span>}
                          </div>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Action:</span> {task.requires_action}
                          </p>
                          {task.technician !== 'N/A' && (
                            <p className="text-xs text-gray-500 mt-1">
                              Tech: {task.technician}
                            </p>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
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