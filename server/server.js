const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const { OAuth2Client } = require('google-auth-library');
const pdfParse = require('pdf-parse');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: false });

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
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || '30mb';
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 25);
const OCR_TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS || 45000);
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 60000);
const LLM_MODEL = process.env.NVIDIA_LLM_MODEL || 'meta/llama-3.1-8b-instruct';
const ALLOWED_TIMINGS = ['morning', 'afternoon', 'evening', 'night'];

app.use(compression());
app.use(cors());
app.use(express.json({ limit: JSON_BODY_LIMIT }));

// Multer setup for handling file uploads (optional, we support base64 json body as well)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_MB * 1024 * 1024
  }
});

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
  patientName: String,
  specialty: String,
  date: String,
  documentType: String,
  ocrEngine: String,
  ocrConfidence: Number,
  aiConfidence: Number,
  quality: mongoose.Schema.Types.Mixed,
  warnings: [String],
  contextSummary: String,
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

const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

const normalizeWhitespace = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const uniqueValues = (values) => [...new Set(values.filter(Boolean))];

const fetchWithTimeout = async (url, options, timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const parseDataUrl = (dataUrl) => {
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/i.exec(dataUrl || '');
  if (!match) {
    return {
      mimeType: 'application/octet-stream',
      buffer: Buffer.from(dataUrl || '', 'base64'),
      dataUrl
    };
  }

  const mimeType = (match[1] || 'application/octet-stream').toLowerCase();
  const body = match[3] || '';
  const buffer = match[2]
    ? Buffer.from(body, 'base64')
    : Buffer.from(decodeURIComponent(body), 'utf8');

  return { mimeType, buffer, dataUrl };
};

const getUploadedDocument = (req) => {
  const files = req.files
    ? Object.values(req.files).flat()
    : req.file
      ? [req.file]
      : [];
  const uploaded = files.find(Boolean);

  if (uploaded) {
    return {
      mimeType: (uploaded.mimetype || 'application/octet-stream').toLowerCase(),
      filename: uploaded.originalname || 'upload',
      size: uploaded.size || uploaded.buffer?.length || 0,
      buffer: uploaded.buffer,
      dataUrl: `data:${uploaded.mimetype || 'application/octet-stream'};base64,${uploaded.buffer.toString('base64')}`
    };
  }

  const dataUrl = req.body.image || req.body.document || req.body.file;
  if (!dataUrl) return null;

  const parsed = parseDataUrl(dataUrl);
  return {
    ...parsed,
    filename: req.body.filename || 'base64-upload',
    size: parsed.buffer?.length || 0
  };
};

const isPdfDocument = (documentInput) => {
  if (!documentInput) return false;
  if (documentInput.mimeType === 'application/pdf') return true;
  if (documentInput.filename && /\.pdf$/i.test(documentInput.filename)) return true;
  return documentInput.buffer?.slice(0, 4).toString('utf8') === '%PDF';
};

const extractPdfTextLayer = async (documentInput) => {
  try {
    const result = await pdfParse(documentInput.buffer);
    const text = normalizeWhitespace(result?.text || '');
    return {
      text,
      engine: 'pdf-text-layer',
      pageCount: result?.numpages || 1,
      confidences: text ? [0.92] : []
    };
  } catch (err) {
    console.error('PDF text layer extraction failed:', err);
    throw err;
  }
};

const TEXT_KEYS = new Set([
  'text',
  'content',
  'markdown',
  'plain_text',
  'ocr_text',
  'detected_text',
  'transcript',
  'recognized_text',
  'value'
]);

const CONFIDENCE_KEYS = new Set([
  'confidence',
  'score',
  'probability',
  'text_confidence',
  'ocr_confidence'
]);

const collectOcrTextFragments = (value, fragments = [], seen = new WeakSet()) => {
  if (!value || typeof value !== 'object') return fragments;
  if (seen.has(value)) return fragments;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item) => collectOcrTextFragments(item, fragments, seen));
    return fragments;
  }

  Object.entries(value).forEach(([key, child]) => {
    const normalizedKey = key.toLowerCase();
    if (typeof child === 'string' && TEXT_KEYS.has(normalizedKey)) {
      const text = normalizeWhitespace(child);
      if (text.length > 1) fragments.push(text);
      return;
    }

    if (child && typeof child === 'object') {
      collectOcrTextFragments(child, fragments, seen);
    }
  });

  return fragments;
};

