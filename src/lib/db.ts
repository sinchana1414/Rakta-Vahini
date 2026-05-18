import Dexie, { type Table } from 'dexie';

export interface Donor {
  id?: number;
  name: string;
  phone: string;
  bloodGroup: string;
  location: string;
  village: string;
  lastDonationDate: string | null;
  isReadyToDonate: boolean;
  registeredAt: number;
}

export interface Donation {
  id?: number;
  donorId: number;
  date: string;
  hospital: string;
  units: number;
  notes?: string;
}

export class RaktaVahiniDB extends Dexie {
  donors!: Table<Donor>;
  donations!: Table<Donation>;

  constructor() {
    super('RaktaVahiniDB');
    this.version(1).stores({
      donors: '++id, bloodGroup, location, isReadyToDonate, phone',
      donations: '++id, donorId, date'
    });
  }
}

export const db = new RaktaVahiniDB();
