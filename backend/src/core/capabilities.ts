/** Central capability matrix — the single source of truth for what each user type may do.
 *  Backend routes still enforce requireRole; this makes the boundaries explicit and shareable
 *  with the frontend so the UI hides what a role can't access. */
export type Role = 'student' | 'teacher' | 'parent' | 'school_admin' | 'super_admin';

export const CAPABILITIES = {
  student: [
    'learn', 'join_class', 'create_peer_class', 'take_exam', 'use_ai_companion',
    'find_tutor', 'book_tutor', 'apply_scholarship', 'view_own_portfolio', 'use_labs',
    'message', 'join_research_hub', 'edit_own_profile',
  ],
  teacher: [
    'create_class', 'price_class', 'host_lecture', 'create_research_hub', 'add_students',
    'use_ai_twin', 'feed_ai_twin', 'train_ai_paid', 'post_scholarship', 'upload_library',
    'view_earnings', 'request_withdrawal', 'moderate_class', 'edit_teaching_profile', 'message',
  ],
  parent: [
    'view_children', 'find_tutor', 'book_tutor', 'pay_fees', 'view_child_progress', 'message', 'edit_own_profile',
  ],
  school_admin: [
    'manage_school', 'manage_roster', 'set_roles', 'bulk_add_users', 'set_branding',
    'manage_academics', 'manage_fees', 'post_results', 'view_analytics', 'post_scholarship',
    'announce', 'notify_at_risk', 'message',
  ],
  super_admin: ['*'], // everything, incl. AI provider config and tenant management
} as const satisfies Record<Role, readonly string[]>;

export function can(role: string | undefined, capability: string): boolean {
  if (!role) return false;
  const caps = (CAPABILITIES as Record<string, readonly string[]>)[role];
  if (!caps) return false;
  return caps.includes('*') || caps.includes(capability);
}

export function capabilitiesFor(role: string | undefined): string[] {
  if (!role) return [];
  const caps = (CAPABILITIES as Record<string, readonly string[]>)[role];
  return caps ? [...caps] : [];
}
