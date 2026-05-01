"use client";

import * as Popover from "@radix-ui/react-popover";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  Check, 
  Trash2, 
  Zap, 
  Info, 
  Shield, 
  Sparkles, 
  ChevronRight,
  Settings2,
  X
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useRole } from "@/hooks/useRole";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/** 
 * Notification Architecture
 * Roles: owner, admin, member, viewer
 */
interface Notification {
  id: string;
  type: 'intelligence' | 'system' | 'team';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  requiredRole: 'viewer' | 'member' | 'admin' | 'owner';
  actionLabel?: string;
  actionUrl?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'intelligence',
    priority: 'high',
    title: 'Low Confidence Detection',
    description: 'Neural analyzer flagged 3 segments in "SOP_Vendor_Agreement" as low confidence.',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5m ago
    isRead: false,
    requiredRole: 'member',
    actionLabel: 'Review segments',
    actionUrl: '/analytics',
  },
  {
    id: '2',
    type: 'system',
    priority: 'medium',
    title: 'Neural Sync Complete',
    description: 'Vector base synchronization successful. 1,240 new nodes mapped.',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45m ago
    isRead: false,
    requiredRole: 'viewer',
    actionUrl: '/history',
  },
  {
    id: '3',
    type: 'team',
    priority: 'low',
    title: 'New Member Joined',
    description: 'Sarah Chen has been added to the Engineering team.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2h ago
    isRead: true,
    requiredRole: 'admin',
  },
  {
    id: '4',
    type: 'system',
    priority: 'high',
    title: 'API Latency Warning',
    description: 'Neural core responding slower than expected (850ms). Investigation active.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5h ago
    isRead: false,
    requiredRole: 'admin',
  },
];

export function NotificationHub() {
  const { role } = useRole();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'intelligence' | 'system'>('all');

  // RBAC Filtering: Only show notifications the user is authorized to see
  // We map role names to power levels for comparison
  const rolePowerMap: Record<string, number> = { viewer: 1, member: 2, admin: 3, owner: 4 };
  const userPower = rolePowerMap[role] || 1;

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter(n => rolePowerMap[n.requiredRole] <= userPower)
      .filter(n => {
        if (activeTab === 'all') return true;
        return n.type === activeTab;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications, userPower, activeTab]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead && rolePowerMap[n.requiredRole] <= userPower).length;
  }, [notifications, userPower]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleAction = (n: Notification) => {
    markAsRead(n.id);
    setIsOpen(false);
    if (n.actionUrl) {
      router.push(n.actionUrl);
    }
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          className={cn(
            "p-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)]/40 hover:bg-[var(--surface-1)] hover:border-[var(--brand)] hover:shadow-md active:scale-[0.97] transition-all group/bell relative outline-none",
            isOpen && "border-[var(--brand)] bg-[var(--surface-1)] shadow-md"
          )}
          aria-label="Notifications"
        >
          <Bell className={cn(
            "w-5 h-5 text-[var(--text-secondary)] group-hover/bell:text-[var(--text-primary)] transition-colors",
            unreadCount > 0 && "animate-[bell-swing_2s_ease-in-out_infinite]"
          )} />
          
          {unreadCount > 0 && (
            <>
              <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-[var(--brand)] ring-2 ring-[var(--surface-1)] shadow-[0_0_12px_var(--brand)] z-10" />
              <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-[var(--brand)] animate-ping opacity-40" />
            </>
          )}
        </button>
      </Popover.Trigger>

      <AnimatePresence>
        {isOpen && (
          <Popover.Portal forceMount>
            <Popover.Content
              asChild
              align="end"
              sideOffset={12}
              className="z-[1001]"
            >
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(10px)" }}
                transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
                className="w-[calc(100vw-2rem)] sm:w-[420px] glass-strong rounded-[2rem] border border-[var(--border-strong)] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[85vh] mx-4 sm:mx-0"
              >
                {/* Header */}
                <div className="p-6 border-b border-[var(--border-subtle)] bg-gradient-to-br from-[var(--brand-soft)]/50 to-transparent">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--brand-soft)] flex items-center justify-center border border-[var(--brand-glow)]">
                        <Bell className="w-5 h-5 text-[var(--brand)]" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">Neural Alerts</h2>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--brand)] opacity-80">Sensory Interface</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={markAllAsRead}
                        className="p-2 rounded-lg hover:bg-[var(--brand-soft)] text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors"
                        title="Mark all as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        title="Alert Settings"
                      >
                        <Settings2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--border-subtle)]">
                    <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')}>All Alerts</TabButton>
                    <TabButton active={activeTab === 'intelligence'} onClick={() => setActiveTab('intelligence')}>Intelligence</TabButton>
                    <TabButton active={activeTab === 'system'} onClick={() => setActiveTab('system')}>System</TabButton>
                  </div>
                </div>

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar min-h-[200px]">
                  <AnimatePresence initial={false} mode="popLayout">
                    {filteredNotifications.length > 0 ? (
                      filteredNotifications.map((n) => (
                        <NotificationItem 
                          key={n.id} 
                          notification={n} 
                          onRead={() => markAsRead(n.id)} 
                          onDelete={() => deleteNotification(n.id)} 
                          onAction={() => handleAction(n)}
                        />
                      ))
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 px-10 text-center"
                      >
                        <div className="w-16 h-16 rounded-full bg-[var(--brand-soft)] flex items-center justify-center mb-4 relative">
                          <Zap className="w-8 h-8 text-[var(--brand)] opacity-20" />
                          <div className="absolute inset-0 rounded-full border-2 border-[var(--brand)] border-dashed animate-[spin_10s_linear_infinite] opacity-20" />
                        </div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Neural State: Optimal</h3>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">No sensory alerts detected in the current neural channel.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-4 bg-[var(--surface-2)]/30 border-t border-[var(--border-subtle)] flex items-center justify-center">
                  <button className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors flex items-center gap-2 group">
                    View Alert History
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  );
}

