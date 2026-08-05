import { useState, type FormEvent } from 'react';
import { CalendarClock, ExternalLink, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { PageHeader } from '@/components/common/PageHeader';
import { useAnnouncementActions, useAnnouncements } from '@/hooks/useCommunications';
import type { Announcement } from '@/api/communications.api';

export function AnnouncementsPage() {
  const { data = [], isLoading } = useAnnouncements();
  const actions = useAnnouncementActions();
  const [editing, setEditing] = useState<Announcement | null | undefined>();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget));
    const input = { title: String(values.title), message: String(values.message), actionUrl: String(values.actionUrl || '') || undefined, publishedAt: String(values.publishedAt || '') || undefined, expiresAt: String(values.expiresAt || '') || undefined };
    if (editing) actions.update.mutate({ id: editing.id, input }, { onSuccess: () => setEditing(undefined) });
    else actions.create.mutate(input, { onSuccess: () => setEditing(undefined) });
  };
  return <div className="page-stack"><PageHeader eyebrow="Communications" title="Announcements" description="Publish scheduled platform messages using the existing announcement service." actions={<Button onClick={() => setEditing(null)}><Plus className="h-4 w-4"/>New announcement</Button>}/>
    <section className="content-grid">{isLoading ? <div className="glass-card skeleton h-44"/> : data.length ? data.map((item) => <article className="glass-card announcement-card" key={item.id}><div className="card-icon purple"><Megaphone/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2>{item.title}</h2>{item.expiresAt && new Date(item.expiresAt) < new Date() ? <span className="status-badge danger">Expired</span> : <span className="status-badge success">Published</span>}</div><p>{item.message}</p><div className="card-meta"><span><CalendarClock/> {new Date(item.publishedAt).toLocaleString()}</span>{item.actionUrl ? <a href={item.actionUrl} target="_blank" rel="noreferrer"><ExternalLink/>Action link</a> : null}</div></div><div className="card-actions"><button className="icon-button" onClick={() => setEditing(item)} aria-label={`Edit ${item.title}`}><Pencil/></button><button className="icon-button danger" onClick={() => { if (window.confirm(`Delete “${item.title}”?`)) actions.remove.mutate(item.id); }} aria-label={`Delete ${item.title}`}><Trash2/></button></div></article>) : <div className="glass-card empty-state"><Megaphone/><h2>No announcements</h2><p>Create your first platform announcement.</p></div>}</section>
    <Modal isOpen={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Edit announcement' : 'New announcement'}><form className="premium-form" onSubmit={submit}><label>Title<input name="title" required maxLength={120} defaultValue={editing?.title}/></label><label>Message<textarea name="message" required rows={5} maxLength={2000} defaultValue={editing?.message}/></label><label>Action URL<input name="actionUrl" type="url" defaultValue={editing?.actionUrl ?? ''}/></label><div className="form-grid"><label>Publish at<input name="publishedAt" type="datetime-local" defaultValue={editing?.publishedAt?.slice(0,16)}/></label><label>Expires at<input name="expiresAt" type="datetime-local" defaultValue={editing?.expiresAt?.slice(0,16)}/></label></div><Button type="submit" isLoading={actions.create.isPending || actions.update.isPending} fullWidth>Save announcement</Button></form></Modal>
  </div>;
}
