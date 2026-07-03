export interface MedicineInfo {
  name: string;
  category: string;
  uses: string[];
  sideEffects: string[];
  precautions: string[];
  interactions: string[]; // Names of other medicines it interacts with
  interactionNotes: { [key: string]: string }; // Medicine -> Detail warning
}

export interface ExtractedMedicine {
  id: string;
  name: string;
  dosage: string;
  timing: string[]; // e.g. ["morning", "night"]
  instructions: string; // e.g. "after meals"
  duration: string; // e.g. "7 days"
  startDate: string;
  endDate?: string;
  refillsLeft: number;
}

export interface SamplePrescription {
  id: string;
  title: string;
  doctorName: string;
  specialty: string;
  date: string;
  imageUrl: string;
  rawHandwriting: string;
  parsedMeds: Omit<ExtractedMedicine, 'id' | 'startDate'>[];
}

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  distance: number; // in miles
  rating: number;
  openHours: string;
  prices: { [medName: string]: number }; // MedName -> Price
}

export const MEDICINE_DATABASE: { [key: string]: MedicineInfo } = {
  "Aspirin": {
    name: "Aspirin",
    category: "NSAID / Antiplatelet",
    uses: ["Pain relief", "Fever reduction", "Reducing risk of heart attack/stroke"],
    sideEffects: ["Heartburn", "Stomach upset", "Easy bruising or bleeding"],
    precautions: ["Avoid if you have a history of stomach ulcers or bleeding disorders", "Limit alcohol consumption while taking", "Consult before combining with other NSAIDs"],
    interactions: ["Ibuprofen", "Warfarin"],
    interactionNotes: {
      "Ibuprofen": "Ibuprofen may decrease the cardioprotective effects of low-dose Aspirin. Concomitant use increases bleeding risk.",
      "Warfarin": "Co-administration of Warfarin and Aspirin significantly increases the risk of serious bleeding events."
    }
  },
  "Ibuprofen": {
    name: "Ibuprofen",
    category: "NSAID (Pain Reliever)",
    uses: ["Relieving pain from headaches, dental work, muscle aches", "Reducing inflammation and joint swelling"],
    sideEffects: ["Nausea", "Indigestion", "Dizziness", "Increased blood pressure"],
    precautions: ["Take with food or milk to prevent stomach irritation", "Avoid long term use without medical supervision", "Use with caution in kidney disease"],
    interactions: ["Aspirin", "Warfarin", "Lisinopril"],
    interactionNotes: {
      "Aspirin": "Ibuprofen blocks Aspirin's antiplatelet action when co-administered. Increases gastric mucosal injury risk.",
      "Warfarin": "Both increase bleeding risk. May cause severe gastrointestinal bleeding.",
      "Lisinopril": "Ibuprofen can reduce the blood-pressure lowering effect of Lisinopril and increase risk of kidney impairment."
    }
  },
  "Warfarin": {
    name: "Warfarin",
    category: "Anticoagulant (Blood Thinner)",
    uses: ["Preventing blood clots in veins, arteries, lungs, or heart", "Reducing stroke risk in patients with atrial fibrillation"],
    sideEffects: ["Severe bleeding", "Bruising", "Nosebleeds", "Blood in urine or stool"],
    precautions: ["Requires regular blood testing (INR) to monitor levels", "Keep Vitamin K intake consistent (avoid sudden changes in green leafy vegetables)", "Inform all doctors/dentists that you are taking Warfarin"],
    interactions: ["Aspirin", "Ibuprofen"],
    interactionNotes: {
      "Aspirin": "High risk of internal bleeding. Only combine under strict cardiological supervision.",
      "Ibuprofen": "Increased risk of major stomach bleeding. Avoid NSAIDs while taking Warfarin; use acetaminophen instead for pain."
    }
  },
  "Metformin": {
    name: "Metformin",
    category: "Biguanide (Antidiabetic)",
    uses: ["Lowering blood sugar levels in Type 2 Diabetes", "Improving insulin sensitivity"],
    sideEffects: ["Diarrhea", "Nausea", "Metallic taste in mouth", "Abdominal discomfort"],
    precautions: ["Take with meals to reduce stomach side effects", "Ensure adequate hydration to avoid lactic acidosis", "Avoid excessive alcohol intake"],
    interactions: [],
    interactionNotes: {}
  },
  "Lisinopril": {
    name: "Lisinopril",
    category: "ACE Inhibitor (Antihypertensive)",
    uses: ["Treating high blood pressure", "Improving survival rates after heart attacks", "Managing heart failure"],
    sideEffects: ["Dry persistent cough", "Dizziness", "Lightheadedness", "Increased potassium levels"],
    precautions: ["Do not take during pregnancy (fetal risk)", "Monitor kidney function and blood potassium regularly", "Avoid potassium supplements or salt substitutes containing potassium without consulting doctor"],
    interactions: ["Ibuprofen"],
    interactionNotes: {
      "Ibuprofen": "NSAIDs like Ibuprofen may reduce Lisinopril's effectiveness and double the risk of acute renal failure."
    }
  },
  "Amoxicillin": {
    name: "Amoxicillin",
    category: "Penicillin Antibiotic",
    uses: ["Treating ear, nose, throat, skin, or urinary tract bacterial infections"],
    sideEffects: ["Diarrhea", "Mild rash", "Nausea", "Vomiting"],
    precautions: ["Finish the entire prescribed course even if you feel better", "Does not treat viral infections (like colds or flu)", "Notify doctor immediately of hives or breathing difficulties"],
    interactions: [],
    interactionNotes: {}
  },
  "Atorvastatin": {
    name: "Atorvastatin",
    category: "Statin (Cholesterol Reducer)",
    uses: ["Lowering 'bad' LDL cholesterol and triglycerides", "Raising 'good' HDL cholesterol", "Reducing risk of stroke and heart attack"],
    sideEffects: ["Muscle aches or weakness", "Headache", "Mild digestive symptoms"],
    precautions: ["Avoid drinking large amounts of grapefruit juice (increases drug concentration)", "Report unexplained muscle pain/weakness immediately (risk of rhabdomyolysis)", "Monitor liver enzyme levels"],
    interactions: [],
    interactionNotes: {}
  }
};

