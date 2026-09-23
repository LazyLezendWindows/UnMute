/** Primary app destinations, shared by the desktop navbar and the mobile bottom bar. */
export interface NavItem {
  to: string;
  label: string;
  /** Remixicon base name; `-line` / `-fill` is appended for inactive / active. */
  icon: string;
  /** Show in the desktop top navigation / the mobile bottom bar. */
  desktop: boolean;
  mobile: boolean;
  /** Shows the unread message count. */
  unreadBadge?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/discover', label: 'Discover', icon: 'ri-compass-3', desktop: true, mobile: true },
  { to: '/matches', label: 'Matches', icon: 'ri-sparkling', desktop: true, mobile: true },
  { to: '/chat', label: 'Messages', icon: 'ri-message-3', desktop: true, mobile: true, unreadBadge: true },
  { to: '/safety', label: 'Safety', icon: 'ri-shield-check', desktop: true, mobile: false },
  { to: '/profile', label: 'Profile', icon: 'ri-user-3', desktop: false, mobile: true },
  { to: '/settings', label: 'Settings', icon: 'ri-settings-3', desktop: true, mobile: true },
];

/** `/chat/:id` keeps "Messages" active; other destinations match exactly. */
export function isNavActive(item: NavItem, path: string): boolean {
  return item.to === '/chat' ? path.startsWith('/chat') : path === item.to;
}
