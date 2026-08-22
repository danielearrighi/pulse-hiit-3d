# 🏃 Cardio HIIT Planner & 3D Mannequin Exercise Simulator

Una piattaforma web moderna e completa per la pianificazione, creazione ed esecuzione guidata di allenamenti **Cardio & HIIT**, dotata di un innovativo **simulatore anatomico 3D** per la modellazione e visualizzazione degli esercizi.

---

## 🌟 Funzionalità Principali della Piattaforma

### 1. 📊 Dashboard Principale (`/dashboard`)
- Panoramica immediata delle schede di allenamento create, degli esercizi disponibili e delle sessioni completate.
- Accesso rapido alle sezioni principali (Libreria, Builder, Editor 3D, Player).

### 2. 📚 Libreria Esercizi (`/library`)
- Catalogo completo con **esercizi standard predefiniti** (Squat, Burpees, Push-ups, Plank, Jumping Jacks, Lunges, High Knees, Riposo) ed **esercizi personalizzati**.
- Filtri interattivi per categoria muscolare (*Cardio*, *Legs*, *Arms*, *Abs*, *Full Body*, *Rest*).
- Ricerca istantanea per nome e visualizzazione delle note di corretta esecuzione tecnica.
- Modalità anteprima 3D in tempo reale con animazione del manichino.

### 3. 🎨 Creatore & Editor Esercizi 3D (`/editor`)
Studio tridimensionale interattivo per creare nuovi esercizi o modificare quelli esistenti manipolando direttamente lo scheletro anatomico di un manichino 3D.

### 4. ⏱️ Builder Schede HIIT a Circuiti (`/builder`)
- Creazione di workout strutturati a **gruppi di circuiti annidati**.
- Configurazione per singolo esercizio:
  - **Modalità a Ripetizioni (Reps)**: conteggio ripetizioni target + tempo di recupero.
  - **Modalità a Tempo (Duration)**: secondi di lavoro target + tempo di recupero.
- Configurazione dei giri di circuito (Ripetizioni del blocco).
- Calcolo automatico della durata totale stimata dell'allenamento.

### 5. 🎮 Workout Player Interattivo (`/player`)
- Riproduttore a schermo intero per guidare l'utente durante l'allenamento reale.
- **Simulatore 3D in tempo reale**: il manichino esegue i movimenti dell'esercizio corrente a ritmo con il timer.
- Segnali visivi differenziati (Fase di Lavoro vs Fase di Recupero / Riposo).
- Timer a conto alla rovescia, indicatore del giro corrente e controlli Play/Pausa/Salta.

### 6. 🛡️ Pannello di Amministrazione, Backup & Ripristino (`/admin`)
- **Gestione Utenti**: visualizzazione, modifica ruoli (`admin`/`user`) ed eliminazione account. L'utente `daniele` viene automaticamente riconosciuto e impostato come amministratore.
- **Backup & Ripristino Grafico (Web UI)**:
  - **Esporta Backup**: genera e scarica con un clic il file `exercise_planner_backup_YYYY-MM-DD.json` completo di utenti, esercizi 3D personalizzati e schede di allenamento.
  - **Ripristina Backup**: caricamento drag & drop di file JSON con anteprima dei dati rilevati e sincronizzazione/upsert automatico su PostgreSQL (in locale o in produzione su Render.com).
  - **Statistiche in tempo reale**: conteggio istantaneo di utenti, esercizi standard, esercizi custom e schede nel database.

### 7. 🌐 Internazionalizzazione (i18n) & Autenticazione
- Supporto multilingua integrato (Italiano 🇮🇹 / Inglese 🇬🇧).
- Autenticazione sicura con hash password via `bcrypt` e gestione delle sessioni tramite cookie HTTP-only.

---

## 🧍 Approfondimento: Come Funziona il Creatore 3D

Il creatore di esercizi tridimensionali (`/editor`) consente di animare un manichino anatomico articolato senza bisogno di competenze di animazione 3D complesse.

### 1. Cinematica & Scheletro Articolato
- Il modello 3D è composto da giunti gerarchici: **Testa**, **Collo**, **Torso/Schiena**, **Bacino (Hips)**, **Spalle**, **Gomiti**, **Polsi**, **Anche**, **Ginocchia** e **Caviglie/Piedi**.
- Tramite slider interattivi o controlli orbitali puoi modificare:
  - **Inclinazione (Pitch)**, **Rotazione (Yaw)** e **Rollio (Roll)** di ogni segmento corporeo.
  - Flessione ed estensione di braccia e gambe.
  - Piega del busto e inclinazione del bacino.
- Supporto per il **Mirroring (Specchio)**: applica simmetricamente la posa dall'arto destro a quello sinistro o viceversa.

