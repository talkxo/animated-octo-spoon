import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  MessageSquare, 
  Phone, 
  Mail, 
  Briefcase, 
  DollarSign, 
  Tag, 
  Calendar,
  Send,
  Sparkles,
  ClipboardList,
  ChevronDown,
  Check,
  AlertTriangle
} from 'lucide-react';
import OCRScanner from './OCRScanner';

const getCurrencySymbol = (currencyCode) => {
  const mapping = {
    USD: '$',
    INR: '₹',
    EUR: '€',
    GBP: '£',
    AED: 'د.إ',
    CAD: 'C$',
    AUD: 'A$',
    SGD: 'S$'
  };
  return mapping[currencyCode] || '$';
};

const formatDateTimeSafe = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) {
      const cleaned = String(dateString).trim();
      const parts = cleaned.split(/[\sT]+/);
      if (parts.length >= 1) {
        const dateParts = parts[0].split(/[-/]/);
        if (dateParts.length === 3) {
          let year = parseInt(dateParts[0]);
          let month = parseInt(dateParts[1]) - 1;
          let day = parseInt(dateParts[2]);
          if (dateParts[0].length !== 4) {
            const standardParsed = new Date(cleaned.replace(/-/g, '/'));
            if (!isNaN(standardParsed.getTime())) {
              return standardParsed.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
            }
          } else {
            let hours = 0, minutes = 0, seconds = 0;
            if (parts[1]) {
              const timeParts = parts[1].split(':');
              hours = parseInt(timeParts[0]) || 0;
              minutes = parseInt(timeParts[1]) || 0;
              seconds = parseInt(timeParts[2]) || 0;
            }
            const constructed = new Date(year, month, day, hours, minutes, seconds);
            if (!isNaN(constructed.getTime())) {
              return constructed.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
            }
          }
        }
      }
      return String(dateString);
    }
    return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  } catch (e) {
    return String(dateString);
  }
};

