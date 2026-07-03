import React, { useState, useEffect } from 'react';
import { useMed } from '../context/MedContext';
import { SAMPLE_PRESCRIPTIONS, type ExtractedMedicine } from '../services/mockData';
import { 
  UploadCloud, 
  FileText, 
  Sparkles, 
  Check, 
  X, 
  Plus, 
  Trash2
} from 'lucide-react';

interface BoundingBox {
  top: string;
  left: string;
  width: string;
  height: string;
  confidence: number;
  label: string;
}

const SAMPLE_BOUNDING_BOXES: { [key: string]: BoundingBox[] } = {
  'pres_01': [
    { top: '23%', left: '10%', width: '80%', height: '11%', confidence: 99.2, label: 'Aspirin 81mg' },
    { top: '39%', left: '10%', width: '82%', height: '11%', confidence: 98.4, label: 'Lisinopril 10mg' },
    { top: '55%', left: '10%', width: '80%', height: '11%', confidence: 98.1, label: 'Atorvastatin 20mg' }
  ],
  'pres_02': [
    { top: '23%', left: '10%', width: '82%', height: '11%', confidence: 99.4, label: 'Amoxicillin 500mg' },
    { top: '39%', left: '10%', width: '85%', height: '11%', confidence: 98.8, label: 'Ibuprofen 400mg' }
  ]
};