export const SAMPLE_PRESCRIPTIONS: SamplePrescription[] = [
  {
    id: "pres_01",
    title: "Cardiology Review - Dr. Jenkins",
    doctorName: "Dr. Sarah Jenkins, MD",
    specialty: "Cardiology & Vascular Medicine",
    date: "2026-06-28",
    imageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=600&auto=format&fit=crop", // placeholder clinical image
    rawHandwriting: `Cardiology Clinic - Jenkins MD
Rx
- Aspirin 81mg (daily in morning with breakfast)
- Lisinopril 10mg (once daily, evening before bed)
- Atorvastatin 20mg (once daily, bedtime)
Duration: 30 days. Refills: 3
Sign: S. Jenkins`,
    parsedMeds: [
      {
        name: "Aspirin",
        dosage: "81mg",
        timing: ["morning"],
        instructions: "With breakfast",
        duration: "30 days",
        refillsLeft: 3
      },
      {
        name: "Lisinopril",
        dosage: "10mg",
        timing: ["evening"],
        instructions: "Before bed",
        duration: "30 days",
        refillsLeft: 3
      },
      {
        name: "Atorvastatin",
        dosage: "20mg",
        timing: ["night"],
        instructions: "At bedtime",
        duration: "30 days",
        refillsLeft: 3
      }
    ]
  },
  {
    id: "pres_02",
    title: "Acute Dental Pain - Dr. Rivera",
    doctorName: "Dr. Alex Rivera, DDS",
    specialty: "General Dentistry & Surgery",
    date: "2026-07-01",
    imageUrl: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?q=80&w=600&auto=format&fit=crop",
    rawHandwriting: `Rivera Dental Care
Rx
- Amoxicillin 500mg, cap - 1 capsule tid (every 8 hrs)
- Ibuprofen 400mg, tab - 1 tablet qid (every 6 hrs) as needed for pain/swelling
Duration: 7 days. Refills: 0
Sign: A. Rivera`,
    parsedMeds: [
      {
        name: "Amoxicillin",
        dosage: "500mg",
        timing: ["morning", "afternoon", "night"],
        instructions: "Every 8 hours with water",
        duration: "7 days",
        refillsLeft: 0
      },
      {
        name: "Ibuprofen",
        dosage: "400mg",
        timing: ["morning", "afternoon", "evening", "night"],
        instructions: "Every 6 hours as needed for pain, take with food",
        duration: "7 days",
        refillsLeft: 0
      }
    ]
  }
];

export const PHARMACIES: Pharmacy[] = [
  {
    id: "pharm_01",
    name: "MediCare Plus Pharmacy",
    address: "742 Medical Center Dr, Suite A",
    phone: "(555) 123-4567",
    distance: 0.4,
    rating: 4.8,
    openHours: "8:00 AM - 10:00 PM",
    prices: {
      "Aspirin": 4.50,
      "Ibuprofen": 6.20,
      "Warfarin": 12.00,
      "Metformin": 8.00,
      "Lisinopril": 9.50,
      "Amoxicillin": 15.00,
      "Atorvastatin": 18.20
    }
  },
  {
    id: "pharm_02",
    name: "Wellness Express Pharmacy",
    address: "1098 Health Blvd, Corner Shop",
    phone: "(555) 987-6543",
    distance: 1.2,
    rating: 4.5,
    openHours: "24/7 Open",
    prices: {
      "Aspirin": 3.99,
      "Ibuprofen": 5.50,
      "Warfarin": 14.50,
      "Metformin": 7.20,
      "Lisinopril": 10.99,
      "Amoxicillin": 13.99,
      "Atorvastatin": 21.00
    }
  },
  {
    id: "pharm_03",
    name: "CureAll Community Drugstore",
    address: "320 Maple St, Downtown",
    phone: "(555) 456-7890",
    distance: 2.5,
    rating: 4.2,
    openHours: "9:00 AM - 7:00 PM",
    prices: {
      "Aspirin": 5.25,
      "Ibuprofen": 7.00,
      "Warfarin": 11.20,
      "Metformin": 6.80,
      "Lisinopril": 8.75,
      "Amoxicillin": 17.50,
      "Atorvastatin": 16.50
    }
  }
];
