const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const { OAuth2Client } = require('google-auth-library');

dotenv.config({ path: path.join(__dirname, '.env') });

const googleClientId = process.env.GOOGLE_CLIENT_ID;
let oauthClient;
if (googleClientId) {
  oauthClient = new OAuth2Client(googleClientId);
  console.log('🔒 Google Auth initialized with Client ID:', googleClientId);
} else {
  console.warn('⚠️ GOOGLE_CLIENT_ID not configured. Google Sign-In will run in fallback simulation mode.');
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Multer setup for handling file uploads (optional, we support base64 json body as well)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Connect to MongoDB
let isDbConnected = false;
const mongoUri = process.env.MONGO_URI;

if (mongoUri && !mongoUri.includes('<db_password>')) {
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('✅ Connected to MongoDB successfully.');
      isDbConnected = true;
    })
    .catch((err) => {
      console.warn('⚠️ MongoDB connection failed. Running in Memory fallback mode:', err.message);
    });
} else {
  console.warn('⚠️ MONGO_URI not configured or contains placeholder. Running in Memory fallback mode.');
}

// Schemas & Models
const MedicineSchema = new mongoose.Schema({
  userId: { type: String, default: 'anonymous' },
  name: String,
  dosage: String,
  timing: [String],
  instructions: String,
  duration: String,
  refillsLeft: Number,
  startDate: { type: Date, default: Date.now }
});

const AdherenceSchema = new mongoose.Schema({
  userId: { type: String, default: 'anonymous' },
  date: String, // YYYY-MM-DD
  records: mongoose.Schema.Types.Mixed // medId_timing -> { taken: boolean, takenAt: string }
});

const PrescriptionLogSchema = new mongoose.Schema({
  userId: { type: String, default: 'anonymous' },
  doctorName: String,
  specialty: String,
  date: String,
  rawText: String,
  extractedMeds: Array,
  createdAt: { type: Date, default: Date.now }
});

const MedicineInfoSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  category: String,
  uses: [String],
  sideEffects: [String],
  precautions: [String],
  interactions: [String],
  interactionNotes: mongoose.Schema.Types.Mixed // drugName -> details
});

const EmailLogSchema = new mongoose.Schema({
  userId: { type: String, default: 'anonymous' },
  recipient: String,
  subject: String,
  body: String,
  sentAt: { type: Date, default: Date.now }
});

const Medicine = mongoose.model('Medicine', MedicineSchema);
const Adherence = mongoose.model('Adherence', AdherenceSchema);
const PrescriptionLog = mongoose.model('PrescriptionLog', PrescriptionLogSchema);
const MedicineInfo = mongoose.model('MedicineInfo', MedicineInfoSchema);
const EmailLog = mongoose.model('EmailLog', EmailLogSchema);

// In-Memory fallback store
let localMedicineInfo = {}; // name -> details
let localEmailLogs = [];

// In-Memory fallback store
let localMedicines = [
  {
    id: 'med_01',
    name: 'Aspirin',
    dosage: '81mg',
    timing: ['morning'],
    instructions: 'Take with food to avoid stomach upset',
    duration: '30 days',
    refillsLeft: 2,
    startDate: new Date().toISOString()
  },
  {
    id: 'med_02',
    name: 'Lisinopril',
    dosage: '10mg',
    timing: ['evening'],
    instructions: 'Take at the same time each day before bed',
    duration: '90 days',
    refillsLeft: 3,
    startDate: new Date().toISOString()
  }
];

let localAdherence = {}; // date -> { medId_timing: { taken: boolean, takenAt: string } }
let localPrescriptionLogs = [];

// Helper to format mongoose object into client format
const formatMed = (mongooseMed) => {
  return {
    id: mongooseMed._id.toString(),
    name: mongooseMed.name,
    dosage: mongooseMed.dosage,
    timing: mongooseMed.timing,
    instructions: mongooseMed.instructions,
    duration: mongooseMed.duration,
    refillsLeft: mongooseMed.refillsLeft,
    startDate: mongooseMed.startDate
  };
};

