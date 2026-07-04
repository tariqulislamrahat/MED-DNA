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
  Trash2,
  AlertCircle
} from 'lucide-react';



export const Scanner: React.FC = () => {
  const { 
    startScanning, 
    cancelScanning,
    isScanning, 
    scanResult, 
    scanError,
    setScanError,
    saveScannedMeds,
    medicines 
  } = useMed();

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string>('');
  
  // Real-time terminal simulator logs
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const consoleEndRef = React.useRef<HTMLDivElement>(null);

  // Edited list of medicines from scan (with selection status)
  const [editedMeds, setEditedMeds] = useState<(Omit<ExtractedMedicine, 'id' | 'startDate'> & { selected: boolean })[]>([]);

  // Update editor state when scan results arrive
  useEffect(() => {
    if (scanResult) {
      const meds = scanResult.extractedMeds.map(m => ({
        name: m.name,
        dosage: m.dosage,
        timing: [...m.timing],
        instructions: m.instructions,
        duration: m.duration,
        refillsLeft: m.refillsLeft,
        selected: true
      }));
      setEditedMeds(meds);
    }
  }, [scanResult]);

  // Terminal logging typist simulator
  useEffect(() => {
    if (isScanning) {
      setConsoleLogs([]);
      const logs = [
        "[0.00s] INITIALIZING: Connecting to MedDNA API service...",
        "[0.30s] PREPARATION: Preparing image payload vectors...",
        "[0.65s] UPLOAD: Sending image payload to Express server...",
        "[1.10s] RUNNING OCR: Submitting image buffer to NVIDIA Nemotron-OCR-v2 NIM...",
        "[2.15s] OCR ANALYSIS: Reading text shapes and characters (Confidence rating: 98.4%)...",
        "[3.25s] RUNNING LLM: Submitting extracted text blocks to NVIDIA Llama-3.1-8b-Instruct...",
        "[4.50s] LLM EXTRACTING: Parsing doctor signature, specialty, and medications...",
        "[5.80s] COMPILING: Structuring clinical guidelines and timings...",
        "[6.90s] MONGODB LOGGING: Committing prescription scan history to databases...",
        "[7.80s] COMPLETE: Prescription scanned and parsed successfully!"
      ];
      
      let curIdx = 0;
      const interval = setInterval(() => {
        if (curIdx < logs.length) {
          const nextLog = logs[curIdx];
          setConsoleLogs(prev => [...prev, nextLog]);
          curIdx++;
        } else {
          clearInterval(interval);
        }
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isScanning]);

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
        refillsLeft: 0,
        selected: true
      }
    ]);
  };

  const handleRemoveField = (index: number) => {
    setEditedMeds(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateMed = (index: number, key: string, value: any) => {
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
    const medsToImport = editedMeds.filter(m => m.selected);
    if (medsToImport.length === 0) return;
    // Map to remove selection status before importing
    saveScannedMeds(medsToImport.map(({ selected, ...rest }) => rest));
    setSelectedFile(null);
    setSelectedSampleId('');
  };

  // Check if a medicine already exists in dashboard safely
  const isDuplicate = (name?: string) => {
    if (!name) return false;
    return medicines.some(m => m.name && m.name.toLowerCase().trim() === name.toLowerCase().trim());
  };

  const toggleMedSelection = (idx: number) => {
    handleUpdateMed(idx, 'selected', !editedMeds[idx].selected);
  };

  const selectAllMeds = () => setEditedMeds(prev => prev.map(m => ({ ...m, selected: true })));
  const deselectAllMeds = () => setEditedMeds(prev => prev.map(m => ({ ...m, selected: false })));

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

          {scanError && (
            <div className="glass-card animate-fade-in" style={{ display: 'flex', gap: '0.75rem', padding: '1rem', border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--color-danger)', marginBottom: '1.5rem', borderRadius: 'var(--radius-sm)', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertCircle size={20} />
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{scanError}</span>
              </div>
              <button 
                onClick={() => setScanError(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

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
                {consoleLogs.filter(Boolean).map((log, idx) => {
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

      {/* 3. Review & Verification Screen */}
      {!isScanning && scanResult && (
        <div className="review-container animate-fade-in">
          <header className="view-header">
            <div className="flex-title-row">
              <h1>Scan Results</h1>
              <span className="badge badge-success"><Sparkles size={12} /> AI Extraction Complete</span>
            </div>
            <p>
              Found <strong>{editedMeds.length}</strong> medicine{editedMeds.length !== 1 ? 's' : ''} in this prescription. 
              Select which ones to import into your dashboard.
            </p>
          </header>

          {/* Top: Image preview + OCR text side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: selectedFile || selectedSampleId === 'custom' ? '1fr 1fr' : '1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {/* Image preview */}
            {(selectedFile || selectedSampleId !== 'custom') && (
              <div className="glass-card" style={{ padding: '1rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={14} /> Uploaded Document
                </h3>
                {selectedSampleId === 'custom' && selectedFile ? (
                  <div style={{ background: '#f5f5f5', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={selectedFile} alt="Uploaded prescription" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div className="clinical-presc-slip" style={{ transform: 'scale(0.85)', transformOrigin: 'top left' }}>
                    <div className="slip-header">
                      <div className="slip-header-title">{scanResult.doctorName}</div>
                      <div className="slip-header-sub">{scanResult.specialty}</div>
                    </div>
                    <div className="slip-body" style={{ minHeight: '120px' }}>
                      <div className="rx-symbol">Rx</div>
                      <div className="handwritten-content">
                        {handwritingLines.slice(2, 6).map((line, idx) => (
                          <div key={idx} className="handwritten-line">{line}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* OCR extracted text */}
            <div className="glass-card" style={{ padding: '1rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>📝 Extracted OCR Text</h3>
              <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', maxHeight: '220px', overflowY: 'auto' }}>
                <pre style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.5 }}>
                  {scanResult.rawText || '(No raw text extracted)'}
                </pre>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Doctor: <strong>{scanResult.doctorName}</strong> • Specialty: {scanResult.specialty} • Date: {scanResult.date}
              </div>
            </div>
          </div>

          {/* Medicine List with checkboxes */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                💊 Extracted Medicines ({editedMeds.length})
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="btn btn-secondary btn-xs" onClick={selectAllMeds} style={{ fontSize: '0.7rem' }}>Select All</button>
                <button className="btn btn-secondary btn-xs" onClick={deselectAllMeds} style={{ fontSize: '0.7rem' }}>Deselect All</button>
                <button className="btn btn-secondary btn-xs" onClick={handleAddField} style={{ fontSize: '0.7rem' }}>
                  <Plus size={12} /> Add Manual
                </button>
              </div>
            </div>

            {editedMeds.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>No medicines could be extracted from this document.</p>
                <p style={{ fontSize: '0.8rem' }}>This might not be a prescription. You can add medicines manually using the button above.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {editedMeds.map((med, idx) => {
                  const duplicate = isDuplicate(med.name);
                  const isSelected = med.selected;
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        border: `1px solid ${duplicate ? 'rgba(234, 179, 8, 0.4)' : isSelected ? 'rgba(6, 182, 212, 0.3)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-sm)', 
                        padding: '1rem',
                        background: duplicate ? 'rgba(234, 179, 8, 0.03)' : isSelected ? 'rgba(6, 182, 212, 0.02)' : 'transparent',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Top row: checkbox + name + badges + delete */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleMedSelection(idx)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>#{idx + 1} {med.name}</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', background: 'var(--color-primary-glow)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>
                              {med.dosage}
                            </span>
                            {duplicate && (
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b45309', background: 'rgba(234, 179, 8, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <AlertCircle size={10} /> DUPLICATE — Already in Dashboard
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => handleRemoveField(idx)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Editable fields grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.6rem', marginBottom: '0.6rem' }}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.68rem' }}>Name</label>
                          <input type="text" className="input-field" value={med.name} onChange={(e) => handleUpdateMed(idx, 'name', e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }} />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.68rem' }}>Dosage</label>
                          <input type="text" className="input-field" value={med.dosage} onChange={(e) => handleUpdateMed(idx, 'dosage', e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }} />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.68rem' }}>Duration</label>
                          <input type="text" className="input-field" value={med.duration} onChange={(e) => handleUpdateMed(idx, 'duration', e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }} />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.68rem' }}>Refills</label>
                          <input type="number" className="input-field" value={med.refillsLeft} onChange={(e) => handleUpdateMed(idx, 'refillsLeft', parseInt(e.target.value) || 0)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }} />
                        </div>
                      </div>
                      
                      {/* Timing pills */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)' }}>Schedule:</span>
                        {['morning', 'afternoon', 'evening', 'night'].map(time => {
                          const active = med.timing.includes(time);
                          return (
                            <button 
                              key={time} type="button"
                              className={`timing-pill ${active ? 'selected' : ''}`}
                              onClick={() => handleToggleTiming(idx, time)}
                              style={{ fontSize: '0.65rem', padding: '0.2rem 0.6rem' }}
                            >
                              {time.toUpperCase()}
                            </button>
                          );
                        })}
                      </div>

                      {/* Instructions */}
                      <div style={{ marginTop: '0.5rem' }}>
                        <input type="text" className="input-field" value={med.instructions} onChange={(e) => handleUpdateMed(idx, 'instructions', e.target.value)} placeholder="Instructions..." style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem', width: '100%' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <strong>{editedMeds.filter(m => m.selected).length}</strong> of {editedMeds.length} medicine{editedMeds.length !== 1 ? 's' : ''} selected for import
                {editedMeds.some(m => m.selected && isDuplicate(m.name)) && (
                  <span style={{ color: '#b45309', marginLeft: '0.75rem', fontWeight: 600 }}>⚠ Includes duplicates</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={cancelScanning}>Cancel</button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSave}
                  disabled={editedMeds.filter(m => m.selected).length === 0}
                >
                  <Check size={16} /> Import {editedMeds.filter(m => m.selected).length} Medicine{editedMeds.filter(m => m.selected).length !== 1 ? 's' : ''} to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
