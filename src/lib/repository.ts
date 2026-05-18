import { db as firestore } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { checkEligibility } from './eligibility';

export interface Donor {
  id?: string;
  userId: string;
  name: string;
  phone: string;
  bloodGroup: string;
  location: string;
  village: string;
  lastDonationDate: string | null;
  isReadyToDonate: boolean;
  registeredAt: number;
}

export const getDonorStatsFromFirestore = async () => {
  const donorsRef = collection(firestore, 'donors');
  const snapshot = await getDocs(donorsRef);
  const allDonors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Donor));
  
  const eligibleCount = allDonors.filter(d => checkEligibility(d.lastDonationDate).isEligible).length;
  const readyCount = allDonors.filter(d => d.isReadyToDonate).length;
  
  return {
    total: allDonors.length,
    eligible: eligibleCount,
    ready: readyCount
  };
};

export const searchDonorsInFirestore = async (bloodGroup: string, location?: string) => {
  const donorsRef = collection(firestore, 'donors');
  const q = query(
    donorsRef, 
    where('bloodGroup', '==', bloodGroup),
    where('isReadyToDonate', '==', true)
  );
  
  const snapshot = await getDocs(q);
  const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Donor));
  
  // Filter for matching eligible on client side for complex date logic
  return results.filter(donor => {
    const { isEligible } = checkEligibility(donor.lastDonationDate);
    const locationMatch = !location || donor.location.toLowerCase().includes(location.toLowerCase()) || donor.village.toLowerCase().includes(location.toLowerCase());
    return isEligible && locationMatch;
  });
};
