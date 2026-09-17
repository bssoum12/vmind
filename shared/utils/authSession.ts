/**
 * Safely clears user authentication tokens and active session data
 * without wiping user preferences, remember-me credentials, or onboarding tutorial flags.
 */
export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('vmind_session');
    localStorage.removeItem('vmind_mcp_token');
    localStorage.removeItem('vmind_allowed_agents');
    sessionStorage.clear();
  } catch (err) {
    console.error('Error clearing auth session:', err);
  }
}
