# Leads France

Site de captation de leads (rappel gratuit) : défiscalisation et énergies renouvelables.
Next.js 15 (App Router) + Supabase + Vercel.

## Démarrage local
1. `npm install`
2. `cp .env.example .env.local` puis renseignez les variables.
3. Supabase : créez un projet, ouvrez **SQL Editor**, collez `supabase/schema.sql`, exécutez.
4. `npm run dev` puis ouvrez http://localhost:3000 (leads visibles sur `/admin`).

## Déploiement
1. Poussez sur GitHub : `git init && git add . && git commit -m "init" && git remote add origin <url> && git push -u origin main`
2. Vercel > Add New Project > importez le dépôt.
3. Ajoutez les variables de `.env.example` (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_USER, ADMIN_PASSWORD).
4. Déployez, puis branchez votre nom de domaine.

## Avant la mise en ligne (obligatoire)
- Remplacer tous les `[NOM DE VOTRE SOCIÉTÉ]`, `[E-MAIL DPO]`, etc. et ajouter mentions légales + politique de confidentialité + bannière cookies si vous utilisez des traceurs.
- Faire valider le texte de consentement, les avantages affichés (`app/page.tsx`) et les messages publicitaires par un juriste.
- Remplacer `lib/estimate.ts` par des barèmes justifiables.
- Ajouter une limitation de débit anti-spam (ex. Upstash Ratelimit ou Vercel BotID) sur `/api/leads`.
- Remplacer l'authentification basique de `/admin` par Supabase Auth dès que plusieurs personnes y accèdent.

## Structure
- `app/page.tsx` : page d'accueil, section « Ce que vous pouvez y gagner » (tableau `OFFERS`, modifiable)
- `components/Funnel.tsx` : simulateur + formulaire
- `components/CtaLink.tsx` : boutons « Être rappelé pour… » qui présélectionnent le motif
- `app/api/leads/route.ts` : validation (zod) + insertion Supabase côté serveur
- `app/admin/page.tsx` : liste des leads (protégée par `middleware.ts`)
- `supabase/schema.sql` : table `leads` avec RLS (aucun accès public direct)
