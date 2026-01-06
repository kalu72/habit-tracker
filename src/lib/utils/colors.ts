// Ticket color palette for punchcards
export const TICKET_COLORS = [
  { from: '#fde047', to: '#facc15', border: '#eab308', name: 'yellow' },
  { from: '#f472b6', to: '#ec4899', border: '#db2777', name: 'pink' },
  { from: '#fb923c', to: '#f97316', border: '#ea580c', name: 'orange' },
  { from: '#a78bfa', to: '#8b5cf6', border: '#7c3aed', name: 'purple' },
  { from: '#4ade80', to: '#22c55e', border: '#16a34a', name: 'green' },
  { from: '#60a5fa', to: '#3b82f6', border: '#2563eb', name: 'blue' },
  { from: '#f87171', to: '#ef4444', border: '#dc2626', name: 'red' },
  { from: '#34d399', to: '#10b981', border: '#059669', name: 'emerald' },
];

// Get color for a punchcard based on index (deterministic rotation)
export function getPunchcardColor(index: number): typeof TICKET_COLORS[number] {
  return TICKET_COLORS[index % TICKET_COLORS.length];
}
