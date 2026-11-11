import { useState } from 'react';
import { Bell, Check, X, ExternalLink } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { formatDate } from '../lib/constants';
import type { NotificationType } from '../types';

const typeColors: Record<NotificationType, string> = {
  info: 'bg-primary-100 text-primary-700',
  warning: 'bg-warning-100 text-warning-800',
  error: 'bg-error-100 text-error-700',
  success: 'bg-success-100 text-success-700',
};

const typeIcons: Record<NotificationType, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  success: '✅',
};

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-error-500 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-lg border border-neutral-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <h3 className="font-semibold text-neutral-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-neutral-500">
                  Aucune notification
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border-b border-neutral-100 px-4 py-3 hover:bg-neutral-50 ${
                      !notification.read ? 'bg-primary-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{typeIcons[notification.type]}</span>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-medium text-neutral-900">
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-1">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600"
                                title="Marquer comme lu"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="rounded p-1 text-neutral-400 hover:bg-error-100 hover:text-error-600"
                              title="Supprimer"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                        {notification.message && (
                          <p className="mt-1 text-sm text-neutral-600">{notification.message}</p>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-neutral-400">
                            {formatDate(notification.created_at)}
                          </span>
                          {notification.link && (
                            <button
                              onClick={() => handleNotificationClick(notification)}
                              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                            >
                              Voir <ExternalLink size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
