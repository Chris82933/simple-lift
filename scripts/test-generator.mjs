import { generateProgram } from '../src/lib/generator.js'

const profiles = {
  'Full gym, 4d, strength, focus legs': {
    focusAreas: ['legs'], trainOthers: true,
    equipment: ['barbell', 'rack', 'flat_bench', 'adj_bench', 'dumbbells', 'pullup_bar', 'cable', 'lat_pulldown', 'leg_press', 'dip_station', 'ez_bar'],
    daysPerWeek: 4, sessionLength: 60, goals: ['strength'],
  },
  'Bodyweight only, 3d, general': {
    focusAreas: ['chest', 'core'], trainOthers: true,
    equipment: [],
    daysPerWeek: 3, sessionLength: 45, goals: ['general'],
  },
  'Dumbbells + bench, 6d, size, focus arms': {
    focusAreas: ['arms', 'chest'], trainOthers: true,
    equipment: ['dumbbells', 'flat_bench', 'adj_bench', 'pullup_bar'],
    daysPerWeek: 6, sessionLength: 45, goals: ['size'],
  },
  'Climbing, bands+bar, 2d': {
    focusAreas: ['back'], trainOthers: false,
    equipment: ['bands', 'pullup_bar'],
    daysPerWeek: 2, sessionLength: 30, goals: ['climbing'],
  },
}

for (const [name, profile] of Object.entries(profiles)) {
  const program = generateProgram(profile)
  console.log('\n========================================')
  console.log(name)
  console.log('========================================')
  for (const day of program.days) {
    console.log(`\n  ${day.dayLabel} — ${day.title}  [${day.regions.join(', ')}]`)
    if (day.exercises.length === 0) console.log('    (!) NO EXERCISES')
    for (const ex of day.exercises) {
      console.log(`    - ${ex.name.padEnd(26)} ${ex.sets}x${ex.repLow}-${ex.repHigh}  rest ${ex.restSec}s  ${ex.compound ? 'compound' : 'accessory'}`)
    }
  }
}
console.log('\nOK')