// Helper function to detect non-medicine items (like hospital names, contact details, emails, physical addresses, etc.)
const isNonMedicine = (name) => {
  if (!name || typeof name !== 'string') return true;
  const clean = name.trim().toLowerCase();
  
  // Exclude empty or single-character names
  if (clean.length < 2) return true;
  
  // 1. Email address check
  if (clean.includes('@')) return true;
  
  // 2. URL check
  if (clean.includes('http://') || clean.includes('https://') || clean.includes('www.')) return true;
  
  // 3. Phone number check (looks like phone number or contains phone keywords)
  if (/\b(?:phone|tel|telephone|fax|mob|mobile|cell|contact)\b/i.test(clean)) return true;
  if (/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(clean)) return true;
  
  // 4. Clinical header/Institutional / Doctor checks
  if (/\b(?:hospital|clinic|medical center|pharmacy|specialty|department|dept|office|physician|prescriber|doctor|dentist|dds|md|dr)\b/i.test(clean)) return true;
  
  // 5. Physical Address checks (keywords like street/rd + digits)
  if (/\b(?:street|st|rd|road|ave|avenue|blvd|boulevard|lane|ln|drive|dr|suite|ste|floor|fl|zip|zipcode|p\.?o\.?\s*box)\b/i.test(clean)) {
    if (/\d+/.test(clean)) return true;
  }
  
  return false;
};

// Helper function to sanitize medication instructions (removes phone numbers, emails, URLs)
const sanitizeInstructions = (text) => {
  if (!text || typeof text !== 'string') return 'Take as directed';
  let clean = text.trim();
  
  // 1. Remove phone keywords and numbers (e.g. "Ph:++91 810811211", "tel: 123-456", "Phone: 555-1234")
  clean = clean.replace(/\b(?:phone|tel|telephone|fax|mob|mobile|cell|contact|ph\.?:?)\s*(?:\+*\d+[-.\s]*)+/ig, '');
  
  // 2. Remove standalone phone numbers
  clean = clean.replace(/(?:\+\+?\d{1,3}[-.\s]*)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '');
  clean = clean.replace(/(?:\+\+?\d{2}\s*)?\d{10}\b/g, '');
  
  // 3. Remove email addresses
  clean = clean.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '');
  
  // 4. Remove URLs
  clean = clean.replace(/\b(?:https?:\/\/|www\.)\S+/gi, '');
  
  // 5. Clean up multiple spaces and trailing punctuations
  clean = clean.replace(/\s+/g, ' ').trim();
  clean = clean.replace(/^[\s,.:;|-]+|[\s,.:;|-]+$/g, '').trim();
  
  if (clean.length === 0) {
    return 'Take as directed';
  }
  return clean;
};

// --- API ROUTES ---

// 0. Google Auth Verification Endpoint
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'No Google credential token provided.' });
  }

  try {
    if (googleClientId && oauthClient) {
      // Real verification
      const ticket = await oauthClient.verifyIdToken({
        idToken: credential,
        audience: googleClientId
      });
      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new Error('Google token payload is empty');
      }

      const userId = payload.sub;
      const email = payload.email;
      const name = payload.name;
      const picture = payload.picture;

      console.log(`✅ Google token verified for user: ${email}`);
      return res.json({
        success: true,
        user: {
          id: userId,
          email,
          name,
          avatar: picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop'
        }
      });
    } else {
      // Development Fallback mode: Decode token without verification, or mock response
      console.warn('⚠️ Google Auth running in fallback simulation mode (GOOGLE_CLIENT_ID is missing).');
      
      // Attempt to decode the JWT helper (so developers can still get user names/emails if they pass any mock JWT)
      try {
        const base64Url = credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(Buffer.from(base64, 'base64').toString().split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        return res.json({
          success: true,
          user: {
            id: payload.sub || 'mock_google_id_' + Date.now(),
            email: payload.email || 'developer@example.com',
            name: payload.name || 'Local Developer',
            avatar: payload.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop'
          }
        });
      } catch {
        // If it's not a valid JWT token, return a simulated user profile
        return res.json({
          success: true,
          user: {
            id: 'mock_google_id_' + Date.now(),
            email: 'alex.mercer@gmail.com',
            name: 'Alex Mercer',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop'
          }
        });
      }
    }
  } catch (error) {
    console.error('❌ Google Auth verification failed:', error.message);
    res.status(401).json({ error: 'Google Auth verification failed', message: error.message });
  }
});

