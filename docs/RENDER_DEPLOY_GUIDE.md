# Guida al Deployment su Render.com e Uso PostgreSQL 18 con Docker

Questa guida spiega come utilizzare il database **PostgreSQL 18** sia in **locale tramite Docker Compose**, sia in **produzione su Render.com**.

---

## 🐳 1. Gestione Locale con Docker

### Prerequisiti
- Docker e Docker Compose installati sul computer.

### Comandi Disponibili

| Comando | Descrizione |
|---|---|
| `npm run docker:up` | Avvia il container PostgreSQL 18 in background |
| `npm run docker:down` | Ferma il container PostgreSQL 18 |
| `npm run docker:logs` | Mostra i log in tempo reale del database PostgreSQL 18 |
| `npm run docker:reset` | Elimina il volume dei dati e ricrea il database da zero |

### File `.env` per lo Sviluppo Locale
Assicurati che nel file `.env` sia presente:
```env
PORT=3000
JWT_SECRET=cardio_hiit_jwt_secret_2026
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/exercise_planner
DATABASE_SSL=false
```
*(Nota: se hai già configurato `SESSION_SECRET`, il server lo userà automaticamente in fallback senza problemi).*

### Avviare l'Applicazione in Locale
```bash
# 1. Avvia il container database PostgreSQL 18
npm run docker:up

# 2. Avvia il server Express
npm run dev
# oppure
npm start
```
L'applicazione si collegherà automaticamente al container Docker, creerà le tabelle e popolerà gli 8 esercizi standard con le pose 3D del manichino.

---

## ☁️ 2. Deployment su Render.com

Render.com offre sia il servizio di **PostgreSQL Managed Database**, sia il servizio di **Web Service** (per l'app Node.js Express).

### Passo 1: Creare il Database PostgreSQL su Render
1. Accedi alla dashboard di [Render.com](https://dashboard.render.com).
2. Clicca su **New +** in alto a destra e seleziona **PostgreSQL**.
3. Compila i campi:
   - **Name**: `exercise-planner-db`
   - **Database**: `exercise_planner` (o lascia il default)
   - **User**: `exercise_planner_user` (o lascia il default)
   - **Region**: Seleziona la regione più vicina (es. *Frankfurt (EU Central)*)
   - **PostgreSQL Version**: Seleziona **16** o la versione più recente disponibile su Render (Render aggiorna costantemente i motori PostgreSQL; l'applicazione è compatibile al 100% con pg 14, 15, 16, 17 e 18).
   - **Plan**: Scegli *Free* (o il piano a pagamento desiderato).
4. Clicca su **Create Database**.
5. Nella pagina dei dettagli del database appena creato:
   - Troverai la sezione **Connections**.
   - Copia la **Internal Database URL** (se farai il deploy anche del Web Service su Render) oppure la **External Database URL** (per connetterti dall'esterno o per eseguire backup/restore dal tuo PC).

---

### Passo 2: Creare il Web Service Node.js su Render
1. Nella dashboard di Render, clicca su **New +** e seleziona **Web Service**.
2. Collega il tuo repository Git (GitHub o GitLab).
3. Configura le impostazioni del Web Service:
   - **Name**: `cardio-hiit-planner`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: *Free* (o a pagamento)
4. Scorri verso il basso fino alla sezione **Environment Variables** e aggiungi:

| Chiave | Valore | Note |
|---|---|---|
| `DATABASE_URL` | *(Incolla la Internal Database URL fornita da Render)* | Es. `postgresql://user:pass@dpg-xxx:5432/exercise_planner` |
| `DATABASE_SSL` | `true` | Abilita SSL con `rejectUnauthorized: false` per il cloud |
| `JWT_SECRET` | `genera_una_stringa_lunga_e_casuale` | Chiave di cifratura/firma dei token JWT persistenti (30 giorni). *(Supporta anche `SESSION_SECRET` in fallback)* |
| `NODE_ENV` | `production` | Ottimizzazioni per produzione |

5. Clicca su **Create Web Service**.
6. Render effettuerà il build e l'avvio: l'app si connetterà automaticamente al database Render PostgreSQL, eseguirà lo schema e caricherà il catalogo esercizi!

---

## 🔄 3. Backup, Restore e Migrazione Dati verso Render

Se desideri trasferire i tuoi esercizi personalizzati creati in locale sul database Render:

### Esportare i dati da locale
```bash
npm run backup
```
Questo creerà un file `backups/exercises_custom_latest.json` (e `full_backup_latest.json`).

### Importare i dati nel database Render
Puoi eseguire il comando `restore` puntando direttamente al database Render impostando temporaneamente `DATABASE_URL` (usando la **External Database URL** di Render):

```bash
DATABASE_URL="postgresql://user:password@dpg-xxxx-a.frankfurt-postgres.render.com/exercise_planner" DATABASE_SSL=true npm run restore backups/exercises_custom_latest.json
```

### Eseguire Query Dirette su Render dal Terminale
```bash
DATABASE_URL="postgresql://user:password@dpg-xxxx-a.frankfurt-postgres.render.com/exercise_planner" DATABASE_SSL=true npm run db:query "SELECT id, name, category, is_standard FROM exercises;"
```

---

## 🛠️ 4. Note Tecniche
- **SSL**: Render.com richiede SSL per tutte le connessioni esterne. L'applicazione rileva automaticamente le connessioni a Render o `DATABASE_SSL=true` abilitando `rejectUnauthorized: false`.
- **Riconnessione Automatica**: All'avvio, `server/db/db.js` effettua fino a 10 tentativi di connessione con backoff, garantendo che l'app attenda che PostgreSQL sia pronto anche se avviata contemporaneamente.
- **Cascata e Integrità Referenziale**: I vincoli di foreign key con `ON DELETE CASCADE` garantiscono l'integrità tra utenti, esercizi personalizzati e schede di allenamento.
