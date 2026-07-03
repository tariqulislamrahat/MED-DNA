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

  const handleStartScan = () => {
    if (!selectedSampleId) {
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
    handleSelectSample('pres_01');
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
                      onChange={() => handleSelectSample('pres_01')} 
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
            
            {/* Left: Custom Simulated Handwriting Prescription Paper */}
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
                        {boxes[idx] && (
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

      <style>{`
        .scanner-view {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .view-header {
          margin-bottom: 1.5rem;
        }

        .view-header h1 {
          font-size: 1.8rem;
          font-weight: 800;
        }

        .view-header p {
          color: var(--text-secondary);
          font-size: 0.95rem;
        }

        .scanner-split-layout {
          display: grid;
          grid-template-columns: 1.1fr 1.9fr;
          gap: 2rem;
        }

        @media (max-width: 900px) {
          .scanner-split-layout {
            grid-template-columns: 1fr;
          }
        }

        /* Dropzone Styling */
        .dropzone {
          min-height: 380px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px dashed rgba(255, 255, 255, 0.1);
          background: rgba(22, 30, 49, 0.25);
          text-align: center;
          cursor: pointer;
          position: relative;
          padding: 1rem;
        }

        .dropzone.has-file {
          border-style: solid;
          border-color: var(--border-color);
          padding: 0;
        }

        .dropzone:hover {
          border-color: var(--color-primary);
        }

        .dropzone-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .dropzone-icon-glow {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: var(--color-primary-glow);
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.5rem;
          box-shadow: 0 0 20px rgba(13, 148, 136, 0.2);
        }

        .dropzone-subtitle {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .upload-input-btn {
          margin-top: 0.5rem;
        }

        .preview-file-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 380px;
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .preview-presc-img {
          width: 100%;
          height: 100%;
          min-height: 380px;
          max-height: 450px;
          object-fit: cover;
        }

        .remove-file-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .remove-file-btn:hover {
          background: rgba(244, 63, 94, 0.8);
        }

        .file-info-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%);
          padding: 1.5rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: white;
          font-size: 0.85rem;
          font-weight: 500;
        }

        /* Demo panel styling */
        .demo-select-panel {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .section-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .sample-cards-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        @media (max-width: 600px) {
          .sample-cards-grid {
            grid-template-columns: 1fr;
          }
        }

        .sample-select-card {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1.25rem;
          border-radius: var(--radius-md);
          background: var(--bg-card);
        }

        .sample-select-card.selected {
          border-color: var(--color-primary);
          background: var(--bg-card-hover);
          box-shadow: 0 0 15px rgba(13, 148, 136, 0.25);
        }

        .sample-card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sample-doctor {
          font-weight: 700;
          font-size: 0.9rem;
        }

        .sample-card-preview-text {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-style: italic;
          background: rgba(0, 0, 0, 0.15);
          padding: 0.5rem;
          border-radius: var(--radius-xs);
          border-left: 2px solid var(--text-muted);
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .sample-card-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          color: var(--text-secondary);
          margin-top: auto;
          border-top: 1px solid var(--border-color);
          padding-top: 0.5rem;
        }

        .start-scan-action-btn {
          margin-top: 1.5rem;
          width: 100%;
          padding: 1rem;
          font-weight: 700;
        }

        /* Scanning screen animation */
        .scanning-screen-wrapper {
          display: flex;
          align-items: center;
          gap: 3rem;
          padding: 3rem;
          max-width: 850px;
          margin: 0 auto;
        }

        @media (max-width: 700px) {
          .scanning-screen-wrapper {
            flex-direction: column;
            gap: 2rem;
            padding: 1.5rem;
          }
        }

        .scanner-animation-container {
          position: relative;
          width: 240px;
          height: 320px;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-color);
          flex-shrink: 0;
        }

        .scanning-preview-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: grayscale(100%) contrast(150%);
        }

        .scanning-fallback-box {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }

        .scanner-laser-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--color-accent);
          box-shadow: 0 0 15px 4px var(--color-accent-glow);
          animation: laserScan 2.5s ease-in-out infinite;
          z-index: 10;
        }

        .scanner-scanning-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle, transparent 30%, rgba(6, 182, 212, 0.15) 100%);
          z-index: 5;
        }

        .scanning-status-box {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          flex: 1;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .scanning-steps-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin: 0.5rem 0;
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .step-item.completed {
          color: var(--color-success);
        }

        .step-item.active {
          color: var(--text-primary);
          font-weight: 500;
        }

        .small-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--color-accent);
          box-shadow: 0 0 8px var(--color-accent);
          animation: pulseGlow 1.5s infinite;
        }

        .btn-cancel-scan {
          margin-top: 1rem;
          align-self: flex-start;
        }

        /* Review Verification Screen */
        .flex-title-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .review-split-layout {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 2rem;
        }

        @media (max-width: 900px) {
          .review-split-layout {
            grid-template-columns: 1fr;
          }
        }

        .raw-transcription-card {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          height: fit-content;
        }

        .meta-info-grid {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          background: rgba(0,0,0,0.2);
          padding: 1rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }

        .meta-row {
          display: flex;
          font-size: 0.85rem;
        }

        .meta-lbl {
          font-weight: 600;
          color: var(--text-secondary);
          width: 130px;
        }

        .meta-val {
          color: var(--text-primary);
        }

        .raw-handwriting-log {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .raw-handwriting-log h4 {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .raw-handwriting-log pre {
          background: #060911;
          color: #a5f3fc;
          font-family: monospace;
          font-size: 0.8rem;
          padding: 1rem;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(6, 182, 212, 0.15);
          white-space: pre-wrap;
          line-height: 1.6;
        }

        .disclaimer-prompt {
          display: flex;
          gap: 0.5rem;
          background: rgba(245, 158, 11, 0.05);
          border: 1px solid rgba(245, 158, 11, 0.2);
          color: var(--color-warning);
          padding: 0.85rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
        }

        .meds-editor-card {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .editor-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn-xs {
          font-size: 0.8rem;
          padding: 0.4rem 0.8rem;
        }

        .meds-editor-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .med-edit-row {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .med-row-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.5rem;
        }

        .med-row-header h4 {
          font-size: 0.95rem;
          color: var(--color-primary);
        }

        .remove-med-row-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: color var(--transition-fast);
        }

        .remove-med-row-btn:hover {
          color: var(--color-danger);
        }

        .edit-inputs-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr 1fr 1fr;
          gap: 1rem;
        }

        @media (max-width: 600px) {
          .edit-inputs-grid {
            grid-template-columns: 1fr;
          }
        }

        .timing-selector-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .timing-lbl {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .timing-pills-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .timing-pill {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 0.35rem 0.85rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .timing-pill:hover {
          border-color: rgba(255, 255, 255, 0.2);
          color: var(--text-primary);
        }

        .timing-pill.selected {
          background: var(--color-primary-glow);
          border-color: var(--color-primary);
          color: var(--color-primary);
        }

        .editor-actions-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          border-top: 1px solid var(--border-color);
          padding-top: 1.5rem;
          margin-top: 1rem;
        }

        .empty-editor-warning {
          text-align: center;
          padding: 2rem;
          color: var(--text-muted);
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
};
