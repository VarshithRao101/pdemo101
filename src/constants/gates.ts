/**
 * The two addresses that reach the ERP, in one place.
 *
 * They used to be string literals repeated across App.tsx, NavigationContext
 * and PinView — eleven copies of two values. Changing the address meant finding
 * every one, and the ones that got missed would not fail loudly: a stale
 * redirect sends a signed-out clerk to a hash nothing matches, and they land on
 * the marketing site wondering where the portal went.
 *
 * WHAT THESE ARE, AND ARE NOT
 *
 * They are unlisted, not secret. This file is compiled into the JavaScript
 * bundle that every visitor downloads, and this repository is public — anyone
 * who looks can read them. They are NOT what protects the ERP.
 *
 * What protects the ERP is the password, the six-digit PIN, the per-account
 * lockout after five wrong guesses, the campus-wide backstop, the rate limiter,
 * and the role and campus checks the server applies to every single request.
 * Those hold whether or not anyone knows this address.
 *
 * What an unlisted address buys is narrower and still worth having: the sign-in
 * screen is not linked from a public page, so it does not appear in search
 * results, in a screenshot of the footer, or under the finger of a visitor
 * idly tapping around the site. It keeps the door out of casual sight.
 *
 * To change them: edit here, rebuild, and tell the staff the new address. There
 * is nowhere else to update.
 */

/** Staff: Rector, accountants and campus clerks. */
export const STAFF_GATE = '#/erp-4Kd9WqhTzVmB-x7PnLs2GcRv';

/** The security authenticator, which has its own separate door. */
export const AUTH_GATE = '#/sec-8Hy3TnQxWvJd-b5FmKz9RpCt';

/**
 * Exact match, deliberately.
 *
 * The old routing opened the gate on `hash.includes('login')` and
 * `hash.includes('portal-gate')`, so `#/login`, `#/staff-login` and anything a
 * crawler or a guess produced containing that word reached the sign-in screen.
 * An unlisted address is pointless while a handful of loose patterns open the
 * same door, so there are no substrings and no aliases here.
 */
export const isStaffGate = (hash: string): boolean => hash === STAFF_GATE;
export const isAuthGate = (hash: string): boolean => hash === AUTH_GATE;
export const isAnyGate = (hash: string): boolean => isStaffGate(hash) || isAuthGate(hash);
