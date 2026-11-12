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

type Campaign = {
  id: number; name: string; client: string; channel: string; status: "Active" | "À surveiller" | "En pause";
  spend: number; budget: number; clicks: number; conversions: number; cpa: number; trend: string;
};

const initialCampaigns: Campaign[] = [
  { id: 1, name: "Dépannage plomberie — Local", client: "Plomberie Martin", channel: "Search", status: "Active", spend: 184, budget: 250, clicks: 326, conversions: 18, cpa: 10.22, trend: "+12,4%" },
  { id: 2, name: "Expertise fissures", client: "GF Expertise", channel: "Search", status: "À surveiller", spend: 312, budget: 400, clicks: 491, conversions: 11, cpa: 28.36, trend: "-8,2%" },
  { id: 3, name: "Fenêtres PVC — Mont-de-Marsan", client: "Menuiserie Dupont", channel: "Search", status: "Active", spend: 146, budget: 250, clicks: 208, conversions: 14, cpa: 10.43, trend: "+6,1%" },
  { id: 4, name: "Création site internet", client: "Studio Web 40", channel: "Search", status: "En pause", spend: 72, budget: 180, clicks: 119, conversions: 3, cpa: 24.00, trend: "-14,5%" },
  { id: 5, name: "Rénovation énergétique", client: "Habitat Conseil", channel: "Performance Max", status: "Active", spend: 528, budget: 700, clicks: 1104, conversions: 32, cpa: 16.50, trend: "+18,7%" },
];

const clients = [
  { name: "Plomberie Martin", sector: "Plomberie · Dax", campaigns: 2, spend: "184 €", status: "Connecté", initials: "PM", color: "blue" },
  { name: "GF Expertise", sector: "Expert bâtiment · Landes", campaigns: 3, spend: "312 €", status: "Connecté", initials: "GF", color: "violet" },
  { name: "Menuiserie Dupont", sector: "Menuiserie · Mont-de-Marsan", campaigns: 1, spend: "146 €", status: "Connecté", initials: "MD", color: "orange" },
  { name: "Studio Web 40", sector: "Agence web · Landes", campaigns: 2, spend: "72 €", status: "À reconnecter", initials: "SW", color: "green" },
];

const recommendations = [
  { id: 1, type: "Budget", title: "Réallouer le budget de GF Expertise", detail: "La campagne consomme 78 % de son budget avec un CPA en hausse. Réduire le budget quotidien de 10 % et surveiller les conversions.", impact: "Économie estimée : 25 €/mois", tone: "amber", tag: "À valider" },
  { id: 2, type: "Mots-clés", title: "Ajouter 4 mots-clés négatifs", detail: "Les termes « formation plomberie » et « salaire plombier » génèrent des clics sans intention commerciale.", impact: "Dépenses évitables : 18 €", tone: "blue", tag: "Recommandé" },
  { id: 3, type: "Enchères", title: "Ajuster l'objectif CPA", detail: "La campagne Menuiserie Dupont est sous son CPA cible depuis 14 jours. Une hausse progressive du budget peut être testée.", impact: "Potentiel : +3 conversions", tone: "green", tag: "Opportunité" },
];

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

