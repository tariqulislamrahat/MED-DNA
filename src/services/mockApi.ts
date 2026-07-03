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
  scanPrescription: async (input: string, userId: string = 'anonymous'): Promise<ScanResult> => {
    let payload: { image?: string; sampleId?: string; userId: string } = { userId };
    
    // Check if input is a base64 data URL
    if (input.startsWith('data:image/')) {
      payload.image = input;
    } else {
      // Let's create a fake base64 or pass sampleId so the backend can use Llama directly on the raw text
      payload.sampleId = input;
      // To ensure OCR runs, we can pass a dummy base64 if needed, but we also support passing text directly.
      // We will send the image base64 of the sample (by using a small fallback or letting backend know)
      // For demo simplicity, if we don't have a file buffer, we send the raw handwriting as image/text
      // Let's send a dummy tiny base64 image + the rawText to parse
      payload.image = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    }

    try {
      // If we sent a sampleId, the server can call Llama directly on the handwriting text to save API quota,
      // or run full Nemotron on the uploaded base64 image!
      const response = await fetch(`${API_BASE}/api/scan-prescription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned error: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        rawText: result.rawText || '',
        doctorName: result.doctorName || 'Unknown Doctor',
        specialty: result.specialty || 'General Practice',
        date: result.date || new Date().toISOString().split('T')[0],
        extractedMeds: result.extractedMeds || []
      };
    } catch (error) {
      console.warn('API connection failed, falling back to local client parsing simulation:', error);
      // Fallback to client simulation if backend is not running
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

