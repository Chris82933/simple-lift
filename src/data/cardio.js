// Cardio machine / activity types for logging.
export const CARDIO_MACHINES = [
  { id: 'treadmill', name: 'Treadmill', icon: '🏃', color: '#38bdf8', distance: true },
  { id: 'elliptical', name: 'Elliptical', icon: '⚙️', color: '#a78bfa', distance: true },
  { id: 'stairs', name: 'Stair Stepper', icon: '🪜', color: '#fb923c', distance: false },
  { id: 'bike', name: 'Stationary Bike', icon: '🚴', color: '#4ade80', distance: true },
  { id: 'rower', name: 'Rowing Machine', icon: '🚣', color: '#f472b6', distance: true },
  { id: 'run', name: 'Outdoor Run', icon: '👟', color: '#22d3ee', distance: true },
  { id: 'walk', name: 'Walk / Hike', icon: '🥾', color: '#fbbf24', distance: true },
  { id: 'jump_rope', name: 'Jump Rope', icon: '🪢', color: '#fb7185', distance: false },
  { id: 'other', name: 'Other', icon: '❤️', color: '#94a3b8', distance: true },
]

export const CARDIO_BY_ID = Object.fromEntries(CARDIO_MACHINES.map((m) => [m.id, m]))
