# 🏃 Pulse HIIT 3D - Cardio HIIT Planner & 3D Mannequin Exercise Simulator

Una piattaforma web moderna e completa per la pianificazione, creazione ed esecuzione guidata di allenamenti **Cardio & HIIT**, dotata di un innovativo **simulatore anatomico 3D** con cinematica inversa per la modellazione e visualizzazione degli esercizi.

Costruita con un'architettura **disaccoppiata Full-Stack**:
- **Frontend SPA**: **Vue 3**, **Vite**, **Vue Router 4**, **Three.js** modulare, e **Material 3 Design System**.
- **Backend API**: **Express.js**, **PostgreSQL 18**, autenticazione **JWT persistente (30 giorni)** con cookie HttpOnly e middleware i18n.
- **Supporto Mobile SPA (Android & iOS)**: Safe Area Insets, Screen Wake Lock API per evitare lo standby dello schermo durante l'allenamento, Web Audio sintetizzato con Dynamic Compressor ad alto volume, PWA Standalone Manifest e controlli touch.

---

## 🌟 Funzionalità Principali della Piattaforma

### 1. 📊 Dashboard Principale (`/`)
- Panoramica delle **schede HIIT personali / assegnate** e delle **schede pubbliche della community**.
- Calcolo automatico dei tempi stimati (~minuti totali), conteggio circuiti, giri e numero di esercizi.
- Accesso rapido alle sezioni principali (Libreria, Builder, Editor 3D, Player).
- Condivisione rapida della scheda tramite link diretto (negli appunti).

### 2. 📚 Libreria Esercizi (`/library`)
- Catalogo completo con **esercizi standard predefiniti** (Squat, Burpees, Push-ups, Plank, Jumping Jacks, Lunges, High Knees, Riposo) ed **esercizi personalizzati**.
- Filtri istantanei per gruppo muscolare (*Cardio*, *Legs*, *Arms*, *Abs*, *Back / Dorsali*, *Full Body*, *Rest*), configurabili tramite `public/data/categories.json`.
- Ricerca immediata e visualizzazione delle note di corretta esecuzione tecnica.
- Modalità **anteprima 3D animata** in tempo reale con animazione del manichino.

### 3. 🎨 Creatore & Editor Esercizi 3D (`/editor`)
- Studio tridimensionale interattivo per creare o modificare esercizi manipolando lo scheletro anatomico a 17 giunti del manichino 3D.
- Cinematica Inversa (2-Bone Closed Form IK), pose base (*In piedi*, *Pancia in su*, *Pancia in giù*, *Laterale dx/sx*), simmetria, blocco piedi al suolo, e Onion Skin (ghosting).
- Sequenza temporale a fotogrammi chiave (Keyframes) con interpolazione sferica fluida (Slerp), slider durata/velocità e timeline scrub.
- Modalità a tutto schermo ottimizzata per mobile e desktop.

### 4. ⏱️ Builder Schede HIIT a Circuiti (`/builder`)
- Creazione di workout strutturati a **gruppi di circuiti annidati**.
- Configurazione per singolo esercizio:
  - **Modalità a Ripetizioni (Reps)**: conteggio ripetizioni target + tempo di recupero.
  - **Modalità a Tempo (Duration)**: secondi di lavoro target + tempo di recupero.
- Configurazione dei giri di circuito (Ripetizioni del blocco).
- Selettore esercizi con ricerca, filtri per categoria e anteprima 3D immediata.
- Calcolo automatico in tempo reale della durata totale stimata dell'allenamento.

### 5. 🎮 Workout Player Interattivo (`/player`)
- Riproduttore a schermo intero per guidare l'utente durante l'allenamento reale.
- **Simulatore 3D in tempo reale**: il manichino esegue i movimenti dell'esercizio corrente a ritmo con il timer.
- **Fase di Lavoro vs Fase di Recupero**: durante la pausa di recupero viene mostrata l'anteprima 3D animata dell'esercizio successivo.
- Anello countdown SVG animato, segnali audio sintetizzati con beeps di countdown (3-2-1) e cambio fase.
- **Screen Wake Lock API**: impedisce al dispositivo Android o iOS di spegnere lo schermo o andare in blocco durante il workout.

### 6. 🛡️ Pannello di Amministrazione, Backup & Ripristino (`/admin`)
- **Gestione Utenti**: visualizzazione, modifica ruoli (`user`/`superuser`/`admin`), cambio password diretto senza email ed eliminazione account con cancellazione a cascata. L'utente `daniele` viene automaticamente riconosciuto e impostato come amministratore principale.
- **Assegnazione Schede HIIT**: associazione selettiva delle schede create da Admin/SuperUser a specifici utenti.
- **Backup & Ripristino Grafico (Web UI)**:
  - **Esporta Backup**: genera e scarica con un clic il file `exercise_planner_backup_YYYY-MM-DD.json` completo di utenti, esercizi 3D personalizzati e schede di allenamento.
  - **Ripristina Backup**: caricamento drag & drop di file JSON con anteprima dei dati rilevati (conteggio utenti, esercizi, schede) e sincronizzazione/upsert automatico su PostgreSQL (in locale o in cloud su Render.com).

### 7. 🌐 Internazionalizzazione (i18n) a Zero-Latenza
- Supporto multilingua (Italiano 🇮🇹 / Inglese 🇬🇧).
- Idratazione istantanea da `localStorage` (0ms FOUC) con revalidazione asincrona in background.

---

## 🚀 Guida all'Avvio degli Ambienti

### 1. Prerequisiti
- **Node.js** 18+ (testato con v20 e v24).
- **Docker** e Docker Compose (per PostgreSQL 18 in locale).

