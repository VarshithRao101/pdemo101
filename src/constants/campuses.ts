/**
 * The four campuses, in one place.
 *
 * This list previously lived only in AdminPortalViews and was imported from
 * there by the accountant portal. That worked, but it made a 270kB lazy-loaded
 * module a dependency of another one for the sake of a four-element array —
 * and it only stayed cheap because tree-shaking happened to remove the rest.
 * A shared constant does not depend on that holding.
 *
 * Must stay in step with VALID_CAMPUSES in server/app.cjs, which is what
 * actually rejects an unknown campus.
 */
export const CAMPUS_LIST = [
  'Erragattugutta C1',
  'Erragattugutta C2',
  'Beemaram C1',
  'Beemaram C2'
] as const;

export type CampusName = (typeof CAMPUS_LIST)[number];
