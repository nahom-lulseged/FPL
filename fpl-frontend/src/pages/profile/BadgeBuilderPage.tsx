import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bolt, Check, Crown, Flame, Shield, Sparkles, Star, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '@/api/experience.api';
import { useToast } from '@/store/toastStore';
import type { BadgeConfig } from '@/types/experience';

const icons = { shield: Shield, crown: Crown, flame: Flame, bolt: Bolt, star: Star, trophy: Trophy } as const;
const palettes = [['#37003C', '#00FF87'], ['#5B006D', '#04F5FF'], ['#7C3AED', '#00D9FF'], ['#FFB300', '#FF5252'], ['#00D9FF', '#2563EB'], ['#FFFFFF', '#37003C']];

export function BadgeBuilderPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<BadgeConfig>({ templateId: 'elite-shield', icon: 'shield', primaryColor: '#37003C', accentColor: '#00FF87' });
  const mutation = useMutation({
    mutationFn: () => updateProfile({ badgeConfig: config }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['profile'] }); toast.success('Team badge saved'); navigate('/profile'); },
    onError: () => { localStorage.setItem('fpl:badge', JSON.stringify(config)); toast.success('Badge saved on this device'); navigate('/profile'); },
  });
  const Icon = icons[config.icon];

  return <div className="fpl-badge-builder">
    <header className="fpl-screen-heading"><button type="button" onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft /></button><h1>Create Team Badge</h1><span /></header>
    <img className="fpl-badge-showcase" src="/reference/badge-showcase.webp" alt="Examples of custom fantasy football badges" />
    <section className="fpl-badge-intro"><h2>Generate your custom team badge</h2><p>+ Fast and easy — choose a badge in seconds</p><p>+ Customise badge style, colours and mark</p><p>+ Perfect your club identity with curated combinations</p></section>
    <section className="fpl-badge-controls">
      <div className="fpl-live-badge"><div style={{ '--badge-primary': config.primaryColor, '--badge-accent': config.accentColor } as React.CSSProperties}><Icon size={54} /><small>FPL</small></div><span>Your badge preview</span></div>
      <div><h3>Choose your mark</h3><div className="badge-choice-grid">{Object.entries(icons).map(([key, ChoiceIcon]) => <button key={key} className={config.icon === key ? 'is-active' : ''} onClick={() => setConfig({ ...config, icon: key as BadgeConfig['icon'] })}><ChoiceIcon size={24} />{config.icon === key ? <Check size={12} /> : null}</button>)}</div><h3>Club colours</h3><div className="palette-grid">{palettes.map(([primary, accent]) => <button key={primary + accent} className={config.primaryColor === primary && config.accentColor === accent ? 'is-active' : ''} onClick={() => setConfig({ ...config, primaryColor: primary!, accentColor: accent! })}><span style={{ background: primary }} /><span style={{ background: accent }} />{config.primaryColor === primary && config.accentColor === accent ? <Check size={13} /> : null}</button>)}</div></div>
    </section>
    <div className="fpl-badge-actions"><button onClick={() => navigate('/home')}>Skip For Now</button><button disabled={mutation.isPending} onClick={() => mutation.mutate()}><Sparkles size={18} /> {mutation.isPending ? 'Saving…' : 'Create Badge'}</button></div>
  </div>;
}
