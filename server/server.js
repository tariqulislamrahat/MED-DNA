const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Multer setup for handling file uploads (optional, we support base64 json body as well)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Connect to MongoDB
let isDbConnected = false;
const mongoUri = process.env.MONGO_URI;

if (mongoUri && !mongoUri.includes('<db_password>')) {
  mongoose
    .connect(mongoUri)
    .then(() => {
      console.log('✅ Connected to MongoDB successfully.');
      isDbConnected = true;
    })
    .catch((err) => {
      console.warn(
        '⚠️ MongoDB connection failed. Running in Memory fallback mode:',
        err.message,
      );
    });
} else {
  console.warn(
    '⚠️ MONGO_URI not configured or contains placeholder. Running in Memory fallback mode.',
  );
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
  startDate: { type: Date, default: Date.now },
});

const AdherenceSchema = new mongoose.Schema({
  userId: { type: String, default: 'anonymous' },
  date: String, // YYYY-MM-DD
  records: mongoose.Schema.Types.Mixed, // medId_timing -> { taken: boolean, takenAt: string }
});

const PrescriptionLogSchema = new mongoose.Schema({
  userId: { type: String, default: 'anonymous' },
  doctorName: String,
  specialty: String,
  date: String,
  rawText: String,
  extractedMeds: Array,
  createdAt: { type: Date, default: Date.now },
});

const MedicineInfoSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  category: String,
  uses: [String],
  sideEffects: [String],
  precautions: [String],
  interactions: [String],
  interactionNotes: mongoose.Schema.Types.Mixed, // drugName -> details
});

const EmailLogSchema = new mongoose.Schema({
  userId: { type: String, default: 'anonymous' },
  recipient: String,
  subject: String,
  body: String,
  sentAt: { type: Date, default: Date.now },
});

const Medicine = mongoose.model('Medicine', MedicineSchema);
const Adherence = mongoose.model('Adherence', AdherenceSchema);
const PrescriptionLog = mongoose.model(
  'PrescriptionLog',
  PrescriptionLogSchema,
);
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
    startDate: new Date().toISOString(),
  },
  {
    id: 'med_02',
    name: 'Lisinopril',
    dosage: '10mg',
    timing: ['evening'],
    instructions: 'Take at the same time each day before bed',
    duration: '90 days',
    refillsLeft: 3,
    startDate: new Date().toISOString(),
  },
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
    startDate: mongooseMed.startDate,
  };
};

// --- API ROUTES ---

