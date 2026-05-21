import React, { useState } from 'react';
import { 
  Search, 
  Tag, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  ArrowLeftRight, 
  ChevronRight, 
  ChevronLeft,
  Filter,
  ChevronDown,
  Check
} from 'lucide-react';

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

export default function FunnelView({ 
  leads, 
  activePipeline, 
  pipelines, 
  activePipelineId, 
  setActivePipelineId, 
  onSelectLead, 
  onNewLeadClick,
  saveLead,
  currency
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter leads based on active pipeline
  const pipelineLeads = leads.filter(l => l.pipelineId === activePipeline.id);

  // Get all unique tags for the filter pill list
  const allTags = Array.from(
    new Set(
      pipelineLeads
        .map(l => l.tags)
        .filter(Boolean)
        .flatMap(t => t.split(',').map(s => s.trim()))
    )
  );

  // Apply search query and tag filters
  const filteredLeads = pipelineLeads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.tags && lead.tags.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesTag = !selectedTag || 
      (lead.tags && lead.tags.split(',').map(s => s.trim()).includes(selectedTag));
      
    return matchesSearch && matchesTag;
  });

  // Calculate overall metrics
  const totalPipelineValue = filteredLeads.reduce((acc, lead) => {
    // Only calculate active/won deal values, skip 'Lost' value if desired (or keep all)
    if (lead.status !== 'Lost' && lead.status !== 'Closed Lost') {
      return acc + (parseFloat(lead.value) || 0);
    }
    return acc;
  }, 0);

  const activeDealsCount = filteredLeads.filter(
    l => l.status !== 'Lost' && l.status !== 'Closed Lost' && l.status !== 'Won' && l.status !== 'Closed Won'
  ).length;

  // Move lead stage helper (left or right)
  const shiftLeadStage = (e, lead, direction) => {
    e.stopPropagation(); // prevent opening details modal
    const stages = activePipeline.stages;
    const currentIdx = stages.indexOf(lead.status);
    
    if (currentIdx === -1) return;
    
    let nextIdx = currentIdx + direction;
    if (nextIdx >= 0 && nextIdx < stages.length) {
      const updatedLead = {
        ...lead,
        status: stages[nextIdx]
      };
      saveLead(updatedLead);
    }
  };

  // Stage column styling colors matching HSL
  const getStageColor = (stage) => {
    const s = stage.toLowerCase();
    if (s.includes('lead') || s.includes('inbound')) return 'var(--color-lead)';
    if (s.includes('contacted') || s.includes('discovery') || s.includes('outreach')) return 'var(--color-contacted)';
    if (s.includes('meeting') || s.includes('demo') || s.includes('pitch')) return 'var(--color-meeting)';
    if (s.includes('proposal') || s.includes('contract')) return 'var(--color-proposal)';
    if (s.includes('won') || s.includes('closed won') || s.includes('sale closed')) return 'var(--color-won)';
    if (s.includes('lost') || s.includes('closed lost')) return 'var(--color-lost)';
    return 'var(--primary)';
  };

  return (
    <div className="funnel-container">
      
      {/* Top filter and switcher bar */}
      <div className="funnel-header-actions">
        <div className="pipeline-selector-wrapper" ref={dropdownRef}>
          <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
          <div className="custom-dropdown-container">
            <button 
              type="button"
              className="custom-dropdown-trigger"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>{activePipeline.name}</span>
              <ChevronDown size={14} className={`chevron-icon ${isDropdownOpen ? 'open' : ''}`} />
            </button>
            {isDropdownOpen && (
              <div className="custom-dropdown-options">
                {pipelines.map(p => (
                  <div 
                    key={p.id}
                    className={`custom-dropdown-option ${p.id === activePipelineId ? 'active' : ''}`}
                    onClick={() => {
                      setActivePipelineId(p.id);
                      setSelectedTag('');
                      setIsDropdownOpen(false);
                    }}
                  >
                    <span>{p.name}</span>
                    {p.id === activePipelineId && <Check size={12} className="check-icon" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={onNewLeadClick}>
            <Plus size={16} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-metrics">
        <div className="glass-card metrics-card">
          <div className="metrics-icon-primary">
            <DollarSign size={20} />
          </div>
          <div className="metrics-content">
            <div className="metrics-label">ACTIVE PIPELINE</div>
            <div className="metrics-value">
              {getCurrencySymbol(currency)}{totalPipelineValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        <div className="glass-card metrics-card">
          <div className="metrics-icon-accent">
            <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
          </div>
          <div className="metrics-content">
            <div className="metrics-label">ACTIVE DEALS</div>
            <div className="metrics-value">
              {activeDealsCount} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>leads</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="glass-card filter-search-row">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div className="search-box-wrapper">
            <Search size={16} className="search-icon-inside" />
            <input 
              type="text" 
              className="form-input search-input" 
              placeholder="Search leads, companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {allTags.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="mobile-hide">
              <Filter size={14} style={{ color: 'var(--text-dark)' }} />
              <select
                className="form-select"
                style={{ padding: '0.45rem', fontSize: '0.8rem', borderRadius: '8px' }}
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
              >
                <option value="">All Tags</option>
                {allTags.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Dynamic Tag Filter Pills */}
        {allTags.length > 0 && (
          <div className="tag-filter-container">
            <button 
              onClick={() => setSelectedTag('')}
              className={`deal-tag tag-filter-btn ${selectedTag === '' ? 'tag-filter-btn-active' : ''}`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button 
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`deal-tag tag-filter-btn ${selectedTag === tag ? 'tag-filter-btn-active' : ''}`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lanes Grid */}
      <div className="funnel-lanes">
        {activePipeline.stages.map(stage => {
          const stageLeads = filteredLeads.filter(l => l.status === stage);
          const stageValue = stageLeads.reduce((sum, l) => sum + (parseFloat(l.value) || 0), 0);
          const stageColor = getStageColor(stage);

          return (
            <div className="funnel-lane" key={stage}>
              
              {/* Lane Header */}
              <div className="lane-header" style={{ borderTop: `3px solid ${stageColor}` }}>
                <div className="lane-title-row">
                  <div className="lane-title">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stageColor }}></span>
                    {stage}
                  </div>
                  <span className="lane-badge">{stageLeads.length}</span>
                </div>
                <div className="lane-metrics">
                  Total: <span>{getCurrencySymbol(currency)}{stageValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>

              {/* Lane Cards Scroll View */}
              <div className="lane-cards">
                {stageLeads.length === 0 ? (
                  <div className="lane-empty-placeholder">
                    No leads in stage
                  </div>
                ) : (
                  stageLeads.map(lead => (
                    <div 
                      key={lead.id} 
                      className="deal-card"
                      style={{ '--stage-color': stageColor }}
                      onClick={() => onSelectLead(lead.id)}
                    >
                      <div className="deal-header">
                        <span className="deal-company">{lead.company}</span>
                        <span className="deal-value">{getCurrencySymbol(currency)}{(lead.value || 0).toLocaleString()}</span>
                      </div>
                      
                      <div className="deal-title">{lead.name}</div>
                      
                      {/* Interactive Move buttons - 1-tap stage shifting, ultra-snappy on mobile */}
                      <div className="deal-footer">
                        <div className="deal-tags">
                          {lead.tags ? lead.tags.split(',').slice(0, 1).map(t => (
                            <span className="deal-tag" key={t}>{t.trim()}</span>
                          )) : (
                            <span className="deal-tag" style={{ visibility: 'hidden' }}>x</span>
                          )}
                        </div>

                        {/* Quick state movement controls */}
                        <div className="card-move-controls">
                          {activePipeline.stages.indexOf(stage) > 0 && (
                            <button 
                              className="outcome-btn" 
                              style={{ padding: '0.15rem 0.3rem', borderRadius: '4px' }}
                              onClick={(e) => shiftLeadStage(e, lead, -1)}
                              title="Move Left"
                            >
                              <ChevronLeft size={13} />
                            </button>
                          )}
                          
                          {activePipeline.stages.indexOf(stage) < activePipeline.stages.length - 1 && (
                            <button 
                              className="outcome-btn" 
                              style={{ padding: '0.15rem 0.3rem', borderRadius: '4px' }}
                              onClick={(e) => shiftLeadStage(e, lead, 1)}
                              title="Move Right"
                            >
                              <ChevronRight size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
