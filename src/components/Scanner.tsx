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



const compressImage = (dataUrl: string, maxDim: number = 1600): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

export const Scanner: React.FC = () => {
  const { 
    startScanning, 
    cancelScanning,
    isScanning, 
    scanResult, 
    scanError,
    setScanError,
    saveScannedMeds,
    medicines,
    language,
    t
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
        "[0.30s] PREPARATION: Preparing document payload and metadata...",
        "[0.65s] UPLOAD: Sending image/PDF payload to Express server...",
        "[1.10s] OCR: Running PDF text-layer extraction or NVIDIA Nemotron-OCR-v2...",
        "[2.15s] QUALITY: Scoring OCR density, medication signals, and confidence...",
        "[3.25s] CANDIDATES: Inferring medicines, dose schedules, and meal context...",
        "[4.50s] LLM: Parsing document context with NVIDIA Llama-3.3-70b-Instruct...",
        "[5.80s] VALIDATION: Merging AI output with deterministic medicine candidates...",
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
      reader.onload = async (event) => {
        if (event.target?.result) {
          const rawData = event.target.result as string;
          const compressed = await compressImage(rawData);
          setSelectedFile(compressed);
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
      reader.onload = async (event) => {
        if (event.target?.result) {
          const rawData = event.target.result as string;
          const compressed = await compressImage(rawData);
          setSelectedFile(compressed);
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
            <h1>{t('ocrHeader')}</h1>
            <p>{t('ocrSub')}</p>
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
                    <span>{t('selectedOverlayText')}</span>
                  </div>
                </div>
              ) : (
                <div className="dropzone-prompt">
                  <div className="dropzone-icon-glow">
                    <UploadCloud size={32} />
                  </div>
                  <h3>{t('dragDropPrompt')}</h3>
                  <p className="dropzone-subtitle">{t('dragDropSub')}</p>
                  <label className="btn btn-secondary upload-input-btn">
                    {t('browseFiles')}
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
              <h3>{t('demoSelectTitle')}</h3>
              <p className="section-desc">{t('demoSelectSub')}</p>
              
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
                      <span>{language === 'bn' ? 'তারিখ' : 'Date'}: {sample.date}</span>
                      <span>{sample.parsedMeds.length} {language === 'bn' ? 'টি ওষুধ' : 'medicines'}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                className="btn btn-primary start-scan-action-btn"
                onClick={handleStartScan}
                disabled={!selectedFile && !selectedSampleId}
              >
                <Sparkles size={16} /> {t('parseActionBtn')}
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
              <h1>{t('scanResultsHeader')}</h1>
              <span className="badge badge-success"><Sparkles size={12} /> {t('aiCompleteBadge')}</span>
            </div>
            <p>
              {t('scanResultsSub', { count: editedMeds.length })}
            </p>
          </header>

          {/* Top: Image preview + OCR text side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: selectedFile || selectedSampleId === 'custom' ? '1fr 1fr' : '1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {/* Image preview */}
            {(selectedFile || selectedSampleId !== 'custom') && (
              <div className="glass-card" style={{ padding: '1rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={14} /> {t('uploadedDocHeader')}
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
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>{t('extractedOcrHeader')}</h3>
              <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', maxHeight: '220px', overflowY: 'auto' }}>
                <pre style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.5 }}>
                  {scanResult.rawText || t('noOcrText')}
                </pre>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {language === 'bn' ? 'ডাক্তার' : 'Doctor'}: <strong>{scanResult.doctorName}</strong> • {language === 'bn' ? 'বিশেষত্ব' : 'Specialty'}: {scanResult.specialty} • {language === 'bn' ? 'তারিখ' : 'Date'}: {scanResult.date}
              </div>
            </div>
          </div>

          {/* Medicine List with checkboxes */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                {t('extractedMedsHeader')} ({editedMeds.length})
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="btn btn-secondary btn-xs" onClick={selectAllMeds} style={{ fontSize: '0.7rem' }}>{t('selectAll')}</button>
                <button className="btn btn-secondary btn-xs" onClick={deselectAllMeds} style={{ fontSize: '0.7rem' }}>{t('deselectAll')}</button>
                <button className="btn btn-secondary btn-xs" onClick={handleAddField} style={{ fontSize: '0.7rem' }}>
                  <Plus size={12} /> {t('addManual')}
                </button>
              </div>
            </div>

            {editedMeds.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>{t('noMedsExtracted')}</p>
                <p style={{ fontSize: '0.8rem' }}>{t('notAPrescNotice')}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {editedMeds.map((med, idx) => {
                  const duplicate = isDuplicate(med.name);
                  const isSelected = med.selected;
                  
                  const timeLabels: Record<string, string> = {
                    morning: language === 'bn' ? 'সকাল' : 'MORNING',
                    afternoon: language === 'bn' ? 'দুপুর' : 'AFTERNOON',
                    evening: language === 'bn' ? 'সন্ধ্যা' : 'EVENING',
                    night: language === 'bn' ? 'রাত' : 'NIGHT'
                  };

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
                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t('medNumLabel')} #{idx + 1} {med.name}</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', background: 'var(--color-primary-glow)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>
                              {med.dosage}
                            </span>
                            {duplicate && (
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b45309', background: 'rgba(234, 179, 8, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <AlertCircle size={10} /> {t('medDuplicateBadge')}
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
                          <label style={{ fontSize: '0.68rem' }}>{t('medNameLabel')}</label>
                          <input type="text" className="input-field" value={med.name} onChange={(e) => handleUpdateMed(idx, 'name', e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }} />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.68rem' }}>{t('medDosageLabel')}</label>
                          <input type="text" className="input-field" value={med.dosage} onChange={(e) => handleUpdateMed(idx, 'dosage', e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }} />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.68rem' }}>{t('medDurationLabel')}</label>
                          <input type="text" className="input-field" value={med.duration} onChange={(e) => handleUpdateMed(idx, 'duration', e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }} />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.68rem' }}>{t('medRefillsLabel')}</label>
                          <input type="number" className="input-field" value={med.refillsLeft} onChange={(e) => handleUpdateMed(idx, 'refillsLeft', parseInt(e.target.value) || 0)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }} />
                        </div>
                      </div>
                      
                      {/* Timing pills */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)' }}>{t('medScheduleLabel')}</span>
                        {['morning', 'afternoon', 'evening', 'night'].map(time => {
                          const active = med.timing.includes(time);
                          return (
                            <button 
                              key={time} type="button"
                              className={`timing-pill ${active ? 'selected' : ''}`}
                              onClick={() => handleToggleTiming(idx, time)}
                              style={{ fontSize: '0.65rem', padding: '0.2rem 0.6rem' }}
                            >
                              {timeLabels[time]}
                            </button>
                          );
                        })}
                      </div>

                      {/* Instructions */}
                      <div style={{ marginTop: '0.5rem' }}>
                        <input type="text" className="input-field" value={med.instructions} onChange={(e) => handleUpdateMed(idx, 'instructions', e.target.value)} placeholder={language === 'bn' ? 'নির্দেশাবলী...' : "Instructions..."} style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem', width: '100%' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {t('selectedForImport', { selected: editedMeds.filter(m => m.selected).length, total: editedMeds.length })}
                {editedMeds.some(m => m.selected && isDuplicate(m.name)) && (
                  <span style={{ color: '#b45309', marginLeft: '0.75rem', fontWeight: 600 }}>{t('includesDuplicates')}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={cancelScanning}>{t('cancel')}</button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSave}
                  disabled={editedMeds.filter(m => m.selected).length === 0}
                >
                  <Check size={16} /> {t('importSelectedMeds', { count: editedMeds.filter(m => m.selected).length })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