function TabButton({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
        active 
          ? "bg-[var(--surface-1)] text-[var(--brand)] shadow-sm border border-[var(--border-subtle)]" 
          : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
      )}
    >
      {children}
    </button>
  );
}

function NotificationItem({ 
  notification, 
  onRead, 
  onDelete,
  onAction
}: { 
  notification: Notification, 
  onRead: () => void, 
  onDelete: () => void,
  onAction: () => void
}) {
  const Icon = notification.type === 'intelligence' ? Sparkles : notification.type === 'system' ? Shield : Info;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10, scale: 0.95 }}
      className={cn(
        "group relative flex gap-4 p-4 rounded-2xl transition-all border border-transparent hover:bg-[var(--surface-1)] hover:border-[var(--border-subtle)] hover:shadow-sm overflow-hidden",
        !notification.isRead && "bg-[var(--brand-soft)]/20"
      )}
    >
      {/* Visual Indicator Line */}
      {!notification.isRead && (
        <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-[var(--brand)]" />
      )}

      {/* Icon */}
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
        notification.isRead ? "bg-[var(--surface-2)] text-[var(--text-muted)]" : "bg-[var(--brand-soft)] text-[var(--brand)]"
      )}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={cn(
            "text-[10px] font-extrabold uppercase tracking-widest",
            notification.priority === 'high' ? "text-[var(--danger)]" : "text-[var(--brand)]"
          )}>
            {notification.type} • {notification.priority}
          </span>
          <span className="text-[10px] font-medium text-[var(--text-muted)]">
            {formatRelativeTime(notification.timestamp)}
          </span>
        </div>
        <h4 className={cn(
          "text-sm font-bold mb-1 truncate",
          notification.isRead ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]"
        )}>
          {notification.title}
        </h4>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3 line-clamp-2">
          {notification.description}
        </p>

        {notification.actionLabel && (
          <button 
            onClick={onAction}
            className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-[var(--brand)] hover:gap-2 transition-all"
          >
            {notification.actionLabel}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Hover Actions */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.isRead && (
          <button 
            onClick={onRead}
            className="p-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[var(--brand)] hover:bg-[var(--brand-soft)] transition-colors shadow-sm"
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button 
          onClick={onDelete}
          className="p-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors shadow-sm"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHrs < 24) return `${diffHrs}h`;
  return `${diffDays}d`;
}
