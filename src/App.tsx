import React, { useMemo, useState } from 'react';
import {
  Activity, ArrowDown, ArrowRight, ArrowUpRight, AudioLines, Bell, Blocks,
  Bot, Check, ChevronDown, CircleHelp, Command, Cpu, Database, Ellipsis,
  FileText, Gauge, Globe2, Layers3, LockKeyhole, MessageSquare, MoreHorizontal,
  Network, Plus, Search, Send, Settings2, Shield, Sparkles, Terminal, X,
} from 'lucide-react';

type Agent = { name: string; role: string; color: string; state: 'Working' | 'Ready' | 'Idle'; icon: string };
type Task = { title: string; agent: string; state: 'Running' | 'Needs approval' | 'Queued'; time: string; color: string };

const initialAgents: Agent[] = [
  { name: 'Atlas', role: 'Research & synthesis', color: '#b7a3ff', state: 'Working', icon: 'A' },
  { name: 'NOVA', role: 'Workflow architect', color: '#75e5d0', state: 'Ready', icon: 'N' },
  { name: 'Cipher', role: 'Security analyst', color: '#ffb17a', state: 'Working', icon: 'C' },
  { name: 'Milo', role: 'Creative intelligence', color: '#f48fba', state: 'Idle', icon: 'M' },
];
const initialTasks: Task[] = [
  { title: 'Map the agent OS landscape', agent: 'Atlas', state: 'Running', time: '02:41', color: '#b7a3ff' },
  { title: 'Review workspace permissions', agent: 'Cipher', state: 'Needs approval', time: 'Just now', color: '#ffb17a' },
  { title: 'Synthesize today’s signal', agent: 'NOVA', state: 'Running', time: '00:38', color: '#75e5d0' },
];
const nav = [
  { title: 'Workspace', items: [{ label: 'Command center', icon: Layers3 }, { label: 'Conversations', icon: MessageSquare, count: '4' }, { label: 'Automations', icon: Activity }] },
  { title: 'Intelligence', items: [{ label: 'Agent network', icon: Network }, { label: 'Memory & context', icon: Database }, { label: 'Knowledge base', icon: Blocks }] },
];

function OrbitalCore() {
  return <div className="orbital-scene" aria-label="Animated 3D agent network visualization">
    <div className="scene-grid" />
    <div className="orbit orbit-a" /><div className="orbit orbit-b" /><div className="orbit orbit-c" />
    <div className="orbit-core"><div className="core-glow" /><div className="core-surface"><Sparkles size={25} /></div><span className="core-ring ring-one" /><span className="core-ring ring-two" /></div>
    <div className="satellite sat-one"><Bot size={14} /></div><div className="satellite sat-two"><Database size={13} /></div><div className="satellite sat-three"><Shield size={13} /></div>
    <span className="scene-label label-one">REASONING</span><span className="scene-label label-two">MEMORY</span><span className="scene-label label-three">TOOLS</span>
    <div className="scene-caption"><span className="live-dot" /> COGNITIVE FIELD <span className="caption-divider">/</span> 04 NODES ACTIVE</div>
  </div>;
}

