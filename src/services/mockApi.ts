import { SAMPLE_PRESCRIPTIONS, MEDICINE_DATABASE, PHARMACIES } from './mockData';
import type { ExtractedMedicine, Pharmacy, MedicineInfo } from './mockData';

export interface ScanResult {
  rawText: string;
  doctorName: string;
  patientName?: string;
  specialty: string;
  date: string;
  documentType?: string;
  contextSummary?: string;
  ocrEngine?: string;
  ocrConfidence?: number;
  aiConfidence?: number;
  quality?: {
    characterCount?: number;
    lineCount?: number;
    medicationSignalCount?: number;
    confidence?: number;
    likelyPrescription?: boolean;
    warnings?: string[];
  };
  warnings?: string[];
  extractedMeds: Omit<ExtractedMedicine, 'id' | 'startDate'>[];
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export const mockApi = {
  /**
   * Sends the prescription image (base64) or sample id to the backend Express server
   */
  scanPrescription: async (input: string, userId: string = 'anonymous', language: string = 'en'): Promise<ScanResult> => {
    let payload: { image?: string; document?: string; sampleId?: string; userId: string; language: string } = { userId, language };
    
    // Check if input is a base64 data URL (real uploaded image/PDF)
    if (input.startsWith('data:')) {
      if (input.startsWith('data:image/')) {
        payload.image = input;
      } else {
        payload.document = input;
      }
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
        patientName: result.patientName || '',
        specialty: result.specialty || 'General Practice',
        date: result.date || new Date().toISOString().split('T')[0],
        documentType: result.documentType,
        contextSummary: result.contextSummary,
        ocrEngine: result.ocrEngine,
        ocrConfidence: result.ocrConfidence,
        aiConfidence: result.aiConfidence,
        quality: result.quality,
        warnings: result.warnings || [],
        extractedMeds: result.extractedMeds || []
      };
    } catch (error: any) {
      console.warn('API connection failed:', error);
      // If we uploaded a real document and it failed, throw so the UI shows the error
      if (input.startsWith('data:')) {
        throw new Error(error.message || 'Failed to scan prescription. Make sure the backend server is running.');
      }
      // For sample IDs, fall back to local data if server is unreachable
      const sample = SAMPLE_PRESCRIPTIONS.find(s => s.id === input) || SAMPLE_PRESCRIPTIONS[0];
      return {
        rawText: sample.rawHandwriting,
        doctorName: sample.doctorName,
        specialty: sample.specialty,
        date: sample.date,
        documentType: 'sample prescription',
        ocrEngine: 'local sample',
        ocrConfidence: 99,
        aiConfidence: 90,
        warnings: [],
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

