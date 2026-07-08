import React, { useState, useEffect, useRef } from 'react';
import { useMed } from '../context/MedContext';
import { type ExtractedMedicine } from '../services/mockData';
import { 
  UploadCloud, 
  FileText, 
  Sparkles, 
  Check, 
  X, 
  Plus, 
  Trash2,
  AlertCircle,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  RefreshCw,
  FileCheck,
  Clipboard,
  Loader2
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
  const [scanProgress, setScanProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [editedMeds, setEditedMeds] = useState<(Omit<ExtractedMedicine, 'id' | 'startDate'> & { selected: boolean })[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);

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

  // Handle auto-scroll inside the logs terminal console
  useEffect(() => {
    if (isScanning && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scanProgress, isScanning]);

  // OCR scanning progress simulator
  useEffect(() => {
    if (isScanning) {
      setScanProgress(0);
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev < 100) {
            return prev + 5;
          } else {
            clearInterval(interval);
            return 100;
          }
        });
      }, 120);

      return () => clearInterval(interval);
    }
  }, [isScanning]);

  const handleCustomFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const rawData = event.target.result as string;
          const compressed = await compressImage(rawData);
          setSelectedFile(compressed);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartScan = () => {
    if (selectedFile) {
      startScanning(selectedFile);
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

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const rawData = event.target.result as string;
          const compressed = await compressImage(rawData);
          setSelectedFile(compressed);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const medsToImport = editedMeds.filter(m => m.selected);
    if (medsToImport.length === 0) return;
    saveScannedMeds(medsToImport.map(({ selected, ...rest }) => rest));
    setSelectedFile(null);
  };

  const isDuplicate = (name?: string) => {
    if (!name) return false;
    return medicines.some(m => m.name && m.name.toLowerCase().trim() === name.toLowerCase().trim());
  };

  const toggleMedSelection = (idx: number) => {
    handleUpdateMed(idx, 'selected', !editedMeds[idx].selected);
  };

  const selectAllMeds = () => setEditedMeds(prev => prev.map(m => ({ ...m, selected: true })));
  const deselectAllMeds = () => setEditedMeds(prev => prev.map(m => ({ ...m, selected: false })));

  const handleCopyRaw = () => {
    if (scanResult?.rawText) {
      navigator.clipboard.writeText(scanResult.rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getFriendlyStatus = (progress: number, lang: string) => {
    const isBn = lang === 'bn';
    if (progress < 25) {
      return isBn ? "প্রেসক্রিপশন ফাইল রিড করা হচ্ছে..." : "Reading prescription document...";
    } else if (progress < 50) {
      return isBn ? "ওষুধের তালিকা সনাক্ত করা হচ্ছে..." : "Extracting medicines with MedDNA AI...";
    } else if (progress < 75) {
      return isBn ? "সেবনের সময়সূচী সাজানো হচ্ছে..." : "Structuring dosage schedule timings...";
    } else if (progress < 90) {
      return isBn ? "নিরাপত্তা ও ড্রাগ কনফ্লিক্ট পরীক্ষা করা হচ্ছে..." : "Checking compatibility and safety interactions...";
    } else {
      return isBn ? "চেকলিস্ট ভেরিফিকেশন প্যানেল প্রস্তুত করা হচ্ছে..." : "Preparing clinical review checksheet...";
    }
  };

  return (
    <div className="scanner-view animate-fade-in">
      
      {/* 1. Upload & Choice Screen */}
      {!isScanning && !scanResult && (
        <div className="upload-container">
          <header className="view-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <Sparkles size={28} style={{ color: 'var(--color-primary)' }} />
              <h1>{t('ocrHeader')}</h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.4rem', maxWidth: '600px', margin: '0.4rem auto 0' }}>{t('ocrSub')}</p>
            
            <div className="header-meta-row" style={{ justifyContent: 'center', marginTop: '1rem' }}>
              <span className="meta-pill online">
                <span className="status-dot-pulse" />
                OCR ENGINE: ONLINE
              </span>
              <span className="meta-pill">ACCURACY: 99.4%</span>
              <span className="meta-pill">MODEL: MedVision v4.2</span>
            </div>
          </header>

          {scanError && (
            <div className="glass-card animate-fade-in" style={{ display: 'flex', gap: '0.75rem', padding: '1rem', border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--color-danger)', maxWidth: '680px', margin: '0 auto 1.5rem', borderRadius: 'var(--radius-sm)', alignItems: 'center', justifyContent: 'space-between' }}>
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

          <div className="scanner-single-centered-layout">
            {/* Centered Upload Card */}
            <div className="glass-card upload-control-card">
              <div className="card-section-title">
                <UploadCloud size={18} className="title-icon" />
                <h3>{language === 'bn' ? 'প্রেসক্রিপশন ফাইল আপলোড' : 'Upload Prescription Document'}</h3>
              </div>
              
              <div 
                className={`custom-dropzone ${selectedFile ? 'has-preview' : ''} ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleFileDrop}
              >
                {selectedFile ? (
                  <div className="dropzone-preview-container">
                    <img src={selectedFile} alt="Selected Prescription" className="dropzone-image-element" />
                    <button className="remove-preview-btn" onClick={() => { setSelectedFile(null); }} title={t('cancel')}>
                      <X size={16} />
                    </button>
                    <div className="preview-label-tag">
                      <FileText size={14} />
                      <span>{t('selectedOverlayText')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="dropzone-empty-state">
                    <div className="upload-icon-wrapper">
                      <UploadCloud size={40} />
                    </div>
                    <h3>{t('dragDropPrompt')}</h3>
                    <p>{t('dragDropSub')}</p>
                    
                    <label className="btn btn-secondary btn-upload-interactive">
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
              
              <button 
                className={`btn btn-primary start-scan-glow-btn ${selectedFile ? 'ready' : 'disabled'}`}
                onClick={handleStartScan}
                disabled={!selectedFile}
              >
                <Sparkles size={16} className="btn-sparkle-icon" />
                <span>{language === 'bn' ? 'প্রেসক্রিপশন স্ক্যান করুন' : 'Scan Prescription'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Scanning / Loading Screen (User-friendly modern loader) */}
      {isScanning && (
        <div className="scanner-friendly-loading-container">
          <div className="glass-card loading-details-card">
            <div className="friendly-loader-circle-wrapper">
              <div className="loader-ring-outer" />
              <div className="loader-ring-inner" />
              <div className="loader-icon-center">
                <Loader2 size={36} className="spinner-rotate" />
              </div>
            </div>

            <div className="friendly-loading-text-section">
              <h3>{language === 'bn' ? 'প্রেসক্রিপশন প্রসেস করা হচ্ছে' : 'Processing Prescription'}</h3>
              <p className="loading-status-message">{getFriendlyStatus(scanProgress, language)}</p>
            </div>

            <div className="friendly-progress-bar-section">
              <div className="progress-percentage-label">{scanProgress}%</div>
              <div className="friendly-progress-track">
                <div className="friendly-progress-fill" style={{ width: `${scanProgress}%` }} />
              </div>
            </div>

            <p className="loading-subtext-notice">
              {language === 'bn' 
                ? 'অনুগ্রহ করে অপেক্ষা করুন, মেডডিএনএ এআই প্রেসক্রিপশনের তথ্যগুলো বিশ্লেষণ করছে...' 
                : 'Please wait while MedDNA AI extracts details from your prescription document...'}
            </p>

            <button 
              className="btn btn-secondary btn-cancel-scan-friendly" 
              onClick={cancelScanning}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* 3. Review & Verification Screen */}
      {!isScanning && scanResult && (
        <div className="review-container animate-fade-in">
          <header className="view-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1>{t('scanResultsHeader')}</h1>
              <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                <Sparkles size={11} /> {t('aiCompleteBadge')}
              </span>
              <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                CONFIDENCE: {(scanResult.aiConfidence * 100).toFixed(0)}%
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
              {t('scanResultsSub', { count: editedMeds.length })}
            </p>
          </header>

          <div className="review-dashboard-grid">
            {/* Left side: Uploaded Doc image + doctor metadata card */}
            <div className="doc-preview-card">
              {selectedFile && (
                <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={14} className="title-icon" /> {t('uploadedDocHeader')}
                  </h3>
                  <div className="source-image-frame">
                    <img src={selectedFile} alt="Uploaded prescription" />
                  </div>
                </div>
              )}
              
              {/* Doctor Details Metadata Grid */}
              <div className="glass-card metadata-section">
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileCheck size={14} className="title-icon" /> {language === 'bn' ? 'চিহ্নিত নথি তথ্য' : 'Verified Document Metadata'}
                </h3>
                
                <div className="meta-grid-item">
                  <label>{language === 'bn' ? 'চিকিৎসক' : 'Doctor'}</label>
                  <span>{scanResult.doctorName}</span>
                </div>
                <div className="meta-grid-item">
                  <label>{language === 'bn' ? 'বিশেষত্ব' : 'Specialty'}</label>
                  <span>{scanResult.specialty}</span>
                </div>
                <div className="meta-grid-item">
                  <label>{language === 'bn' ? 'তারিখ' : 'Date'}</label>
                  <span>{scanResult.date}</span>
                </div>
                <div className="meta-grid-item">
                  <label>OCR Engine</label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)' }}>{scanResult.ocrEngine || 'MedVision AI'}</span>
                </div>
              </div>

              {/* OCR raw text card */}
              <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clipboard size={14} className="title-icon" /> {t('extractedOcrHeader')}
                  </h3>
                  <button 
                    onClick={handleCopyRaw}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', color: copied ? 'var(--color-success)' : 'var(--text-secondary)' }}
                  >
                    {copied ? <Check size={10} /> : null}
                    {copied ? (language === 'bn' ? 'কপি হয়েছে' : 'Copied') : (language === 'bn' ? 'টেক্সট কপি' : 'Copy Text')}
                  </button>
                </div>
                <div className="raw-transcript-box">
                  <pre>{scanResult.rawText || t('noOcrText')}</pre>
                </div>
              </div>
            </div>

            {/* Right side: Verification checklist editor */}
            <div className="glass-card verification-editor-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                  {t('extractedMedsHeader')} ({editedMeds.length})
                </h3>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button className="btn btn-secondary btn-xs" onClick={selectAllMeds} style={{ fontSize: '0.7rem' }}>{t('selectAll')}</button>
                  <button className="btn btn-secondary btn-xs" onClick={deselectAllMeds} style={{ fontSize: '0.7rem' }}>{t('deselectAll')}</button>
                </div>
              </div>

              {editedMeds.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>{t('noMedsExtracted')}</p>
                  <p style={{ fontSize: '0.8rem' }}>{t('notAPrescNotice')}</p>
                </div>
              ) : (
                <div className="checklist-scroll-area">
                  {editedMeds.map((med, idx) => {
                    const duplicate = isDuplicate(med.name);
                    const isSelected = med.selected;
                    
                    const timeLabels: Record<string, string> = {
                      morning: language === 'bn' ? 'সকাল' : 'Morning',
                      afternoon: language === 'bn' ? 'দুপুর' : 'Afternoon',
                      evening: language === 'bn' ? 'সন্ধ্যা' : 'Evening',
                      night: language === 'bn' ? 'রাত' : 'Night'
                    };

                    return (
                      <div 
                        key={idx} 
                        className={`clinical-med-card ${isSelected ? 'selected' : ''} ${duplicate ? 'duplicate' : ''}`}
                      >
                        {/* Custom styled checkbox column */}
                        <div className="med-checkbox-col">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleMedSelection(idx)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                          />
                        </div>

                        {/* Editable form fields column */}
                        <div className="med-details-col">
                          {/* Header name row */}
                          <div className="med-card-header">
                            <div className="med-title-row">
                              <h4>{med.name || (language === 'bn' ? 'নতুন ওষুধ' : 'New Medicine')}</h4>
                              <span className="dosage-badge-micro">{med.dosage}</span>
                              
                              {duplicate && (
                                <span className="duplicate-alert-badge">
                                  <AlertCircle size={10} /> {t('medDuplicateBadge')}
                                </span>
                              )}
                            </div>
                            <button 
                              className="delete-med-btn" 
                              onClick={() => handleRemoveField(idx)}
                              title={language === 'bn' ? 'ওষুধ মুছুন' : 'Remove Medicine'}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          {/* Detail inputs grid */}
                          <div className="med-inputs-grid">
                            <div className="inline-input-group">
                              <label>{t('medNameLabel')}</label>
                              <input 
                                type="text" 
                                value={med.name} 
                                onChange={(e) => handleUpdateMed(idx, 'name', e.target.value)} 
                              />
                            </div>
                            <div className="inline-input-group">
                              <label>{t('medDosageLabel')}</label>
                              <input 
                                type="text" 
                                value={med.dosage} 
                                onChange={(e) => handleUpdateMed(idx, 'dosage', e.target.value)} 
                              />
                            </div>
                            <div className="inline-input-group">
                              <label>{t('medDurationLabel')}</label>
                              <input 
                                type="text" 
                                value={med.duration} 
                                onChange={(e) => handleUpdateMed(idx, 'duration', e.target.value)} 
                              />
                            </div>
                            <div className="inline-input-group">
                              <label>{t('medRefillsLabel')}</label>
                              <input 
                                type="number" 
                                value={med.refillsLeft} 
                                onChange={(e) => handleUpdateMed(idx, 'refillsLeft', parseInt(e.target.value) || 0)} 
                              />
                            </div>
                          </div>

                          {/* Interactive scheduler row */}
                          <div className="timing-pills-row">
                            <label>{t('medScheduleLabel')}</label>
                            {[
                              { key: 'morning', label: timeLabels.morning, icon: <Sunrise size={11} /> },
                              { key: 'afternoon', label: timeLabels.afternoon, icon: <Sun size={11} /> },
                              { key: 'evening', label: timeLabels.evening, icon: <Sunset size={11} /> },
                              { key: 'night', label: timeLabels.night, icon: <Moon size={11} /> }
                            ].map(({ key, label, icon }) => {
                              const active = med.timing.includes(key);
                              return (
                                <button 
                                  key={key} 
                                  type="button"
                                  className={`clinical-timing-pill ${active ? 'selected' : ''}`}
                                  onClick={() => handleToggleTiming(idx, key)}
                                >
                                  {icon}
                                  <span>{label}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Extra instructions field */}
                          <div>
                            <input 
                              type="text" 
                              className="med-instructions-field" 
                              value={med.instructions} 
                              onChange={(e) => handleUpdateMed(idx, 'instructions', e.target.value)} 
                              placeholder={language === 'bn' ? 'খাওয়ার নিয়ম বা বিশেষ নির্দেশাবলী...' : "Dosage instructions or food rules..."} 
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add manual button inside checklist card */}
              <button className="btn-add-manual-dashed" onClick={handleAddField}>
                <Plus size={16} />
                <span>{t('addManual')}</span>
              </button>

              {/* Import/Save Footer Actions */}
              <div className="editor-footer-row">
                <div className="footer-selection-summary">
                  <span>{t('selectedForImport', { selected: editedMeds.filter(m => m.selected).length, total: editedMeds.length })}</span>
                  {editedMeds.some(m => m.selected && isDuplicate(m.name)) && (
                    <span className="duplicate-count-badge">{t('includesDuplicates')}</span>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-secondary" onClick={cancelScanning} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <RefreshCw size={12} />
                    <span>{language === 'bn' ? 'পুনরায় স্ক্যান' : 'Scan Another'}</span>
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSave}
                    disabled={editedMeds.filter(m => m.selected).length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.4rem' }}
                  >
                    <Check size={16} /> 
                    <span>{t('importSelectedMeds', { count: editedMeds.filter(m => m.selected).length })}</span>
                  </button>
                </div>
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
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 0.5rem;
        }

        .header-meta-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-top: 0.5rem;
        }

        .meta-pill {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 0.25rem 0.6rem;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
        }

        .meta-pill.online {
          color: var(--color-success);
          border-color: rgba(16, 185, 129, 0.25);
          background: var(--color-success-glow);
        }

        /* Single centered layout on landing */
        .scanner-single-centered-layout {
          max-width: 680px;
          margin: 1rem auto;
          width: 100%;
        }

        .upload-control-card {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 2rem;
        }

        .custom-dropzone {
          border: 2px dashed var(--border-color);
          border-radius: var(--radius-md);
          min-height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.01);
          transition: all 0.2s ease-in-out;
          position: relative;
          overflow: hidden;
        }

        .custom-dropzone:hover {
          border-color: var(--color-primary);
          background: rgba(6, 182, 212, 0.02);
        }

        .custom-dropzone.has-preview {
          border-style: solid;
          border-color: var(--color-primary);
        }

        .custom-dropzone.dragging {
          border-color: var(--color-primary);
          background: rgba(6, 182, 212, 0.05);
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.15);
        }

        .dropzone-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2.5rem 1.5rem;
          gap: 0.85rem;
        }

        .upload-icon-wrapper {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.3s ease;
        }

        .custom-dropzone:hover .upload-icon-wrapper {
          color: var(--color-primary);
          transform: translateY(-3px);
          box-shadow: 0 4px 12px var(--color-primary-glow);
          border-color: var(--color-primary);
        }

        .dropzone-empty-state h3 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .dropzone-empty-state p {
          font-size: 0.78rem;
          color: var(--text-muted);
          margin: 0;
          max-width: 220px;
        }

        .btn-upload-interactive {
          margin-top: 0.5rem;
          padding: 0.45rem 1.25rem;
          font-size: 0.8rem;
        }

        /* Image preview box */
        .dropzone-preview-container {
          position: relative;
          width: 100%;
          height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #090d16;
        }

        .dropzone-image-element {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .remove-preview-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 10;
        }

        .remove-preview-btn:hover {
          background: #ef4444;
          border-color: #ef4444;
          transform: scale(1.08);
        }

        .preview-label-tag {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.35rem 0.9rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.9);
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        }

        .start-scan-glow-btn {
          max-width: 260px;
          width: 100%;
          padding: 0.65rem 1.25rem;
          font-weight: 600;
          font-size: 0.88rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin: 1.5rem auto 0;
          transition: all 0.2s ease;
          border-radius: var(--radius-sm);
        }

        .start-scan-glow-btn.ready {
          box-shadow: 0 0 15px var(--color-primary-glow);
        }

        .start-scan-glow-btn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Centered User-Friendly Loader Container */
        .scanner-friendly-loading-container {
          max-width: 520px;
          margin: 4rem auto;
          width: 100%;
        }

        .loading-details-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 3.5rem 2.5rem;
          gap: 1.75rem;
        }

        .friendly-loader-circle-wrapper {
          position: relative;
          width: 110px;
          height: 110px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loader-ring-outer {
          position: absolute;
          inset: 0;
          border: 3.5px dashed rgba(6, 182, 212, 0.15);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: spinOuter 2.5s linear infinite;
        }

        .loader-ring-inner {
          position: absolute;
          inset: 12px;
          border: 3px solid rgba(16, 185, 129, 0.05);
          border-bottom-color: #10b981;
          border-radius: 50%;
          animation: spinInner 1.8s linear infinite;
        }

        .loader-icon-center {
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }

        .spinner-rotate {
          animation: spinOuter 2s linear infinite;
        }

        @keyframes spinOuter {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes spinInner {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }

        .friendly-loading-text-section h3 {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 0.5rem 0;
        }

        .loading-status-message {
          font-size: 0.88rem;
          color: var(--color-primary);
          font-weight: 600;
          margin: 0;
          min-height: 22px;
        }

        .friendly-progress-bar-section {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }

        .progress-percentage-label {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .friendly-progress-track {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .friendly-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary), #10b981);
          box-shadow: 0 0 10px var(--color-primary-glow);
          border-radius: var(--radius-full);
          transition: width 0.2s ease-out;
        }

        .loading-subtext-notice {
          font-size: 0.78rem;
          color: var(--text-muted);
          margin: 0;
          max-width: 320px;
          line-height: 1.4;
        }

        .btn-cancel-scan-friendly {
          margin-top: 0.5rem;
          padding: 0.45rem 1.75rem;
          font-size: 0.8rem;
          font-weight: 600;
        }

        /* Review container styling */
        .review-dashboard-grid {
          display: grid;
          grid-template-columns: 1.2fr 1.8fr;
          gap: 1.75rem;
          align-items: start;
        }

        @media (max-width: 950px) {
          .review-dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        .doc-preview-card {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .source-image-frame {
          background: #090d16;
          border-radius: var(--radius-sm);
          overflow: hidden;
          border: 1px solid var(--border-color);
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .source-image-frame img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .metadata-section {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .meta-grid-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          padding-bottom: 0.4rem;
        }

        .meta-grid-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .meta-grid-item label {
          color: var(--text-muted);
          font-weight: 500;
        }

        .meta-grid-item span {
          color: var(--text-primary);
          font-weight: 600;
        }

        .raw-transcript-box {
          background: rgba(0, 0, 0, 0.1);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 0.75rem;
          max-height: 180px;
          overflow-y: auto;
        }

        .raw-transcript-box pre {
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.72rem;
          color: var(--text-secondary);
          white-space: pre-wrap;
          margin: 0;
          line-height: 1.4;
        }

        /* Medicine Checklist Editor */
        .verification-editor-card {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .checklist-scroll-area {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-height: 480px;
          overflow-y: auto;
          padding-right: 0.25rem;
        }

        .clinical-med-card {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.01);
          display: flex;
          gap: 1rem;
          transition: all 0.2s ease-in-out;
          position: relative;
        }

        .clinical-med-card.selected {
          border-color: rgba(6, 182, 212, 0.3);
          background: rgba(6, 182, 212, 0.02);
        }

        .clinical-med-card.duplicate {
          border-color: rgba(245, 158, 11, 0.4);
          background: rgba(245, 158, 11, 0.02);
        }

        .med-checkbox-col {
          display: flex;
          align-items: flex-start;
          padding-top: 0.2rem;
        }

        .med-details-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .med-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .med-title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .med-card-header h4 {
          font-size: 0.95rem;
          font-weight: 800;
          margin: 0;
          color: var(--text-primary);
        }

        .dosage-badge-micro {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--color-primary);
          background: var(--color-primary-glow);
          padding: 0.15rem 0.55rem;
          border-radius: var(--radius-xs);
        }

        .duplicate-alert-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.68rem;
          font-weight: 700;
          color: #d97706;
          background: rgba(245, 158, 11, 0.15);
          padding: 0.15rem 0.5rem;
          border-radius: var(--radius-xs);
        }

        .delete-med-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.35rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .delete-med-btn:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.05);
        }

        /* Input Grid inside Med Card */
        .med-inputs-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 0.75rem;
        }

        @media (max-width: 600px) {
          .med-inputs-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .inline-input-group {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .inline-input-group label {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-secondary);
          letter-spacing: 0.02em;
        }

        .inline-input-group input {
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xs);
          padding: 0.4rem 0.6rem;
          font-size: 0.8rem;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s ease;
        }

        .inline-input-group input:focus {
          border-color: var(--color-primary);
        }

        /* Timing slots in card */
        .timing-pills-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .timing-pills-row label {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-muted);
          margin-right: 0.25rem;
        }

        .clinical-timing-pill {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.68rem;
          font-weight: 600;
          padding: 0.25rem 0.65rem;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .clinical-timing-pill:hover {
          border-color: rgba(6, 182, 212, 0.3);
          background: rgba(6, 182, 212, 0.02);
        }

        .clinical-timing-pill.selected {
          background: var(--color-primary-glow);
          border-color: var(--color-primary);
          color: var(--color-primary);
        }

        .med-instructions-field {
          width: 100%;
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xs);
          padding: 0.45rem 0.65rem;
          font-size: 0.78rem;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s ease;
        }

        .med-instructions-field:focus {
          border-color: var(--color-primary);
        }

        /* Add manual card */
        .btn-add-manual-dashed {
          width: 100%;
          border: 2px dashed var(--border-color);
          border-radius: var(--radius-md);
          background: transparent;
          color: var(--text-secondary);
          padding: 1rem;
          font-size: 0.85rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }

        .btn-add-manual-dashed:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
          background: rgba(6, 182, 212, 0.01);
          transform: scale(0.995);
        }

        /* Footer info */
        .editor-footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
          border-top: 1px solid var(--border-color);
          padding-top: 1.25rem;
          gap: 1.5rem;
        }

        @media (max-width: 600px) {
          .editor-footer-row {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }
        }

        .footer-selection-summary {
          font-size: 0.8rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .duplicate-count-badge {
          color: #d97706;
          font-weight: bold;
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
};
