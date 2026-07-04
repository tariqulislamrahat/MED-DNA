import { SAMPLE_PRESCRIPTIONS, MEDICINE_DATABASE, PHARMACIES } from './mockData';
import type { ExtractedMedicine, Pharmacy, MedicineInfo } from './mockData';

export interface ScanResult {
  rawText: string;
  doctorName: string;
  specialty: string;
  date: string;
  extractedMeds: Omit<ExtractedMedicine, 'id' | 'startDate'>[];
}

const API_BASE = ''; // Rely on Vite proxy, or absolute http://localhost:5000 if not proxying

export const mockApi = {
  /**
   * Sends the prescription image (base64) or sample id to the backend Express server
   */
  scanPrescription: async (input: string, userId: string = 'anonymous', language: string = 'en'): Promise<ScanResult> => {
    let payload: { image?: string; sampleId?: string; userId: string; language: string } = { userId, language };
    
    // Check if input is a base64 data URL (real uploaded image)
    if (input.startsWith('data:image/')) {
      payload.image = input;
    } else {
      // It's a sample ID — the backend handles sample text injection directly
      payload.sampleId = input;
    }

    try {
      const response = await fetch(`${API_BASE}/api/scan-prescription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const msg = errorData?.message || errorData?.error || response.statusText;
        throw new Error(msg);
      }

      const result = await response.json();
      return {
        rawText: result.rawText || '',
        doctorName: result.doctorName || 'Unknown Doctor',
        specialty: result.specialty || 'General Practice',
        date: result.date || new Date().toISOString().split('T')[0],
        extractedMeds: result.extractedMeds || []
      };
    } catch (error: any) {
      console.warn('API connection failed:', error);
      // If we uploaded a real image and it failed, throw so the UI shows the error
      if (input.startsWith('data:image/')) {
        throw new Error(error.message || 'Failed to scan prescription. Make sure the backend server is running.');
      }
      // For sample IDs, fall back to local data if server is unreachable
      const sample = SAMPLE_PRESCRIPTIONS.find(s => s.id === input) || SAMPLE_PRESCRIPTIONS[0];
      return {
        rawText: sample.rawHandwriting,
        doctorName: sample.doctorName,
        specialty: sample.specialty,
        date: sample.date,
        extractedMeds: sample.parsedMeds
      };
    }
  },

  /**
   * Fetches detailed information for a medicine name
   */
  getMedicineInfo: async (name: string): Promise<MedicineInfo | null> => {
    try {
      const response = await fetch(`${API_BASE}/api/medicine-info?name=${encodeURIComponent(name)}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Backend medicine-info query failed, falling back to client dictionary:', e);
    }
    // Case-insensitive local lookup
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
    let cheapestId = '';
    let cheapestTotal = Infinity;

    const list = PHARMACIES.map(pharm => {
      let total = 0;
      let count = 0;

      medNames.forEach(med => {
        const priceKey = Object.keys(pharm.prices).find(
          pk => pk.toLowerCase() === med.toLowerCase()
        );
        if (priceKey) {
          total += pharm.prices[priceKey];
          count++;
        } else {
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

