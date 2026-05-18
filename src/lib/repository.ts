import { type Donor, db } from './db';
import { checkEligibility } from './eligibility';

export const getDonorStats = async () => {
  const allDonors = await db.donors.toArray();
  const now = new Date();
  
  const eligibleCount = allDonors.filter(d => checkEligibility(d.lastDonationDate).isEligible).length;
  const readyCount = allDonors.filter(d => d.isReadyToDonate).length;
  
  return {
    total: allDonors.length,
    eligible: eligibleCount,
    ready: readyCount
  };
};

export const searchDonors = async (bloodGroup: string, location?: string) => {
  let collection = db.donors.where('bloodGroup').equals(bloodGroup);
  
  const results = await collection.toArray();
  
  // Filter for matching ready/eligible on client side for complex logic
  return results.filter(donor => {
    const { isEligible } = checkEligibility(donor.lastDonationDate);
    const locationMatch = !location || donor.location.toLowerCase().includes(location.toLowerCase());
    return donor.isReadyToDonate && isEligible && locationMatch;
  });
};
