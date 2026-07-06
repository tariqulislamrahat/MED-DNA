import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ExtractedMedicine } from '../services/mockData';
import { mockApi } from '../services/mockApi';
import type { ScanResult } from '../services/mockApi';
import { translations } from '../services/translations';

const API_BASE = import.meta.env.VITE_API_URL || '';

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
  extractedMeds?: Omit<ExtractedMedicine, 'id' | 'startDate'>[];
}

export interface EmailLogItem {
  id: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  sentAt: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

interface MedContextType {
  user: UserProfile | null;
  medicines: ExtractedMedicine[];
  adherenceRecords: AdherenceRecords;
  scanHistory: ScanHistoryItem[];
  emailLogs: EmailLogItem[];
  isScanning: boolean;
  scanResult: ScanResult | null;
  scanError: string | null;
  setScanError: (error: string | null) => void;
  notificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  emergencyContact: { name: string; phone: string };
  sosTriggered: boolean;
  userCoordinates: Coordinates | null;
  activeSpeechId: string | null;
  interactionWarnings: { medA: string; medB: string; note: string }[];
  slotTimes: { morning: string; afternoon: string; evening: string; night: string };
  updateSlotTime: (slot: 'morning' | 'afternoon' | 'evening' | 'night', time: string) => void;
  language: 'en' | 'bn';
  setLanguage: (lang: 'en' | 'bn') => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  
  login: (email?: string, name?: string, googleToken?: string) => Promise<void>;
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
  speakText: (text: string, id?: string) => void;
  stopSpeech: () => void;
  sendPushTest: (title: string, body: string) => void;
  deleteScanHistory: (id: string) => Promise<void>;
  fetchEmailLogs: () => Promise<void>;
  requestRefill: (medId: string) => Promise<void>;
  checkoutRefills: () => Promise<void>;
}

const MedContext = createContext<MedContextType | undefined>(undefined);


export const MedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const stored = localStorage.getItem('meddna_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [medicines, setMedicines] = useState<ExtractedMedicine[]>([]);
  const [adherenceRecords, setAdherenceRecords] = useState<AdherenceRecords>({});
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const stored = localStorage.getItem('meddna_push_enabled');
    return stored ? stored === 'true' : true;
  });
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(() => {
    const stored = localStorage.getItem('meddna_email_enabled');
    return stored ? stored === 'true' : true;
  });
  const [emergencyContact, setEmergencyContact] = useState(() => {
    const stored = localStorage.getItem('meddna_emergency_contact');
    return stored ? JSON.parse(stored) : {
      name: 'Sarah Smith (Wife)',
      phone: '+1 (555) 911-3829'
    };
  });
  const [sosTriggered, setSosTriggered] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLogItem[]>([]);
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const [interactionWarnings, setInteractionWarnings] = useState<{ medA: string; medB: string; note: string }[]>([]);

  // Time picker defaults (stored in local state but shared)
  const [slotTimes, setSlotTimes] = useState<{ morning: string; afternoon: string; evening: string; night: string }>(() => {
    const stored = localStorage.getItem('meddna_slot_times');
    return stored ? JSON.parse(stored) : {
      morning: '08:00',
      afternoon: '13:00',
      evening: '18:00',
      night: '22:00'
    };
  });

  const updateSlotTime = (slot: 'morning' | 'afternoon' | 'evening' | 'night', time: string) => {
    setSlotTimes(prev => {
      const updated = { ...prev, [slot]: time };
      localStorage.setItem('meddna_slot_times', JSON.stringify(updated));
      return updated;
    });
  };

  const [language, setLanguageState] = useState<'en' | 'bn'>(() => {
    const stored = localStorage.getItem('meddna_lang');
    return (stored === 'bn' || stored === 'en') ? stored : 'en';
  });

  const setLanguage = (lang: 'en' | 'bn') => {
    setLanguageState(lang);
    localStorage.setItem('meddna_lang', lang);
  };

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    const dict = translations[language] || translations.en;
    let translation = (dict as any)[key] || (translations.en as any)[key] || key;
    
    if (replacements) {
      Object.keys(replacements).forEach(k => {
        translation = translation.replace(`{${k}}`, String(replacements[k]));
      });
    }
    return translation;
  };

  // Audio elements for SOS siren synthesized using Web Audio API
  const audioContextRef = useRef<AudioContext | null>(null);
  const sirenOscillatorRef = useRef<OscillatorNode | null>(null);
  const sirenGainRef = useRef<GainNode | null>(null);
  const sirenIntervalId = useRef<any>(null);

  // Dynamic AI interaction checker effect
  useEffect(() => {
    const checkActiveInteractions = async () => {
      if (medicines.length < 2) {
        setInteractionWarnings([]);
        return;
      }
      try {
        const medNames = medicines.map(m => m.name);
        const res = await fetch(`${API_BASE}/api/check-interactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ medicines: medNames })
        });
        if (res.ok) {
          const warnings = await res.json();
          setInteractionWarnings(warnings);
        }
      } catch (err) {
        console.warn('Dynamic interaction check failed:', err);
      }
    };
    checkActiveInteractions();
  }, [medicines]);



  // Seed initial medicines, history, and email logs on login
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const email = user.email;
          const [medsRes, adherenceRes, prescriptionsRes, emailLogsRes] = await Promise.all([
            fetch(`${API_BASE}/api/medicines?userId=${email}`),
            fetch(`${API_BASE}/api/adherence?userId=${email}`),
            fetch(`${API_BASE}/api/prescriptions?userId=${email}`),
            fetch(`${API_BASE}/api/email-logs?userId=${email}`)
          ]);
          
          if (medsRes.ok && adherenceRes.ok) {
            const meds = await medsRes.json();
            const adherence = await adherenceRes.json();
            setMedicines(meds);
            setAdherenceRecords(adherence);
          }
          if (prescriptionsRes.ok) {
            const history = await prescriptionsRes.json();
            setScanHistory(history.map((h: any) => ({
              id: h._id || h.id,
              title: h.doctorName ? `Prescription - ${h.doctorName.split(',')[0]}` : 'Prescription Scan',
              doctorName: h.doctorName || 'Unknown Doctor',
              date: h.date || new Date().toISOString().split('T')[0],
              medCount: h.extractedMeds ? h.extractedMeds.length : 0,
              extractedMeds: h.extractedMeds
            })));
          }
          if (emailLogsRes.ok) {
            const emails = await emailLogsRes.json();
            setEmailLogs(emails);
          }
        } catch (error) {
          console.warn('Failed to load user data from Express backend, using defaults:', error);
          // Standard mock fallback
          const today = new Date().toISOString().split('T')[0];
          setMedicines([
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
          ]);
          setScanHistory([
            {
              id: 'sc_01',
              title: 'Cardiology Review - Dr. Jenkins',
              doctorName: 'Dr. Sarah Jenkins, MD',
              date: '2026-06-28',
              medCount: 3
            }
          ]);
        }
      } else {
        setMedicines([]);
        setAdherenceRecords({});
        setScanHistory([]);
        setEmailLogs([]);
      }
    };
    
    fetchUserData();

    // Trigger geolocation retrieval if possible
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation failed or denied. Falling back to default coordinates:', error.message);
          setUserCoordinates({
            latitude: 37.7749,
            longitude: -122.4194
          });
        }
      );
    } else {
      setUserCoordinates({
        latitude: 37.7749,
        longitude: -122.4194
      });
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

  const login = async (email?: string, name?: string, googleToken?: string) => {
    let loggedInUser: any = null;
    if (googleToken) {
      try {
        const response = await fetch(`${API_BASE}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: googleToken })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            loggedInUser = data.user;
          }
        } else {
          throw new Error('Google verification response not OK');
        }
      } catch (e) {
        console.warn('Google Auth server verification failed, using fallback:', e);
      }
    }

    if (!loggedInUser) {
      // Simulated Google Login Auth Popup
      await new Promise(r => setTimeout(r, 1200));
      loggedInUser = {
        name: name || 'Alex Mercer',
        email: email || 'alex.mercer@gmail.com',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop'
      };
    }

    // Set user state and save to local storage
    setUser(loggedInUser);
    localStorage.setItem('meddna_user', JSON.stringify(loggedInUser));

    // Sync any existing offline/simulated medicines to the backend under the newly logged in user's email
    try {
      const syncEmail = loggedInUser.email;
      if (medicines.length > 0) {
        console.log(`Syncing ${medicines.length} medicines to Google account: ${syncEmail}`);
        // Send a post request for each medicine that doesn't already belong to this user
        await Promise.all(
          medicines.map(async (med) => {
            return fetch(`${API_BASE}/api/medicines`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...med, userId: syncEmail })
            });
          })
        );
      }
    } catch (syncErr) {
      console.warn('Failed to sync medicines to backend:', syncErr);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('meddna_user');
  };

  const handleSetNotificationsEnabled = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem('meddna_push_enabled', enabled ? 'true' : 'false');
  };

  const handleSetEmailNotificationsEnabled = (enabled: boolean) => {
    setEmailNotificationsEnabled(enabled);
    localStorage.setItem('meddna_email_enabled', enabled ? 'true' : 'false');
  };

  const startScanning = async (sampleId?: string) => {
    setIsScanning(true);
    setScanResult(null);
    setScanError(null);
    try {
      const result = await mockApi.scanPrescription(sampleId || 'pres_01', user?.email || 'anonymous', language);
      setScanResult(result);
    } catch (e: any) {
      console.error("Scanning failed", e);
      setScanError(e.message || "Failed to parse prescription.");
    } finally {
      setIsScanning(false);
    }
  };

  const cancelScanning = () => {
    setIsScanning(false);
    setScanResult(null);
  };

  const saveScannedMeds = async (meds: Omit<ExtractedMedicine, 'id' | 'startDate'>[]) => {
    const today = new Date().toISOString().split('T')[0];
    const email = user?.email || 'anonymous';
    
    try {
      const savePromises = meds.map(med => 
        fetch(`${API_BASE}/api/medicines`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...med, userId: email })
        }).then(res => {
          if (!res.ok) throw new Error('Database save failed');
          return res.json();
        })
      );
      
      const savedMeds = await Promise.all(savePromises);
      setMedicines(prev => [...prev, ...savedMeds]);
      
      if (scanResult) {
        // Save scan history log to DB
        // The /api/scan-prescription endpoint already logs to the DB.
        // We can reload the prescriptions list from the API to get actual history.
        const res = await fetch(`${API_BASE}/api/prescriptions?userId=${email}`);
        if (res.ok) {
          const history = await res.json();
          setScanHistory(history.map((h: any) => ({
            id: h._id || h.id,
            title: h.doctorName ? `Prescription - ${h.doctorName.split(',')[0]}` : 'Prescription Scan',
            doctorName: h.doctorName || 'Unknown Doctor',
            date: h.date || today,
            medCount: h.extractedMeds ? h.extractedMeds.length : 0,
            extractedMeds: h.extractedMeds
          })));
        }
      }
    } catch (error) {
      console.warn('Failed to save scanned meds to backend. Falling back to local state:', error);
      const newMeds: ExtractedMedicine[] = meds.map((m, idx) => ({
        ...m,
        id: `med_${Date.now()}_${idx}`,
        startDate: today
      }));
      setMedicines(prev => [...prev, ...newMeds]);
    } finally {
      setScanResult(null);
    }
  };

  const addMedicine = async (med: Omit<ExtractedMedicine, 'id' | 'startDate'>) => {
    const today = new Date().toISOString().split('T')[0];
    const email = user?.email || 'anonymous';
    
    try {
      const response = await fetch(`${API_BASE}/api/medicines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...med, userId: email })
      });
      
      if (response.ok) {
        const savedMed = await response.json();
        setMedicines(prev => [...prev, savedMed]);
      } else {
        throw new Error('Database insert failed');
      }
    } catch (error) {
      console.warn('Failed to add medicine to backend. Falling back to local state:', error);
      const newMed: ExtractedMedicine = {
        ...med,
        id: `med_${Date.now()}`,
        startDate: today
      };
      setMedicines(prev => [...prev, newMed]);
    }
  };

  const removeMedicine = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/medicines/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setMedicines(prev => prev.filter(m => m.id !== id));
      } else {
        throw new Error('Database delete failed');
      }
    } catch (error) {
      console.warn('Failed to remove medicine from backend. Falling back to local state:', error);
      setMedicines(prev => prev.filter(m => m.id !== id));
    }
  };

  const deleteScanHistory = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/prescriptions/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setScanHistory(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.warn('Failed to delete prescription from history. Fallback:', err);
      setScanHistory(prev => prev.filter(item => item.id !== id));
    }
  };

  const fetchEmailLogs = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/api/email-logs?userId=${user.email}`);
      if (res.ok) {
        const logs = await res.json();
        setEmailLogs(logs);
      }
    } catch (err) {
      console.warn('Failed to fetch email logs:', err);
    }
  };

  const requestRefill = async (medId: string) => {
    const med = medicines.find(m => m.id === medId);
    if (!med) return;

    // Doctor authorization simulation adds 3 refills
    const updatedRefills = (med.refillsLeft || 0) + 3;

    try {
      const response = await fetch(`${API_BASE}/api/medicines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...med,
          refillsLeft: updatedRefills,
          userId: user?.email || 'anonymous'
        })
      });
      
      if (response.ok) {
        const savedMed = await response.json();
        setMedicines(prev => prev.map(m => m.id === medId ? savedMed : m));
      }
    } catch (error) {
      console.warn('Failed to update refills on backend. Fallback:', error);
      setMedicines(prev => prev.map(m => m.id === medId ? { ...m, refillsLeft: updatedRefills } : m));
    }
  };

  const checkoutRefills = async () => {
    try {
      const updatePromises = medicines.map(med => {
        const nextRefills = Math.max(0, (med.refillsLeft || 0) - 1);
        return fetch(`${API_BASE}/api/medicines`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...med,
            refillsLeft: nextRefills,
            userId: user?.email || 'anonymous'
          })
        });
      });
      await Promise.all(updatePromises);
      
      // Reload medicines
      const email = user?.email || 'anonymous';
      const medsRes = await fetch(`${API_BASE}/api/medicines?userId=${email}`);
      if (medsRes.ok) {
        const meds = await medsRes.json();
        setMedicines(meds);
      }
    } catch (e) {
      console.warn('Failed to checkout refills on backend. Falling back to local state:', e);
      setMedicines(prev => prev.map(m => ({ ...m, refillsLeft: Math.max(0, (m.refillsLeft || 0) - 1) })));
    }
  };

  const toggleDose = async (dateStr: string, medId: string, timing: string) => {
    const email = user?.email || 'anonymous';
    
    try {
      const response = await fetch(`${API_BASE}/api/adherence/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, medId, timing, userId: email })
      });
      
      if (response.ok) {
        const result = await response.json();
        setAdherenceRecords(prev => ({
          ...prev,
          [dateStr]: result.records
        }));
      } else {
        throw new Error('Database check-off failed');
      }
    } catch (error) {
      console.warn('Failed to toggle dose in backend. Falling back to local state:', error);
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
    }
  };

  const updateEmergencyContact = (name: string, phone: string) => {
    const newContact = { name, phone };
    setEmergencyContact(newContact);
    localStorage.setItem('meddna_emergency_contact', JSON.stringify(newContact));
  };

  const triggerSOS = () => {
    setSosTriggered(true);
    const lat = userCoordinates?.latitude || 37.7749;
    const lon = userCoordinates?.longitude || -122.4194;
    console.warn(`[EMERGENCY SOS TRIGGERED] Coordinates: Lat ${lat}, Long ${lon}. Contacting ${emergencyContact.name} at ${emergencyContact.phone}`);

    // Dispatch emergency simulated email
    if (emailNotificationsEnabled && user) {
      fetch(`${API_BASE}/api/send-email-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.email,
          recipient: emergencyContact.phone,
          subject: `CRITICAL ALERT: MedDNA SOS Triggered by ${user.name}`,
          body: `MedDNA has detected a panic SOS trigger from ${user.name}. Patient coordinates: Lat ${lat}, Long ${lon}. Emergency responder ${emergencyContact.name} is being notified.`
        })
      }).then(() => fetchEmailLogs());
    }

    // Play synthesized siren sound using Web Audio API
    try {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);

      // Siren sound sweep logic
      let high = true;
      sirenIntervalId.current = setInterval(() => {
        const time = ctx.currentTime;
        if (high) {
          osc.frequency.linearRampToValueAtTime(880, time + 0.45);
        } else {
          osc.frequency.linearRampToValueAtTime(440, time + 0.45);
        }
        high = !high;
      }, 500);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      sirenOscillatorRef.current = osc;
      sirenGainRef.current = gain;
    } catch (err) {
      console.warn('Failed to play synthesized SOS siren sound:', err);
    }
  };

  const resetSOS = () => {
    setSosTriggered(false);
    // Stop audio siren
    if (sirenIntervalId.current) {
      clearInterval(sirenIntervalId.current);
      sirenIntervalId.current = null;
    }
    if (sirenOscillatorRef.current) {
      try {
        sirenOscillatorRef.current.stop();
        sirenOscillatorRef.current.disconnect();
      } catch (e) {}
      sirenOscillatorRef.current = null;
    }
    sirenGainRef.current = null;
  };

  // Text to Speech
  const speakText = (text: string, id: string = 'global') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setActiveSpeechId(id);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onend = () => {
        setActiveSpeechId(null);
      };
      utterance.onerror = () => {
        setActiveSpeechId(null);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-speech is not supported in this browser.");
    }
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setActiveSpeechId(null);
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

  // Real-Time Background Notification Scheduler
  const lastCheckedTimeRef = useRef<string>('');

  useEffect(() => {
    if (!user) return;

    const checkReminders = async () => {
      const now = new Date();
      const hourStr = String(now.getHours()).padStart(2, '0');
      const minStr = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${hourStr}:${minStr}`;

      if (lastCheckedTimeRef.current === currentTime) {
        return; // Already checked this minute
      }
      lastCheckedTimeRef.current = currentTime;

      // Find matching schedule slots
      const matchingSlots = Object.keys(slotTimes).filter(
        slot => slotTimes[slot as keyof typeof slotTimes] === currentTime
      );

      if (matchingSlots.length === 0) return;

      matchingSlots.forEach(slot => {
        const medsToTake = medicines.filter(m => 
          m.timing.map(t => t.toLowerCase()).includes(slot.toLowerCase())
        );

        if (medsToTake.length === 0) return;

        medsToTake.forEach(med => {
          const title = `MedDNA Medication Alert`;
          const body = `It's time to take ${med.name} (${med.dosage}). Directions: ${med.instructions || 'Take with water'}`;
          
          // 1. Send Browser Notification
          if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
              body,
              icon: 'https://cdn-icons-png.flaticon.com/512/822/822143.png'
            });
          }

          // 2. Dispatch simulated email alert
          if (emailNotificationsEnabled) {
            fetch(`${API_BASE}/api/send-email-reminder`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.email,
                recipient: user.email,
                subject: `Medication Reminder: ${med.name}`,
                body
              })
            }).then(() => fetchEmailLogs());
          }
        });
      });
    };

    const timerId = setInterval(checkReminders, 15000); // Check every 15 seconds
    return () => clearInterval(timerId);
  }, [user, medicines, slotTimes, notificationsEnabled, emailNotificationsEnabled]);

  return (
    <MedContext.Provider value={{
      user,
      medicines,
      adherenceRecords,
      scanHistory,
      emailLogs,
      isScanning,
      scanResult,
      scanError,
      setScanError,
      notificationsEnabled,
      emailNotificationsEnabled,
      emergencyContact,
      sosTriggered,
      userCoordinates,
      activeSpeechId,
      interactionWarnings,
      slotTimes,
      updateSlotTime,
      language,
      setLanguage,
      t,
      login,
      logout,
      startScanning,
      cancelScanning,
      saveScannedMeds,
      addMedicine,
      removeMedicine,
      toggleDose,
      updateEmergencyContact,
      setNotificationsEnabled: handleSetNotificationsEnabled,
      setEmailNotificationsEnabled: handleSetEmailNotificationsEnabled,
      triggerSOS,
      resetSOS,
      speakText,
      stopSpeech,
      sendPushTest,
      deleteScanHistory,
      fetchEmailLogs,
      requestRefill,
      checkoutRefills
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