// 1. OCR + LLM Parsing Endpoint
app.post('/api/scan-prescription', upload.single('image'), async (req, res) => {
  try {
    let rawText = '';
    const sampleId = req.body.sampleId;

    if (sampleId && (sampleId === 'pres_01' || sampleId === 'pres_02')) {
      console.log(`Processing sample ${sampleId} direct parsing...`);
      if (sampleId === 'pres_01') {
        rawText =
          'Dr. Sarah Jenkins, MD\nCardiology Specialty\nDate: 2026-06-28\nRx:\n- Lisinopril 10mg: Take 1 tablet by mouth daily in the evening. Duration: 30 days. Refills: 3.\n- Atorvastatin 20mg: Take 1 tablet by mouth daily at bedtime. Duration: 30 days. Refills: 3.\n- Aspirin 81mg: Take 1 tablet daily. Duration: 30 days. Refills: 3.';
      } else {
        rawText =
          'Dr. Manuel Rivera, MD\nPediatrics Specialty\nDate: 2026-07-02\nRx:\n- Amoxicillin 500mg: Take 1 capsule three times daily for 10 days. Refills: 0.\n- Ibuprofen 400mg: Take 1 tablet every 6 hours as needed for fever/pain. Duration: 5 days. Refills: 0.';
      }
    } else {
      let base64Image = '';
      if (req.file) {
        base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      } else if (req.body.image) {
        base64Image = req.body.image;
      } else {
        return res
          .status(400)
          .json({ error: 'No prescription image provided.' });
      }

      console.log('Sending image to NVIDIA Nemotron-OCR-v2...');

      const ocrResponse = await fetch(
        'https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-ocr-v2',
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NVIDIA_OCR_KEY}`,
          },
          body: JSON.stringify({
            input: [
              {
                type: 'image_url',
                url: base64Image,
              },
            ],
          }),
        },
      );

      if (!ocrResponse.ok) {
        const errText = await ocrResponse.text();
        console.error('NVIDIA OCR Error:', errText);
        return res
          .status(502)
          .json({ error: 'NVIDIA OCR NIM failed', details: errText });
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
          .map(
            (d) =>
              d.text_detections
                ?.map((td) => td.text_prediction?.text || '')
                .join(' ') || '',
          )
          .join('\n');
      } else {
        rawText = JSON.stringify(ocrData);
      }

      if (!rawText || rawText.trim().length === 0) {
        return res.status(422).json({
          error:
            'OCR could not extract any text from the uploaded image. Please upload a clearer prescription image.',
          rawText: '',
        });
      }
    }

    console.log('Extracted raw text length:', rawText.length);

    const llmInputText =
      rawText.length > 3000
        ? rawText.substring(0, 3000) + '\n[... text truncated ...]'
        : rawText;

    console.log('Sending text to NVIDIA Llama-3.1-8b-Instruct...');

    const llmResponse = await fetch(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NVIDIA_LLM_KEY}`,
        },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          messages: [
            {
              role: 'system',
              content: `
You are an expert clinical prescription parser.

Your task is to analyze raw OCR text extracted from a doctor's handwritten prescription and convert it into structured JSON.

Return ONLY valid JSON.

If the uploaded document is NOT a medical prescription, return:
{
  "doctorName": "Not a prescription document",
  "specialty": "",
  "date": "",
  "extractedMeds": []
}

Otherwise, return exactly this schema:
{
  "doctorName": "",
  "specialty": "",
  "date": "",
  "extractedMeds": [
    {
      "name": "",
      "dosage": "",
      "timing": [],
      "instructions": "",
      "duration": "",
      "refillsLeft": 0,
      "cause": ""
    }
  ]
}

GENERAL RULES
1. Extract EVERY medicine in the prescription.
2. Never stop after the first medicine.
3. Preserve the prescription order.
4. Never invent medicines.
5. Ignore patient information.
6. Never use the patient's name as the doctor's name.
7. If no medicines are found, return an empty extractedMeds array.

DOSAGE
The dosage field must contain ONLY medicine strength.
Never put prescription frequency inside dosage.

TIMING
Convert prescription frequency into a timing array.
1-0-1 or 101 => ["morning","night"]
1-1-1 or 111 => ["morning","noon","night"]
1-0-0 => ["morning"]
0-1-0 => ["noon"]
0-0-1 => ["night"]
OD => ["morning"]
BD/BID => ["morning","night"]
TDS/TID => ["morning","noon","night"]
QID => ["morning","noon","evening","night"]
HS/Bedtime => ["night"]
If timing cannot be determined return ["morning"].

INSTRUCTIONS
Extract meal instructions only.
After meal / After food / After breakfast / PC => "After meal"
Before meal / Before food / AC / Empty stomach => "Before meal"
With food => "With food"
If unavailable return "".

DURATION
Extract treatment duration.
If unavailable return "".

CAUSE
Extract the disease or indication ONLY if explicitly written.
Otherwise return "".

REFILLS
If not mentioned return 0.

FINAL RULES
Return ONLY valid JSON.
Never invent medicine names.
Every medicine found in the prescription MUST appear in extractedMeds.
`,
            },
            {
              role: 'user',
              content: llmInputText,
            },
          ],
          temperature: 0.1,
          max_tokens: 2048,
        }),
      },
    );

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      console.error('NVIDIA LLM Error:', errText);
      return res.json({
        rawText: rawText,
        doctorName: 'AI parsing unavailable',
        specialty: 'Unknown',
        date: new Date().toISOString().split('T')[0],
        extractedMeds: [],
      });
    }

    const llmData = await llmResponse.json();
    console.log('NVIDIA LLM parsing complete.');

    let parsedResult;
    try {
      let content = llmData.choices[0].message.content.trim();
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        content = content.slice(firstBrace, lastBrace + 1);
      }
      parsedResult = JSON.parse(content);
    } catch (jsonErr) {
      console.error(
        'JSON parse failed, returning raw OCR text. LLM output was:',
        llmData.choices[0].message.content,
      );
      parsedResult = {
        doctorName: 'Could not parse structure',
        specialty: 'Unknown',
        date: new Date().toISOString().split('T')[0],
        extractedMeds: [],
      };
    }

    const normalizeTiming = (text = '') => {
      const t = String(text).toLowerCase();

      if (/(1[\s-]?0[\s-]?1|\b101\b|\bbid\b|\bbd\b)/i.test(t))
        return ['morning', 'night'];
      if (/(1[\s-]?1[\s-]?1|\b111\b|\btds\b|\btid\b)/i.test(t))
        return ['morning', 'noon', 'night'];
      if (/(1[\s-]?0[\s-]?0|\b100\b|\bod\b|\bmorning\b|\bbreakfast\b)/i.test(t))
        return ['morning'];
      if (/(0[\s-]?1[\s-]?0|\b010\b|\bnoon\b|\blunch\b|\bafternoon\b)/i.test(t))
        return ['noon'];
      if (
        /(0[\s-]?0[\s-]?1|\b001\b|\bevening\b|\bdinner\b|\bhs\b|\bbedtime\b|\bnight\b)/i.test(
          t,
        )
      )
        return ['night'];
      if (/\b0[\s-]?1[\s-]?1\b|\b011\b/.test(t)) return ['noon', 'night'];
      if (/\b1[\s-]?1[\s-]?0\b|\b110\b/.test(t)) return ['morning', 'noon'];
      if (/\b2[\s-]?0[\s-]?2\b/.test(t)) return ['morning', 'night'];
      if (/\b2[\s-]?2[\s-]?2\b/.test(t)) return ['morning', 'noon', 'night'];
      if (/\bqid\b/.test(t)) return ['morning', 'noon', 'evening', 'night'];

      return ['morning'];
    };

    const extractMealInstruction = (text = '') => {
      const t = String(text).toLowerCase();
      if (/(after meal|after food|after breakfast|\bpc\b)/i.test(t))
        return 'After meal';
      if (/(before meal|before food|\bac\b|empty stomach)/i.test(t))
        return 'Before meal';
      if (/with food/i.test(t)) return 'With food';
      return '';
    };

    const cleanDosage = (text = '') => {
      const t = String(text || '').trim();
      return t
        .replace(
          /\b(1-0-1|1 0 1|101|1-1-1|111|1-0-0|100|0-1-0|010|0-0-1|001|bd|bid|tds|tid|qid|od|hs)\b/gi,
          '',
        )
        .replace(/\s{2,}/g, ' ')
        .trim();
    };

    async function verifyDrugNameWithRxNorm(name) {
      const q = String(name || '').trim();
      if (!q) return { verifiedName: '', rxcui: '', verified: false };

      const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(q)}&search=2&allsrc=0`;
      try {
        const r = await fetch(url);
        if (!r.ok) return { verifiedName: q, rxcui: '', verified: false };

        const data = await r.json();
        const ids = data?.idGroup?.rxnormId || [];
        if (!ids.length) return { verifiedName: q, rxcui: '', verified: false };

        const rxcui = Array.isArray(ids) ? ids[0] : ids;
        const propRes = await fetch(
          `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/properties.json`,
        );
        if (!propRes.ok) return { verifiedName: q, rxcui, verified: true };

        const propData = await propRes.json();
        const verifiedName = propData?.properties?.name || q;
        return { verifiedName, rxcui, verified: true };
      } catch (e) {
        return { verifiedName: q, rxcui: '', verified: false };
      }
    }

    parsedResult.rawText = rawText;

    if (!Array.isArray(parsedResult.extractedMeds)) {
      parsedResult.extractedMeds = [];
    }

    const enrichedMeds = [];
    for (const med of parsedResult.extractedMeds) {
      const sourceText = [
        med.name,
        med.dosage,
        med.instructions,
        med.duration,
        med.cause,
      ]
        .filter(Boolean)
        .join(' ');
      const timing =
        Array.isArray(med.timing) && med.timing.length
          ? [...new Set(med.timing.flatMap((t) => normalizeTiming(t)))]
          : normalizeTiming(sourceText);
      const instructions =
        med.instructions || extractMealInstruction(sourceText);
      const dosage = cleanDosage(med.dosage || '');

      const verified = await verifyDrugNameWithRxNorm(med.name);

      enrichedMeds.push({
        name: verified.verifiedName || med.name || 'Unknown Medicine',
        dosage: dosage || '',
        timing,
        instructions,
        duration: med.duration || '',
        refillsLeft: typeof med.refillsLeft === 'number' ? med.refillsLeft : 0,
        cause: med.cause || '',
      });
    }

    parsedResult.extractedMeds = enrichedMeds;

    try {
      if (isDbConnected) {
        const log = new PrescriptionLog({
          userId: req.body.userId || 'anonymous',
          doctorName: parsedResult.doctorName || 'Unknown',
          specialty: parsedResult.specialty || 'General',
          date: parsedResult.date || new Date().toISOString().split('T')[0],
          rawText: rawText,
          extractedMeds: parsedResult.extractedMeds,
        });
        await log.save();
      } else {
        localPrescriptionLogs.push({
          id: 'log_' + Date.now(),
          ...parsedResult,
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

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// A handful of public Overpass mirrors. Public instances rate-limit and
// occasionally go down, so we try several in order and give each one a
// real chance before falling back to the next.
//
// IMPORTANT: Overpass mirrors return HTTP 406 for requests with no/blank
// User-Agent header, and HTTP 429 if you hit the same mirror too often
// without backing off. Both are fixed below.
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

// Set this to a real contact (your email or project URL). Overpass admins
// do check this and will block generic/fake User-Agents on repeated abuse.
const OVERPASS_USER_AGENT = 'MedDNA/1.0 (contact: your-email@example.com)';

app.get('/api/pharmacies', async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng required' });
    }

    const query = `