// 1. OCR + LLM Parsing Endpoint
app.post('/api/scan-prescription', upload.single('image'), async (req, res) => {
  try {
    let rawText = '';
    const sampleId = req.body.sampleId;
    const language = req.body.language || 'en';

    if (sampleId && (sampleId === 'pres_01' || sampleId === 'pres_02')) {
      console.log(`Processing sample ${sampleId} direct parsing...`);
      if (sampleId === 'pres_01') {
        rawText = "Dr. Sarah Jenkins, MD\nCardiology Specialty\nDate: 2026-06-28\nRx:\n- Lisinopril 10mg: Take 1 tablet by mouth daily in the evening. Duration: 30 days. Refills: 3.\n- Atorvastatin 20mg: Take 1 tablet by mouth daily at bedtime. Duration: 30 days. Refills: 3.\n- Aspirin 81mg: Take 1 tablet daily. Duration: 30 days. Refills: 3.";
      } else {
        rawText = "Dr. Manuel Rivera, MD\nPediatrics Specialty\nDate: 2026-07-02\nRx:\n- Amoxicillin 500mg: Take 1 capsule three times daily for 10 days. Refills: 0.\n- Ibuprofen 400mg: Take 1 tablet every 6 hours as needed for fever/pain. Duration: 5 days. Refills: 0.";
      }
    } else {
      // ---- REAL OCR: Upload image to NVIDIA Nemotron-OCR-v2 ----
      let base64Image = '';
      if (req.file) {
        base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      } else if (req.body.image) {
        base64Image = req.body.image;
      } else {
        return res.status(400).json({ error: 'No prescription image provided.' });
      }

      console.log('Sending image to NVIDIA Nemotron-OCR-v2...');
      
      const ocrResponse = await fetch('https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-ocr-v2', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NVIDIA_OCR_KEY}`
        },
        body: JSON.stringify({
          input: [
            {
              type: 'image_url',
              url: base64Image
            }
          ]
        })
      });

      if (!ocrResponse.ok) {
        const errText = await ocrResponse.text();
        console.error('NVIDIA OCR Error:', errText);
        return res.status(502).json({ error: 'NVIDIA OCR NIM failed', details: errText });
      }

      const ocrData = await ocrResponse.json();
      console.log('NVIDIA OCR complete.');
      
      if (ocrData.text) {
        rawText = ocrData.text;
      } else if (ocrData.predictions && ocrData.predictions[0]) {
        rawText = ocrData.predictions[0].text;
      } else if (ocrData.choices && ocrData.choices[0]?.message?.content) {
        rawText = ocrData.choices[0].message.content;
      } else if (ocrData.data && Array.isArray(ocrData.data)) {
        rawText = ocrData.data
          .map(d => d.text_detections?.map(td => td.text_prediction?.text || '').join(' ') || '')
          .join('\n');
      } else {
        rawText = JSON.stringify(ocrData);
      }

      if (!rawText || rawText.trim().length === 0) {
        return res.status(422).json({ 
          error: 'OCR could not extract any text from the uploaded image. Please upload a clearer prescription image.',
          rawText: '' 
        });
      }
    }

    console.log('Extracted raw text length:', rawText.length);

    // Truncate very long OCR text to avoid LLM token overflow and malformed JSON
    const llmInputText = rawText.length > 3000 ? rawText.substring(0, 3000) + '\n[... text truncated ...]' : rawText;

    console.log('Sending text to NVIDIA Llama-3.3-70b-Instruct...');

    // 2. Call Llama to parse the OCR text into structured medicine data
    const llmResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NVIDIA_LLM_KEY}`
      },
      body: JSON.stringify({
        model: 'meta/llama-3.3-70b-instruct',
        messages: [
          {
            role: 'system',
            content: `You are a medical prescription parser. You receive raw OCR text extracted from a document image. Your job is to extract medications, dosages, doctor info, and instructions into a clean structured format.

CRITICAL RULES:
1. ONLY extract actual pharmaceutical medications (brand or generic drug names, e.g. "Lisinopril", "Amoxicillin", "Aspirin") in the "extractedMeds" list.
2. DO NOT include clinical or hospital names, clinics, physical addresses, email addresses, websites, telephone/fax numbers, patient registration details, or doctor contact info anywhere in the "extractedMeds" array.
3. The "name" field for each medicine MUST be ONLY the drug name (e.g., "Lisinopril", "Amoxicillin"). It must NEVER be a clinic name (e.g., "St. Jude Hospital", "Green City Clinic"), address, email, phone number, doctor name, signature line, or header. If a block of text does not represent a real pharmaceutical drug or medicine name, DO NOT include it in the "extractedMeds" array.
4. Clean the medicine "name" field by stripping out prefixes like "Tab.", "Tab:", "Tab", "Capsule", "Caps", "Cap.", "Cap", "Syr.", "Syrup" so that only the clean, proper medicine name is returned (e.g., "Tab. Augmentin" becomes "Augmentin", "Tab PPanD" becomes "PPanD", "Tab: Enzoflam" becomes "Enzoflam", "Hexigel gum paint" becomes "Hexigel").
5. The "dosage" field MUST contain only the strength or dosing unit (e.g., "10mg", "500mg", "1 tablet"). NEVER populate it with street addresses, phone numbers, email addresses, or clinic metadata.
6. The "instructions" field MUST only contain directions for taking the drug (e.g., "Take 1 tablet daily before bed", "with meals"). NEVER include clinic operating hours, general disclaimers, address details, phone numbers, or pharmacy location details in instructions.
7. The "timing" array MUST contain only one or more of: "morning", "afternoon", "evening", "night". Map Latin abbreviations (like QD, BID, TID, QID, QHS, 1-0-1, 1-1-1) to these slots correctly.
8. Extract medications even if the document contains non-standard medical headers (such as dental clinic letters, dental implants, ophthalmic clinics, skin/dermatology plans). Do not mark the document as "Not a prescription document" if it contains lists of recognizable medicines or drug instructions.
9. If there are absolutely no medications or doctor info present in the text, return an empty "extractedMeds" array and set "doctorName" to "Not a prescription document".
10. Output ONLY a valid JSON object. No markdown formatting, no explanations.
${language === 'bn' ? '11. IMPORTANT: Translate the "specialty", "instructions", and "duration" fields to Bangla (Bengali) language (e.g. translate "Take with food" to "খাবারের সাথে নিন", "7 days" to "৭ দিন"). Keep the "name" field in English or transliterated to Bangla, and keep "timing" values strictly in English.' : ''}

JSON schema:
{"doctorName":"string","specialty":"string","date":"YYYY-MM-DD","extractedMeds":[{"name":"string","dosage":"string","timing":["morning"],"instructions":"string","duration":"string","refillsLeft":0}]}`
          },
          {
            role: 'user',
            content: llmInputText
          }
        ],
        temperature: 0.1,
        max_tokens: 2048
      })
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      console.error('NVIDIA LLM Error:', errText);
      // Return raw OCR text even if LLM fails - user can still see what was scanned
      return res.json({
        rawText: rawText,
        doctorName: 'AI parsing unavailable',
        specialty: 'Unknown',
        date: new Date().toISOString().split('T')[0],
        extractedMeds: []
      });
    }

    const llmData = await llmResponse.json();
    console.log('NVIDIA LLM parsing complete.');

    let parsedResult;
    try {
      let content = llmData.choices[0].message.content.trim();
      // Extract JSON from between first { and last }
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        content = content.slice(firstBrace, lastBrace + 1);
      }
      parsedResult = JSON.parse(content);
    } catch (jsonErr) {
      console.error('JSON parse failed, returning raw OCR text. LLM output was:', llmData.choices[0].message.content);
      // Even if JSON parsing fails, return the raw OCR text so the user sees the scan worked
      parsedResult = {
        doctorName: 'Could not parse structure',
        specialty: 'Unknown',
        date: new Date().toISOString().split('T')[0],
        extractedMeds: []
      };
    }
    
    // Always attach raw text
    parsedResult.rawText = rawText;

    // Ensure extractedMeds exists and is an array
    if (!Array.isArray(parsedResult.extractedMeds)) {
      parsedResult.extractedMeds = [];
    }

    // Normalize and filter each med to ensure safety and precision
    parsedResult.extractedMeds = parsedResult.extractedMeds
      .filter(med => {
        // Discard any entries that are clearly not medications (e.g. hospital headers, contact info)
        return med && med.name && !isNonMedicine(med.name);
      })
      .map(med => {
        let dosage = med.dosage || 'As directed';
        let instructions = med.instructions || 'Take as directed';

        // Clean up dosage or instructions if they contain obvious contact info or address-like details
        if (isNonMedicine(dosage)) {
          dosage = 'As directed';
        }
        
        // Sanitize instructions to strip out phone numbers, URLs, emails
        instructions = sanitizeInstructions(instructions);

        return {
          name: med.name.trim(),
          dosage: dosage.trim(),
          timing: Array.isArray(med.timing) ? med.timing : ['morning'],
          instructions: instructions.trim(),
          duration: med.duration || '7 days',
          refillsLeft: typeof med.refillsLeft === 'number' ? med.refillsLeft : 0
        };
      });

    // Save to Database or Memory
    try {
      if (isDbConnected) {
        const log = new PrescriptionLog({
          userId: req.body.userId || 'anonymous',
          doctorName: parsedResult.doctorName || 'Unknown',
          specialty: parsedResult.specialty || 'General',
          date: parsedResult.date || new Date().toISOString().split('T')[0],
          rawText: rawText,
          extractedMeds: parsedResult.extractedMeds
        });
        await log.save();
      } else {
        localPrescriptionLogs.push({
          id: 'log_' + Date.now(),
          ...parsedResult
        });
      }
    } catch (dbErr) {
      console.error('Failed to save prescription log:', dbErr.message);
    }

    res.json(parsedResult);
  } catch (error) {
    console.error('OCR Pipeline Server Error:', error);
    res.status(500).json({ error: 'OCR scan failed', message: error.message });
  }
});

