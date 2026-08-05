import { BarChart3, Download, FileSpreadsheet, Printer, ShieldCheck, UsersRound, WalletCards } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/common/Button';
import { CsvExportButton } from '@/components/tables/CsvExportButton';

const reports = [
  { title:'User directory', description:'Registered users, teams, and account status.', icon:UsersRound, entity:'users' as const },
  { title:'Player catalogue', description:'Current player data and performance fields.', icon:BarChart3, entity:'players' as const },
  { title:'League register', description:'League configuration and membership records.', icon:ShieldCheck, entity:'leagues' as const },
];
export function ReportsPage() {
  return <div className="page-stack reports-page"><PageHeader eyebrow="Overview" title="Reports & exports" description="Download endpoint-backed datasets or create a print-ready operational snapshot." actions={<Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4"/>Print report</Button>}/><div className="report-hero glass-card"><div><span className="status-badge success">Live scope</span><h2>Operational reporting center</h2><p>Exports preserve the selected module scope. No unavailable metrics or synthetic totals are included.</p></div><div className="report-date"><FileSpreadsheet/><span>Generated</span><strong>{new Date().toLocaleDateString()}</strong></div></div><section className="report-grid">{reports.map(({title,description,icon:Icon,entity})=><article className="glass-card report-card" key={entity}><div className="card-icon purple"><Icon/></div><h2>{title}</h2><p>{description}</p><CsvExportButton entity={entity}/></article>)}<article className="glass-card report-card muted-report"><div className="card-icon green"><WalletCards/></div><h2>Finance & operations</h2><p>Use the active finance or operations table to export its current filtered scope.</p><Button variant="secondary" onClick={() => window.print()}><Download className="h-4 w-4"/>Print current view</Button></article></section></div>;
}
