/**
 * Input length limits, in one place.
 *
 * Before this, none of the roughly one hundred inputs in the app had a
 * `maxLength` at all: a name field would accept as much text as someone cared
 * to paste, and only some server routes capped it afterwards. The result was
 * a form that looked fine, submitted, and then either failed with a generic
 * error or stored something absurd.
 *
 * These are the browser-side limits. The server enforces its own — see
 * MAX_TEXT and cleanTextFields in server/app.cjs — because a maxLength
 * attribute is a convenience for people typing, not a control: anyone can
 * post around it.
 */
export const LIMITS = {
  // People and identifiers
  personName: 50,
  admissionNumber: 20,
  staffId: 20,
  studentId: 20,

  // Contact
  mobile: 10,
  email: 50,
  address: 200,

  // Academic
  course: 30,
  section: 30,
  subject: 50,
  department: 50,
  previousSchool: 100,
  previousBoard: 50,
  academicYear: 12,

  // Free text
  remarks: 500,
  notes: 500,
  reason: 250,
  category: 50,
  feeSlotName: 50,

  // Finance
  amountDigits: 9,
  receiptNumber: 30,
  transactionRef: 30,

  // Credentials. The PIN is exactly six digits; usernames and passwords are
  // bounded to keep a paste from becoming a denial-of-service against bcrypt,
  // which hashes the whole input.
  username: 40,
  password: 72,
  pin: 6,
  backupCode: 20
} as const;

export type FieldLimitKey = keyof typeof LIMITS;

/**
 * Keeps a numeric input to a sane number of digits.
 *
 * `maxLength` does nothing on `<input type="number">` — browsers ignore it —
 * so money fields need this on the change handler instead.
 */
export function clampDigits(value: string, digits: number = LIMITS.amountDigits): string {
  const cleaned = String(value).replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  const head = whole.slice(0, digits);
  return rest.length ? `${head}.${rest.join('').slice(0, 2)}` : head;
}

/** Digits only, for mobile numbers. */
export function digitsOnly(value: string, max: number = LIMITS.mobile): string {
  return String(value).replace(/\D/g, '').slice(0, max);
}

/**
 * A mobile number must be exactly ten digits, or absent.
 *
 * Returns the message to show, or null when the value is acceptable.
 *
 * This mirrors the server rule in createStudentHandler (server/app.cjs), which
 * strips spaces and dashes then requires /^\d{10}$/. It lives here because the
 * admin portal had its own copy and the accountant portal had none at all — so
 * the accountant form accepted a three-digit number, submitted it, and only
 * then showed a server error. Empty stays allowed: these fields are optional
 * on the record, and the forms that require one check for emptiness
 * separately.
 */
export function validateMobile(value: string, label = 'Mobile number'): string | null {
  if (!value || value.trim() === '') return null;
  const digits = value.replace(/[\s-]/g, '');
  if (!/^\d{10}$/.test(digits)) return `${label} must be exactly 10 digits.`;
  return null;
}
