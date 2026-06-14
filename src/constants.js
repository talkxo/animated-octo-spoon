export const DEFAULT_PIPELINES = [
  {
    id: 'agency_pipeline',
    name: 'Agency Sales Pipeline',
    stages: ['Lead', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost'],
  },
  {
    id: 'product_pipeline',
    name: 'Product Sales Pipeline',
    stages: ['Inbound', 'Discovery Call', 'Demo Done', 'Contract Sent', 'Closed Won', 'Closed Lost'],
  },
];

export const DEFAULT_WHATSAPP_TEMPLATES = [
  { id: 'temp-1', title: '\u{1F44B} Cold Outreach Intro', text: 'Hey {{name}}! This is from Pluto CRM. I was checking out {{company}} and noticed you guys might be looking to scale your pipeline. Would love to grab 10 mins if you have availability this week!' },
  { id: 'temp-2', title: '\u{1F4DE} Post-Call Follow-up', text: 'Hey {{name}}, great chatting with you just now! As promised, here is our agency deck. Let me know if next steps look good!' },
  { id: 'temp-3', title: '\u{231B} Quick Touchbase', text: 'Hey {{name}}, just bumping this in case you missed my earlier text. Let me know if {{company}} is still looking to solve this workflow bottleneck!' },
];

export const COSMIC_QUOTES = [
  { text: "Always remember: Pluto is 4.67 billion miles away, and we still reached it. Your cold leads aren't that far.", tagline: 'Start small, reach far!' },
  { text: "Pluto was demoted to a dwarf planet, but it's still out there closing orbital deals. Keep spinning.", tagline: 'Start small, reach far!' },
  { text: "Even at -375°F, Pluto keeps revolving. No cold outreach list is too frozen for a solid pitch.", tagline: 'Start small, reach far!' },
  { text: "It took New Horizons 9.5 years to reach Pluto. Sometimes the longest sales cycle leads to the sweetest heart of gold.", tagline: 'Start small, reach far!' },
  { text: "Pluto doesn't care that it's small or remote; it still holds a giant heart on its surface.", tagline: 'Start small, reach far!' },
];
