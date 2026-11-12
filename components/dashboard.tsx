"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, Bot, BriefcaseBusiness,
  CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp,
  CreditCard, Gauge, LayoutDashboard, Lightbulb, Menu, MoreHorizontal,
  Plus, Search, Settings2, ShieldCheck, Sparkles, Target, Users,
  Wallet, X, Zap, Filter, ChartNoAxesCombined, CircleDollarSign,
  Pause, Play, RefreshCw
} from "lucide-react";
import type { CampaignRow, ClientRow } from "@/lib/dashboard-data";
import type { Finding } from "@/lib/rules-engine";

type Stats = {
  totalSpend: number;
  totalConversions: number;
  avgCpa: number;
  connectedClients: number;
  totalClients: number;
  spendTrendPct: number | null;
  conversionsTrendPct: number | null;
};

type DailyPoint = { date: string; spend: number; conversions: number };

type DashboardProps = {
  initialCampaigns: CampaignRow[];
  clients: ClientRow[];
  dailySeries: DailyPoint[];
  findings: Finding[];
  stats: Stats;
};

const RULE_LABELS: Record<Finding["rule"], string> = {
  spend_no_conversion: "Budget",
  cpa_drift: "Enchères",
  cpa_target_exceeded: "Enchères",
  budget_pace_over: "Budget",
  budget_pace_under: "Budget",
  no_clicks: "Diffusion",
};

const SEVERITY_TONE: Record<Finding["severity"], string> = {
  warning: "amber",
  opportunity: "green",
  info: "blue",
};

const SEVERITY_TAG: Record<Finding["severity"], string> = {
  warning: "À valider",
  opportunity: "Opportunité",
  info: "Information",
};

const navItems = [
  { label: "Vue d'ensemble", icon: LayoutDashboard },
  { label: "Clients", icon: Users },
  { label: "Campagnes", icon: Target },
  { label: "Optimisations IA", icon: Sparkles, badge: "3" },
  { label: "Rapports", icon: ChartNoAxesCombined },
];

