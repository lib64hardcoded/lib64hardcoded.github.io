import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  related_id?: string; // For bug reports, etc.
  action_url?: string; // Where to navigate when clicked
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const getStorageKey = () => `prodomo_notifications_${user?.id || 'guest'}`;

  // Load notifications from localStorage
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(getStorageKey());
      if (stored) {
        try {
          const parsedNotifications = JSON.parse(stored);
          setNotifications(parsedNotifications);
          setUnreadCount(parsedNotifications.filter((n: Notification) => !n.read).length);
        } catch (error) {
          console.error('Failed to parse notifications:', error);
        }
      }
    }
  }, [user]);

  // Save notifications to localStorage
  const saveNotifications = (newNotifications: Notification[]) => {
    if (user) {
      localStorage.setItem(getStorageKey(), JSON.stringify(newNotifications));
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.read).length);
    }
  };

  // Add a new notification
  const addNotification = (notification: Omit<Notification, 'id' | 'created_at' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      read: false
    };

    const updatedNotifications = [newNotification, ...notifications].slice(0, 50); // Keep only last 50
    saveNotifications(updatedNotifications);
    
    console.log('Notification added:', newNotification);
  };

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    const updatedNotifications = notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    saveNotifications(updatedNotifications);
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updatedNotifications);
  };

  // Remove notification
  const removeNotification = (notificationId: string) => {
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);
    saveNotifications(updatedNotifications);
  };

  // Clear all notifications
  const clearAll = () => {
    saveNotifications([]);
  };

  // Add bug status notification - this will be called from BugManagement
  const addBugStatusNotification = (bugTitle: string, oldStatus: string, newStatus: string, bugId: string, reporterId: string) => {
    // Only add notification if the current user is the bug reporter
    if (user?.id !== reporterId) {
      return;
    }

    let message = '';
    let type: 'info' | 'success' | 'warning' | 'error' = 'info';

    switch (newStatus) {
      case 'in-progress':
        message = `Your bug report "${bugTitle}" is now being worked on by our team.`;
        type = 'info';
        break;
      case 'resolved':
        message = `Great news! Your bug report "${bugTitle}" has been resolved.`;
        type = 'success';
        break;
      case 'closed':
        message = `Your bug report "${bugTitle}" has been closed.`;
        type = 'info';
        break;
      default:
        message = `Your bug report "${bugTitle}" status changed from ${oldStatus} to ${newStatus}.`;
        type = 'info';
    }

    addNotification({
      title: 'Bug Report Update',
      message,
      type,
      related_id: bugId,
      action_url: '/bug-report'
    });
  };

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    addBugStatusNotification
  };
};