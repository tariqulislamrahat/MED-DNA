const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const dotenv = require('dotenv');
const path = require('path');

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

const Medicine = mongoose.model('Medicine', MedicineSchema);
const Adherence = mongoose.model('Adherence', AdherenceSchema);
const PrescriptionLog = mongoose.model('PrescriptionLog', PrescriptionLogSchema);

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

// --- API ROUTES ---

// 1. OCR + LLM Parsing Endpoint
app.post('/api/scan-prescription', upload.single('image'), async (req, res) => {
  try {
    let base64Image = '';
    
    if (req.file) {
      base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    } else if (req.body.image) {
      base64Image = req.body.image;
    } else {
      return res.status(400).json({ error: 'No prescription image provided.' });
    }

    console.log('Sending image to NVIDIA Nemotron-OCR-v2...');
    
    // 1. Call Nemotron OCR
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
    
    let rawText = '';
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

    console.log('Extracted raw text:', rawText);
    console.log('Sending text to NVIDIA Llama-3.1-8b-Instruct...');

    // 2. Call Llama 3.1 8b
    const llmResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NVIDIA_LLM_KEY}`
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        messages: [
          {
            role: 'system',
            content: `You are a clinical parser. Process the raw OCR text of a doctor's handwritten prescription. Fix typos, find medicine details, and extract the Doctor Name, Specialty, Date, and Medications.
Output ONLY a valid JSON object matching this schema, without markdown formatting or other text:
{
  "doctorName": "Dr. Jane Doe",
  "specialty": "Cardiology",
  "date": "YYYY-MM-DD",
  "extractedMeds": [
    {
      "name": "Aspirin",
      "dosage": "81mg",
      "timing": ["morning", "night"],
      "instructions": "Take after meals",
      "duration": "30 days",
      "refillsLeft": 1
    }
  ]
}`
          },
          {
            role: 'user',
            content: rawText
          }
        ],
        temperature: 0.1,
        max_tokens: 1024
      })
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      console.error('NVIDIA LLM Error:', errText);
      return res.status(502).json({ error: 'NVIDIA Llama NIM failed', details: errText });
    }

    const llmData = await llmResponse.json();
    console.log('NVIDIA LLM parsing complete.');

    let content = llmData.choices[0].message.content.trim();
    if (content.startsWith('```')) {
      content = content.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    const parsedResult = JSON.parse(content);
    
    // Add raw text reference
    parsedResult.rawText = rawText;

    // Save to Database or Memory
    if (isDbConnected) {
      const log = new PrescriptionLog({
        userId: req.body.userId || 'anonymous',
        doctorName: parsedResult.doctorName,
        specialty: parsedResult.specialty,
        date: parsedResult.date,
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

    res.json(parsedResult);
  } catch (error) {
    console.error('OCR Pipeline Server Error:', error);
    res.status(500).json({ error: 'Internal Server Error inside OCR pipeline', message: error.message });
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

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 MedDNA API Service listening on port ${PORT}`);
});