const collectOcrConfidences = (value, scores = [], seen = new WeakSet()) => {
  if (!value || typeof value !== 'object') return scores;
  if (seen.has(value)) return scores;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item) => collectOcrConfidences(item, scores, seen));
    return scores;
  }

  Object.entries(value).forEach(([key, child]) => {
    const normalizedKey = key.toLowerCase();
    if (CONFIDENCE_KEYS.has(normalizedKey) && (typeof child === 'number' || typeof child === 'string')) {
      const parsed = Number(child);
      if (Number.isFinite(parsed)) {
        scores.push(parsed > 1 ? clamp01(parsed / 100) : clamp01(parsed));
      }
      return;
    }

    if (child && typeof child === 'object') {
      collectOcrConfidences(child, scores, seen);
    }
  });

  return scores;
};

const dedupeFragments = (fragments) => {
  const seen = new Set();
  return fragments.filter((fragment) => {
    const key = fragment.toLowerCase().replace(/\s+/g, ' ').slice(0, 500);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const extractTextFromOcrData = (ocrData) => {
  const priorityFragments = [];

  if (ocrData?.text) priorityFragments.push(ocrData.text);
  if (ocrData?.predictions?.[0]?.text) priorityFragments.push(ocrData.predictions[0].text);
  if (ocrData?.choices?.[0]?.message?.content) priorityFragments.push(ocrData.choices[0].message.content);
  if (Array.isArray(ocrData?.data)) {
    ocrData.data.forEach((entry) => {
      const detections = entry?.text_detections || entry?.detections || [];
      if (Array.isArray(detections)) {
        priorityFragments.push(
          detections
            .map((detection) => detection?.text_prediction?.text || detection?.text || '')
            .filter(Boolean)
            .join(' ')
        );
      }
    });
  }

  const genericFragments = collectOcrTextFragments(ocrData);
  const text = normalizeWhitespace(dedupeFragments([...priorityFragments, ...genericFragments]).join('\n'));

  return {
    text,
    confidences: collectOcrConfidences(ocrData)
  };
};

const runNemotronOcr = async (documentInput) => {
  if (!process.env.NVIDIA_OCR_KEY || process.env.NVIDIA_OCR_KEY.includes('your_')) {
    throw new Error('NVIDIA_OCR_KEY is not configured on the server.');
  }

  const ocrResponse = await fetchWithTimeout('https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-ocr-v2', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.NVIDIA_OCR_KEY}`
    },
    body: JSON.stringify({
      input: [
        {
          type: 'image_url',
          url: documentInput.dataUrl
        }
      ]
    })
  }, OCR_TIMEOUT_MS);

  if (!ocrResponse.ok) {
    const errText = await ocrResponse.text();
    throw new Error(`NVIDIA OCR NIM failed: ${errText}`);
  }

  const ocrData = await ocrResponse.json();
  const extracted = extractTextFromOcrData(ocrData);
  return {
    ...extracted,
    engine: 'nvidia-nemotron-ocr-v2'
  };
};

const computeOcrQuality = (rawText, confidences = [], sourceType = 'image') => {
  const text = normalizeWhitespace(rawText);
  const characterCount = text.length;
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const alphaNumericCount = (text.match(/[a-z0-9]/gi) || []).length;
  const alphaNumericRatio = characterCount ? alphaNumericCount / characterCount : 0;
  const medicationSignalCount = (text.match(/\b(?:rx|tab|tablet|cap|capsule|syr|inj|mg|mcg|ml|days?|weeks?|bd|bid|tid|tds|qid|qhs|od|1\s*[-/]\s*0\s*[-/]\s*1)\b/gi) || []).length;
  const avgConfidence = confidences.length
    ? confidences.reduce((sum, score) => sum + score, 0) / confidences.length
    : Math.min(0.94, 0.35 + Math.min(characterCount / 1200, 0.35) + Math.min(medicationSignalCount / 12, 0.24));
  const warnings = [];

  if (characterCount < 40) warnings.push('Very little text was detected. Try a clearer, flatter image.');
  if (alphaNumericRatio < 0.45 && characterCount > 0) warnings.push('OCR text contains heavy noise or handwriting artifacts.');
  if (medicationSignalCount === 0) warnings.push('No strong medication shorthand was detected in OCR text.');
  if (sourceType === 'pdf' && characterCount < 80) warnings.push('PDF text layer was sparse; scanned PDFs may require image OCR.');

  return {
    characterCount,
    lineCount: lines.length,
    medicationSignalCount,
    confidence: Number((clamp01(avgConfidence) * 100).toFixed(1)),
    likelyPrescription: medicationSignalCount > 0 || /\brx\b/i.test(text),
    warnings
  };
};

const detectDocumentType = (text, mimeType) => {
  const clean = (text || '').toLowerCase();
  if (/\b(rx|tab|tablet|cap|capsule|syr|inj|mg|mcg|ml|1\s*[-/]\s*0\s*[-/]\s*1)\b/.test(clean)) {
    if (/\b(dental|dentist|teeth|gum|implant|oral)\b/.test(clean)) return 'dental prescription';
    return 'prescription';
  }
  if (/\b(lab|laboratory|pathology|cbc|hemoglobin|glucose|cholesterol)\b/.test(clean)) return 'lab report';
  if (mimeType === 'application/pdf') return 'medical document';
  return 'image document';
};

const parseJsonObjectFromText = (content) => {
  if (!content || typeof content !== 'string') {
    throw new Error('LLM returned empty content.');
  }

  let cleaned = content
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
      return JSON.parse(cleaned);
    }
    throw new Error('LLM output did not contain a valid JSON object.');
  }
};

const buildPrescriptionParserPrompt = (language) => `You are MedDNA's clinical document intelligence engine. Extract structured data from OCR text with special attention to handwritten prescriptions.

Rules:
1. Extract only real medicines, drug brands, generics, formulations, gels, mouthwashes, drops, injections, or topical dental medicines into extractedMeds.
2. Never put clinic names, doctor names, patient names, phone numbers, emails, websites, addresses, social handles, services, headers, signatures, or dates inside extractedMeds.
3. Preserve uncertainty by using confidence values from 0 to 1 and short evidence snippets from the OCR text.
4. Clean medicine names by removing prefixes like Tab, Tablet, Cap, Capsule, Syr, Inj, Drops, Adv, Rx. Remove dosage from name and place it in dosage.
5. Parse schedules: 1-0-1 means morning and night; 1-0-0 morning; 0-1-0 afternoon; 0-0-1 night; 1-1-1 morning, afternoon, night; BID/BD twice daily; TID/TDS three times daily; QID four times daily; QHS/HS bedtime/night; OD daily.
6. Meal context written beside a brace applies to the medicines grouped by that brace. Keep before meals/after meals in instructions.
7. Dental prescriptions are valid prescriptions. Examples: Augmentin, Enzoflam, Pan-D, Hexigel gum paint.
8. If no medicines are present, return an empty extractedMeds array and explain that in warnings.
9. Output one valid JSON object only.
${language === 'bn' ? '10. Translate specialty, contextSummary, instructions, duration, and warnings into Bengali. Keep medicine names in English or common transliteration and keep timing values in English.' : ''}

Schema:
{
  "doctorName": "string",
  "patientName": "string",
  "specialty": "string",
  "date": "YYYY-MM-DD",
  "documentType": "string",
  "contextSummary": "string",
  "aiConfidence": 0.0,
  "warnings": ["string"],
  "extractedMeds": [
    {
      "name": "string",
      "dosage": "string",
      "timing": ["morning"],
      "instructions": "string",
      "duration": "string",
      "refillsLeft": 0,
      "confidence": 0.0,
      "evidence": "short source snippet"
    }
  ]
}`;

const repairJsonWithLlm = async (badContent) => {
  if (!process.env.NVIDIA_LLM_KEY || process.env.NVIDIA_LLM_KEY.includes('your_')) {
    throw new Error('NVIDIA_LLM_KEY is not configured on the server.');
  }

  const response = await fetchWithTimeout('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.NVIDIA_LLM_KEY}`
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Repair the following response into one valid JSON object only. Do not add markdown or commentary.'
        },
        {
          role: 'user',
          content: badContent.slice(0, 6000)
        }
      ],
      temperature: 0,
      max_tokens: 2048
    })
  }, LLM_TIMEOUT_MS);

  if (!response.ok) {
    throw new Error(`JSON repair failed: ${await response.text()}`);
  }

  const data = await response.json();
  return parseJsonObjectFromText(data.choices?.[0]?.message?.content || '');
};