export default function App() {
  const [activeNav, setActiveNav] = useState('Command center');
  const [agents, setAgents] = useState(initialAgents);
  const [tasks, setTasks] = useState(initialTasks);
  const [prompt, setPrompt] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [showQuick, setShowQuick] = useState(false);
  const [approved, setApproved] = useState(false);
  const filteredTasks = useMemo(() => tasks.filter((task) => `${task.title} ${task.agent} ${task.state}`.toLowerCase().includes(search.toLowerCase())), [tasks, search]);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
  const sendPrompt = () => {
    const clean = prompt.trim();
    if (!clean) return;
    setTasks((current) => [{ title: clean, agent: 'NOVA', state: 'Queued', time: 'Just now', color: '#75e5d0' }, ...current]);
    setPrompt('');
    notify('Intent captured · NOVA is planning your workflow');
  };
  const toggleAgent = (name: string) => setAgents((current) => current.map((agent) => agent.name === name ? { ...agent, state: agent.state === 'Idle' ? 'Ready' : 'Idle' } : agent));

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => setActiveNav('Command center')} aria-label="JAXX home"><span className="brand-mark"><AudioLines size={19} /></span><span><b>JAXX</b><small>AGENT OS <i>0.9</i></small></span><ChevronDown size={14} className="brand-chevron" /></button>
      <div className="workspace-switch"><span className="workspace-avatar">L</span><span><b>Lastic Studio</b><small>Personal workspace</small></span><MoreHorizontal size={17} /></div>
      <div className="sidebar-scroll">{nav.map((group) => <section className="nav-group" key={group.title}><div className="nav-heading">{group.title}</div>{group.items.map(({ label, icon: Icon, count }) => <button key={label} onClick={() => setActiveNav(label)} className={`nav-link ${activeNav === label ? 'selected' : ''}`}><Icon size={16} strokeWidth={1.7} /><span>{label}</span>{count && <small className="nav-count">{count}</small>}</button>)}</section>)}
        <section className="nav-group agent-menu"><div className="nav-heading">Your agents <button className="tiny-plus" onClick={() => notify('Agent builder is ready for your next specialist.')} aria-label="Add agent"><Plus size={14} /></button></div>{agents.map((agent) => <button className="agent-nav" key={agent.name} onClick={() => toggleAgent(agent.name)}><span className="mini-agent" style={{ '--agent-color': agent.color } as React.CSSProperties}>{agent.icon}</span><span>{agent.name}</span><i className={`presence ${agent.state === 'Working' ? 'busy' : agent.state === 'Ready' ? 'ready' : ''}`} /></button>)}</section>
        <section className="nav-group"><div className="nav-heading">System</div><button className="nav-link" onClick={() => notify('Trust center · all permissions are human-governed.')}><LockKeyhole size={16} /><span>Trust & permissions</span></button><button className="nav-link" onClick={() => notify('Settings are coming into focus.')}><Settings2 size={16} /><span>Preferences</span></button></section>
      </div>
      <button className="usage-card" onClick={() => notify('Compute budget is healthy · 72% available.')}><div className="usage-top"><span>COMPUTE BUDGET</span><span>72%</span></div><div className="usage-track"><i /></div><small><span className="live-dot" /> Local runtime healthy</small></button>
      <div className="profile"><div className="profile-avatar">L</div><div><b>Lastic</b><small>Local-first mode</small></div><Ellipsis size={18} /></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><b>{activeNav}</b></div><div className="top-actions"><div className="system-status"><span className="live-dot" /> ALL SYSTEMS NOMINAL</div><button className="icon-button" aria-label="Search" onClick={() => document.getElementById('task-search')?.focus()}><Search size={17} /></button><button className="icon-button notification" onClick={() => notify('You’re all caught up.')} aria-label="Notifications"><Bell size={17} /><i /></button><button className="top-avatar" onClick={() => notify('Lastic Studio · private workspace')}>L</button></div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> MONDAY, NOVEMBER 16 <span className="eyebrow-dot">·</span> YOUR SYSTEM IS THINKING</div><h1>Good morning, <em>Lastic.</em></h1><p className="subtitle">Your intelligence layer is online. What are we building today?</p></div><button className="date-pill" onClick={() => notify('Your timeline is synced.')}> <span className="calendar-dot" /> LIVE WORKSPACE <ArrowUpRight size={14} /></button></div>
        <section className="hero-panel"><div className="hero-copy"><div className="hero-kicker"><span className="pulse-ring" /> AGENT FABRIC <span className="hero-kicker-sep">/</span> ONLINE</div><h2>One intent.<br /><span>Infinite capability.</span></h2><p>A coordinated system of specialists that reasons, remembers, and gets things moving—with you in control.</p><div className="hero-meta"><div className="meta-stat"><b>04</b><span>AGENTS ONLINE</span></div><div className="meta-rule" /><div className="meta-stat"><b>12<span className="meta-unit">ms</span></b><span>AVG. RESPONSE</span></div><div className="meta-rule" /><div className="meta-stat"><b>100<span className="meta-unit">%</span></b><span>HUMAN CONTROL</span></div></div><button className="hero-cta" onClick={() => document.getElementById('intent-input')?.focus()}>Direct the system <ArrowRight size={15} /></button></div><OrbitalCore /><div className="hero-index">FIG. 01 <span>·</span> AWARENESS ENGINE</div></section>

        <section className="intent-panel"><div className="intent-leading"><div className="intent-icon"><Command size={17} /></div><div><b>Give your system a direction</b><small>Describe an outcome. Your agents will figure out the how.</small></div></div><div className="intent-form"><input id="intent-input" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendPrompt(); }} placeholder="e.g. Research the next wave of agent operating systems…" /><button className="voice-button" onClick={() => notify('Voice input is ready when you connect a microphone.')} aria-label="Voice input"><AudioLines size={17} /></button><button className="send-button" onClick={sendPrompt} aria-label="Send intent"><Send size={15} /><span>Run intent</span></button></div><div className="intent-foot"><span><Shield size={12} /> You approve consequential actions</span><span className="intent-shortcut">Press <kbd>↵</kbd> to launch</span></div></section>

        <div className="section-header"><div><div className="section-eyebrow">LIVE OPERATIONS</div><h3>System pulse <span className="live-dot" /></h3></div><button className="text-action" onClick={() => setActiveNav('Agent network')}>Open network <ArrowUpRight size={14} /></button></div>
        <section className="metric-grid"><article className="metric-card"><div className="metric-top"><span className="metric-icon violet"><Activity size={16} /></span><span className="metric-trend">+18.4% <ArrowUpRight size={12} /></span></div><div className="metric-value">28<span>h</span> <small>saved this week</small></div><div className="sparkline spark-purple"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="metric-caption">TIME RETURNED TO YOU <span>↗ 4.2h / day</span></div></article>
          <article className="metric-card"><div className="metric-top"><span className="metric-icon mint"><Gauge size={16} /></span><span className="metric-label">OPTIMAL</span></div><div className="metric-value">94<small>/100 autonomy</small></div><div className="meter-line"><i /></div><div className="metric-caption">SYSTEM CONFIDENCE <span>↑ 6 points</span></div></article>
          <article className="metric-card"><div className="metric-top"><span className="metric-icon amber"><Cpu size={16} /></span><span className="metric-label">LOCAL + PRIVATE</span></div><div className="metric-value">3.2<span>GB</span> <small>active context</small></div><div className="memory-stack"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="metric-caption">MEMORY IN USE <span>of 8 GB available</span></div></article></section>

        <div className="lower-grid"><section className="operations-panel"><div className="panel-heading"><div><div className="section-eyebrow">COORDINATION LAYER</div><h3>Active workflows <span className="workflow-count">{tasks.length.toString().padStart(2, '0')}</span></h3></div><div className="panel-tools"><div className="search-box"><Search size={14}/><input id="task-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter…" /></div><button className="small-icon" onClick={() => setShowQuick((value) => !value)} aria-label="Quick actions"><Ellipsis size={17}/></button>{showQuick && <div className="quick-menu"><button onClick={() => { setShowQuick(false); notify('All active workflows are paused.'); }}>Pause all workflows</button><button onClick={() => { setShowQuick(false); notify('Workflow history opened.'); }}>View history</button></div>}</div></div>
            <div className="task-list">{filteredTasks.length ? filteredTasks.map((task, index) => <article className="task-row" key={`${task.title}-${index}`}><div className="task-symbol" style={{ '--agent-color': task.color } as React.CSSProperties}>{task.state === 'Needs approval' ? <Shield size={16}/> : task.state === 'Queued' ? <ArrowDown size={16}/> : <Activity size={16}/>}</div><div className="task-info"><b>{task.title}</b><small><span className="task-agent-dot" style={{ background: task.color }} /> {task.agent} <span className="task-separator">·</span> {task.time}</small></div><span className={`task-status ${task.state.toLowerCase().replaceAll(' ', '-')}`}>{task.state === 'Running' && <i/>}{approved && task.state === 'Needs approval' ? 'Approved' : task.state}</span>{task.state === 'Needs approval' && !approved && <button className="approve-button" onClick={() => { setApproved(true); notify('Approved · Cipher can continue.'); }}><Check size={13}/> Review</button>}<button className="row-more" onClick={() => notify(`${task.title} · workflow details`)} aria-label="Workflow details"><ArrowUpRight size={15}/></button></article>) : <div className="empty-state">No workflows match that search.</div>}</div>
            <button className="all-workflows" onClick={() => setActiveNav('Automations')}>View all workflows <ArrowRight size={14}/></button></section>
          <section className="agents-panel"><div className="panel-heading"><div><div className="section-eyebrow">SPECIALIST COLLECTIVE</div><h3>Your agents</h3></div><button className="small-icon" onClick={() => notify('Agent directory opened.')} aria-label="More about agents"><ArrowUpRight size={16}/></button></div><div className="agent-list">{agents.map((agent) => <button className="agent-card" key={agent.name} onClick={() => toggleAgent(agent.name)}><span className="agent-avatar" style={{ '--agent-color': agent.color } as React.CSSProperties}>{agent.icon}<i className={`presence ${agent.state === 'Working' ? 'busy' : agent.state === 'Ready' ? 'ready' : ''}`} /></span><span className="agent-copy"><b>{agent.name}</b><small>{agent.role}</small></span><span className={`agent-state ${agent.state.toLowerCase()}`}>{agent.state === 'Working' && <i/>}{agent.state}</span><ArrowUpRight className="agent-arrow" size={14}/></button>)}</div><button className="add-agent" onClick={() => notify('Agent builder is ready for your next specialist.')}><Plus size={14}/> Design a new specialist</button></section></div>

        <footer className="footer-note"><span><span className="footer-mark"><Sparkles size={12}/></span> Your AI. Your rules. Your ground.</span><span><span className="live-dot"/> PRIVATE BY DESIGN <i>·</i> HUMAN-GOVERNED <i>·</i> LOCAL-FIRST</span><button onClick={() => notify('JAXX Agent OS · built for human-directed intelligence.')}><CircleHelp size={13}/> System guide</button></footer>
      </div>
    </main>
    {toast && <div className="toast"><span className="toast-check"><Check size={14}/></span>{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={14}/></button></div>}
  </div>;
}
