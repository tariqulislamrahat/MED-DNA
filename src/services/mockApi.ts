import { SAMPLE_PRESCRIPTIONS, MEDICINE_DATABASE, PHARMACIES } from './mockData';
import type { ExtractedMedicine, Pharmacy, MedicineInfo } from './mockData';

// Delay helper to mock real network calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface ScanResult {
  rawText: string;
  doctorName: string;
  specialty: string;
  date: string;
  extractedMeds: Omit<ExtractedMedicine, 'id' | 'startDate'>[];
}

export const mockApi = {
  /**
   * Simulates scanning a prescription file or preloaded template
   */
  scanPrescription: async (sampleId?: string): Promise<ScanResult> => {
    await delay(1800); // 1.8s artificial latency for scanning
    
    // Find preloaded sample or generate a fallback
    const sample = SAMPLE_PRESCRIPTIONS.find(s => s.id === sampleId) || SAMPLE_PRESCRIPTIONS[0];
    
    return {
      rawText: sample.rawHandwriting,
      doctorName: sample.doctorName,
      specialty: sample.specialty,
      date: sample.date,
      extractedMeds: sample.parsedMeds
    };
  },

  /**
   * Fetches detailed information for a medicine name
   */
  getMedicineInfo: async (name: string): Promise<MedicineInfo | null> => {
    await delay(500);
    // Case-insensitive lookup
    const foundKey = Object.keys(MEDICINE_DATABASE).find(
      key => key.toLowerCase() === name.trim().toLowerCase()
    );
    return foundKey ? MEDICINE_DATABASE[foundKey] : null;
  },

  /**
   * Calculates estimated pricing details across pharmacies for a list of active medicines
   */
  calculatePharmacyComparison: async (medNames: string[]): Promise<{
    pharmacies: (Pharmacy & { totalEstimatedPrice: number; availableCount: number })[];
    cheapestPharmacyId: string;
  }> => {
    await delay(800);
    
    let cheapestId = '';
    let cheapestTotal = Infinity;

    const list = PHARMACIES.map(pharm => {
      let total = 0;
      let count = 0;

      medNames.forEach(med => {
        // Find match in pharmacy prices database (case insensitive)
        const priceKey = Object.keys(pharm.prices).find(
          pk => pk.toLowerCase() === med.toLowerCase()
        );
        if (priceKey) {
          total += pharm.prices[priceKey];
          count++;
        } else {
          // Default price if not found in db
          total += 10.00;
          count++;
        }
      });

      if (total < cheapestTotal && count > 0) {
        cheapestTotal = total;
        cheapestId = pharm.id;
      }

      return {
        ...pharm,
        totalEstimatedPrice: parseFloat(total.toFixed(2)),
        availableCount: count
      };
    });

    return {
      pharmacies: list,
      cheapestPharmacyId: cheapestId
    };
  }
};
