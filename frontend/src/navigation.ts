/** Primary app destinations, shared by the desktop rail and the mobile tab bar. */
export interface NavItem {
  to: string;
  label: string;
  /** Remixicon base name; `-line` / `-fill` is appended for inactive / active. */
  icon: string;
  /** Show in the desktop rail / the mobile tab bar. */
  desktop: boolean;
  mobile: boolean;
  /** Shows unread messages plus message requests. */
  unreadBadge?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/discover', label: 'Discover', icon: 'ri-compass-3', desktop: true, mobile: true },
  { to: '/matches', label: 'Matches', icon: 'ri-hearts', desktop: true, mobile: true },
  { to: '/chat', label: 'Messages', icon: 'ri-chat-3', desktop: true, mobile: true, unreadBadge: true },
  { to: '/profile', label: 'Profile', icon: 'ri-user-3', desktop: true, mobile: true },
  { to: '/settings', label: 'Settings', icon: 'ri-settings-3', desktop: true, mobile: false },
];

/** `/chat/:id` keeps Messages active and Settings screens keep Profile active on mobile. */
export function isNavActive(item: NavItem, path: string): boolean {
  if (item.to === '/chat') return path.startsWith('/chat');
  if (item.to === '/profile') return path.startsWith('/profile');
  if (item.to === '/settings') return path.startsWith('/settings') || path === '/safety';
  return path === item.to;
}
