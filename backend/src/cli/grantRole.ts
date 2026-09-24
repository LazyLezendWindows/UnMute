import { getDatabase, initDatabase } from '../config/database';
import { UserRepository, UserRole } from '../repositories/userRepository';

/**
 * Grants or removes a staff role: `npm run grant-role -- <email> <member|moderator|admin>`
 * (`npm run grant-role:prod` against the compiled build). There is deliberately no API for this:
 * only someone with database access can create moderators.
 */
async function main() {
  const [email, role] = process.argv.slice(2);
  const roles: UserRole[] = ['member', 'moderator', 'admin'];
  if (!email || !roles.includes(role as UserRole)) {
    console.error('Usage: grant-role <email> <member|moderator|admin>');
    process.exit(2);
  }
  await initDatabase();
  const user = await UserRepository.findByEmail(email.toLowerCase());
  if (!user) {
    console.error(`No account with email ${email}`);
    process.exit(1);
  }
  await UserRepository.setRole(getDatabase(), user.id, role as UserRole);
  console.log(`${email} is now ${role}. Existing sessions pick up the change on their next request.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[grant-role] failed:', err);
  process.exit(1);
});
