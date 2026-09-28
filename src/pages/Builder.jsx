import { useIsDesktop } from '../lib/useMediaQuery.js'
import useProgramDraft from '../components/builder/useProgramDraft.js'
import BuilderMobile from '../components/builder/BuilderMobile.jsx'
import BuilderDesktop from '../components/builder/BuilderDesktop.jsx'

// Two views, one draft. The hook owns every piece of state and every mutation,
// including the single save() — so a program built in the desktop workspace and
// one built on the phone are the same object, and there is no second copy of
// the superset/validation/rotation-pointer rules to fall out of sync.
export default function Builder() {
  const draft = useProgramDraft()
  const isDesktop = useIsDesktop()
  return isDesktop ? <BuilderDesktop d={draft} /> : <BuilderMobile d={draft} />
}
