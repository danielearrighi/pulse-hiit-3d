# 🏃 Pulse HIIT 3D - Context & Development Guidelines

Questo file fornisce il contesto architetturale, tecnico e operativo per l'assistente AI e gli sviluppatori che lavorano su **Pulse HIIT 3D**. Viene caricato automaticamente come Workspace Rule per garantire coerenza, rispetto dei vincoli e rapidità di intervento.

---

## 🧭 Panoramica del Progetto

**Pulse HIIT 3D** è una piattaforma web full-stack responsive per la pianificazione, creazione ed esecuzione guidata di workout **Cardio & HIIT**, integrata con un **simulatore anatomico 3D** basato su Three.js con cinematica inversa (IK) per la modellazione e riproduzione degli esercizi.

---

## 🏗️ Architettura & Stack Tecnologico

### Frontend (`client/`)
- **Framework**: Vue 3 (Composition API `<script setup>`), Vite 6.
- **Routing**: Vue Router 4 (HTML5 History Mode con code-splitting dinamico).
- **3D Engine**: Three.js (r170) modulare senza librerie esterne pesanti.
- **Design System**: Material 3 personalizzato (`client/src/assets/css/`).
- **Audio Engine**: Web Audio API nativo con oscillatori sintetizzati (beeps countdown, fanfara di completamento) e `DynamicCompressorNode`.
- **Mobile Support**: Screen Wake Lock API per prevenire lo standby durante il workout, Safe Area Insets (iOS/Android), PWA Standalone.
- **Internazionalizzazione (i18n)**: Zero-latenza tramite `localStorage` + revalidazione asincrona con fallback locale (`public/locales/{it,en}/translation.json`).

### Backend (`server/`)
- **Runtime**: Node.js (CommonJS), Express.js 4.
- **Database**: PostgreSQL 18 (supporto per Docker in locale e Render Cloud con SSL).
- **Autenticazione**: JWT persistente (validità 30 giorni) salvato in cookie `HttpOnly` (`jwt`), con supporto opzionale a header `Authorization: Bearer <token>`.
- **Sicurezza**: Hashing password con `bcryptjs`, middleware di controllo ruoli (`user`, `superuser`, `admin`), sanitizzazione e cascading deletes.
- **Testing**: Suite di test automatizzati nativa in `server/tests/run-tests.js` (11 blocchi di verifica).

---

## 📁 Mappa del Repository

```text
pulse-hiit-3d/
├── client/                               # Frontend Vue 3 + Vite SPA
│   ├── vite.config.js                    # Configurazione Vite e Reverse Proxy verso Express (:3000)
│   ├── index.html                        # Template HTML (meta viewport, standalone PWA, font)
│   └── src/
│       ├── main.js                       # Bootstrap Vue
│       ├── App.vue                       # Layout root, snackbar globale, modali auth
│       ├── router/index.js               # Definizione rotte frontend
│       ├── composables/                  # useAuth, useCategories, useI18n, useSnackbar
│       ├── services/
│       │   ├── api.js                    # Fetch client centralizzato (gestione credenziali e cookie)
│       │   ├── audio.js                  # Sintesi audio workout (beep 3-2-1, cambio fase, fanfara)
│       │   └── wakeLock.js               # Gestione Screen Wake Lock API
│       ├── mannequin/
│       │   └── mannequin.js              # Engine 3D Mannequin Three.js, scheletro 17 giunti, IK, Slerp
│       ├── components/                   # Componenti riutilizzabili (NavRail, TopAppBar, modali)
│       └── views/
│           ├── DashboardView.vue         # Lista schede, statistiche personali (workout e minuti), filtri
│           ├── BuilderView.vue           # Costruzione schede HIIT a gruppi, reps/tempo, riordino/duplica
│           ├── EditorView.vue            # Studio 3D interattivo, pose, giunti, IK, equipment, timeline
│           ├── LibraryView.vue           # Catalogo esercizi predefiniti e personalizzati + preview 3D
│           ├── PlayerView.vue            # Riproduttore workout fullscreen, manichino 3D sincrono, timer
│           └── AdminView.vue             # Gestione utenti, ruoli, cambio password, backup/ripristino
├── server/                               # Backend REST API Express
│   ├── index.js                          # Server Express, middleware i18n, static serving & SPA fallback
│   ├── middleware/auth.js                # Estrazione JWT, verifica token, ruoli
│   ├── db/
│   │   ├── db.js                         # Connessione pg Pool, gestione schema e migrazioni
│   │   ├── schema.sql                    # Definizione DDL PostgreSQL
│   │   └── seed.js                       # 8 esercizi standard con keyframe 3D completi
│   ├── routes/
│   │   ├── auth.js                       # /api/auth (register, login, logout, me)
│   │   ├── exercises.js                  # /api/exercises (CRUD, permessi public/private, equipment)
│   │   ├── plans.js                      # /api/plans (CRUD, copia scheda, visibilità pubblica/assegnata)
│   │   ├── users.js                      # /api/users (profilo, password)
│   │   ├── stats.js                      # /api/stats (GET/POST statistiche workout e minuti totali)
│   │   └── admin.js                      # /api/admin (gestione utenti, ruoli, backup/restore JSON)
│   └── tests/
│       └── run-tests.js                  # Suite di test di integrazione backend
├── public/                               # Risorse statiche condivise
│   ├── locales/                          # Traduzioni it/en
│   ├── data/categories.json              # Categorie muscolari (Cardio, Legs, Arms, Abs, Back, etc.)
│   └── assets/                           # Icone PWA e manifest
├── scripts/                              # Script di utilità (query.js, backup.js, restore.js)
├── docker-compose.yml                    # PostgreSQL 18 Alpine locale
└── package.json                          # Script root unificati
```