// 2. Fetch all active medicines
app.get('/api/medicines', async (req, res) => {
  const userId = req.query.userId || 'anonymous';
  try {
    if (isDbConnected) {
      const meds = await Medicine.find({ userId });
      res.json(meds.map(formatMed));
    } else {
      res.json(localMedicines);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Add a medicine manually
app.post('/api/medicines', async (req, res) => {
  const { name, dosage, timing, instructions, duration, refillsLeft, userId } = req.body;
  try {
    if (isDbConnected) {
      const newMed = new Medicine({
        userId: userId || 'anonymous',
        name,
        dosage,
        timing,
        instructions,
        duration,
        refillsLeft
      });
      const saved = await newMed.save();
      res.json(formatMed(saved));
    } else {
      const mockMed = {
        id: 'med_' + Date.now(),
        name,
        dosage,
        timing,
        instructions,
        duration,
        refillsLeft,
        startDate: new Date().toISOString()
      };
      localMedicines.push(mockMed);
      res.json(mockMed);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Delete a medicine
app.delete('/api/medicines/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (isDbConnected) {
      await Medicine.findByIdAndDelete(id);
      res.json({ success: true });
    } else {
      localMedicines = localMedicines.filter(m => m.id !== id);
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get Adherence Logs
app.get('/api/adherence', async (req, res) => {
  const userId = req.query.userId || 'anonymous';
  try {
    if (isDbConnected) {
      const logs = await Adherence.find({ userId });
      const recordMap = {};
      logs.forEach(log => {
        recordMap[log.date] = log.records;
      });
      res.json(recordMap);
    } else {
      res.json(localAdherence);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Toggle Dose Check-off
app.post('/api/adherence/toggle', async (req, res) => {
  const { date, medId, timing, userId } = req.body;
  const key = `${medId}_${timing}`;

  try {
    if (isDbConnected) {
      let record = await Adherence.findOne({ userId: userId || 'anonymous', date });
      if (!record) {
        record = new Adherence({
          userId: userId || 'anonymous',
          date,
          records: {}
        });
      }
      
      const currentVal = record.records[key] || { taken: false };
      const nextTaken = !currentVal.taken;
      
      const updatedRecords = { ...record.records };
      if (nextTaken) {
        updatedRecords[key] = {
          taken: true,
          takenAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
      } else {
        delete updatedRecords[key];
      }

      record.records = updatedRecords;
      // Mark as modified so mongoose saves the mixed type
      record.markModified('records');
      await record.save();
      
      res.json({ success: true, records: updatedRecords });
    } else {
      if (!localAdherence[date]) {
        localAdherence[date] = {};
      }
      
      const currentVal = localAdherence[date][key] || { taken: false };
      const nextTaken = !currentVal.taken;
      
      if (nextTaken) {
        localAdherence[date][key] = {
          taken: true,
          takenAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
      } else {
        delete localAdherence[date][key];
      }
      
      res.json({ success: true, records: localAdherence[date] });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Fetch prescription scan history
app.get('/api/prescriptions', async (req, res) => {
  const userId = req.query.userId || 'anonymous';
  try {
    if (isDbConnected) {
      const logs = await PrescriptionLog.find({ userId }).sort({ createdAt: -1 });
      res.json(logs);
    } else {
      res.json(localPrescriptionLogs);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Delete a prescription log
app.delete('/api/prescriptions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (isDbConnected) {
      await PrescriptionLog.findByIdAndDelete(id);
      res.json({ success: true });
    } else {
      localPrescriptionLogs = localPrescriptionLogs.filter(log => log.id !== id);
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Fetch dynamic AI safety profile for a medicine
app.get('/api/medicine-info', async (req, res) => {
  const name = req.query.name;
  if (!name) {
    return res.status(400).json({ error: 'Medicine name is required.' });
  }

  // Capitalize name
  const cleanName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

  try {
    let info = null;
    if (isDbConnected) {
      info = await MedicineInfo.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
    } else {
      info = localMedicineInfo[cleanName.toLowerCase()];
    }

    if (info) {
      return res.json(info);
    }

    // Not found, fetch from Llama NIM
    console.log(`Safety profile for ${cleanName} not found in cache. Querying Llama NIM...`);
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NVIDIA_LLM_KEY}`
      },
      body: JSON.stringify({
        model: 'meta/llama-3.3-70b-instruct',
        messages: [
          {
            role: 'system',
            content: `You are an expert clinical pharmacologist. Generate a detailed safety profile for the requested medicine.
Output ONLY a valid JSON object matching the following schema, without markdown formatting or other text:
{
  "name": "Medicine Name",
  "category": "e.g. Antibiotic, Antidiabetic, NSAID",
  "uses": ["primary use 1", "primary use 2"],
  "sideEffects": ["common side effect 1", "common side effect 2"],
  "precautions": ["precaution 1", "precaution 2"],
  "interactions": ["interacting_drug_1", "interacting_drug_2"],
  "interactionNotes": {
    "interacting_drug_1": "detailed description of the interaction risk with drug 1",
    "interacting_drug_2": "detailed description of the interaction risk with drug 2"
  }
}`
          },
          {
            role: 'user',
            content: cleanName
          }
        ],
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      throw new Error(`Llama NIM API returned ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      content = content.slice(firstBrace, lastBrace + 1);
    }
    const parsedInfo = JSON.parse(content);

    // Save to Database or Memory
    if (isDbConnected) {
      const newInfo = new MedicineInfo(parsedInfo);
      await newInfo.save();
    } else {
      localMedicineInfo[cleanName.toLowerCase()] = parsedInfo;
    }

    res.json(parsedInfo);
  } catch (error) {
    console.error(`Failed to load AI safety profile for ${cleanName}:`, error);
    res.status(500).json({ error: 'AI Safety Profile generator failed', message: error.message });
  }
});

// 10. Check for interactions among active medicines
app.post('/api/check-interactions', async (req, res) => {
  const { medicines } = req.body;
  if (!medicines || !Array.isArray(medicines) || medicines.length < 2) {
    return res.json([]);
  }

  try {
    console.log(`Checking drug interactions for: ${medicines.join(', ')}`);
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NVIDIA_LLM_KEY}`
      },
      body: JSON.stringify({
        model: 'meta/llama-3.3-70b-instruct',
        messages: [
          {
            role: 'system',
            content: `You are an expert clinical pharmacologist. Analyze the list of active medicines provided by the user. Identify any clinically significant drug-to-drug interactions.
Output ONLY a valid JSON array matching the following schema, without markdown formatting or other text. If there are no interactions, output an empty array [].
[
  {
    "medA": "First drug name",
    "medB": "Second drug name",
    "note": "Detailed description of the interaction risk and recommendations"
  }
]`
          },
          {
            role: 'user',
            content: JSON.stringify(medicines)
          }
        ],
        temperature: 0.1,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      throw new Error(`Llama NIM API returned ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    const firstIdx = Math.min(
      content.indexOf('{') !== -1 ? content.indexOf('{') : Infinity,
      content.indexOf('[') !== -1 ? content.indexOf('[') : Infinity
    );
    const lastIdx = Math.max(
      content.lastIndexOf('}'),
      content.lastIndexOf(']')
    );
    if (firstIdx !== Infinity && lastIdx !== -1 && firstIdx < lastIdx) {
      content = content.slice(firstIdx, lastIdx + 1);
    }
    const warnings = JSON.parse(content);
    res.json(warnings);
  } catch (error) {
    console.error('Failed to run drug interaction checks:', error);
    res.status(500).json({ error: 'Interaction check failed', message: error.message });
  }
});

// 11. Log simulated email reminder
app.post('/api/send-email-reminder', async (req, res) => {
  const { userId, recipient, subject, body } = req.body;
  try {
    if (isDbConnected) {
      const emailLog = new EmailLog({
        userId: userId || 'anonymous',
        recipient,
        subject,
        body
      });
      await emailLog.save();
    } else {
      localEmailLogs.push({
        id: 'email_' + Date.now(),
        userId: userId || 'anonymous',
        recipient,
        subject,
        body,
        sentAt: new Date().toISOString()
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Fetch email logs
app.get('/api/email-logs', async (req, res) => {
  const userId = req.query.userId || 'anonymous';
  try {
    if (isDbConnected) {
      const logs = await EmailLog.find({ userId }).sort({ sentAt: -1 });
      res.json(logs);
    } else {
      res.json(localEmailLogs.filter(log => log.userId === userId));
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. AI Health Guide Chat Endpoint (strictly limited to health and medicine)
app.post('/api/chat-guide', async (req, res) => {
  const { messages, language } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required.' });
  }

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NVIDIA_LLM_KEY}`
      },
      body: JSON.stringify({
        model: 'meta/llama-3.3-70b-instruct',
        messages: [
          {
            role: 'system',
            content: `You are MedDNA AI, a highly professional clinical health and medicine assistant. You are strictly restricted to guiding the user on medicine, health, prescription guidelines, wellness, and medical instructions. If the user asks about ANY topic unrelated to medicine, health, biology, or healthcare (such as coding, general knowledge, sports, history, business, entertainment, etc.), you must politely decline to answer and remind them that you are only qualified to assist with medical and health-related topics. Keep your answers concise, clear, and informative.
${language === 'bn' ? 'IMPORTANT: You must respond and communicate strictly in Bangla (Bengali) language. Translate all explanations, advice, and responses to Bangla. If declining non-medical queries, you must decline in Bangla (e.g. "দুঃখিত, আমি কেবল চিকিৎসা এবং/অথবা স্বাস্থ্য-সম্পর্কিত বিষয়ে সাহায্য করতে পারি।").' : ''}`
          },
          ...messages
        ],
        temperature: 0.2,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('NVIDIA Chat Guide Error:', errText);
      return res.status(502).json({ error: 'NVIDIA Llama NIM failed', details: errText });
    }

    const data = await response.json();
    res.json({ reply: data.choices[0].message.content });
  } catch (error) {
    console.error('Failed to run AI Chat Guide:', error);
    res.status(500).json({ error: 'AI Chat Guide failed', message: error.message });
  }
});

// Serve static assets in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback all other routes to React index.html (React Router Support) or a clean API status check
app.get(/.*/, (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ status: "online", service: "MED DNA API Service" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 MedDNA API Service listening on port ${PORT}`);
});
