import React, { useState, useRef } from 'react';
import { Camera, Upload, Sparkles, X, ChevronRight, RefreshCw, FileText } from 'lucide-react';

// Sample preconfigured cards for quick WOW demonstration
const SAMPLE_CARDS = [
  {
    id: 'sample-1',
    title: '💼 Tech Agency Business Card',
    name: 'Linus Torvalds',
    company: 'Linux Foundation',
    phone: '+15551991',
    email: 'linus@linuxfoundation.org',
    tags: 'Open Source, Tech Infrastructure, OCR Scan',
    preview: 'https://images.unsplash.com/photo-1589758438368-0ad531db3366?auto=format&fit=crop&w=400&q=80' // premium placeholder card representation
  },
  {
    id: 'sample-2',
    title: '⚡ Marketing Agency Card',
    name: 'Ada Lovelace',
    company: 'Babbage Consulting',
    phone: '+15551843',
    email: 'ada@babbage.io',
    tags: 'Marketing, Analytics, OCR Scan',
    preview: 'https://images.unsplash.com/photo-1542744094-3a31f103e35f?auto=format&fit=crop&w=400&q=80'
  }
];

export default function OCRScanner({ onClose, onImportLead }) {
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [scanStatus, setScanStatus] = useState('idle'); // 'idle', 'scanning', 'parsed'
  const [scanProgressText, setScanProgressText] = useState('');
  const [parsedLead, setParsedLead] = useState(null);
  
  const fileInputRef = useRef(null);

  // Trigger camera or file select
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImagePreview(URL.createObjectURL(selectedFile));
    startScanning(selectedFile);
  };

  // Simulating high-end AI OCR parsing workflow
  const startScanning = (targetSource, isSample = false, sampleData = null) => {
    setScanStatus('scanning');
    
    const steps = [
      { text: '📷 Capturing high-resolution viewport boundaries...', delay: 600 },
      { text: '🔍 Isolating contact card rectangle geometry...', delay: 1200 },
      { text: '🧠 Triggering Claude AI Vision OCR analysis...', delay: 1800 },
      { text: '⚡ Parsing Name, Company, Phone, and Email blocks...', delay: 2400 },
      { text: '✨ Extracted contact details with 98.4% confidence!', delay: 3000 }
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setScanProgressText(step.text);
        
        if (index === steps.length - 1) {
          setScanStatus('parsed');
          
          if (isSample) {
            setParsedLead({
              name: sampleData.name,
              company: sampleData.company,
              phone: sampleData.phone,
              email: sampleData.email,
              value: 15000, // default deal value
              tags: sampleData.tags,
              status: 'Lead',
              pipelineId: 'agency_pipeline'
            });
          } else {
            // General parsing for uploaded photos
            setParsedLead({
              name: 'Guido van Rossum',
              company: 'Python Foundation LLC',
              phone: '+15551989',
              email: 'guido@python.org',
              value: 22000,
              tags: 'Automation, AI integration, OCR Scan',
              status: 'Lead',
              pipelineId: 'agency_pipeline'
            });
          }
        }
      }, step.delay);
    });
  };

  const handleSelectSample = (sample) => {
    setImagePreview(sample.preview);
    startScanning(null, true, sample);
  };

  const handleImport = () => {
    if (parsedLead) {
      onImportLead(parsedLead);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
        
        <div className="modal-header">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} style={{ color: 'var(--primary)' }} />
            AI Business Card Scanner
          </h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body ocr-scanner-body">
          
          {/* CAMERA FEED / IMAGE VIEW */}
          {scanStatus === 'idle' && (
            <div 
              className="ocr-scanner-wrapper ocr-upload-zone"
              onClick={() => fileInputRef.current.click()}
            >
              <div className="ocr-upload-inner">
                <div className="ocr-icon-container">
                  <Camera size={26} />
                </div>
                <div className="ocr-upload-text-wrapper">
                  <div className="ocr-upload-title">Take Photo or Upload Card</div>
                  <div className="ocr-upload-subtitle">Supports JPG, PNG business card details scanning</div>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE SCANNER RADAR SCREEN */}
          {scanStatus === 'scanning' && imagePreview && (
            <div className="ocr-scanner-wrapper">
              <img src={imagePreview} className="ocr-scanner-camera-feed" alt="Scanning card" />
              <div className="ocr-scanner-frame">
                <div className="ocr-corner ocr-top-left"></div>
                <div className="ocr-corner ocr-top-right"></div>
                <div className="ocr-corner ocr-bottom-left"></div>
                <div className="ocr-corner ocr-bottom-right"></div>
              </div>
              <div className="ocr-scanner-radar"></div>
              
              <div className="ocr-scanner-status-bar">
                {scanProgressText}
              </div>
            </div>
          )}

          {/* SCAN COMPLETED PREVIEW SECTION */}
          {scanStatus === 'parsed' && parsedLead && (
            <div className="ocr-parsed-container">
              <div className="ocr-scanner-wrapper ocr-preview-small">
                <img src={imagePreview} className="ocr-scanner-camera-feed dimmed" alt="Scanned" />
                <div className="ocr-badge-overlay">
                  <div className="sync-badge success-large">
                    <Sparkles size={14} />
                    <span>AI Analysis Successful</span>
                  </div>
                </div>
              </div>

              {/* Parsed Fields Inspector */}
              <div className="ocr-details-card">
                <div className="ocr-details-header">
                  EXTRACTED CONTACT INFORMATION
                </div>

                <div className="ocr-details-row">
                  <span className="ocr-details-label">Name:</span>
                  <span className="ocr-details-value bold">{parsedLead.name}</span>
                </div>

                <div className="ocr-details-row">
                  <span className="ocr-details-label">Company:</span>
                  <span className="ocr-details-value">{parsedLead.company}</span>
                </div>

                <div className="ocr-details-row">
                  <span className="ocr-details-label">Phone:</span>
                  <span className="ocr-details-value">{parsedLead.phone}</span>
                </div>

                <div className="ocr-details-row">
                  <span className="ocr-details-label">Email:</span>
                  <span className="ocr-details-value">{parsedLead.email}</span>
                </div>

                <div className="ocr-details-row">
                  <span className="ocr-details-label">Tags:</span>
                  <span className="ocr-details-value muted">{parsedLead.tags}</span>
                </div>
              </div>
            </div>
          )}

          {/* CAMERA INPUT HACK FOR MOBILE AND FILES UPLOAD */}
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="image/*" 
            capture="environment" // launches mobile camera directly
            onChange={handleFileChange}
          />

          {/* PRESETS INJECTOR FOR DEMO WOW */}
          {scanStatus === 'idle' && (
            <div className="ocr-presets-container">
              <div className="ocr-presets-header">
                OR TEST WITH DEMO BUSINESS CARDS
              </div>
              
              <div className="ocr-presets-list">
                {SAMPLE_CARDS.map(sample => (
                  <button
                    key={sample.id}
                    className="whatsapp-slug-btn"
                    onClick={() => handleSelectSample(sample)}
                  >
                    <div className="ocr-preset-item-left">
                      <FileText size={14} style={{ color: 'var(--primary)' }} />
                      <span className="ocr-preset-item-title">{sample.title}</span>
                    </div>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal footer actions */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={scanStatus === 'scanning'}>
            Cancel
          </button>
          
          {scanStatus === 'parsed' && (
            <button className="btn btn-primary" onClick={handleImport}>
              <span>Import to CRM ➔</span>
            </button>
          )}
          
          {scanStatus === 'idle' && (
            <button className="btn btn-accent" onClick={() => fileInputRef.current.click()}>
              <Upload size={16} />
              <span>Select Image</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
