/**
 * Today, as the person at the desk would write it.
 *
 * Every date input in this app used to default to
 * `new Date().toISOString().split('T')[0]`. `toISOString()` is UTC, and the
 * college is on IST (UTC+5:30) — so between midnight and 5:30 in the morning
 * that expression returns YESTERDAY. Observed, not theorised: at 00:04 IST on
 * 1 September the fee collection date, the expenditure date and the staff
 * joining date all defaulted to 31 August.
 *
 * The consequence is not cosmetic. That default is what gets SAVED: a receipt
 * handed to a parent, an expenditure in the day's totals and a salary record
 * would all be filed under the previous day, and the day's books would not
 * balance against the cash actually taken.
 *
 * Built from the local calendar fields rather than a locale string, so no
 * browser's locale settings can change what it returns.
 */
export const todayLocalISO = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