export default function Dashboard() {
  const [activeNav, setActiveNav] = useState("Vue d'ensemble");
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [filter, setFilter] = useState("Toutes");
  const [search, setSearch] = useState("");
  const [approved, setApproved] = useState<number[]>([]);
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [notice, setNotice] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleCampaigns = useMemo(() => campaigns.filter((campaign) => {
    const matchesFilter = filter === "Toutes" || campaign.status === filter;
    const matchesSearch = `${campaign.name} ${campaign.client}`.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }), [campaigns, filter, search]);

  const pendingRecommendations = recommendations.filter((item) => !approved.includes(item.id) && !dismissed.includes(item.id));

  function approve(id: number) {
    setApproved((current) => [...current, id]);
    setNotice("Optimisation validée dans la démonstration. Aucune action Google Ads réelle n'a été exécutée.");
  }

  function toggleCampaign(id: number) {
    setCampaigns((current) => current.map((campaign) => campaign.id === id
      ? { ...campaign, status: campaign.status === "En pause" ? "Active" : "En pause" }
      : campaign));
    setNotice("Statut modifié dans les données de démonstration uniquement.");
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
            <div className="heading-actions"><button className="button button-secondary" onClick={() => setNotice("Actualisation de démonstration terminée.")}><RefreshCw size={16}/> Actualiser</button><button className="button button-primary" onClick={() => { setActiveNav("Clients"); setNotice("Vous pouvez connecter un nouveau client depuis le module Clients."); }}><Plus size={17}/> Ajouter un client</button></div>
          </div>

          <section className="stats-grid">
            <StatCard label="Dépenses publicitaires" value="1 242 €" change="+8,2 %" positive={false} icon={<Wallet size={18}/>} foot="vs période précédente"/>
            <StatCard label="Conversions" value="78" change="+16,4 %" positive icon={<Target size={18}/>} foot="vs période précédente"/>
            <StatCard label="Coût par conversion" value="15,92 €" change="-7,1 %" positive icon={<CircleDollarSign size={18}/>} foot="vs période précédente"/>
            <StatCard label="Comptes clients" value="4" change="3 actifs" positive icon={<BriefcaseBusiness size={18}/>} foot="sur 4 comptes connectés"/>
          </section>

          <section className="content-grid">
            <div className="panel performance-panel">
              <div className="panel-heading"><div><h2>Performance globale</h2><p>Évolution des dépenses et conversions</p></div><button className="more-button" onClick={() => setNotice("Graphique présenté avec des données fictives.")}><MoreHorizontal size={20}/></button></div>
              <div className="chart-legend"><span><i className="legend-spend"/> Dépenses</span><span><i className="legend-conv"/> Conversions</span><span className="chart-period">1 oct. — 31 oct. 2026</span></div>
              <div className="chart-wrap">
                <div className="chart-y-labels"><span>500 €</span><span>375 €</span><span>250 €</span><span>125 €</span><span>0 €</span></div>
                <svg className="chart" viewBox="0 0 680 220" preserveAspectRatio="none" role="img" aria-label="Graphique d'évolution des dépenses et conversions">
                  {[15, 62, 109, 156, 203].map(y => <line key={y} x1="0" x2="680" y1={y} y2={y} className="grid-line"/> )}
                  <defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7467f0" stopOpacity=".18"/><stop offset="100%" stopColor="#7467f0" stopOpacity="0"/></linearGradient></defs>
                  <path d="M0 153 C35 145 48 165 82 137 S135 129 164 142 S215 103 246 116 S292 93 328 111 S374 83 410 96 S452 67 492 84 S540 60 574 77 S635 40 680 48 L680 203 L0 203Z" fill="url(#area)"/>
                  <path d="M0 153 C35 145 48 165 82 137 S135 129 164 142 S215 103 246 116 S292 93 328 111 S374 83 410 96 S452 67 492 84 S540 60 574 77 S635 40 680 48" className="line-spend"/>
                  <path d="M0 178 C38 174 50 180 82 165 S135 172 164 158 S215 166 246 151 S292 155 328 145 S374 157 410 137 S452 148 492 130 S540 141 574 118 S635 126 680 105" className="line-conv"/>
                  <circle cx="680" cy="48" r="4" className="chart-point"/>
                </svg>
                <div className="chart-x-labels"><span>1 oct.</span><span>7 oct.</span><span>14 oct.</span><span>21 oct.</span><span>31 oct.</span></div>
              </div>
            </div>

            <div className="panel ai-panel">
              <div className="ai-panel-top"><div className="ai-icon"><Bot size={20}/></div><span className="ai-label">ADSPILOT INTELLIGENCE</span><span className="ai-status">EN LIGNE</span></div>
              <h2>Votre copilote a détecté<br/>des opportunités.</h2>
              <p className="ai-intro">L&apos;analyse automatique de vos comptes a identifié plusieurs optimisations potentielles.</p>
              <div className="ai-insight"><div className="insight-icon amber"><AlertTriangle size={17}/></div><div><strong>1 point de vigilance</strong><small>Un coût par conversion en hausse</small></div></div>
              <div className="ai-insight"><div className="insight-icon blue"><Lightbulb size={17}/></div><div><strong>2 opportunités détectées</strong><small>Budget et mots-clés à optimiser</small></div></div>
              <div className="ai-bottom"><div><strong>3 recommandations</strong><small>Prêtes à être examinées</small></div><button onClick={() => setActiveNav("Optimisations IA")}>Examiner <ChevronRight size={15}/></button></div>
            </div>
          </section>

          <section className="panel campaigns-panel">
            <div className="panel-heading campaign-heading"><div><h2>Campagnes récentes</h2><p>Suivez les performances de vos campagnes clients.</p></div><button className="text-button" onClick={() => setActiveNav("Campagnes")}>Voir toutes les campagnes <ChevronRight size={15}/></button></div>
            <div className="table-toolbar"><div className="search-box"><Search size={16}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une campagne ou un client..."/></div><div className="filter-box"><Filter size={15}/><select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrer les campagnes"><option>Toutes</option><option>Active</option><option>À surveiller</option><option>En pause</option></select></div></div>
            <div className="table-scroll"><table><thead><tr><th>Campagne / Client</th><th>Statut</th><th>Dépenses</th><th>Clics</th><th>Conversions</th><th>CPA</th><th>Tendance</th><th></th></tr></thead>
              <tbody>{visibleCampaigns.map((c) => <tr key={c.id}><td><div className="campaign-name">{c.name}</div><div className="campaign-client">{c.client} <span>· {c.channel}</span></div></td><td><Status status={c.status}/></td><td><strong>{money(c.spend)}</strong><div className="budget-line"><i style={{width: `${Math.min(100, c.spend / c.budget * 100)}%`}}/></div><small className="table-muted">Budget {money(c.budget)}</small></td><td>{c.clicks.toLocaleString("fr-FR")}</td><td><strong>{c.conversions}</strong></td><td>{money(c.cpa)}</td><td><span className={c.trend.startsWith("+") ? "trend-up" : "trend-down"}>{c.trend}</span></td><td><button className="row-action" title={c.status === "En pause" ? "Activer" : "Mettre en pause"} onClick={() => toggleCampaign(c.id)}>{c.status === "En pause" ? <Play size={16}/> : <Pause size={16}/>}</button></td></tr>)}</tbody>
            </table>{visibleCampaigns.length === 0 && <div className="empty-state">Aucune campagne ne correspond à votre recherche.</div>}</div>
            <div className="table-footer"><span>Affichage de {visibleCampaigns.length} campagne(s) sur {campaigns.length}</span><span className="demo-tag"><span/> DONNÉES DE DÉMONSTRATION</span></div>
          </section>

          <section className="bottom-grid">
            <div className="panel recommendations-panel">
              <div className="panel-heading"><div><h2>Recommandations IA</h2><p>Les actions à examiner en priorité.</p></div><span className="count-pill">{pendingRecommendations.length} en attente</span></div>
              <div className="recommendation-list">
                {recommendations.filter((r) => !dismissed.includes(r.id)).map((r) => <div className="recommendation" key={r.id}>
                  <div className={`recommendation-icon ${r.tone}`}>{r.type === "Budget" ? <Wallet size={17}/> : r.type === "Mots-clés" ? <Search size={17}/> : <Gauge size={17}/>}</div>
                  <div className="recommendation-body"><div className="recommendation-meta"><span>{r.type}</span><b>{approved.includes(r.id) ? "Validée" : r.tag}</b></div><strong>{r.title}</strong><p>{r.detail}</p><div className="recommendation-impact">{r.impact}</div></div>
                  <div className="recommendation-actions">{approved.includes(r.id) ? <span className="approved-label"><Check size={15}/> Validée</span> : <><button className="approve-button" onClick={() => approve(r.id)}>Valider</button><button className="dismiss-button" onClick={() => setDismissed((v) => [...v, r.id])} aria-label="Ignorer"><X size={16}/></button></>}</div>
                </div>)}
                {pendingRecommendations.length === 0 && <div className="empty-state">Toutes les recommandations ont été traitées.</div>}
              </div>
              <button className="view-all-button" onClick={() => setActiveNav("Optimisations IA")}>Voir toutes les recommandations <ChevronRight size={15}/></button>
            </div>

            <div className="panel clients-panel">
              <div className="panel-heading"><div><h2>Vos clients</h2><p>Vue rapide de votre portefeuille.</p></div><button className="more-button" onClick={() => setActiveNav("Clients")}><MoreHorizontal size={20}/></button></div>
              <div className="client-list">{clients.map((client) => <div className="client-row" key={client.name}><div className={`client-avatar ${client.color}`}>{client.initials}</div><div className="client-info"><strong>{client.name}</strong><small>{client.sector}</small></div><div className="client-right"><strong>{client.spend}</strong><small className={client.status === "Connecté" ? "connected" : "reconnect"}>{client.status}</small></div></div>)}</div>
              <button className="view-all-button" onClick={() => setActiveNav("Clients")}>Gérer les clients <ChevronRight size={15}/></button>
            </div>
          </section>

          <footer className="footer"><span>© 2026 Adspilot AI · Prototype de démonstration</span><span><ShieldCheck size={14}/> Vos données restent sous votre contrôle</span></footer>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, change, positive, icon, foot }: { label: string; value: string; change: string; positive: boolean; icon: React.ReactNode; foot: string }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className="stat-icon">{icon}</div></div><div className="stat-value">{value}</div><div className="stat-bottom"><span className={positive ? "stat-positive" : "stat-negative"}>{positive ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {change}</span><span>{foot}</span></div></div>;
}
function Status({ status }: { status: Campaign["status"] }) {
  const cls = status === "Active" ? "status-active" : status === "À surveiller" ? "status-watch" : "status-paused";
  return <span className={`status ${cls}`}><i/>{status}</span>;
}