### 2. Sistema a Fotogrammi Chiave (Keyframes)
- Un esercizio è definito da una sequenza temporale di pose (*Keyframe 1: posa iniziale*, *Keyframe 2: massima contrazione*, *Keyframe 3: ritorno*).
- Il motore grafico (sviluppato su Three.js) esegue un'**interpolazione matematica sferica/lineare fluida** tra i vari keyframe, riproducendo il movimento continuo a 60 FPS.
- Puoi impostare la velocità di esecuzione (cicli al secondo / ripetizioni) e testare il loop in anteprima prima del salvataggio.

### 3. Note Tecniche & Parametri di Esercizio
- Assegna una categoria muscolare (*Cardio*, *Gambe*, *Braccia*, *Addome*, *Full Body*).
- Inserisci le **Note di esecuzione tecnica**: consigli posturali, avvertenze sulle articolazioni e istruzioni di respirazione che verranno mostrate sia nella libreria sia durante il workout nel Player.
- I dati dell'animazione vengono serializzati come payload **JSONB** ad alte prestazioni direttamente nella colonna `keyframes` di PostgreSQL.

---

## 🗄️ Database PostgreSQL 18 & Gestione con Docker

L'applicazione utilizza un database relazionale **PostgreSQL 18** nativo (`postgres:18-alpine`), gestito in locale tramite Docker Compose.

### 1. Configurazione Ambiente (`.env`)
Crea o modifica il file `.env` nella root del progetto:
```env
PORT=3000
SESSION_SECRET=cardio_hiit_secret_key_2026
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/exercise_planner
DATABASE_SSL=false
```

### 2. Comandi Docker Rapidi

| Comando | Descrizione |
|---|---|
| `npm run docker:up` | Avvia il container PostgreSQL 18 in background |
| `npm run docker:down` | Ferma il container PostgreSQL 18 |
| `npm run docker:logs` | Mostra i log del database in tempo reale |
| `npm run docker:reset` | Elimina il volume e ricrea il database da zero |

### 3. Avvio dell'Applicazione in Locale
```bash
# 1. Avvia il database PostgreSQL 18
npm run docker:up

# 2. Avvia il server Node.js Express (con auto-reload in sviluppo)
npm run dev
# oppure per avvio standard:
npm start
```
All'avvio, l'applicazione si collegherà automaticamente al database, creerà le tabelle necessarie (`users`, `exercises`, `plans`, `system_seed`) e popolerà gli esercizi standard 3D.

L'applicazione sarà accessibile all'indirizzo: **`http://localhost:3000`**

### 4. Test Automatizzati
Per verificare l'integrità del database, le operazioni CRUD, il cascading delete e la gestione degli utenti:
```bash
npm test
```

## 🛠️ Script CLI di Manutenzione & Migrazione Dati

Nella cartella `scripts/` sono inclusi strumenti utili da riga di comando:

### Esportazione Backup (Dati Locali o Cloud)
```bash
npm run backup
```
*Salva tutti gli esercizi personalizzati e le schede di allenamento in file JSON con timestamp nella cartella `backups/`.*

### Ripristino / Migrazione Dati
```bash
# Ripristina l'ultimo backup su PostgreSQL locale:
npm run restore backups/exercises_custom_latest.json

# Ripristina un backup completo sul database remoto di Render.com:
DATABASE_URL="postgresql://user:pass@dpg-xxx.render.com/dbname" DATABASE_SSL=true npm run restore backups/full_backup_latest.json
```

### Query SQL Dirette da Terminale
```bash
npm run db:query "SELECT id, name, category, is_standard FROM exercises;"
```

---

## 📂 Struttura del Progetto

```text
exercise-planner/
├── docker-compose.yml       # Definizione container PostgreSQL 18 Alpine
├── package.json             # Dipendenze e script npm (start, test, docker, backup, restore)
├── .env.example             # Template delle variabili d'ambiente
├── docs/
│   └── RENDER_DEPLOY_GUIDE.md # Guida dettagliata per il deployment su Render.com
├── server/
│   ├── index.js             # Entry point Express, middleware sessioni e routing
│   ├── db/
│   │   ├── db.js            # Connessione pg.Pool, retry logic e auto-SSL
│   │   ├── schema.sql       # DDL tabelle users, exercises, plans
│   │   └── seed.js          # Seeding pose 3D ed esercizi standard
│   ├── routes/              # Endpoint REST API (auth, exercises, plans, users)
│   └── tests/
│       └── run-tests.js     # Suite di test automatizzati backend
├── scripts/
│   ├── backup.js            # Script di esportazione JSON
│   ├── restore.js           # Script di importazione e sincronizzazione
│   └── query.js             # Esecuzione query SQL da CLI
└── public/                  # Frontend statico (HTML5, Three.js, Material 3, CSS, Locales)
```

---

## 📄 Licenza
Rilasciato sotto licenza **MIT**.
