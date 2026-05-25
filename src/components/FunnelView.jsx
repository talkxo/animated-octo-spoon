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
  Check,
  Inbox,
  Layers,
  Activity
} from 'lucide-react';
import EmptyState from './EmptyState';

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
  const pipelineLeads = leads.filter(l => String(l.pipelineId) === String(activePipeline.id));

  // Get all unique tags for the filter pill list
  const allTags = Array.from(
    new Set(
      pipelineLeads
        .map(l => l.tags)
        .filter(Boolean)
        .flatMap(t => String(t).split(',').map(s => s.trim()))
    )
  );

  // Apply search query and tag filters
  const filteredLeads = pipelineLeads.filter(lead => {
    const matchesSearch = 
      String(lead.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(lead.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.tags && String(lead.tags).toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesTag = !selectedTag || 
      (lead.tags && String(lead.tags).split(',').map(s => s.trim()).includes(selectedTag));
      
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

  const avgDealValue = activeDealsCount > 0 ? Math.round(totalPipelineValue / activeDealsCount) : 0;

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
      
      {/* Top Bar (Selector & Actions) */}
      <div className="funnel-top-bar">
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
                    className={`custom-dropdown-option ${String(p.id) === String(activePipelineId) ? 'active' : ''}`}
                    onClick={() => {
                      setActivePipelineId(p.id);
                      setSelectedTag('');
                      setIsDropdownOpen(false);
                    }}
                  >
                    <span>{p.name}</span>
                    {String(p.id) === String(activePipelineId) && <Check size={12} className="check-icon" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="funnel-actions">
          <button className="btn btn-primary" onClick={onNewLeadClick}>
            <Plus size={16} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (Unified 'boxes inside a box' card layout) */}
      <div className="funnel-metrics-box">
        {/* Active Pipeline Value */}
        <div className="funnel-metric-cell">
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.45rem', borderRadius: '8px', flexShrink: 0, display: 'flex' }}>
            <DollarSign size={16} />
          </div>
          <div>
            <div className="metrics-value">
              {getCurrencySymbol(currency)}{totalPipelineValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="metrics-label">ACTIVE PIPELINE</div>
          </div>
        </div>

        {/* Active Deals Count */}
        <div className="funnel-metric-cell">
          <div style={{ background: 'var(--accent-glow)', color: 'var(--accent)', padding: '0.45rem', borderRadius: '8px', flexShrink: 0, display: 'flex' }}>
            <Layers size={16} />
          </div>
          <div>
            <div className="metrics-value">
              {activeDealsCount} <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>leads</span>
            </div>
            <div className="metrics-label">ACTIVE DEALS</div>
          </div>
        </div>

        {/* Average Deal Value */}
        <div className="funnel-metric-cell">
          <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '0.45rem', borderRadius: '8px', flexShrink: 0, display: 'flex' }}>
            <Activity size={16} />
          </div>
          <div>
            <div className="metrics-value">
              {getCurrencySymbol(currency)}{avgDealValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="metrics-label">AVG DEAL VALUE</div>
          </div>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="filter-search-row">
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

        {/* Dynamic Tag Filter Pills */}
        {allTags.length > 0 && (
          <div className="tag-filter-container">
            <button 
              onClick={() => setSelectedTag('')}
              className={`tag-filter-btn ${selectedTag === '' ? 'tag-filter-btn-active' : ''}`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button 
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`tag-filter-btn ${selectedTag === tag ? 'tag-filter-btn-active' : ''}`}
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
              <div className="lane-header" style={{ '--stage-color': stageColor }}>
                <div className="lane-title-row">
                  <div className="lane-title">
                    <span className="lane-title-dot" style={{ background: stageColor }}></span>
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
                  <EmptyState
                    icon={<Inbox size={16} />}
                    heading="No leads"
                    sub="Add a new lead to populate this stage."
                  />
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
                          {lead.tags ? String(lead.tags).split(',').slice(0, 1).map(t => (
                            <span className="deal-tag" key={t}>{t.trim()}</span>
                          )) : (
                            <span className="deal-tag" style={{ visibility: 'hidden' }}>x</span>
                          )}
                        </div>

                        {/* Quick state movement controls */}
                        <div className="card-move-controls">
                          {activePipeline.stages.indexOf(stage) > 0 && (
                            <button 
                              className="card-move-btn" 
                              onClick={(e) => shiftLeadStage(e, lead, -1)}
                              title="Move Left"
                            >
                              <ChevronLeft size={16} />
                            </button>
                          )}
                          
                          {activePipeline.stages.indexOf(stage) < activePipeline.stages.length - 1 && (
                            <button 
                              className="card-move-btn" 
                              onClick={(e) => shiftLeadStage(e, lead, 1)}
                              title="Move Right"
                            >
                              <ChevronRight size={16} />
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