---

## 🗄️ Schema Database PostgreSQL

1. **`users`**: `id`, `username`, `email`, `password_hash`, `role` (`user`|`superuser`|`admin`), `created_at`.
   - L'utente `daniele` viene promosso automaticamente ad `admin`.
2. **`exercises`**: `id`, `user_id` (FK `users`, ON DELETE CASCADE), `name`, `category`, `is_standard` (BOOL), `is_private` (BOOL), `keyframes` (JSONB), `equipment` (JSONB), `notes` (TEXT), timestamp.
3. **`plans`**: `id`, `user_id` (FK `users`, ON DELETE CASCADE), `name`, `description`, `is_public` (BOOL), `structure` (JSONB), timestamp.
4. **`user_assigned_plans`**: `(user_id, plan_id)` PK, associazione di schede a specifici utenti.
5. **`user_exercise_stats`**: `user_id` (PK, FK `users`), `completed_workouts` (INT), `total_minutes` (INT), `updated_at` (TIMESTAMPTZ).
6. **`system_seed`**: flag singleton per assicurare il seeding iniziale degli 8 esercizi 3D.

---

## 🧩 Logiche Chiave & Dettagli di Dominio

### 1. Mannequin 3D & Cinematica Inversa (`client/src/mannequin/mannequin.js`)
- Scheletro anatomico a **17 giunti**: testa, collo, spalle, gomiti, polsi, colonna, bacino, anche, ginocchia, caviglie.
- **Cinematica Inversa (2-Bone Analytical IK)**: calcolo posizionamento arti superiori e inferiori con vincoli ergonomici.
- **Keyframe & Animazione**: interpolazione sferica (Quaternion Slerp) tra i fotogrammi chiave con scrubbing real-time della timeline.
- **Ghosting / Onion Skinning**: anteprima semitrasparente dei fotogrammi precedente/successivo.
- **Equipment 3D**: supporto a manubri (`dumbbells`), palla medica (`medicine_ball`), e panca/step (`step`).

### 2. Struttura Schede HIIT (`structure` JSONB in `plans`)
- Organizzazione in **gruppi di circuiti** (`groups`), ciascuno con:
  - `rounds`: numero di volte in cui ripetere il gruppo.
  - `restBetweenRounds`: secondi di pausa tra i giri.
  - `items`: elenco esercizi, ciascuno configurabile a **ripetizioni** (`type: 'reps'`) con tempo stimato oppure a **durata fissa** (`type: 'duration'`), più recupero post-esercizio (`restAfter`).

### 3. Workout Player (`PlayerView.vue`)
- Modalità a tutto schermo per l'allenamento reale.
- Sincronizzazione Three.js: il manichino anima l'esercizio a tempo con il timer.
- Durante il **Recupero (Rest)**, il manichino mostra in anteprima l'esercizio successivo.
- Al termine del workout: fanfara finale (audio sintetizzato) e salvataggio automatico delle statistiche via `POST /api/stats/increment`.

### 4. Permessi & Ruoli
- `admin`: pieno controllo (gestione utenti, ruoli, cambio password, backup/ripristino, creazione esercizi pubblici).
- `superuser`: creazione di esercizi e schede pubbliche.
- `user`: creazione di esercizi e schede personali (private). Può accedere a schede pubbliche e a quelle esplicitamente assegnate dall'amministratore.

---

## ⚠️ Linee Guida per Modifiche al Codice

1. **Esegui sempre i test (`npm test`)**: Dopo qualsiasi modifica a tabelle, rotte API, autenticazione o seeding, lancia i test per evitare regressioni.
2. **Preserva la retrocompatibilità del formato 3D**: Le proprietà `keyframes` ed `equipment` sono persistite in formato JSONB; eventuali arricchimenti devono rimanere compatibili con i dati esistenti.
3. **Internazionalizzazione (i18n)**: Ogni testo aggiunto nella UI deve avere le rispettive chiavi in `public/locales/it/translation.json` e `public/locales/en/translation.json`.
4. **Mobile First & Material 3**: Preserva le safe area insets (`env(safe-area-inset-top)`, etc.), la fluidità touch e le classi del design system Material 3.
5. **Autenticazione & Cookie**: Nelle chiamate frontend usa sempre l'helper `api.js` (o `credentials: 'include'`) per inviare il cookie JWT `HttpOnly`.

---

## ⚡ Efficienza Token & Interventi Mirati (Surgical Mode)

1. **Modifiche chirurgiche e localizzate**: Leggere ed editare esclusivamente i file e i blocchi di righe specificati nel prompt dell'utente. Non esplorare l'intero repository né rileggere file/schemi non correlati.
2. **Zero scansioni massive**: Evitare `grep`, `find` o letture globali non necessarie. Puntare direttamente alle righe target.
3. **Minimizzazione contesto e comandi**: Non eseguire suite di test, build o comandi pesanti a meno che l'utente non lo richieda esplicitamente o sia strettamente indispensabile.
4. **Output conciso**: Mantenere le risposte dirette, prive di convenevoli e concentrate solo sulle modifiche effettuate.
