<p align="center">
  <a href="README.md">English</a> |
  <a href="README_KO.md">한국어</a> |
  <a href="README_JA.md">日本語</a> |
  <a href="README_ZH.md">中文</a> |
  <a href="README_FR.md">Français</a>
</p>

# Human-to-Human CAPTCHA (H2H-CAPTCHA)

> **"Vérification en temps réel par des humains, pour des humains."**

H2H-CAPTCHA est une solution de sécurité innovante qui remplace les tests de Turing automatisés (comme identifier des feux de signalisation) par une interaction humaine en temps réel. Les utilisateurs ("Clients") sont associés à des vérificateurs humains ("Validateurs") pour effectuer des tâches interactives.

---

## 🏗 Architecture

Aucun serveur backend dédié requis. Fonctionne entièrement avec **React + Supabase**.

### Frontend (React + TypeScript + Vite)
- **Supabase Realtime Broadcast** : Transmet les données de suivi de souris jusqu'à 40 fois/seconde sans écriture en base de données.
- **Supabase Presence** : Détecte la déconnexion du partenaire en temps réel.
- **Postgres Changes** : Notifie instantanément les utilisateurs en attente dès qu'un match est créé.

### Base de données & Temps réel (Supabase + PostgreSQL)
- Table **`queued_participants`** : Gère la file d'attente des Clients et Validateurs.
- Table **`matches`** : Stocke les enregistrements de matchs actifs et terminés.
- Table **`client_states`** : Suit le nombre d'échecs et les listes noires par client.
- RPC **`try_match()`** : Appariement atomique 1:1 avec `FOR UPDATE SKIP LOCKED`.
- RPC **`record_decision()`** : Traite les verdicts d'approbation/rejet et met à jour les échecs.
- RPC **`handle_disconnect()`** : Nettoie la file et les matchs actifs lors d'une déconnexion.

### Stratégie de canaux
```
queued_participants  → Postgres Changes  (attente de match)
session:{match_id}   → Broadcast         (événements souris / jeu / résultat)
session:{match_id}   → Presence          (détection de déconnexion)
```

---

## 🎮 Défis Interactifs

Le système prend en charge quatre modes de vérification contrôlés par le Validateur :

1. **🖱️ Suivi de Souris (Passif)**
   - Le Validateur observe les mouvements naturels de la souris du Client.
   - Objectif : Détecter les mouvements linéaires ou téléportations typiques des bots.
   - Technologie : Realtime Broadcast 30fps (sans écriture DB).

2. **✏️ Dessin (Actif)**
   - Le Validateur assigne un sujet (ex : « Pomme »). Le Client le dessine sur un canevas.
   - Objectif : Vérifier la créativité humaine et le contrôle moteur.
   - Technologie : Système de double coordonnées (global + relatif au canevas).

3. **👊 Pierre-Feuille-Ciseaux (Réaction)**
   - Le Validateur envoie un défi (ex : « Pierre »). Le Client doit choisir le coup gagnant (« Feuille »).
   - Objectif : Tester la compréhension des règles et la réponse cognitive.

4. **💬 Chat (Turing)**
   - Conversation textuelle libre avec indicateurs « En train de taper... » en temps réel.
   - Objectif : Vérification finale par interaction linguistique avancée.

---

## 🚀 Démarrage

### Prérequis
- **Node.js** 18+
- Un projet **Supabase** ([supabase.com](https://supabase.com))

### 1. Configuration de la base de données

Exécutez la migration dans l'éditeur SQL de Supabase :

```bash
# Fichier : supabase/migrations/001_h2h_captcha.sql
```

Activez ensuite le Realtime pour la table `matches` dans le tableau de bord Supabase → Database → Replication.

### 2. Variables d'environnement

```env
# .env.local
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

L'URL et l'anon key sont disponibles dans le tableau de bord Supabase → Project Settings → API.

### 3. Installation et lancement

```bash
npm install
npm run dev
```

Ouvrez `http://localhost:5173`.

### Utilisation
1. **Onglet 1** : Sélectionnez **"Je suis un utilisateur (Client)"**.
2. **Onglet 2** : Sélectionnez **"Je suis un validateur"**.
3. Le système vous met en relation instantanément.
4. Utilisez la console du Validateur pour changer de tâche et vérifier le Client.

---

## 🛡️ Sécurité et Confidentialité
- **Routage basé sur l'UUID** : UUID stocké dans `localStorage` pour maintenir l'identité après rechargement.
- **Isolation** : Les Clients ne peuvent pas communiquer entre eux.
- **Liste noire de Validateurs** : Empêche le rematch avec le même Validateur (géré dans `client_states`).
- **Suivi des échecs** : Blocage permanent après 3 rejets consécutifs.
- **Sécurité au niveau des lignes (RLS)** : Toutes les tables appliquent RLS ; les opérations sensibles s'exécutent via des fonctions `SECURITY DEFINER`.

---

## 🗂 Structure du Projet

```
├── src/
│   ├── hooks/
│   │   └── useSupabase.ts     # Hook principal (matching + broadcast + presence)
│   ├── lib/
│   │   └── supabase.ts        # Singleton client Supabase
│   ├── pages/
│   │   ├── ClientPage.tsx
│   │   └── ValidatorPage.tsx
│   ├── types/
│   │   └── index.ts           # MatchRow, SessionBroadcast, etc.
│   └── i18n/
│       └── translations.ts    # Support de 5 langues
├── supabase/
│   └── migrations/
│       └── 001_h2h_captcha.sql
├── .env.local                 # Identifiants Supabase (gitignore)
└── vite.config.ts
```

---

© 2025 Projet Captcha H2H.
