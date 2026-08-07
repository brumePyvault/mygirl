import NotesPage from '../../components/notes-page'
import { PageShell } from '../../components/site-shell'
export const metadata = { title: 'Love notes — For Deborah' }
export default function Page() { return <PageShell section="notes"><NotesPage/></PageShell> }
