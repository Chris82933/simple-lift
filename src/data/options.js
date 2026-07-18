// Static option sets used by the onboarding wizard.

export const REGIONS = [
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'arms', label: 'Arms' },
  { id: 'legs', label: 'Legs' },
  { id: 'core', label: 'Core' },
]

export const EQUIPMENT_GROUPS = [
  {
    group: 'Free weights',
    items: [
      { id: 'barbell', label: 'Barbell' },
      { id: 'dumbbells', label: 'Dumbbells' },
      { id: 'kettlebells', label: 'Kettlebells' },
      { id: 'plates', label: 'Weight plates' },
      { id: 'ez_bar', label: 'EZ-curl bar' },
    ],
  },
  {
    group: 'Racks & benches',
    items: [
      { id: 'rack', label: 'Squat rack / cage' },
      { id: 'flat_bench', label: 'Flat bench' },
      { id: 'adj_bench', label: 'Adjustable bench' },
      { id: 'pullup_bar', label: 'Pull-up bar' },
      { id: 'rings', label: 'Gymnastic rings' },
      { id: 'dip_station', label: 'Dip station' },
    ],
  },
  {
    group: 'Machines & cables',
    items: [
      { id: 'cable', label: 'Cable machine' },
      { id: 'lat_pulldown', label: 'Lat pulldown' },
      { id: 'leg_press', label: 'Leg press' },
      { id: 'smith', label: 'Smith machine' },
      { id: 'leg_curl_ext', label: 'Leg curl / extension' },
      { id: 'machines', label: 'Selectorized machines (pec deck, shoulder press…)' },
    ],
  },
  {
    group: 'Climbing',
    items: [
      { id: 'hangboard', label: 'Hangboard / fingerboard' },
      { id: 'finger_trainer', label: 'Finger-strength tool (Tindeq, lifting block…)' },
    ],
  },
  {
    group: 'Other',
    items: [
      { id: 'bands', label: 'Resistance bands' },
      { id: 'trx', label: 'Suspension trainer' },
      { id: 'med_ball', label: 'Medicine ball' },
      { id: 'jump_rope', label: 'Jump rope' },
      { id: 'cardio', label: 'Cardio machine' },
    ],
  },
]

export const GOALS = [
  { id: 'general', label: 'General strength & muscle', hint: 'Balanced, broadly useful' },
  { id: 'strength', label: 'Pure strength', hint: 'Heavier, lower reps' },
  { id: 'size', label: 'Muscle size', hint: 'Higher volume' },
  { id: 'endurance', label: 'Endurance', hint: 'Lighter, higher reps' },
  { id: 'climbing', label: 'Rock climbing', hint: 'Grip & pulling focus' },
  { id: 'running', label: 'Running', hint: 'Legs & conditioning' },
]

export const DAYS_OPTIONS = [2, 3, 4, 5, 6]
export const SESSION_OPTIONS = [30, 45, 60, 75, 90]
