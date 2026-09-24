/** `?, ?, ?` for an IN (...) list; callers must not pass an empty array. */
export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

/** SQL predicate: true when either of two user-id columns has blocked the other. */
export function blockedBetween(userColA: string, userColB: string): string {
  return `EXISTS (
    SELECT 1 FROM blocks b
    WHERE (b.blocker_id = ${userColA} AND b.blocked_id = ${userColB})
       OR (b.blocker_id = ${userColB} AND b.blocked_id = ${userColA})
  )`;
}

/** SQL predicate: the user in this column has an active account (not deactivated, suspended or deleted). */
export function activeUser(userCol: string): string {
  return `EXISTS (SELECT 1 FROM users au WHERE au.id = ${userCol} AND au.is_active = 1)`;
}