const parsePrescriptionWithLlm = async ({ rawText, language, documentProfile, candidates }) => {
  if (!process.env.NVIDIA_LLM_KEY || process.env.NVIDIA_LLM_KEY.includes('your_')) {
    return {
      parsed: {
        doctorName: 'AI parsing unavailable',
        specialty: 'Unknown',
        date: new Date().toISOString().split('T')[0],
        documentType: documentProfile.documentType,
        contextSummary: 'LLM parsing skipped because NVIDIA_LLM_KEY is not configured.',
        aiConfidence: 0,
        warnings: ['NVIDIA_LLM_KEY is not configured on the server.'],
        extractedMeds: []
      },
      llmWarning: 'NVIDIA_LLM_KEY is not configured on the server.'
    };
  }

  const llmInput = JSON.stringify({
    documentProfile,
    deterministicMedicineCandidates: candidates.slice(0, 20),
    rawOcrText: rawText.slice(0, 12000)
  }, null, 2);

  const response = await fetchWithTimeout('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.NVIDIA_LLM_KEY}`
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        {
          role: 'system',
          content: buildPrescriptionParserPrompt(language)
        },
        {
          role: 'user',
          content: llmInput
        }
      ],
      temperature: 0.05,
      max_tokens: 3072
    })
  }, LLM_TIMEOUT_MS);

  if (!response.ok) {
    throw new Error(`NVIDIA LLM failed: ${await response.text()}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  try {
    return { parsed: parseJsonObjectFromText(content) };
  } catch (parseErr) {
    console.warn('Initial LLM JSON parse failed, trying repair:', parseErr.message);
    return { parsed: await repairJsonWithLlm(content) };
  }
};

const normalizeMedicineName = (name) => {
  if (!name || typeof name !== 'string') return '';
  let clean = name
    .replace(/\b(?:tab(?:let)?|cap(?:sule)?|syr(?:up)?|inj(?:ection)?|drops?|adv(?:ice)?|rx)\.?\s*[:.-]?\s*/ig, '')
    .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?|%)\b/ig, '')
    .replace(/\b(?:gum\s+paint|massage|before\s+meals?|after\s+meals?|with\s+meals?|x\s*\d+\s*(?:days?|weeks?|months?))\b/ig, '')
    .replace(/\b(?:take|apply|tablet|capsule|daily|days?|weeks?|morning|afternoon|evening|night)\b/ig, '')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/^[\s,.:;|/\\-]+|[\s,.:;|/\\-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  clean = clean.replace(/\bpan\s*[- ]\s*d\b/i, 'Pan-D');
  return clean;
};

const extractDosage = (text) => {
  if (!text || typeof text !== 'string') return '';
  const match = text.match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?|%)\b/i);
  return match ? match[0].replace(/\s+/g, '') : '';
};

const inferDuration = (text) => {
  if (!text || typeof text !== 'string') return '';
  const match = text.match(/\b(?:x|for|duration\s*:?)\s*(\d+\s*(?:days?|weeks?|months?))\b/i)
    || text.match(/\b(\d+\s*(?:days?|weeks?|months?))\b/i);
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
};

const normalizeTimings = (timing, evidenceText = '') => {
  const existing = Array.isArray(timing)
    ? timing.map((item) => String(item).toLowerCase()).filter((item) => ALLOWED_TIMINGS.includes(item))
    : [];
  const text = String(evidenceText || '').toLowerCase();
  const inferred = new Set();

  if (/\b1\s*[-/]\s*0\s*[-/]\s*1\b/.test(text)) {
    inferred.add('morning');
    inferred.add('night');
  }
  if (/\b1\s*[-/]\s*0\s*[-/]\s*0\b/.test(text)) inferred.add('morning');
  if (/\b0\s*[-/]\s*1\s*[-/]\s*0\b/.test(text)) inferred.add('afternoon');
  if (/\b0\s*[-/]\s*0\s*[-/]\s*1\b/.test(text)) inferred.add('night');
  if (/\b1\s*[-/]\s*1\s*[-/]\s*1\b/.test(text) || /\b(?:tid|tds|three times|thrice)\b/.test(text)) {
    inferred.add('morning');
    inferred.add('afternoon');
    inferred.add('night');
  }
  if (/\b(?:bid|bd|twice)\b/.test(text)) {
    inferred.add('morning');
    inferred.add('night');
  }
  if (/\b(?:qid|qds|four times)\b/.test(text)) {
    ALLOWED_TIMINGS.forEach((slot) => inferred.add(slot));
  }
  if (/\b(?:qhs|hs|bedtime|night)\b/.test(text)) inferred.add('night');
  if (/\b(?:morning|breakfast|qam|am)\b/.test(text)) inferred.add('morning');
  if (/\b(?:afternoon|lunch|noon)\b/.test(text)) inferred.add('afternoon');
  if (/\b(?:evening|dinner|supper|pm)\b/.test(text)) inferred.add('evening');

  const normalized = uniqueValues([...existing, ...inferred])
    .filter((slot) => ALLOWED_TIMINGS.includes(slot))
    .slice(0, 4);

  return normalized.length ? normalized : ['morning'];
};

const inferInstructions = (text, medicineName = '') => {
  const source = `${text || ''} ${medicineName || ''}`.toLowerCase();
  const instructions = [];

  if (/\bafter\s+meals?\b/.test(source)) instructions.push('after meals');
  if (/\bbefore\s+meals?\b/.test(source)) instructions.push('before meals');
  if (/\bwith\s+(?:food|meals?)\b/.test(source)) instructions.push('with food');
  if (/\b(?:prn|sos|as needed)\b/.test(source)) instructions.push('as needed');
  if (/\b(?:gum\s+paint|hexigel|massage)\b/.test(source)) instructions.push('apply to gums and gently massage');

  return uniqueValues(instructions).join('; ') || 'Take as directed';
};

const isLikelyMedicineName = (name) => {
  const clean = normalizeMedicineName(name).toLowerCase();
  if (!clean || isNonMedicine(clean)) return false;
  if (!/[a-z]/i.test(clean)) return false;
  if (/^(rx|adv|advice|date|patient|name|age|male|female|signature|sign|web|email)$/i.test(clean)) return false;
  if (/\b(?:smile|designing|whitening|implant|dentistry|clinic|hospital|doctor|dentist|meals?|days?|weeks?|phone|mobile)\b/i.test(clean)) return false;
  return clean.split(/\s+/).length <= 5;
};

const parseMedicineTail = (tail, sourceLine, inheritedContext = '') => {
  const cleanTail = normalizeWhitespace(tail);
  if (!cleanTail) return null;

  const dosage = extractDosage(cleanTail);
  const dosageIndex = dosage ? cleanTail.toLowerCase().indexOf(dosage.toLowerCase()) : -1;
  let namePart = dosageIndex > 0 ? cleanTail.slice(0, dosageIndex) : cleanTail;
  const stopIndex = namePart.search(/\b(?:\d+\s*[-/]\s*\d|x\s*\d|for\s+\d|after|before|with|daily|od|bd|bid|tid|tds|qid|qhs|sos|prn)\b/i);
  if (stopIndex > 0) namePart = namePart.slice(0, stopIndex);

  const name = normalizeMedicineName(namePart);
  if (!isLikelyMedicineName(name)) return null;

  const evidence = normalizeWhitespace(`${inheritedContext} ${sourceLine}`);
  const topicalDosage = /\b(?:gum\s+paint|gel|cream|ointment|mouthwash)\b/i.test(cleanTail)
    ? (cleanTail.match(/\b(?:gum\s+paint|gel|cream|ointment|mouthwash)\b/i)?.[0] || '')
    : '';

  return {
    name,
    dosage: dosage || topicalDosage || 'As directed',
    timing: normalizeTimings([], evidence),
    instructions: inferInstructions(evidence, name),
    duration: inferDuration(evidence) || 'As directed',
    refillsLeft: 0,
    confidence: 0.72,
    evidence,
    source: 'heuristic'
  };
};

const extractHeuristicMedicines = (rawText) => {
  const normalized = normalizeWhitespace(rawText)
    .replace(/[|;]/g, '\n')
    .replace(/\b(?=(?:Tab|Tablet|Cap|Capsule|Syr|Syrup|Inj|Injection|Drops|Gel|Cream|Ointment|Mouthwash|Adv)\.?\s)/gi, '\n');
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const meds = [];
  let mealContext = '';

  lines.forEach((line) => {
    if (/\bafter\s+meals?\b/i.test(line)) mealContext = 'after meals';
    if (/\bbefore\s+meals?\b/i.test(line)) mealContext = 'before meals';

    const formMatch = line.match(/\b(?:tab(?:let)?|cap(?:sule)?|syr(?:up)?|inj(?:ection)?|drops?|gel|cream|ointment|mouthwash)\.?\s*[:.-]?\s*(.+)$/i);
    if (formMatch) {
      const parsed = parseMedicineTail(formMatch[1], line, mealContext);
      if (parsed) meds.push(parsed);
    }

    const topicalMatch = line.match(/\b(?:adv(?:ice)?\.?\s*[:.-]?\s*)?([A-Z][A-Za-z0-9-]{2,})\s+(gum\s+paint|mouthwash|gel|cream|ointment)\b/i);
    if (topicalMatch) {
      const parsed = parseMedicineTail(`${topicalMatch[1]} ${topicalMatch[2]}`, line, mealContext);
      if (parsed) meds.push(parsed);
    }
  });

  const byName = new Map();
  meds.forEach((med) => {
    const key = med.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, med);
  });
  return [...byName.values()];
};

const normalizeMedicineRecord = (med) => {
  if (!med || !med.name) return null;
  const evidence = normalizeWhitespace([med.evidence, med.sourceLine, med.instructions, med.duration, med.dosage].filter(Boolean).join(' '));
  let name = normalizeMedicineName(med.name);
  const dosageFromName = extractDosage(med.name);

  if (!isLikelyMedicineName(name)) return null;

  let dosage = med.dosage || dosageFromName || extractDosage(evidence) || 'As directed';
  if (isNonMedicine(dosage)) dosage = 'As directed';
  dosage = String(dosage).replace(/\s+/g, '').replace(/^Asdirected$/i, 'As directed');

  const duration = med.duration && !isNonMedicine(med.duration)
    ? med.duration
    : inferDuration(evidence) || 'As directed';
  const instructions = sanitizeInstructions(
    med.instructions && med.instructions !== 'Take as directed'
      ? med.instructions
      : inferInstructions(evidence, name)
  );

  return {
    name,
    dosage,
    timing: normalizeTimings(med.timing, evidence),
    instructions,
    duration,
    refillsLeft: typeof med.refillsLeft === 'number' ? med.refillsLeft : 0,
    confidence: typeof med.confidence === 'number' ? clamp01(med.confidence) : undefined,
    evidence: med.evidence || med.sourceLine || undefined
  };
};

const mergeMedicineLists = (llmMeds = [], heuristicMeds = []) => {
  const merged = new Map();

  [...llmMeds, ...heuristicMeds].forEach((med) => {
    const normalized = normalizeMedicineRecord(med);
    if (!normalized) return;

    const key = normalized.name.toLowerCase();
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, normalized);
      return;
    }

    merged.set(key, {
      ...existing,
      dosage: existing.dosage === 'As directed' ? normalized.dosage : existing.dosage,
      instructions: existing.instructions === 'Take as directed' ? normalized.instructions : existing.instructions,
      duration: existing.duration === 'As directed' ? normalized.duration : existing.duration,
      timing: uniqueValues([...existing.timing, ...normalized.timing]).filter((slot) => ALLOWED_TIMINGS.includes(slot)),
      confidence: Math.max(existing.confidence || 0, normalized.confidence || 0) || undefined,
      evidence: existing.evidence || normalized.evidence
    });
  });

  return [...merged.values()].map((med) => {
    const { evidence, confidence, ...clientMed } = med;
    return {
      ...clientMed,
      confidence
    };
  });
};

const buildSampleRawText = (sampleId) => {
  if (sampleId === 'pres_01') {
    return "Dr. Sarah Jenkins, MD\nCardiology Specialty\nDate: 2026-06-28\nRx:\n- Lisinopril 10mg: Take 1 tablet by mouth daily in the evening. Duration: 30 days. Refills: 3.\n- Atorvastatin 20mg: Take 1 tablet by mouth daily at bedtime. Duration: 30 days. Refills: 3.\n- Aspirin 81mg: Take 1 tablet daily. Duration: 30 days. Refills: 3.";
  }
  if (sampleId === 'pres_02') {
    return "Dr. Manuel Rivera, MD\nPediatrics Specialty\nDate: 2026-07-02\nRx:\n- Amoxicillin 500mg: Take 1 capsule three times daily for 10 days. Refills: 0.\n- Ibuprofen 400mg: Take 1 tablet every 6 hours as needed for fever/pain. Duration: 5 days. Refills: 0.";
  }
  return '';
};

const buildFallbackParsedResult = ({ rawText, language, documentType, warnings = [] }) => ({
  doctorName: /dr\.?\s+[a-z .]+/i.exec(rawText)?.[0] || 'Unknown Doctor',
  patientName: '',
  specialty: documentType === 'dental prescription' ? (language === 'bn' ? 'Dental' : 'Dentistry') : 'General',
  date: new Date().toISOString().split('T')[0],
  documentType,
  contextSummary: warnings.length ? warnings.join(' ') : 'Parsed with deterministic OCR fallback.',
  aiConfidence: 0.45,
  warnings,
  extractedMeds: []
});

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

// 1. OCR + document-intelligence parsing endpoint
const prescriptionUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'document', maxCount: 1 },
  { name: 'file', maxCount: 1 }
]);

app.post('/api/scan-prescription', prescriptionUpload, async (req, res) => {
  try {
    const sampleId = req.body.sampleId;
    const language = req.body.language || 'en';
    const warnings = [];
    let rawText = '';
    let ocrEngine = 'sample-direct';
    let documentInput = null;
    let quality = null;

    if (sampleId && (sampleId === 'pres_01' || sampleId === 'pres_02')) {
      console.log(`Processing sample ${sampleId} with document intelligence parser...`);
      rawText = buildSampleRawText(sampleId);
      quality = computeOcrQuality(rawText, [0.99], 'sample');
    } else {
      documentInput = getUploadedDocument(req);
      if (!documentInput) {
        return res.status(400).json({ error: 'No prescription image or document provided.' });
      }

      console.log(`Scanning ${documentInput.mimeType} document (${documentInput.size} bytes)...`);

      if (isPdfDocument(documentInput)) {
        try {
          const pdfText = await extractPdfTextLayer(documentInput);
          if (pdfText.text.length >= 80) {
            rawText = pdfText.text;
            ocrEngine = pdfText.engine;
            quality = computeOcrQuality(rawText, pdfText.confidences, 'pdf');
          } else {
            warnings.push('PDF text layer was too sparse; falling back to OCR.');
          }
        } catch (pdfErr) {
          console.warn('PDF text extraction failed, falling back to OCR:', pdfErr.message);
          warnings.push('PDF text extraction failed; falling back to OCR.');
        }
      }

      if (!rawText) {
        console.log('Sending document payload to NVIDIA Nemotron-OCR-v2...');
        const ocrResult = await runNemotronOcr(documentInput);
        rawText = ocrResult.text;
        ocrEngine = ocrResult.engine;
        quality = computeOcrQuality(rawText, ocrResult.confidences, isPdfDocument(documentInput) ? 'pdf' : 'image');
      }

      if (!rawText || rawText.trim().length === 0) {
        return res.status(422).json({
          error: 'OCR could not extract any text from the uploaded document. Please upload a clearer image or a PDF with readable text.',
          rawText: ''
        });
      }
    }

    rawText = normalizeWhitespace(rawText);
    const heuristicCandidates = extractHeuristicMedicines(rawText);
    const documentType = detectDocumentType(rawText, documentInput?.mimeType);
    quality = quality || computeOcrQuality(rawText, [], documentInput?.mimeType === 'application/pdf' ? 'pdf' : 'image');
    quality.warnings = uniqueValues([...(quality.warnings || []), ...warnings]);

    console.log(`OCR complete via ${ocrEngine}. chars=${rawText.length}, candidates=${heuristicCandidates.length}`);

    const documentProfile = {
      documentType,
      ocrEngine,
      ocrConfidence: quality.confidence,
      characterCount: quality.characterCount,
      lineCount: quality.lineCount,
      medicationSignalCount: quality.medicationSignalCount,
      likelyPrescription: quality.likelyPrescription,
      language
    };

    let parsedResult;
    try {
      console.log(`Sending OCR text to ${LLM_MODEL} for contextual parsing...`);
      const llmResult = await parsePrescriptionWithLlm({
        rawText,
        language,
        documentProfile,
        candidates: heuristicCandidates
      });
      parsedResult = llmResult.parsed;
      if (llmResult.llmWarning) warnings.push(llmResult.llmWarning);
    } catch (llmErr) {
      console.error('LLM parsing failed, using deterministic extraction fallback:', llmErr.message);
      warnings.push('AI parser failed; deterministic medicine extraction was used.');
      parsedResult = buildFallbackParsedResult({
        rawText,
        language,
        documentType,
        warnings
      });
    }

    const parsedWarnings = Array.isArray(parsedResult.warnings) ? parsedResult.warnings : [];
    const aiConfidenceRaw = Number(parsedResult.aiConfidence);
    const aiConfidence = Number.isFinite(aiConfidenceRaw)
      ? Number(((aiConfidenceRaw > 1 ? aiConfidenceRaw / 100 : aiConfidenceRaw) * 100).toFixed(1))
      : heuristicCandidates.length ? 55 : 35;

    parsedResult = {
      doctorName: parsedResult.doctorName || 'Unknown Doctor',
      patientName: parsedResult.patientName || '',
      specialty: parsedResult.specialty || 'General',
      date: parsedResult.date || new Date().toISOString().split('T')[0],
      documentType: parsedResult.documentType || documentType,
      contextSummary: parsedResult.contextSummary || 'Clinical document parsed from OCR text.',
      ocrEngine,
      ocrConfidence: quality.confidence,
      aiConfidence,
      quality,
      warnings: uniqueValues([...parsedWarnings, ...(quality.warnings || []), ...warnings]),
      rawText,
      extractedMeds: mergeMedicineLists(
        Array.isArray(parsedResult.extractedMeds) ? parsedResult.extractedMeds : [],
        heuristicCandidates
      )
    };

    if (parsedResult.extractedMeds.length === 0 && !quality.likelyPrescription) {
      parsedResult.doctorName = parsedResult.doctorName || 'Not a prescription document';
      parsedResult.warnings = uniqueValues([
        ...parsedResult.warnings,
        'No medications were confidently detected.'
      ]);
    }

    try {
      if (isDbConnected) {
        const log = new PrescriptionLog({
          userId: req.body.userId || 'anonymous',
          doctorName: parsedResult.doctorName || 'Unknown',
          patientName: parsedResult.patientName || '',
          specialty: parsedResult.specialty || 'General',
          date: parsedResult.date || new Date().toISOString().split('T')[0],
          documentType: parsedResult.documentType,
          ocrEngine: parsedResult.ocrEngine,
          ocrConfidence: parsedResult.ocrConfidence,
          aiConfidence: parsedResult.aiConfidence,
          quality: parsedResult.quality,
          warnings: parsedResult.warnings,
          contextSummary: parsedResult.contextSummary,
          rawText,
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

// Legacy scanner kept as a diagnostic fallback.
app.post('/api/scan-prescription-legacy', upload.single('image'), async (req, res) => {
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
        model: LLM_MODEL,
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
        model: LLM_MODEL,
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
        model: LLM_MODEL,
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
        model: LLM_MODEL,
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
