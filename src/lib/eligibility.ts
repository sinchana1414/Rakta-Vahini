import { differenceInDays, parseISO, addDays, format } from 'date-fns';

export const WAIT_PERIOD_DAYS = 90;

export const checkEligibility = (lastDonationDate: string | null): {
  isEligible: boolean;
  nextDate: Date | null;
  daysRemaining: number;
} => {
  if (!lastDonationDate) {
    return { isEligible: true, nextDate: null, daysRemaining: 0 };
  }

  const last = parseISO(lastDonationDate);
  const next = addDays(last, WAIT_PERIOD_DAYS);
  const now = new Date();
  const diff = differenceInDays(next, now);

  return {
    isEligible: diff <= 0,
    nextDate: next,
    daysRemaining: Math.max(0, diff)
  };
};

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