### 2. Configurazione Ambiente (`.env`)
Crea o modifica il file `.env` nella root del progetto:
```env
PORT=3000
JWT_SECRET=cardio_hiit_jwt_secret_2026
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/exercise_planner
DATABASE_SSL=false
```

---

### 💻 Ambiente di Sviluppo (Dev Mode)

In sviluppo, backend e frontend possono funzionare come due servizi separati ma perfettamente integrati tramite il proxy Vite (`http://localhost:5173` inoltra `/api`, `/locales`, `/data` e `/assets` a `http://localhost:3000`).

#### Avvio Rapido con 1 Solo Comando:
```bash
# 1. Avvia il container PostgreSQL 18
npm run docker:up

# 2. Avvia contemporaneamente Backend Express e Frontend Vite con Hot Module Reload (HMR):
npm run dev
```

L'applicazione in sviluppo sarà attiva su: **`http://localhost:5173`** (con auto-reload istantaneo ad ogni modifica al codice).

#### Oppure Avvio Separato su 2 Terminali:
- **Terminale 1 (Backend Express API)**:
  ```bash
  npm run dev:server
  ```
- **Terminale 2 (Frontend Vue 3 Vite)**:
  ```bash
  npm run dev:client
  ```

---

### 🌐 Ambiente di Produzione & Coesistenza su Singola Istanza (Render.com)

In produzione (o su Render.com dove è disponibile una sola istanza Web Service), **Node.js Express serve sia le API REST che l'applicazione Vue 3 compilata** (`client/dist`), gestendo il fallback HTML5 History Mode per tutti i percorsi dell'app (`/`, `/builder`, `/editor`, `/library`, `/player`, `/admin`).

```bash
# 1. Compila l'applicazione Vue 3 frontend
npm run build

# 2. Avvia il server Node.js di produzione
npm start
```

L'applicazione di produzione sarà attiva su: **`http://localhost:3000`** (o sulla porta specificata da `process.env.PORT`).

---

## ☁️ Deployment su Render.com

Su [Render.com](https://dashboard.render.com), configura il Web Service con le seguenti impostazioni:

| Impostazione | Valore | Note |
|---|---|---|
| **Runtime** | `Node` | |
| **Build Command** | `npm install && npm run build` | Installa le dipendenze e compila il frontend Vue 3 |
| **Start Command** | `npm start` | Avvia il server Express unificato |
| **DATABASE_URL** | `postgresql://user:pass@dpg-xxx:5432/exercise_planner` | Internal Database URL del PostgreSQL Render |
| **DATABASE_SSL** | `true` | Abilita SSL per il cloud |
| **JWT_SECRET** | `tua_chiave_segreta_lunga` | Chiave di firma token JWT |
| **NODE_ENV** | `production` | Abilita compressione e proxy trust |

*(Per la guida passo-passo completa, consulta [docs/RENDER_DEPLOY_GUIDE.md](docs/RENDER_DEPLOY_GUIDE.md)).*

---

## 🧪 Test Automatizzati

Per eseguire la suite di test automatizzati backend (verifica schema database, seeding esercizi standard 3D, autenticazione JWT, cascading delete, permessi ruoli, backup/restore pipeline):
```bash
npm test
```

---

## 🛠️ Script di Manutenzione & Migrazione Dati

| Comando | Descrizione |
|---|---|
| `npm run backup` | Salva tutti gli esercizi personalizzati e le schede in file JSON con timestamp |
| `npm run restore backups/file.json` | Ripristina un file di backup sul database locale o remoto |
| `npm run db:query "SELECT ..."` | Esegue una query SQL diretta dal terminale |
| `npm run docker:up` | Avvia il container PostgreSQL 18 in locale |
| `npm run docker:down` | Ferma il container PostgreSQL 18 |
| `npm run docker:logs` | Mostra i log del database in tempo reale |
| `npm run docker:reset` | Elimina il volume e ricrea il database da zero |

---

## 📂 Struttura del Progetto

```text
pulse-hiit-3d/
├── client/                               # Frontend Vue 3 + Vite SPA
│   ├── package.json                      # Dipendenze client (vue, vue-router, three, vite)
│   ├── vite.config.js                    # Configurazione Vite e Proxy verso backend Express
│   ├── index.html                        # Template HTML (PWA, Standalone meta, Google Fonts)
│   └── src/
│       ├── main.js                       # Entry point Vue 3
│       ├── App.vue                       # Root layout Material 3 & Modali globali
│       ├── router/index.js               # Vue Router (History Mode, Code Splitting)
│       ├── services/                     # Client API, Web Audio Engine, Screen Wake Lock
│       ├── composables/                  # useAuth, useI18n, useCategories, useSnackbar
│       ├── mannequin/mannequin.js        # Engine 3D Mannequin modulare con Three.js & IK
│       ├── components/                   # NavRail, TopAppBar, BottomNav, Auth, Modali
│       ├── views/                        # Dashboard, Builder, Editor, Library, Player, Admin
│       └── assets/css/                   # Fogli di stile Material 3 Design System
├── server/                               # Backend Express.js REST API
│   ├── index.js                          # Express Server, static serving client/dist & SPA fallback
│   ├── db/                               # Connessione PostgreSQL, Schema SQL, Seeding 3D
│   ├── middleware/auth.js                # Autenticazione JWT persistente (30 giorni)
│   ├── routes/                           # API Routes (auth, exercises, plans, users, admin)
│   └── tests/run-tests.js                # Suite di test automatizzati backend
├── public/                               # Risorse condivise (locales, categorie JSON, icone PWA)
├── docs/                                 # Documentazione tecnica e guide deploy
├── docker-compose.yml                    # Container PostgreSQL 18 Alpine
├── package.json                          # Script root unificati per dev e build
└── README.md                             # Documentazione generale
```

---

## 📄 Licenza
Rilasciato sotto licenza **MIT**.