function money(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function formatTrend(pct: number | null) {
  if (pct === null) return "—";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1).replace(".", ",")} %`;
}

const CHART_WIDTH = 680;
const CHART_HEIGHT = 220;
const CHART_TOP_PAD = 15;
const CHART_BOTTOM_PAD = 17;

function scalePoints(values: number[]) {
  const max = Math.max(...values, 1);
  const n = values.length;
  return values.map((v, i) => ({
    x: n > 1 ? (i / (n - 1)) * CHART_WIDTH : 0,
    y: CHART_HEIGHT - CHART_BOTTOM_PAD - (v / max) * (CHART_HEIGHT - CHART_TOP_PAD - CHART_BOTTOM_PAD),
  }));
}

function linePath(points: { x: number; y: number }[]) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

function areaPath(points: { x: number; y: number }[]) {
  const baseline = CHART_HEIGHT - CHART_BOTTOM_PAD;
  return `${linePath(points)} L${points[points.length - 1].x.toFixed(1)} ${baseline} L${points[0].x.toFixed(1)} ${baseline} Z`;
}

export default function Dashboard({ initialCampaigns, clients, dailySeries, findings, stats }: DashboardProps) {
  const [activeNav, setActiveNav] = useState("Vue d'ensemble");
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [filter, setFilter] = useState("Toutes");
  const [search, setSearch] = useState("");
  const [approved, setApproved] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleCampaigns = useMemo(() => campaigns.filter((campaign) => {
    const matchesFilter = filter === "Toutes" || campaign.status === filter;
    const matchesSearch = `${campaign.name} ${campaign.client}`.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }), [campaigns, filter, search]);

  const pendingFindings = findings.filter((item) => !approved.includes(item.id) && !dismissed.includes(item.id));
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const opportunityCount = findings.filter((f) => f.severity === "opportunity").length;

  const spendMax = Math.max(...dailySeries.map((d) => d.spend), 1);
  const spendPoints = useMemo(() => scalePoints(dailySeries.map((d) => d.spend)), [dailySeries]);
  const convPoints = useMemo(() => scalePoints(dailySeries.map((d) => d.conversions)), [dailySeries]);
  const chartLabelIndexes = [0, 7, 14, 21, dailySeries.length - 1].filter((i) => i >= 0 && i < dailySeries.length);

  function approve(id: string) {
    setApproved((current) => [...current, id]);
    setNotice("Marqué comme examiné localement. Aucune action n'a été envoyée à Google Ads.");
  }

  function toggleCampaign(id: number) {
    setCampaigns((current) => current.map((campaign) => campaign.id === id
      ? { ...campaign, status: campaign.status === "En pause" ? "Active" : "En pause" }
      : campaign));
    setNotice("Affichage local uniquement : aucune action n'a été envoyée à Google Ads.");
  }

  const sidebar = (
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="brand">
        <div className="brand-mark"><Zap size={20} fill="currentColor" /></div>
        <div><strong>adspilot<span>AI</span></strong><small>CAMPAIGN INTELLIGENCE</small></div>
        <button className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="Fermer"><X size={18}/></button>
      </div>
      <div className="workspace-switch">
        <div className="workspace-avatar">LD</div>
        <div className="workspace-text"><strong>Landeco Studio</strong><small>Espace agence</small></div>
        <ChevronDown size={15} className="muted"/>
      </div>
      <div className="nav-label">ESPACE DE TRAVAIL</div>
      <nav className="main-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return <button key={item.label} className={`nav-item ${activeNav === item.label ? "active" : ""}`} onClick={() => { setActiveNav(item.label); setMobileOpen(false); }}>
            <Icon size={18}/><span>{item.label}</span>{item.badge && <b className="nav-badge">{item.badge}</b>}
          </button>;
        })}
      </nav>
      <div className="nav-label nav-label-spaced">CONFIGURATION</div>
      <nav className="main-nav">
        <button className={`nav-item ${activeNav === "Paramètres" ? "active" : ""}`} onClick={() => setActiveNav("Paramètres")}><Settings2 size={18}/><span>Paramètres</span></button>
        <button className={`nav-item ${activeNav === "Facturation" ? "active" : ""}`} onClick={() => setActiveNav("Facturation")}><CreditCard size={18}/><span>Facturation</span></button>
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><strong>Besoin d&apos;aide ?</strong><p>Consultez le guide de prise en main.</p><button onClick={() => setNotice("Le centre d'aide sera disponible dans une prochaine version.")}>Ouvrir le centre d&apos;aide <ChevronRight size={14}/></button></div>
        <div className="profile"><div className="profile-avatar">ML</div><div><strong>Mon compte</strong><small>Administrateur</small></div><MoreHorizontal size={18} className="muted"/></div>
      </div>
    </aside>
  );

  return (
    <div className="app-shell">
      {sidebar}
      {mobileOpen && <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu"/>}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu"><Menu size={20}/></button>
            <div className="breadcrumb">Espace agence <ChevronRight size={14}/> <strong>{activeNav}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="period-select"><CalendarDays size={15}/><span>30 derniers jours</span><ChevronDown size={14}/></div>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice("Vous êtes à jour : aucune nouvelle notification.")}><Bell size={18}/><i/></button>
            <div className="top-avatar">ML</div>
          </div>
        </header>

        <div className="page-wrap">
          {notice && <div className="notice"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Fermer"><X size={16}/></button></div>}
          <div className="page-heading">
            <div><div className="eyebrow"><span className="live-dot"/> VOTRE ACTIVITÉ PUBLICITAIRE</div><h1>Vue d&apos;ensemble</h1><p>Pilotez les performances de vos clients depuis un seul espace.</p></div>
            <div className="heading-actions"><button className="button button-secondary" onClick={() => setNotice("Rechargez la page pour relire les dernières données synchronisées depuis Google Ads.")}><RefreshCw size={16}/> Actualiser</button><button className="button button-primary" onClick={() => { setActiveNav("Clients"); setNotice("Vous pouvez connecter un nouveau client depuis le module Clients."); }}><Plus size={17}/> Ajouter un client</button></div>
          </div>

          <section className="stats-grid">
            <StatCard label="Dépenses publicitaires" value={money(stats.totalSpend)} change={formatTrend(stats.spendTrendPct)} positive={(stats.spendTrendPct ?? 0) <= 0} icon={<Wallet size={18}/>} foot="vs 15 jours précédents"/>
            <StatCard label="Conversions" value={String(stats.totalConversions)} change={formatTrend(stats.conversionsTrendPct)} positive={(stats.conversionsTrendPct ?? 0) >= 0} icon={<Target size={18}/>} foot="vs 15 jours précédents"/>
            <StatCard label="Coût par conversion" value={money(stats.avgCpa)} change="—" positive icon={<CircleDollarSign size={18}/>} foot="moyenne sur 30 jours"/>
            <StatCard label="Comptes clients" value={String(stats.totalClients)} change={`${stats.connectedClients} connectés`} positive icon={<BriefcaseBusiness size={18}/>} foot={`sur ${stats.totalClients} comptes liés`}/>
          </section>

          <section className="content-grid">
            <div className="panel performance-panel">
              <div className="panel-heading"><div><h2>Performance globale</h2><p>Évolution des dépenses et conversions (données réelles Google Ads)</p></div><button className="more-button" onClick={() => setNotice("Agrégat de toutes les campagnes connectées.")}><MoreHorizontal size={20}/></button></div>
              <div className="chart-legend"><span><i className="legend-spend"/> Dépenses</span><span><i className="legend-conv"/> Conversions</span><span className="chart-period">{dailySeries.length > 0 ? `${new Date(dailySeries[0].date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — ${new Date(dailySeries[dailySeries.length - 1].date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ""}</span></div>
              <div className="chart-wrap">
                <div className="chart-y-labels">
                  <span>{money(spendMax)}</span>
                  <span>{money(spendMax * 0.75)}</span>
                  <span>{money(spendMax * 0.5)}</span>
                  <span>{money(spendMax * 0.25)}</span>
                  <span>0 €</span>
                </div>
                <svg className="chart" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none" role="img" aria-label="Graphique d'évolution des dépenses et conversions">
                  {[15, 62, 109, 156, 203].map(y => <line key={y} x1="0" x2={CHART_WIDTH} y1={y} y2={y} className="grid-line"/> )}
                  <defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7467f0" stopOpacity=".18"/><stop offset="100%" stopColor="#7467f0" stopOpacity="0"/></linearGradient></defs>
                  {spendPoints.length > 1 && <path d={areaPath(spendPoints)} fill="url(#area)"/>}
                  {spendPoints.length > 1 && <path d={linePath(spendPoints)} className="line-spend"/>}
                  {convPoints.length > 1 && <path d={linePath(convPoints)} className="line-conv"/>}
                  {spendPoints.length > 0 && <circle cx={spendPoints[spendPoints.length - 1].x} cy={spendPoints[spendPoints.length - 1].y} r="4" className="chart-point"/>}
                </svg>
                <div className="chart-x-labels">
                  {chartLabelIndexes.map((i) => <span key={i}>{new Date(dailySeries[i].date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>)}
                </div>
              </div>
            </div>

            <div className="panel ai-panel">
              <div className="ai-panel-top"><div className="ai-icon"><Bot size={20}/></div><span className="ai-label">MOTEUR DE RÈGLES</span><span className="ai-status">EN LIGNE</span></div>
              <h2>Analyse déterministe<br/>de vos campagnes.</h2>
              <p className="ai-intro">Règles explicables appliquées à vos données réelles des 30 derniers jours. Aucune action n&apos;est exécutée automatiquement.</p>
              <div className="ai-insight"><div className="insight-icon amber"><AlertTriangle size={17}/></div><div><strong>{warningCount} point{warningCount === 1 ? "" : "s"} de vigilance</strong><small>Seuils dépassés sur vos campagnes</small></div></div>
              <div className="ai-insight"><div className="insight-icon blue"><Lightbulb size={17}/></div><div><strong>{opportunityCount} opportunité{opportunityCount === 1 ? "" : "s"} détectée{opportunityCount === 1 ? "" : "s"}</strong><small>Budget disponible non exploité</small></div></div>
              <div className="ai-bottom"><div><strong>{findings.length} constat{findings.length === 1 ? "" : "s"}</strong><small>Prêts à être examinés</small></div><button onClick={() => setActiveNav("Optimisations IA")}>Examiner <ChevronRight size={15}/></button></div>
            </div>
          </section>

          <section className="panel campaigns-panel">
            <div className="panel-heading campaign-heading"><div><h2>Campagnes récentes</h2><p>Suivez les performances de vos campagnes clients.</p></div><button className="text-button" onClick={() => setActiveNav("Campagnes")}>Voir toutes les campagnes <ChevronRight size={15}/></button></div>
            <div className="table-toolbar"><div className="search-box"><Search size={16}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une campagne ou un client..."/></div><div className="filter-box"><Filter size={15}/><select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrer les campagnes"><option>Toutes</option><option>Active</option><option>En pause</option></select></div></div>
            <div className="table-scroll"><table><thead><tr><th>Campagne / Client</th><th>Statut</th><th>Dépenses</th><th>Clics</th><th>Conversions</th><th>CPA</th><th>Tendance</th><th></th></tr></thead>
              <tbody>{visibleCampaigns.map((c) => <tr key={c.id}><td><div className="campaign-name">{c.name}</div><div className="campaign-client">{c.client} <span>· {c.channel}</span></div></td><td><Status status={c.status}/></td><td><strong>{money(c.spend)}</strong><div className="budget-line"><i style={{width: `${c.budget > 0 ? Math.min(100, (c.spend / c.budget) * 100) : 0}%`}}/></div><small className="table-muted">Budget {c.budget > 0 ? `${money(c.budget)}/j` : "N/A"}</small></td><td>{c.clicks.toLocaleString("fr-FR")}</td><td><strong>{c.conversions}</strong></td><td>{c.conversions > 0 ? money(c.cpa) : "—"}</td><td><span className={c.trend.startsWith("+") ? "trend-up" : c.trend.startsWith("-") ? "trend-down" : ""}>{c.trend}</span></td><td><button className="row-action" title={c.status === "En pause" ? "Activer" : "Mettre en pause"} onClick={() => toggleCampaign(c.id)}>{c.status === "En pause" ? <Play size={16}/> : <Pause size={16}/>}</button></td></tr>)}</tbody>
            </table>{visibleCampaigns.length === 0 && <div className="empty-state">Aucune campagne ne correspond à votre recherche.</div>}</div>
            <div className="table-footer"><span>Affichage de {visibleCampaigns.length} campagne(s) sur {campaigns.length}</span><span className="demo-tag"><span/> DONNÉES GOOGLE ADS RÉELLES</span></div>
          </section>

          <section className="bottom-grid">
            <div className="panel recommendations-panel">
              <div className="panel-heading"><div><h2>Constats du moteur de règles</h2><p>Analyse réelle de vos campagnes, à examiner avant toute action.</p></div><span className="count-pill">{pendingFindings.length} en attente</span></div>
              <div className="recommendation-list">
                {findings.filter((f) => !dismissed.includes(f.id)).map((f) => <div className="recommendation" key={f.id}>
                  <div className={`recommendation-icon ${SEVERITY_TONE[f.severity]}`}>{RULE_LABELS[f.rule] === "Budget" ? <Wallet size={17}/> : RULE_LABELS[f.rule] === "Diffusion" ? <Search size={17}/> : <Gauge size={17}/>}</div>
                  <div className="recommendation-body"><div className="recommendation-meta"><span>{RULE_LABELS[f.rule]}</span><b>{approved.includes(f.id) ? "Validée" : SEVERITY_TAG[f.severity]}</b></div><strong>{f.title}</strong><p>{f.detail}</p><div className="recommendation-impact">{f.metric}</div></div>
                  <div className="recommendation-actions">{approved.includes(f.id) ? <span className="approved-label"><Check size={15}/> Validée</span> : <><button className="approve-button" onClick={() => approve(f.id)}>Marquer examiné</button><button className="dismiss-button" onClick={() => setDismissed((v) => [...v, f.id])} aria-label="Ignorer"><X size={16}/></button></>}</div>
                </div>)}
                {findings.length === 0 && <div className="empty-state">Aucune anomalie détectée sur vos campagnes actives.</div>}
                {findings.length > 0 && pendingFindings.length === 0 && <div className="empty-state">Tous les constats ont été examinés.</div>}
              </div>
              <button className="view-all-button" onClick={() => setActiveNav("Optimisations IA")}>Voir tous les constats <ChevronRight size={15}/></button>
            </div>

            <div className="panel clients-panel">
              <div className="panel-heading"><div><h2>Vos clients</h2><p>Vue rapide de votre portefeuille.</p></div><button className="more-button" onClick={() => setActiveNav("Clients")}><MoreHorizontal size={20}/></button></div>
              <div className="client-list">{clients.map((client) => <div className="client-row" key={client.name}><div className={`client-avatar ${client.color}`}>{client.initials}</div><div className="client-info"><strong>{client.name}</strong><small>{client.sector}</small></div><div className="client-right"><strong>{client.spend}</strong><small className={client.status === "Connecté" ? "connected" : "reconnect"}>{client.status}</small></div></div>)}
                {clients.length === 0 && <div className="empty-state">Aucun client synchronisé pour le moment.</div>}
              </div>
              <button className="view-all-button" onClick={() => setActiveNav("Clients")}>Gérer les clients <ChevronRight size={15}/></button>
            </div>
          </section>

          <footer className="footer"><span>© 2026 Adspilot AI · Données Google Ads connectées</span><span><ShieldCheck size={14}/> Vos données restent sous votre contrôle</span></footer>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, change, positive, icon, foot }: { label: string; value: string; change: string; positive: boolean; icon: React.ReactNode; foot: string }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className="stat-icon">{icon}</div></div><div className="stat-value">{value}</div><div className="stat-bottom"><span className={positive ? "stat-positive" : "stat-negative"}>{positive ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {change}</span><span>{foot}</span></div></div>;
}
function Status({ status }: { status: CampaignRow["status"] }) {
  const cls = status === "Active" ? "status-active" : "status-paused";
  return <span className={`status ${cls}`}><i/>{status}</span>;
}
