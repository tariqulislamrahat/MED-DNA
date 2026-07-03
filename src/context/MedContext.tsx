import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ExtractedMedicine } from '../services/mockData';
import { mockApi } from '../services/mockApi';
import type { ScanResult } from '../services/mockApi';

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
}

export interface DoseRecord {
  taken: boolean;
  takenAt?: string;
}

export interface AdherenceRecords {
  [dateStr: string]: {
    [doseKey: string]: DoseRecord; // doseKey format: `${medId}_${timing}`
  };
}

export interface ScanHistoryItem {
  id: string;
  title: string;
  doctorName: string;
  date: string;
  medCount: number;
}

interface MedContextType {
  user: UserProfile | null;
  medicines: ExtractedMedicine[];
  adherenceRecords: AdherenceRecords;
  scanHistory: ScanHistoryItem[];
  isScanning: boolean;
  scanResult: ScanResult | null;
  notificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  emergencyContact: { name: string; phone: string };
  sosTriggered: boolean;
  
  login: () => Promise<void>;
  logout: () => void;
  startScanning: (sampleId?: string) => Promise<void>;
  cancelScanning: () => void;
  saveScannedMeds: (meds: Omit<ExtractedMedicine, 'id' | 'startDate'>[]) => void;
  addMedicine: (med: Omit<ExtractedMedicine, 'id' | 'startDate'>) => void;
  removeMedicine: (id: string) => void;
  toggleDose: (dateStr: string, medId: string, timing: string) => void;
  updateEmergencyContact: (name: string, phone: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setEmailNotificationsEnabled: (enabled: boolean) => void;
  triggerSOS: () => void;
  resetSOS: () => void;
  speakText: (text: string) => void;
  sendPushTest: (title: string, body: string) => void;
}

const MedContext = createContext<MedContextType | undefined>(undefined);

export const MedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [medicines, setMedicines] = useState<ExtractedMedicine[]>([]);
  const [adherenceRecords, setAdherenceRecords] = useState<AdherenceRecords>({});
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [emergencyContact, setEmergencyContact] = useState({
    name: 'Sarah Smith (Wife)',
    phone: '+1 (555) 911-3829'
  });
  const [sosTriggered, setSosTriggered] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);

  // Seed initial medicines and data on login
  useEffect(() => {
    if (user) {
      // Pre-populate with two medicines so the dashboard doesn't look blank
      const today = new Date().toISOString().split('T')[0];
      const initialMeds: ExtractedMedicine[] = [
        {
          id: 'med_01',
          name: 'Lisinopril',
          dosage: '10mg',
          timing: ['evening'],
          instructions: 'Before bed',
          duration: '30 days',
          startDate: today,
          refillsLeft: 3
        },
        {
          id: 'med_02',
          name: 'Atorvastatin',
          dosage: '20mg',
          timing: ['night'],
          instructions: 'At bedtime',
          duration: '30 days',
          startDate: today,
          refillsLeft: 3
        }
      ];
      setMedicines(initialMeds);
      
      setScanHistory([
        {
          id: 'sc_01',
          title: 'Cardiology Review - Dr. Jenkins',
          doctorName: 'Dr. Sarah Jenkins, MD',
          date: '2026-06-28',
          medCount: 3
        }
      ]);
    } else {
      setMedicines([]);
      setAdherenceRecords({});
      setScanHistory([]);
    }
  }, [user]);

  // Request browser notification permissions
  useEffect(() => {
    if (notificationsEnabled && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [notificationsEnabled]);

  const login = async () => {
    // Simulated Google Login Auth Popup
    await new Promise(r => setTimeout(r, 1200));
    setUser({
      name: 'Alex Mercer',
      email: 'alex.mercer@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop'
    });
  };

  const logout = () => {
    setUser(null);
  };

  const startScanning = async (sampleId?: string) => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const result = await mockApi.scanPrescription(sampleId);
      setScanResult(result);
    } catch (e) {
      console.error("Scanning failed", e);
    } finally {
      setIsScanning(false);
    }
  };

  const cancelScanning = () => {
    setIsScanning(false);
    setScanResult(null);
  };

  const saveScannedMeds = (meds: Omit<ExtractedMedicine, 'id' | 'startDate'>[]) => {
    const today = new Date().toISOString().split('T')[0];
    const newMeds: ExtractedMedicine[] = meds.map((m, idx) => ({
      ...m,
      id: `med_${Date.now()}_${idx}`,
      startDate: today
    }));

    setMedicines(prev => [...prev, ...newMeds]);
    
    // Add to history list
    if (scanResult) {
      const historyItem: ScanHistoryItem = {
        id: `sc_${Date.now()}`,
        title: scanResult.doctorName ? `Prescription - ${scanResult.doctorName.split(',')[0]}` : 'Prescription Scan',
        doctorName: scanResult.doctorName || 'Unknown Doctor',
        date: today,
        medCount: meds.length
      };
      setScanHistory(prev => [historyItem, ...prev]);
    }
    
    setScanResult(null);
  };

  const addMedicine = (med: Omit<ExtractedMedicine, 'id' | 'startDate'>) => {
    const today = new Date().toISOString().split('T')[0];
    const newMed: ExtractedMedicine = {
      ...med,
      id: `med_${Date.now()}`,
      startDate: today
    };
    setMedicines(prev => [...prev, newMed]);
  };

  const removeMedicine = (id: string) => {
    setMedicines(prev => prev.filter(m => m.id !== id));
  };

  const toggleDose = (dateStr: string, medId: string, timing: string) => {
    const doseKey = `${medId}_${timing}`;
    
    setAdherenceRecords(prev => {
      const dayRecords = prev[dateStr] || {};
      const currentDose = dayRecords[doseKey] || { taken: false };
      
      const newDoseRecord: DoseRecord = {
        taken: !currentDose.taken,
        takenAt: !currentDose.taken ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
      };

      return {
        ...prev,
        [dateStr]: {
          ...dayRecords,
          [doseKey]: newDoseRecord
        }
      };
    });
  };

  const updateEmergencyContact = (name: string, phone: string) => {
    setEmergencyContact({ name, phone });
  };

  const triggerSOS = () => {
    setSosTriggered(true);
    console.warn(`[EMERGENCY SOS TRIGGERED] Coordinates: Lat 37.7749, Long -122.4194. Contacting ${emergencyContact.name} at ${emergencyContact.phone}`);
  };

  const resetSOS = () => {
    setSosTriggered(false);
  };

  // Text to Speech
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel active speaking
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // speak slightly slower for clarity
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-speech is not supported in this browser.");
    }
  };

  // Browser Push Notifications API simulation
  const sendPushTest = (title: string, body: string) => {
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/822/822143.png'
      });
    } else {
      console.log(`[PUSH NOTIFICATION MOCK] Title: ${title} | Body: ${body}`);
    }
  };

  return (
    <MedContext.Provider value={{
      user,
      medicines,
      adherenceRecords,
      scanHistory,
      isScanning,
      scanResult,
      notificationsEnabled,
      emailNotificationsEnabled,
      emergencyContact,
      sosTriggered,
      login,
      logout,
      startScanning,
      cancelScanning,
      saveScannedMeds,
      addMedicine,
      removeMedicine,
      toggleDose,
      updateEmergencyContact,
      setNotificationsEnabled,
      setEmailNotificationsEnabled,
      triggerSOS,
      resetSOS,
      speakText,
      sendPushTest
    }}>
      {children}
    </MedContext.Provider>
  );
};

export const useMed = () => {
  const context = useContext(MedContext);
  if (context === undefined) {
    throw new Error('useMed must be used within a MedProvider');
  }
  return context;
};
