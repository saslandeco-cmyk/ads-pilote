# Adspilot AI — Prototype SaaS

Prototype d'une plateforme de pilotage multi-clients et d'aide à l'optimisation Google Ads.

## Prérequis

- Node.js 20.9 ou supérieur
- npm
- Visual Studio Code

## Installation

1. Décompresser le ZIP.
2. Ouvrir le dossier `adspilot-ai` dans VS Code.
3. Ouvrir le terminal intégré.
4. Installer les dépendances :

```bash
npm install
```

5. Lancer le serveur de développement :

```bash
npm run dev
```

6. Ouvrir http://localhost:3000

## Commandes

```bash
npm run dev     # développement
npm run build   # compilation de production
npm run start   # serveur de production
npm run lint    # vérification ESLint
```

## Contenu du prototype

- Dashboard agence multi-clients.
- Indicateurs de dépenses, conversions et CPA.
- Graphique de performance.
- Tableau des campagnes avec recherche et filtres.
- Activation / mise en pause simulée d'une campagne.
- Recommandations IA avec validation ou rejet simulé.
- Liste des clients et état de connexion.
- Interface responsive desktop, tablette et mobile.

## Important : données de démonstration

Cette version est un prototype frontend. Les chiffres, clients, campagnes et recommandations sont fictifs. Les actions de validation, pause et activation ne modifient aucun compte Google Ads.

Aucune connexion Google Ads réelle n'est encore implémentée.

## Prochaines étapes techniques

### 1. Authentification et gestion des utilisateurs
Mettre en place une authentification sécurisée, les rôles (administrateur / collaborateur) et l'isolation des données par organisation.

### 2. Base de données
Créer les tables PostgreSQL :
- organizations
- users
- clients
- google_ads_accounts
- campaigns
- campaign_metrics
- optimization_recommendations
- optimization_actions
- audit_logs

### 3. Connexion Google Ads
Créer un projet Google Cloud, activer Google Ads API, configurer OAuth 2.0 et demander un developer token. Les accès de production et niveaux de service sont soumis à validation par Google.

### 4. Collecte des performances
Créer des tâches planifiées côté serveur pour récupérer les métriques et conserver un historique. Ne pas faire dépendre les traitements longs du navigateur.

### 5. Moteur de règles
Commencer par des règles déterministes et explicables :
- seuil de dépenses sans conversion ;
- dérive du CPA ;
- rythme de consommation du budget ;
- termes de recherche à exclure ;
- campagnes sans diffusion ;
- suivi de la qualité des conversions.

### 6. Exécution sécurisée
Toute action doit être journalisée, limitée par des plafonds et idempotente. Prévoir un mode lecture seule, un mode validation humaine et seulement ensuite une automatisation explicite. Ajouter des garde-fous contre les modifications massives.

## Structure

```text
adspilot-ai/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── dashboard.tsx
├── public/
├── .env.example
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

## Version

- Next.js 16.4.6
- React 19
- TypeScript
- Tailwind CSS 4 (configuration PostCSS)
- lucide-react

La version exacte de Next.js est volontairement fixée dans `package.json` pour assurer une installation reproductible.