export const Scanner: React.FC = () => {
  const { 
    startScanning, 
    cancelScanning,
    isScanning, 
    scanResult, 
    saveScannedMeds 
  } = useMed();

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string>('');
  
  // Hover linkage states
  const [hoveredMedIndex, setHoveredMedIndex] = useState<number | null>(null);
  
  // Real-time terminal simulator logs
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const consoleEndRef = React.useRef<HTMLDivElement>(null);

  // Edited list of medicines from scan
  const [editedMeds, setEditedMeds] = useState<Omit<ExtractedMedicine, 'id' | 'startDate'>[]>([]);

  // Update editor state when scan results arrive
  useEffect(() => {
    if (scanResult) {
      setEditedMeds(
        scanResult.extractedMeds.map(m => ({
          name: m.name,
          dosage: m.dosage,
          timing: [...m.timing],
          instructions: m.instructions,
          duration: m.duration,
          refillsLeft: m.refillsLeft
        }))
      );
    }
  }, [scanResult]);

  // Terminal logging typist simulator
  useEffect(() => {
    if (isScanning) {
      setConsoleLogs([]);
      const logs = [
        "[0.00s] INITIALIZING: Booting MedDNA OCR Neural Engine v3.4.1 (GPU acceleration active)...",
        "[0.18s] PREPARATION: Pre-loading clinical FDA database matching maps...",
        "[0.35s] IMAGE ANALYSIS: Analyzing contrast grid, de-skewing angle (+0.32° correction)...",
        "[0.55s] CONTRAST CORRECTION: Normalizing luminance channels, sharpening script margins...",
        "[0.72s] SEGMENTATION: Mapping handwritten script lines. Clinic header boundary detected.",
        "[0.95s] RECOGNITION: Processing cursive doctor script against Caveat-v2 handwriting model...",
        "[1.15s] EXTRACTING: Reading item 1 -> 'Aspirin 81mg' (Confidence rating: 99.2%)...",
        "[1.32s] EXTRACTING: Reading item 2 -> 'Lisinopril 10mg' (Confidence rating: 98.4%)...",
        "[1.50s] EXTRACTING: Reading item 3 -> 'Atorvastatin 20mg' (Confidence rating: 98.1%)...",
        "[1.68s] SAFETY SHIELD: Cross-referencing active chemical profiles for interaction overlaps...",
        "[1.80s] SCAN COMPLETE: 98.6% average interpretation accuracy confirmed."
      ];
      
      let curIdx = 0;
      const interval = setInterval(() => {
        if (curIdx < logs.length) {
          // If sample 2 selected, change the log list for sample 2
          if (selectedSampleId === 'pres_02') {
            const riveraLogs = [
              "[0.00s] INITIALIZING: Booting MedDNA OCR Neural Engine v3.4.1 (GPU acceleration active)...",
              "[0.18s] PREPARATION: Pre-loading clinical FDA database matching maps...",
              "[0.35s] IMAGE ANALYSIS: Analyzing contrast grid, de-skewing angle (-0.12° correction)...",
              "[0.55s] CONTRAST CORRECTION: Normalizing luminance channels, sharpening script margins...",
              "[0.72s] SEGMENTATION: Mapping handwritten script lines. Clinic header boundary detected.",
              "[0.95s] RECOGNITION: Processing cursive doctor script against Caveat-v2 handwriting model...",
              "[1.15s] EXTRACTING: Reading item 1 -> 'Amoxicillin 500mg' (Confidence rating: 99.4%)...",
              "[1.32s] EXTRACTING: Reading item 2 -> 'Ibuprofen 400mg' (Confidence rating: 98.8%)...",
              "[1.55s] SAFETY SHIELD: Cross-referencing active chemical profiles for interaction overlaps...",
              "[1.80s] SCAN COMPLETE: 99.1% average interpretation accuracy confirmed."
            ];
            setConsoleLogs(prev => [...prev, riveraLogs[curIdx]]);
          } else {
            setConsoleLogs(prev => [...prev, logs[curIdx]]);
          }
          curIdx++;
        } else {
          clearInterval(interval);
        }
      }, 150);

      return () => clearInterval(interval);
    }
  }, [isScanning, selectedSampleId]);

  // Autoscroll terminal
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  const handleSelectSample = (id: string) => {
    setSelectedSampleId(id);
    const sample = SAMPLE_PRESCRIPTIONS.find(s => s.id === id);
    if (sample) {
      setSelectedFile(sample.imageUrl);
    }
  };

  const handleCustomFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedFile(event.target.result as string);
          setSelectedSampleId('custom');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartScan = () => {
    if (selectedSampleId === 'custom' && selectedFile) {
      startScanning(selectedFile);
    } else if (!selectedSampleId) {
      handleSelectSample('pres_01');
      startScanning('pres_01');
    } else {
      startScanning(selectedSampleId);
    }
  };

  const handleAddField = () => {
    setEditedMeds(prev => [
      ...prev,
      {
        name: 'New Medicine',
        dosage: '10mg',
        timing: ['morning'],
        instructions: 'Take with water',
        duration: '7 days',
        refillsLeft: 0
      }
    ]);
  };

  const handleRemoveField = (index: number) => {
    setEditedMeds(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateMed = (index: number, key: keyof Omit<ExtractedMedicine, 'id' | 'startDate'>, value: any) => {
    setEditedMeds(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [key]: value
      };
      return copy;
    });
  };

  const handleToggleTiming = (index: number, time: string) => {
    const currentTimings = [...editedMeds[index].timing];
    const timeIdx = currentTimings.indexOf(time);
    
    if (timeIdx > -1) {
      if (currentTimings.length > 1) {
        currentTimings.splice(timeIdx, 1);
      }
    } else {
      currentTimings.push(time);
    }
    
    handleUpdateMed(index, 'timing', currentTimings);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedFile(event.target.result as string);
          setSelectedSampleId('custom');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (editedMeds.length === 0) return;
    saveScannedMeds(editedMeds);
    setSelectedFile(null);
    setSelectedSampleId('');
  };

  const boxes = SAMPLE_BOUNDING_BOXES[selectedSampleId] || SAMPLE_BOUNDING_BOXES['pres_01'];
  const sampleDoc = SAMPLE_PRESCRIPTIONS.find(s => s.id === selectedSampleId) || SAMPLE_PRESCRIPTIONS[0];
  const handwritingLines = sampleDoc.rawHandwriting.split('\n');

  return (
    <div className="scanner-view animate-fade-in">
      
      {/* 1. Upload & Choice Screen */}
      {!isScanning && !scanResult && (
        <div className="upload-container">
          <header className="view-header">
            <h1>Prescription OCR & AI Interpreter</h1>
            <p>Upload a photo, PDF, or choose from our handwriting demo scripts to test the AI extractor.</p>
          </header>

          <div className="scanner-split-layout">
            
            {/* Drag & Drop Area */}
            <div 
              className={`dropzone glass-card ${selectedFile ? 'has-file' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              {selectedFile ? (
                <div className="preview-file-wrapper">
                  <img src={selectedFile} alt="Selected Prescription" className="preview-presc-img" />
                  <button className="remove-file-btn" onClick={() => { setSelectedFile(null); setSelectedSampleId(''); }}>
                    <X size={16} />
                  </button>
                  <div className="file-info-overlay">
                    <FileText size={18} />
                    <span>Selected Prescription Image</span>
                  </div>
                </div>
              ) : (
                <div className="dropzone-prompt">
                  <div className="dropzone-icon-glow">
                    <UploadCloud size={32} />
                  </div>
                  <h3>Drag & Drop Prescription</h3>
                  <p className="dropzone-subtitle">Supports JPG, PNG, PDF or camera snaps</p>
                  <label className="btn btn-secondary upload-input-btn">
                    Browse Files
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }}
                      onChange={handleCustomFileChange} 
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Preloaded Demo Prescriptions */}
            <div className="demo-select-panel">
              <h3>Try Sample Prescriptions (Handwritten OCR Demo)</h3>
              <p className="section-desc">Click a card to load pre-scanned mock handwriting samples.</p>
              
              <div className="sample-cards-grid">
                {SAMPLE_PRESCRIPTIONS.map(sample => (
                  <div 
                    key={sample.id}
                    className={`sample-select-card glass-card interactive ${selectedSampleId === sample.id ? 'selected' : ''}`}
                    onClick={() => handleSelectSample(sample.id)}
                  >
                    <div className="sample-card-head">
                      <span className="sample-doctor">{sample.doctorName.split(',')[0]}</span>
                      <span className="badge badge-info">{sample.specialty.split(' ')[0]}</span>
                    </div>
                    <div className="sample-card-preview-text">
                      <p>"{sample.rawHandwriting.split('\n')[2]}"</p>
                      <p>"{sample.rawHandwriting.split('\n')[3]}"</p>
                    </div>
                    <div className="sample-card-footer">
                      <span>Date: {sample.date}</span>
                      <span>{sample.parsedMeds.length} medicines</span>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                className="btn btn-primary start-scan-action-btn"
                onClick={handleStartScan}
                disabled={!selectedFile && !selectedSampleId}
              >
                <Sparkles size={16} /> Parse prescription with MedDNA AI
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. Scanning / Loading Screen (Command Line Logging terminal style) */}
      {isScanning && (
        <div className="scanning-screen-wrapper glass-card" style={{ maxWidth: '950px' }}>
          <div className="scanner-animation-container">
            {selectedFile ? (
              <img src={selectedFile} alt="Scanning" className="scanning-preview-img" />
            ) : (
              <div className="scanning-fallback-box"><FileText size={48} /></div>
            )}
            <div className="scanner-laser-line" />
            <div className="scanner-scanning-overlay" />
          </div>

          <div className="scanning-status-box">
            <div className="glass-card ocr-console-card">
              <div className="console-header">
                <div className="console-green-dot" />
                <span className="console-title">MedDNA-OCR-ENGINE://terminal_logs</span>
              </div>
              <div className="console-output-area">
                {consoleLogs.map((log, idx) => {
                  const isHighlight = log.includes("COMPLETE") || log.includes("ACCURACY") || log.includes("accuracy");
                  return (
                    <div key={idx} className={`console-log-line ${isHighlight ? 'highlight' : ''}`}>
                      {log}
                    </div>
                  );
                })}
                <div ref={consoleEndRef} />
              </div>
            </div>
            
            <button className="btn btn-secondary btn-cancel-scan" onClick={cancelScanning} style={{ alignSelf: 'flex-end' }}>
              Cancel Scan
            </button>
          </div>
        </div>
      )}

      {/* 3. Review & Verification Screen (Interactive split screen bounding boxes) */}
      {!isScanning && scanResult && (
        <div className="review-container animate-fade-in">
          <header className="view-header">
            <div className="flex-title-row">
              <h1>Verify Parsed Medications</h1>
              <span className="badge badge-success"><Sparkles size={12} /> AI Extraction Complete</span>
            </div>
            <p>Hover over the prescription regions or the editor cards below to see matched coordinate blocks.</p>
          </header>

          <div className="review-split-layout">
            
            {/* Left: Custom Simulated Handwriting Prescription Paper or Custom Upload Preview */}
            {selectedSampleId === 'custom' ? (
              <div className="custom-presc-preview-card glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '420px', padding: '1rem' }}>
                <h3 style={{ fontSize: '0.95rem' }}>Uploaded Prescription Document</h3>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                  <img src={selectedFile || ''} alt="Uploaded prescription" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  <div className="scanner-laser-line" style={{ animation: 'laserScan 3s ease-in-out infinite' }} />
                </div>
                <div style={{ background: '#fcfcfc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', maxHeight: '100px', overflowY: 'auto' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Extracted OCR Text snippet</span>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                    {scanResult.rawText}
                  </p>
                </div>
              </div>
            ) : (
              <div className="clinical-presc-slip">
                <div className="slip-header">
                  <div className="slip-header-title">{sampleDoc.doctorName}</div>
                  <div className="slip-header-sub">{sampleDoc.specialty}</div>
                  <div className="slip-meta-row">
                    <span>Patient Name: Alex Mercer</span>
                    <span>Date: {sampleDoc.date}</span>
                  </div>
                </div>
                
                <div className="slip-body">
                  <div className="rx-symbol">Rx</div>
                  <div className="handwritten-content">
                    {handwritingLines.slice(2, selectedSampleId === 'pres_02' ? 4 : 5).map((line, idx) => (
                      <div key={idx} className="handwritten-line">
                        {line}
                      </div>
                    ))}
                    <div className="handwritten-line" style={{ marginTop: '2rem', fontSize: '1.25rem', fontFamily: 'sans-serif', opacity: 0.6 }}>
                      {handwritingLines[selectedSampleId === 'pres_02' ? 4 : 5]}
                    </div>
                    <div className="handwritten-line" style={{ fontSize: '1.25rem', fontFamily: 'sans-serif', opacity: 0.6 }}>
                      {handwritingLines[selectedSampleId === 'pres_02' ? 5 : 6]}
                    </div>
                  </div>

                  {/* Absolutely positioned glowing bounding boxes */}
                  <div className="ocr-bounding-box-layer">
                    {boxes.map((box, idx) => (
                      <div 
                        key={idx}
                        className={`ocr-bounding-box ${hoveredMedIndex === idx ? 'active-hover' : ''}`}
                        style={{ 
                          top: box.top, 
                          left: box.left, 
                          width: box.width, 
                          height: box.height 
                        }}
                        onMouseEnter={() => setHoveredMedIndex(idx)}
                        onMouseLeave={() => setHoveredMedIndex(null)}
                      >
                        <div className="confidence-bubble">
                          {box.confidence}% confident
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Right: Editable list editor */}
            <div className="glass-card meds-editor-card">
              <div className="editor-card-header">
                <h3>Structured Medication Rules</h3>
                <button className="btn btn-secondary btn-xs" onClick={handleAddField}>
                  <Plus size={14} /> Add Medicine
                </button>
              </div>

              <div className="meds-editor-list">
                {editedMeds.map((med, idx) => (
                  <div 
                    key={idx} 
                    className={`med-edit-row ${hoveredMedIndex === idx ? 'active-row-hover' : ''}`}
                    onMouseEnter={() => setHoveredMedIndex(idx)}
                    onMouseLeave={() => setHoveredMedIndex(null)}
                  >
                    <div className="med-row-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h4>Medication #{idx + 1}</h4>
                        {boxes[idx] ? (
                          <div className="confidence-editor-label" style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.7rem',
                            color: 'var(--color-success)',
                            background: 'var(--color-success-glow)',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            fontWeight: 600
                          }}>
                            <Sparkles size={10} />
                            <span>{boxes[idx].confidence}% OCR Confidence</span>
                          </div>
                        ) : (
                          <div className="confidence-editor-label" style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.7rem',
                            color: 'var(--color-primary)',
                            background: 'var(--color-primary-glow)',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            fontWeight: 600
                          }}>
                            <Sparkles size={10} />
                            <span>98.6% Extraction Match</span>
                          </div>
                        )}
                      </div>
                      
                      <button className="remove-med-row-btn" onClick={() => handleRemoveField(idx)}>
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="edit-inputs-grid">
                      {/* Name */}
                      <div className="input-group">
                        <label>Medicine Name</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          value={med.name} 
                          onChange={(e) => handleUpdateMed(idx, 'name', e.target.value)} 
                        />
                      </div>

                      {/* Dosage */}
                      <div className="input-group">
                        <label>Dosage strength</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          value={med.dosage} 
                          onChange={(e) => handleUpdateMed(idx, 'dosage', e.target.value)} 
                        />
                      </div>

                      {/* Duration */}
                      <div className="input-group">
                        <label>Duration (days)</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          value={med.duration} 
                          onChange={(e) => handleUpdateMed(idx, 'duration', e.target.value)} 
                        />
                      </div>

                      {/* Refills */}
                      <div className="input-group">
                        <label>Refills Allowed</label>
                        <input 
                          type="number" 
                          className="input-field" 
                          value={med.refillsLeft} 
                          onChange={(e) => handleUpdateMed(idx, 'refillsLeft', parseInt(e.target.value) || 0)} 
                        />
                      </div>
                    </div>

                    {/* Schedule slots */}
                    <div className="timing-selector-group">
                      <span className="timing-lbl">Daily Dosage Schedule:</span>
                      <div className="timing-pills-row">
                        {['morning', 'afternoon', 'evening', 'night'].map(time => {
                          const isSelected = med.timing.includes(time);
                          return (
                            <button
                              key={time}
                              type="button"
                              className={`timing-pill ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleToggleTiming(idx, time)}
                            >
                              {time.toUpperCase()}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="input-group">
                      <label>Additional Intake Directions</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={med.instructions} 
                        onChange={(e) => handleUpdateMed(idx, 'instructions', e.target.value)} 
                      />
                    </div>
                  </div>
                ))}

                {editedMeds.length === 0 && (
                  <div className="empty-editor-warning">
                    <p>No medicines in the review list. Click 'Add Medicine' to insert a record.</p>
                  </div>
                )}
              </div>

              <div className="editor-actions-footer">
                <button className="btn btn-secondary" onClick={cancelScanning}>
                  Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSave}
                  disabled={editedMeds.length === 0}
                >
                  <Check size={16} /> Import into Dashboard Timeline
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
};