[out:json][timeout:25];
(
  node["amenity"="pharmacy"](around:25000,${lat},${lng});
  way["amenity"="pharmacy"](around:25000,${lat},${lng});
  relation["amenity"="pharmacy"](around:25000,${lat},${lng});
);
out center tags;
`;

    let response = null;
    const failures = [];

    // Try each mirror in turn; a non-2xx or network error just moves on
    // to the next one instead of failing the whole request immediately.
    for (const url of OVERPASS_URLS) {
      try {
        response = await axios.post(url, query, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            Accept: '*/*',
            'User-Agent': OVERPASS_USER_AGENT,
          },
          timeout: 20000,
          transformRequest: [(data) => data],
        });

        if (response?.data) break;
      } catch (e) {
        const status = e.response?.status;
        const detail = status ? `HTTP ${status}` : e.code || e.message;
        failures.push(`${url} -> ${detail}`);
        console.warn(`Overpass mirror failed: ${url} (${detail})`);
        response = null;

        // 429 = rate limited, not down. A short pause avoids immediately
        // tripping the same limit on the next mirror too.
        if (status === 429) {
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    }

    if (!response || !response.data) {
      console.error('All Overpass mirrors failed:', failures.join(' | '));
      return res.status(503).json({
        error:
          'Pharmacy lookup service is temporarily unavailable. Please try again in a moment.',
        details: failures,
      });
    }

    const elements = response.data.elements || [];

    const pharmacies = elements
      .map((p) => {
        const plat = p.lat || p.center?.lat;
        const plng = p.lon || p.center?.lon;

        if (!plat || !plng) return null;

        return {
          id: String(p.id),
          name: p.tags?.name || 'Pharmacy',
          address:
            [
              p.tags?.['addr:street'],
              p.tags?.['addr:city'],
              p.tags?.['addr:postcode'],
            ]
              .filter(Boolean)
              .join(', ') || 'Address unavailable',

          phone: p.tags?.phone || null,
          website: p.tags?.website || null,
          lat: plat,
          lng: plng,
          distance: Number(
            haversineMiles(Number(lat), Number(lng), plat, plng).toFixed(1),
          ),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance);

    return res.json({ pharmacies });
  } catch (err) {
    console.error('Pharmacy API error:', err);
    return res.status(500).json({ error: err.message });
  }
});

const NodeGeocoder = require('node-geocoder');

const geocoder = NodeGeocoder({
  provider: 'openstreetmap',
});

// Nationwide online medicine-delivery platforms in Bangladesh. These ship
// (or claim to ship) across most/all districts, so they're always shown
// regardless of the detected city. Researched July 2026 — verify current
// delivery coverage/licensing directly with each platform before launch.
const NATIONWIDE_MARKETPLACES = [
  {
    id: 'medeasy',
    name: 'MedEasy',
    description:
      'DGDA-licensed platform offering medicine delivery, doctor consultations, lab tests, and health records across Bangladesh.',
    website: 'https://medeasy.health',
    delivery: true,
    tags: ['Home delivery', 'DGDA licensed', 'Doctor consultation'],
  },
  {
    id: 'arogga',
    name: 'Arogga',
    description:
      'Certified e-pharmacy with prescription upload, pharmacist review, same-day Dhaka delivery, and coverage across all 64 districts.',
    website: 'https://arogga.com',
    delivery: true,
    tags: ['Home delivery', 'Prescription upload', 'Nationwide'],
  },
  {
    id: 'epharma',
    name: 'ePharma',
    description:
      'Online pharmacy sourcing from government-approved pharmaceutical companies and licensed pharmacies, delivering nationwide since 2016.',
    website: 'https://epharma.com.bd',
    delivery: true,
    tags: ['Home delivery', 'Verified'],
  },
  {
    id: 'osudpotro',
    name: 'Osudpotro',
    description:
      'One of the largest online medicine inventories in Bangladesh, offering prescription and OTC medicine delivery nationwide.',
    website: 'https://osudpotro.com',
    delivery: true,
    tags: ['Home delivery', 'Large inventory'],
  },
  {
    id: 'healthx-bd',
    name: 'HealthX BD',
    description:
      'Partners with 300+ local pharmacies to deliver prescription and OTC medicines quickly, including areas outside Dhaka.',
    website: 'https://healthxbd.com',
    delivery: true,
    tags: ['Home delivery', 'Rural coverage'],
  },
  {
    id: 'lazz-pharma',
    name: 'Lazz Pharma',
    description:
      "Bangladesh's first model pharmacy chain, serving for 45+ years with 65+ branches and combined offline/online ordering.",
    website: 'https://lazzpharma.com',
    delivery: true,
    tags: ['Home delivery', 'Verified', 'Established chain'],
  },
  {
    id: 'banglameds',
    name: 'BanglaMeds (via Chaldal)',
    description:
      'Emergency and everyday medicine home delivery with a 3000+ item catalog, available inside the Chaldal app.',
    website: 'https://chaldal.com/pharmacy',
    delivery: true,
    tags: ['Home delivery', 'Emergency medicine'],
  },
  {
    id: 'medex',
    name: 'MedEx',
    description:
      "Bangladesh's most comprehensive online medicine directory — useful for checking dosage, uses, and side effects before ordering.",
    website: 'https://medex.com.bd',
    delivery: false,
    tags: ['Drug info directory'],
  },
];

// Optional extra platforms layered on top of the nationwide list for
// specific cities. Every marketplace here (and above) needs a stable
// `id`, short `description`, and `tags` — the Pharmacy view keys off them.
const CITY_MARKETPLACES = {
  dhaka: [],
  chittagong: [],
  rajshahi: [],
  khulna: [],
  sylhet: [],
};

const CITY_MAP = {
  ঢাকা: 'dhaka',
  dhaka: 'dhaka',

  চট্টগ্রাম: 'chittagong',
  chattogram: 'chittagong',
  chittagong: 'chittagong',

  রাজশাহী: 'rajshahi',
  rajshahi: 'rajshahi',

  খুলনা: 'khulna',
  khulna: 'khulna',

  সিলেট: 'sylhet',
  sylhet: 'sylhet',
};

app.get('/api/reverse-geocode', async (req, res) => {
  const { lat, lng } = req.query;

  try {
    const result = await geocoder.reverse({
      lat,
      lon: lng,
    });

    if (!result.length) {
      return res.json({
        city: null,
      });
    }

    res.json({
      city:
        result[0].city ||
        result[0].administrativeLevels?.level2long ||
        result[0].state ||
        null,

      formattedAddress: result[0].formattedAddress,
    });
  } catch (err) {
    console.error('Reverse geocode error:', err.message);
    res.json({ city: null });
  }
});

app.get('/api/geocode', async (req, res) => {
  const { address } = req.query;

  try {
    const result = await geocoder.geocode(address);

    if (!result.length) {
      return res.status(404).json({
        error: 'Address not found',
      });
    }

    res.json({
      lat: result[0].latitude,
      lng: result[0].longitude,
    });
  } catch (err) {
    console.error('Geocode error:', err.message);
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

// Always returns the nationwide marketplace list. If a recognized city is
// passed, any city-specific extras are appended on top. A missing or
// unrecognized city no longer results in an empty response.
app.get('/api/marketplaces', (req, res) => {
  const { city } = req.query;

  const normalized = city
    ? (CITY_MAP[String(city).trim().toLowerCase()] ??
      String(city).trim().toLowerCase())
    : null;

  const extras = normalized ? CITY_MARKETPLACES[normalized] || [] : [];

  res.json({
    marketplaces: [...NATIONWIDE_MARKETPLACES, ...extras],
  });
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
  const { name, dosage, timing, instructions, duration, refillsLeft, userId } =
    req.body;
  try {
    if (isDbConnected) {
      const newMed = new Medicine({
        userId: userId || 'anonymous',
        name,
        dosage,
        timing,
        instructions,
        duration,
        refillsLeft,
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
        startDate: new Date().toISOString(),
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
      localMedicines = localMedicines.filter((m) => m.id !== id);
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
      logs.forEach((log) => {
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
      let record = await Adherence.findOne({
        userId: userId || 'anonymous',
        date,
      });
      if (!record) {
        record = new Adherence({
          userId: userId || 'anonymous',
          date,
          records: {},
        });
      }

      const currentVal = record.records[key] || { taken: false };
      const nextTaken = !currentVal.taken;

      const updatedRecords = { ...record.records };
      if (nextTaken) {
        updatedRecords[key] = {
          taken: true,
          takenAt: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
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
          takenAt: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
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
      const logs = await PrescriptionLog.find({ userId }).sort({
        createdAt: -1,
      });
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
      localPrescriptionLogs = localPrescriptionLogs.filter(
        (log) => log.id !== id,
      );
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
    return res.status(400).json({
      error: 'Medicine name is required.',
    });
  }

  const cleanName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

  try {
    // 1. Check cache first
    let info = null;

    if (isDbConnected) {
      info = await MedicineInfo.findOne({
        name: { $regex: new RegExp(`^${cleanName}$`, 'i') },
      });
    } else {
      info = localMedicineInfo[cleanName.toLowerCase()];
    }

    if (info) {
      return res.json(info);
    }

    console.log(
      `Safety profile for ${cleanName} not found in cache. Querying LLM...`,
    );

    // 2. Call LLM
    const response = await fetch(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NVIDIA_LLM_KEY}`,
        },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          messages: [
            {
              role: 'system',
              content: `
You are a clinical pharmacology assistant.

Return ONLY valid JSON:

{
  "name": "",
  "category": "",
  "uses": [],
  "sideEffects": [],
  "precautions": [],
  "interactions": [],
  "interactionNotes": {}
}
              `,
            },
            {
              role: 'user',
              content: `Medicine name: ${cleanName}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 800,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || 'Unable to fetch pharmacies');
    }

    let content = data.choices[0].message.content.trim();

    // 3. Clean JSON safely
    const first = content.indexOf('{');
    const last = content.lastIndexOf('}');

    if (first === -1 || last === -1) {
      throw new Error('Invalid JSON returned from LLM');
    }

    content = content.slice(first, last + 1);

    const parsedInfo = JSON.parse(content);
    parsedInfo.name = cleanName;

    // 4. Save cache
    if (isDbConnected) {
      const newInfo = new MedicineInfo(parsedInfo);
      await newInfo.save();
    } else {
      localMedicineInfo[cleanName.toLowerCase()] = parsedInfo;
    }

    return res.json(parsedInfo);
  } catch (error) {
    console.error('medicine-info error:', error);

    return res.status(500).json({
      error: 'AI Safety Profile failed',
      message: error.message,
    });
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
    const response = await fetch(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NVIDIA_LLM_KEY}`,
        },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
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
]`,
            },
            {
              role: 'user',
              content: JSON.stringify(medicines),
            },
          ],
          temperature: 0.1,
          max_tokens: 1024,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Llama NIM API returned ${response.status}: ${await response.text()}`,
      );
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    const firstIdx = Math.min(
      content.indexOf('{') !== -1 ? content.indexOf('{') : Infinity,
      content.indexOf('[') !== -1 ? content.indexOf('[') : Infinity,
    );
    const lastIdx = Math.max(
      content.lastIndexOf('}'),
      content.lastIndexOf(']'),
    );
    if (firstIdx !== Infinity && lastIdx !== -1 && firstIdx < lastIdx) {
      content = content.slice(firstIdx, lastIdx + 1);
    }
    const warnings = JSON.parse(content);
    res.json(warnings);
  } catch (error) {
    console.error('Failed to run drug interaction checks:', error);
    res
      .status(500)
      .json({ error: 'Interaction check failed', message: error.message });
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
        body,
      });
      await emailLog.save();
    } else {
      localEmailLogs.push({
        id: 'email_' + Date.now(),
        userId: userId || 'anonymous',
        recipient,
        subject,
        body,
        sentAt: new Date().toISOString(),
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
      res.json(localEmailLogs.filter((log) => log.userId === userId));
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. AI Health Guide Chat Endpoint (strictly limited to health and medicine)
app.post('/api/chat-guide', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required.' });
  }

  try {
    const response = await fetch(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NVIDIA_LLM_KEY}`,
        },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          messages: [
            {
              role: 'system',
              content: `You are MedDNA AI, a highly professional clinical health and medicine assistant. You are strictly restricted to guiding the user on medicine, health, prescription guidelines, wellness, and medical instructions. If the user asks about ANY topic unrelated to medicine, health, biology, or healthcare (such as coding, general knowledge, sports, history, business, entertainment, etc.), you must politely decline to answer and remind them that you are only qualified to assist with medical and health-related topics. Keep your answers concise, clear, and informative.`,
            },
            ...messages,
          ],
          temperature: 0.2,
          max_tokens: 800,
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('NVIDIA Chat Guide Error:', errText);
      return res
        .status(502)
        .json({ error: 'NVIDIA Llama NIM failed', details: errText });
    }

    const data = await response.json();
    res.json({ reply: data.choices[0].message.content });
  } catch (error) {
    console.error('Failed to run AI Chat Guide:', error);
    res
      .status(500)
      .json({ error: 'AI Chat Guide failed', message: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 MedDNA API Service listening on port ${PORT}`);
});
