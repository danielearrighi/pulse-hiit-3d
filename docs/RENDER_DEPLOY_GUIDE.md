# Guida al Deployment su Render.com e Coesistenza Singola Istanza (Vue 3 + Express + PostgreSQL)

Questa guida spiega come effettuare il deployment di **Pulse HIIT 3D** su **Render.com** utilizzando **un'unica istanza Web Service** (compatibile con il piano Free) combinata con il database gestito **PostgreSQL**.

---

## 🏗️ Architettura di Produzione su Singola Istanza

Su Render.com, un'unica istanza Node.js Express ospita l'intera applicazione:
1. **Frontend Vue 3 SPA**: Viene compilato durante la fase di build (`npm run build`) in `client/dist`.
2. **File Statici & Risorse**: Express serve i file statici (`client/dist`, `/locales`, `/data`, `/assets`) con header di caching HTTP (`maxAge: 1d`, `etag`, `lastModified`).
3. **API RESTful**: Tutti gli endpoint applicativi risiedono sotto `/api/*` (`/api/auth`, `/api/exercises`, `/api/plans`, `/api/users`, `/api/admin`).
4. **Fallback Routing SPA**: Qualsiasi richiesta HTTP che non inizi per `/api/` (come `/`, `/dashboard`, `/builder`, `/editor`, `/library`, `/player?planId=...`, `/admin`) viene reindirizzata a `client/dist/index.html`, consentendo a **Vue Router (HTML5 History Mode)** di gestire il routing lato client senza ricaricamenti.

```mermaid
graph TD
    User["Client (Browser / Android / iOS)"]
    subgraph "Render.com (Single Web Service Instance)"
        Express["Node.js Express Server (Port $PORT)"]
        VueDist["Vue 3 SPA Compiled Files (client/dist)"]
        APIRoutes["REST API Endpoints (/api/*)"]
    end
    Database[(Render PostgreSQL 16+)]

    User -->|Richiesta HTTP| Express
    Express -->|GET /builder, /library, ecc.| VueDist
    Express -->|GET/POST /api/*| APIRoutes
    APIRoutes --> Database
```

---

## ☁️ Configurazione Passo-Passo su Render.com

### Passo 1: Creare il Database PostgreSQL su Render
1. Accedi alla dashboard di [Render.com](https://dashboard.render.com).
2. Clicca su **New +** in alto a destra e seleziona **PostgreSQL**.
3. Compila i campi:
   - **Name**: `exercise-planner-db`
   - **Database**: `exercise_planner` (o lascia il default)
   - **User**: `exercise_planner_user` (o lascia il default)
   - **Region**: Seleziona la regione desiderata (es. *Frankfurt (EU Central)*).
   - **PostgreSQL Version**: Seleziona **16** o superiore (l'app supporta nativamente PostgreSQL 14, 15, 16, 17 e 18).
   - **Plan**: Seleziona *Free* (o piano a pagamento).
4. Clicca su **Create Database**.
5. Nella pagina dei dettagli del database:
   - Troverai la sezione **Connections**.
   - Copia la **Internal Database URL** (da inserire nel Web Service).

---

### Passo 2: Creare il Web Service Node.js su Render
1. Nella dashboard di Render, clicca su **New +** e seleziona **Web Service**.
2. Collega il tuo repository Git (GitHub o GitLab).
3. Configura le impostazioni:
   - **Name**: `pulse-hiit-3d`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: *Free*
4. Nella sezione **Environment Variables**, aggiungi le seguenti variabili:

| Chiave | Valore | Note |
|---|---|---|
| `DATABASE_URL` | *(Incolla la Internal Database URL di Render)* | Es. `postgresql://user:pass@dpg-xxx:5432/exercise_planner` |
| `DATABASE_SSL` | `true` | Abilita la connessione SSL sicura per PostgreSQL |
| `JWT_SECRET` | `genera_una_stringa_lunga_e_casuale` | Chiave di firma token JWT persistenti (30 giorni) |
| `NODE_ENV` | `production` | Abilita le ottimizzazioni di produzione e caching |

5. Clicca su **Create Web Service**.
6. Render avvierà la build, installerà i pacchetti, compilerà l'applicazione Vue 3 con Vite in `client/dist` e avvierà il server Express, collegandosi automaticamente al database PostgreSQL!

---

## 🔄 Backup, Restore e Migrazione Dati verso Render

Se hai creato esercizi personalizzati o schede in locale e vuoi trasferirli su Render:

### 1. Esportare il Backup da Locale
```bash
npm run backup
```
Questo genererà un file JSON timestamped in `backups/`.

### 2. Ripristinare via Interfaccia Grafica Web (`/admin`)
1. Apri la tua applicazione su Render (es. `https://pulse-hiit-3d.onrender.com`).
2. Effettua il login con il tuo account amministratore (`daniele`).
3. Vai nel menu profilo o apri `/admin`.
4. Seleziona il tab **Backup & Ripristino DB**.
5. Trascina il file `.json` generato nella dropzone e clicca su **Avvia Ripristino Database**.

### 3. Oppure Ripristinare via CLI da Terminale
Puoi utilizzare lo script di restore puntando direttamente alla **External Database URL** di Render:
```bash
DATABASE_URL="postgresql://user:password@dpg-xxxx-a.frankfurt-postgres.render.com/exercise_planner" DATABASE_SSL=true npm run restore backups/full_backup_latest.json
```

---

## 📱 Note per l'Uso come App Mobile (Android / iOS)
- **Installazione come PWA**: Aprendo il link dell'app su Chrome (Android) o Safari (iOS), puoi toccare "Aggiungi alla schermata Home" per installarla come applicazione autonoma a tutto schermo.
- **Screen Wake Lock**: Durante l'allenamento nel Player (`/player`), lo schermo rimarrà automaticamente acceso senza andare in blocco.
- **Audio Cues ad Alto Volume**: Il sintetizzatore Web Audio integrato garantisce segnali sonori nitidi e udibili su tutti gli altoparlanti mobile.