export default function LeadModal({ 
  lead, 
  leads = [],
  notes = [],
  pipelines = [], 
  activePipelineId, 
  onClose, 
  onSave, 
  onDelete, 
  onAddNote,
  whatsappTemplates = [],
  currency
}) {
  const [currentLead, setCurrentLead] = useState(lead);
  const isNew = !currentLead;

  // Form Field States
  const [name, setName] = useState(currentLead?.name !== undefined && currentLead?.name !== null ? String(currentLead.name) : '');
  const [company, setCompany] = useState(currentLead?.company !== undefined && currentLead?.company !== null ? String(currentLead.company) : '');
  const [phone, setPhone] = useState(currentLead?.phone !== undefined && currentLead?.phone !== null ? String(currentLead.phone) : '');
  const [email, setEmail] = useState(currentLead?.email !== undefined && currentLead?.email !== null ? String(currentLead.email) : '');
  
  // Safe pipeline resolution
  const initialPipelineId = currentLead?.pipelineId || activePipelineId || (pipelines?.[0]?.id || '');
  const [pipelineId, setPipelineId] = useState(String(initialPipelineId || ''));
  
  // Find current stages based on selected pipeline
  const currentPipeline = (pipelines && pipelines.find(p => String(p.id) === String(pipelineId))) || (pipelines && pipelines[0]) || { name: '', stages: [] };
  
  const [status, setStatus] = useState(currentLead?.status || currentPipeline?.stages?.[0] || '');
  const [value, setValue] = useState(currentLead?.value || 0);
  const [tags, setTags] = useState(currentLead?.tags !== undefined && currentLead?.tags !== null ? String(currentLead.tags) : '');
  const [isScanning, setIsScanning] = useState(false);

  // Add Note Input state
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteType, setNewNoteType] = useState('manual'); // 'manual', 'call', 'whatsapp'

  // Safety confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Custom select states
  const [isPipelineDropdownOpen, setIsPipelineDropdownOpen] = useState(false);
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  const pipelineDropdownRef = useRef(null);
  const stageDropdownRef = useRef(null);

  // Tag suggestions states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const tagInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Auto-correct stage when pipeline changes
  const handlePipelineChange = (newPipeId) => {
    const stringPipeId = String(newPipeId || '');
    setPipelineId(stringPipeId);
    const pipe = pipelines.find(p => String(p.id) === stringPipeId) || pipelines[0] || { stages: [] };
    setStatus(pipe?.stages?.[0] || ''); // Reset to first stage of new pipeline
  };

  // Duplicate lead checking
  const duplicate = useMemo(() => {
    if (!leads || leads.length === 0) return null;
    const cleanTypedEmail = String(email || '').trim().toLowerCase();
    const cleanTypedPhone = String(phone || '').replace(/[^0-9]/g, '');

    // Avoid matching if both are empty
    if (!cleanTypedEmail && !cleanTypedPhone) return null;

    return leads.find(l => {
      // If we are currently editing/inspecting a lead, don't match it with itself
      if (currentLead && String(l.id) === String(currentLead.id)) return false;

      const emailMatch = cleanTypedEmail && l.email && String(l.email).trim().toLowerCase() === cleanTypedEmail;
      const phoneMatch = cleanTypedPhone && l.phone && String(l.phone).replace(/[^0-9]/g, '') === cleanTypedPhone;

      return emailMatch || phoneMatch;
    });
  }, [leads, email, phone, currentLead]);

  const lastAutoPopulatedId = useRef(null);

  // Auto-fill logic when duplicate is detected
  useEffect(() => {
    if (duplicate && String(duplicate.id) !== String(lastAutoPopulatedId.current)) {
      lastAutoPopulatedId.current = String(duplicate.id);
      setName(duplicate.name || '');
      setCompany(duplicate.company || '');
      setPhone(duplicate.phone || '');
      setEmail(duplicate.email || '');
      if (duplicate.pipelineId) {
        const stringPipeId = String(duplicate.pipelineId);
        setPipelineId(stringPipeId);
        const pipe = pipelines.find(p => String(p.id) === stringPipeId) || pipelines[0] || { stages: [] };
        setStatus(duplicate.status || pipe?.stages?.[0] || '');
      }
      setValue(duplicate.value || 0);
      setTags(duplicate.tags || '');
    } else if (!duplicate) {
      lastAutoPopulatedId.current = null;
    }
  }, [duplicate, pipelines]);

  const handleSwitchToEdit = () => {
    if (!duplicate) return;
    setCurrentLead(duplicate);
    setName(duplicate.name || '');
    setCompany(duplicate.company || '');
    setPhone(duplicate.phone || '');
    setEmail(duplicate.email || '');
    setPipelineId(String(duplicate.pipelineId || (pipelines[0] && pipelines[0].id) || ''));
    setStatus(duplicate.status || '');
    setValue(duplicate.value || 0);
    setTags(duplicate.tags || '');
    lastAutoPopulatedId.current = String(duplicate.id);
  };

  // Extract unique tags for autocomplete suggestions
  const allExistingTags = useMemo(() => {
    if (!leads) return [];
    const uniqueTags = new Set();
    leads.forEach(l => {
      if (l.tags && typeof l.tags === 'string') {
        l.tags.split(',').forEach(tag => {
          const t = tag.trim();
          if (t) uniqueTags.add(t);
        });
      }
    });
    return Array.from(uniqueTags);
  }, [leads]);

  // Tag suggestions filter logic
  const typedTagsList = useMemo(() => {
    if (typeof tags !== 'string') return [];
    return tags.split(',').map(t => t.trim());
  }, [tags]);

  const currentTypedTag = useMemo(() => {
    if (typeof tags !== 'string') return '';
    if (tags.endsWith(',') || tags === '') return '';
    return typedTagsList[typedTagsList.length - 1];
  }, [tags, typedTagsList]);

  const tagSuggestions = useMemo(() => {
    if (!currentTypedTag) return [];
    const searchVal = currentTypedTag.toLowerCase();
    return allExistingTags.filter(tag => 
      tag.toLowerCase().includes(searchVal) && 
      !typedTagsList.slice(0, -1).includes(tag)
    );
  }, [allExistingTags, currentTypedTag, typedTagsList]);

  const handleSelectTag = (tag) => {
    const list = [...typedTagsList];
    if (list.length > 0 && !tags.endsWith(',')) {
      list[list.length - 1] = tag;
    } else {
      list.push(tag);
    }
    setTags(list.join(', ') + ', ');
    setShowSuggestions(false);
    setFocusedSuggestionIndex(-1);
    if (tagInputRef.current) {
      tagInputRef.current.focus();
    }
  };

  const handleTagKeyDown = (e) => {
    if (tagSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowSuggestions(true);
      setFocusedSuggestionIndex(prev => (prev + 1) % tagSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setShowSuggestions(true);
      setFocusedSuggestionIndex(prev => (prev - 1 + tagSuggestions.length) % tagSuggestions.length);
    } else if (e.key === 'Enter' && focusedSuggestionIndex >= 0) {
      e.preventDefault();
      handleSelectTag(tagSuggestions[focusedSuggestionIndex]);
    } else if (e.key === 'Tab' && focusedSuggestionIndex >= 0) {
      e.preventDefault();
      handleSelectTag(tagSuggestions[focusedSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setFocusedSuggestionIndex(-1);
    }
  };

  // Click outside listener for pipeline, stage and tag suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pipelineDropdownRef.current && !pipelineDropdownRef.current.contains(event.target)) {
        setIsPipelineDropdownOpen(false);
      }
      if (stageDropdownRef.current && !stageDropdownRef.current.contains(event.target)) {
        setIsStageDropdownOpen(false);
      }
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          tagInputRef.current && !tagInputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !company) {
      alert('Name and Company are required!');
      return;
    }

    onSave({
      id: currentLead ? currentLead.id : undefined,
      name,
      company,
      phone,
      email,
      status,
      value: parseFloat(value) || 0,
      tags,
      pipelineId,
      lastContacted: currentLead ? currentLead.lastContacted : ''
    });
  };

  const handleAddNoteSubmit = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    onAddNote({
      leadId: currentLead.id,
      text: newNoteText,
      type: newNoteType
    });

    setNewNoteText('');
    setNewNoteType('manual');
  };

  // Compile WhatsApp link
  const getWhatsAppLink = (templateText) => {
    if (typeof templateText !== 'string') return '';
    let compiled = templateText
      .replace(/{{name}}/g, String(name || ''))
      .replace(/{{company}}/g, String(company || ''))
      .replace(/{{value}}/g, `${getCurrencySymbol(currency)}${(parseFloat(value) || 0).toLocaleString()}`);
      
    let cleanPhone = String(phone || '').replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+') && cleanPhone.length > 5) {
      cleanPhone = '+' + cleanPhone;
    }
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(compiled)}`;
  };

  const handleWhatsAppClick = (templateTitle) => {
    onAddNote({
      leadId: currentLead.id,
      text: `Sent WhatsApp outreach: "${templateTitle}"`,
      type: 'whatsapp'
    });
  };

  // Timeline note type helper styling
  const getNoteIconDetails = (type) => {
    switch (type) {
      case 'call':
        return { icon: '📞', color: 'var(--color-meeting)', text: 'Call Log' };
      case 'whatsapp':
        return { icon: '💬', color: '#10b981', text: 'WhatsApp SMS' };
      case 'system':
        return { icon: '⚙️', color: 'var(--text-dark)', text: 'System' };
      default:
        return { icon: '📝', color: 'var(--primary)', text: 'Note' };
    }
  };

  const activeLeadNotes = useMemo(() => {
    if (!currentLead || !notes) return [];
    return notes.filter(n => String(n.leadId) === String(currentLead.id));
  }, [notes, currentLead]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: isNew ? '480px' : '900px' }}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isNew ? (
              <>
                <Sparkles size={18} style={{ color: 'var(--primary)' }} />
                Create New CRM Lead
              </>
            ) : (
              <>
                <ClipboardList size={18} style={{ color: 'var(--primary)' }} />
                Lead Profile details
              </>
            )}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Dynamic Modal Layout */}
        <div className="modal-body">
          
          <div className={isNew ? "" : "modal-layout-split"}>

            {/* LEFT / SINGLE PROFILE FORM EDITOR */}
            <form onSubmit={handleSubmit} className="modal-form-column">
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
                LEAD ATTRIBUTES
              </div>

              {/* Duplicate Notice Banner */}
              {isNew && duplicate && (
                <div className="duplicate-warning-banner">
                  <div className="duplicate-warning-content">
                    <AlertTriangle size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <div>
                      Already saved as <strong>{duplicate.name}</strong> ({duplicate.company})
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleSwitchToEdit}
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px', whiteSpace: 'nowrap' }}
                  >
                    Edit Instead
                  </button>
                </div>
              )}

              <div className="grid-metrics">
                <div className="form-group">
                  <label className="form-label">Contact Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Bruce Wayne"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Wayne Enterprises"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-metrics">
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    placeholder="e.g. +15550199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="e.g. bruce@wayne.co"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Sales Pipeline Campaign</label>
                <div className="custom-dropdown-container" ref={pipelineDropdownRef}>
                  <button 
                    type="button"
                    className="custom-dropdown-trigger"
                    onClick={() => setIsPipelineDropdownOpen(!isPipelineDropdownOpen)}
                  >
                    <span>{currentPipeline?.name || ''}</span>
                    <ChevronDown size={14} className={`chevron-icon ${isPipelineDropdownOpen ? 'open' : ''}`} />
                  </button>
                  {isPipelineDropdownOpen && (
                    <div className="custom-dropdown-options">
                      {pipelines?.map(p => (
                        <div 
                          key={p.id}
                          className={`custom-dropdown-option ${p.id === pipelineId ? 'active' : ''}`}
                          onClick={() => {
                            handlePipelineChange(p.id);
                            setIsPipelineDropdownOpen(false);
                          }}
                        >
                          <span>{p.name}</span>
                          {p.id === pipelineId && <Check size={12} className="check-icon" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid-metrics">
                <div className="form-group">
                  <label className="form-label">Pipeline Deal Stage</label>
                  <div className="custom-dropdown-container" ref={stageDropdownRef}>
                    <button 
                      type="button"
                      className="custom-dropdown-trigger"
                      onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
                    >
                      <span>{status}</span>
                      <ChevronDown size={14} className={`chevron-icon ${isStageDropdownOpen ? 'open' : ''}`} />
                    </button>
                    {isStageDropdownOpen && (
                      <div className="custom-dropdown-options">
                        {currentPipeline?.stages?.map(stage => (
                          <div 
                            key={stage}
                            className={`custom-dropdown-option ${stage === status ? 'active' : ''}`}
                            onClick={() => {
                              setStatus(stage);
                              setIsStageDropdownOpen(false);
                            }}
                          >
                            <span>{stage}</span>
                            {stage === status && <Check size={12} className="check-icon" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Estimated Deal Value ({getCurrencySymbol(currency)})</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="0"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Tags (comma-separated)</label>
                <input 
                  type="text" 
                  ref={tagInputRef}
                  className="form-input" 
                  placeholder="e.g. Retainer, Tech, Cold outreach"
                  value={tags}
                  onChange={(e) => {
                    setTags(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleTagKeyDown}
                />
                {showSuggestions && tagSuggestions.length > 0 && (
                  <div className="tag-suggestions-container" ref={suggestionsRef}>
                    {tagSuggestions.map((suggestion, idx) => (
                      <div
                        key={suggestion}
                        className={`tag-suggestion-item ${idx === focusedSuggestionIndex ? 'active' : ''}`}
                        onClick={() => handleSelectTag(suggestion)}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isNew && (
                <div style={{ marginTop: '0.25rem', marginBottom: '0.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: '1px dashed var(--primary)', background: 'var(--primary-glow)', color: 'var(--primary)', padding: '0.6rem 1rem', borderRadius: '8px' }}
                    onClick={() => setIsScanning(true)}
                  >
                    📷 Scan Business Card with AI
                  </button>
                </div>
              )}

              {/* Action row for form */}
              <div className="sprint-progress-row" style={{ marginTop: '0.75rem' }}>
                <div>
                  {!isNew && onDelete && (
                    confirmDelete ? (
                      <div className="card-move-controls">
                        <button 
                          type="button" 
                          className="btn btn-danger" 
                          style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
                          onClick={() => onDelete(currentLead.id)}
                        >
                          Confirm
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
                          onClick={() => setConfirmDelete(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        className="btn btn-danger"
                        style={{ padding: '0.5rem', borderRadius: '8px' }}
                        onClick={() => setConfirmDelete(true)}
                        title="Delete Lead"
                      >
                        <Trash2 size={16} />
                      </button>
                    )
                  )}
                </div>

                <div className="card-move-controls" style={{ gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Close
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {isNew ? 'Create Lead' : 'Save Details'}
                  </button>
                </div>
              </div>
            </form>

            {/* RIGHT SIDE TIMELINE LOGS (ONLY SHOWS FOR EXISTING PROFILE INSPECTOR) */}
            {!isNew && (
              <div className="modal-timeline-column">
                
                {/* WHATSAPP TEMPLATE SLUGS ACCORDION */}
                {whatsappTemplates?.length > 0 && (
                  <div className="whatsapp-triggers-box">
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      <MessageSquare size={13} />
                      QUICK WHATSAPP outreach LINKS
                    </div>
                    
                    <div className="whatsapp-slug-list">
                      {whatsappTemplates?.map(temp => (
                        <a
                          key={temp.id}
                          href={getWhatsAppLink(temp.text)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="whatsapp-slug-btn"
                          onClick={() => handleWhatsAppClick(temp.title)}
                        >
                          <span>{temp.title}</span>
                          <Send size={12} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* TIMELINE logger */}
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.25rem' }}>
                  TIMELINE & LOG ACTIVITIES
                </div>

                {/* Timeline input log form */}
                <form onSubmit={handleAddNoteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Log a call outcome, custom note or client request..."
                    required
                    style={{ resize: 'none', fontSize: '0.8rem' }}
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                  />
                  
                  <div className="sprint-progress-row">
                    <div className="card-move-controls">
                      <button
                        type="button"
                        className={`outcome-btn ${newNoteType === 'manual' ? 'active' : ''}`}
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px' }}
                        onClick={() => setNewNoteType('manual')}
                      >
                        📝 Note
                      </button>
                      <button
                        type="button"
                        className={`outcome-btn ${newNoteType === 'call' ? 'active' : ''}`}
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px' }}
                        onClick={() => setNewNoteType('call')}
                      >
                        📞 Call
                      </button>
                      <button
                        type="button"
                        className={`outcome-btn ${newNoteType === 'whatsapp' ? 'active' : ''}`}
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px' }}
                        onClick={() => setNewNoteType('whatsapp')}
                      >
                        💬 Whatsapp
                      </button>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}>
                      <span>Add Log</span>
                    </button>
                  </div>
                </form>

                {/* Timeline display loop */}
                <div className="timeline-list-container" style={{ maxHeight: '200px' }}>
                  {activeLeadNotes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-dark)', fontSize: '0.8rem' }}>
                      No activity logged yet
                    </div>
                  ) : (
                    activeLeadNotes.map(n => {
                      const details = getNoteIconDetails(n.type);
                      return (
                        <div key={n.id} className="timeline-item" style={{ '--timeline-color': details.color }}>
                          <div className="timeline-time">
                            <span style={{ marginRight: '0.35rem' }}>{details.icon}</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{details.text}</span>
                            <span style={{ marginLeft: '0.5rem', color: 'var(--text-dark)' }}>
                              {formatDateTimeSafe(n.timestamp)}
                            </span>
                          </div>
                          <div className="timeline-content">{n.text}</div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            )}

          </div>

        </div>
      </div>

      {isScanning && (
        <OCRScanner 
          onClose={() => setIsScanning(false)}
          onImportLead={(parsed) => {
            if (parsed.name) setName(parsed.name);
            if (parsed.company) setCompany(parsed.company);
            if (parsed.phone) setPhone(parsed.phone);
            if (parsed.email) setEmail(parsed.email);
            if (parsed.tags) setTags(parsed.tags);
            if (parsed.value) setValue(parsed.value);
            setIsScanning(false);
          }}
        />
      )}

    </div>
  );
}
