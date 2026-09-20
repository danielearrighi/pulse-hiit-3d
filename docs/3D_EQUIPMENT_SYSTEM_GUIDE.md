# Guida Architetturale e di Estensione: Sistema Equipment 3D

Questo documento descrive l'architettura completa del sistema di **oggetti ed equipaggiamento 3D (Equipment)** in **Pulse HIIT 3D**, la gestione della persistenza dati non-distruttiva e la guida passo-passo per aggiungere nuovi attrezzi in futuro.

---

## Indice
1. [Obiettivi e Requisiti di Compatibilità](#1-obiettivi-e-requisiti-di-compatibilità)
2. [Modello Dati e Persistenza (PostgreSQL)](#2-modello-dati-e-persistenza-postgresql)
3. [Architettura del Motore 3D (`mannequin.js`)](#3-architettura-del-motore-3d-mannequinjs)
4. [Integrazione nell'Editor (`EditorView.vue`)](#4-integrazione-nelleditor-editorviewvue)
5. [Integrazione nei Componenti di Riproduzione e Preview](#5-integrazione-nei-componenti-di-riproduzione-e-preview)
6. [Guida Pratica: Come Aggiungere un Nuovo Oggetto 3D](#6-guida-pratica-come-aggiungere-un-nuovo-oggetto-3d)

---

## 1. Obiettivi e Requisiti di Compatibilità

Il sistema permette di associare a ogni esercizio uno o più oggetti 3D interattivi (attualmente: **Manubri / Dumbbells**, **Palla Medica / Ball**, **Gradino / Step**).

### Requisito Fondamentale: Retrocompatibilità Totale
- **Nessuna versione v1 / v2 separata**: il formato dei keyframe 3D (array di 17 giunti per 51 float) rimane inalterato.
- Gli esercizi salvati prima di questa funzionalità o privi di oggetti devono continuare a caricarsi e funzionare regolarmente senza errori.
- I backup storici del database (`backups/`) devono poter essere ripristinati senza incompatibilità di schema.

---

## 2. Modello Dati e Persistenza (PostgreSQL)

### Colonna Database
La tabella `exercises` include una colonna nativa `JSONB`:
```sql
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS equipment JSONB DEFAULT '[]'::jsonb;
```

### Struttura degli Oggetti nel JSON
La colonna `equipment` contiene un array di oggetti di configurazione. Ciascun oggetto ha un campo `type` obbligatorio e proprietà opzionali specifiche:

#### 1. Manubri (`dumbbells`)
```json
{
  "type": "dumbbells",
  "hands": "both" // "both" | "left" | "right"
}
```

#### 2. Palla (`ball`)
Può essere ancorata alle mani o libera nello spazio 3D su coordinate assolute:
```json
{
  "type": "ball",
  "position": "floor", // "hands" | "floor"
  "x": 0.0,            // Sinistra (-) / Destra (+) in metri
  "y": 0.16,           // Quota verticale da terra (raggio 0.16m - 2.30m)
  "z": 0.40            // Dietro (-) / Avanti (+) in metri
}
```
*Fallback automatico:* Se `x`, `y` o `z` mancano, il motore assume `x = 0`, `y = 0.16` (pavimento) e `z = 0.40`.

#### 3. Gradino / Step (`step`)
```json
{
  "type": "step",
  "position": "center", // "center" | "front" | "back"
  "x": 0.0,             // Spostamento orizzontale in metri
  "y": 0.0,             // Quota verticale/altezza da terra in metri (0.00m - 1.50m)
  "z": 0.0,             // Spostamento sagittale in metri
  "rotation": 0.0       // Angolo in radianti: 0 (orizzontale), 1.5708 (90° verticale)
}
```
*Fallback automatico:* Se `x`, `y` o `z` mancano, il motore assume `x = 0`, `y = 0.0` (pavimento) e `z = 0.0`.

### Backend & API
- **`server/routes/exercises.js`**:
  - `GET /api/exercises`: ritorna `equipment` come array (o `[]` se null).
  - `POST /api/exercises` e `PUT /api/exercises/:id`: accetta `equipment` nel payload, lo normalizza a JSON array valido e lo memorizza nella query `INSERT` / `UPDATE`.
- **`scripts/restore.js`**:
  - Inserisce `equipment` durante il restore. Se il dump JSON proviene da una versione legacy in cui il campo non esisteva, inserisce `[]::jsonb`.

---

## 3. Architettura del Motore 3D (`mannequin.js`)

Il file `client/src/mannequin/mannequin.js` gestisce tutta la cinematica, la grafica Three.js e le interazioni.

### Creazione delle Mesh (`initMeshes()`)
- Ogni attrezzo ha materiali e gruppi dedicati:
  - `this.dumbbellL`, `this.dumbbellR`: aggiunti a `this.rigGroup`.
  - `this.ballGroup`: gruppo autonomo aggiunto a `this.scene`.
  - `this.stepGroup`: gruppo autonomo aggiunto a `this.scene`.

### Posizionamento Dinamico (`refreshEquipment()`)
Chiamato ad ogni render frame:
1. **Manubri**:
   - Vengono agganciati alle coordinate delle mani: `this.P[IDX.handL]` e `this.P[IDX.handR]`.
   - Orientati perpendicolarmente al vettore avambraccio (`hand - elbow`) per un allineamento ergonomico.
2. **Palla**:
   - **Modalità `hands`**: posizionata automaticamente al baricentro delle due mani:
     ```javascript
     const hx = (this.P[IDX.handL].x + this.P[IDX.handR].x) * 0.5;
     const hy = (this.P[IDX.handL].y + this.P[IDX.handR].y) * 0.5;
     const hz = (this.P[IDX.handL].z + this.P[IDX.handR].z) * 0.5;
     this.ballGroup.position.set(hx, hy, hz);
     ```
   - **Modalità `floor` / Libera**: posizionata alle coordinate assolute `(cfg.x, cfg.y, cfg.z)`.
3. **Gradino**:
   - Posizionato alle coordinate `(cfg.x, cfg.y, cfg.z)` con rotazione `cfg.rotation` attorno all'asse Y.

### Modalità Onion Skin e Trasparenza (`updateBodyTransparency()`)
Quando l'utente attiva l'Onion Skin nell'editor (`flags.onion = true`):
- Il busto del manichino diventa semitrasparente (`opacity: 0.45`).
- **Anche la palla diventa semitrasparente** (`opacity: 0.35`, `depthWrite: false`, `renderOrder: 2`).
- **Perché è essenziale:** evita che la palla occluda visivamente le mani e gli handle di presa quando sono all'interno o dietro di essa, consentendo all'utente di selezionare e manipolare i keyframe delle mani senza ostacoli.
- Quando l'Onion Skin viene disattivato, la palla ritorna opaca al 100% (`opacity: 1.0`, `depthWrite: true`).

### Drag & Drop 3D nel Canvas (`drag_prop`)
- **Rilevamento Clic (`pickEquipmentProp`)**: Raycasting sulla scena per individuare se l'utente ha cliccato sul gradino o sulla palla (in modalità libera).
- **Priorità Giunti**: `pickJoint()` viene eseguito prima di `pickEquipmentProp()`. Se l'utente clicca su un giunto (anche all'interno della palla trasparente), ha la priorità il trascinamento dell'arto.
- **Piano di Trascinamento Dinamico**:
  - Per il gradino: piano orizzontale a quota $Y = \text{stepCfg.y || 0}$.
  - Per la palla: piano orizzontale dinamico a quota $Y = \text{ballCfg.y || 0.16}$, consentendo di trascinare gli oggetti mantenendo l'altezza impostata.
- **Callback di Sincronizzazione**: durante il movimento e al rilascio, viene invocato `onEquipmentChange(this.equipment)` per aggiornare lo stato reattivo di Vue.

---

## 4. Integrazione nell'Editor (`EditorView.vue`)

Nell'editor degli esercizi (`client/src/views/EditorView.vue`):

### 1. Selettore Attrezzi
Pulsanti a schede / toggle:
- 🏋️ **Manubri** (`toggleProp('dumbbells')`)
- ⚽ **Palla** (`toggleProp('ball')`)
- 🪜 **Gradino** (`toggleProp('step')`)

### 2. Controlli Specifici
- **Manubri**: pulsanti segmentati per scegliere se equipaggiare entrambe le mani, solo sinistra o solo destra.
- **Palla**:
  - Pulsante segmentato tra *Tra le mani* e *A terra*.
  - Quando a terra:
    - Slider continuo **Asse X** ($-1.5m \dots +1.5m$).
    - Slider continuo **Asse Y** ($0.16m \dots 2.30m$) con preset: *Terra* (0.16m), *Bacino* (0.90m), *Petto* (1.35m), *Alto* (1.85m).
    - Slider continuo **Asse Z** ($-1.5m \dots +1.5m$) con preset: *Centro*, *Sinistra*, *Destra*.
- **Gradino**:
  - Slider continuo **Asse X** ($-1.5m \dots +1.5m$).
  - Slider continuo **Asse Y** ($0.00m \dots 1.50m$) con preset: *Terra* (0.00m), *Basso* (0.15m), *Medio* (0.30m), *Alto* (0.50m).
  - Slider continuo **Asse Z** ($-1.5m \dots +1.5m$) con preset: *Centro*, *Davanti*, *Dietro*.
  - Selettore di **Rotazione**: `0° Orizzontale` vs `90° Verticale`.

### 3. Sincronizzazione Reattiva
- Modificando i cursori o i pulsanti nell'interfaccia, viene chiamato `mannequin.setEquipment(equipment.value)`.
- Trascina direttamente nel canvas 3D aggiorna i valori degli slider tramite `onEquipmentChange`.
- Al salvataggio (`handleSaveExercise`), l'array `equipment` viene inviato nel body della richiesta HTTP al server.

---

## 5. Integrazione nei Componenti di Riproduzione e Preview

1. **`MannequinPreview.vue`**:
   - Riceve la prop `equipment` (array).
   - Un `watch` reattivo aggiorna l'istanza `MannequinPreview` chiamando `mannequin.setEquipment(newVal)`.
2. **`PlayerView.vue`**:
   - Durante il workout attivo, passa l'equipment dell'esercizio corrente al canvas principale.
   - Durante le pause di recupero (Rest), resetta temporaneamente l'equipment a `[]`.
   - Passa l'equipment anche al preview del passaggio successivo (`nextStep`).
3. **`LibraryView.vue` & `ExercisePickerModal.vue`**:
   - Mostrano i badge visivi compatti (🏋️, ⚽, 🪜) sulle card degli esercizi per indicare a colpo d'occhio gli attrezzi necessari.

---

## 6. Guida Pratica: Come Aggiungere un Nuovo Oggetto 3D

Quando in futuro si vorrà aggiungere un nuovo attrezzo (es. **Kettlebell**, **Bilanciere**, **Elastico / Banda di resistenza**, **Corda per saltare**), seguire questa checklist:

### Fase 1: Creazione della Geometria 3D in `client/src/mannequin/mannequin.js`
1. **Materiali**: definisci i materiali in `initMeshes()` (es. `this.matKettlebell = new THREE.MeshStandardMaterial(...)`).
2. **Generatore di Mesh**: crea una funzione dedicata, es. `createKettlebellMesh()`.
3. **Istanziamento**: istanzia l'oggetto in `initMeshes()` e aggiungilo alla scena o al rig:
   ```javascript
   this.kettlebellGroup = this.createKettlebellMesh();
   this.kettlebellGroup.visible = false;
   this.scene.add(this.kettlebellGroup);
   ```
4. **Visibilità**: aggiorna `updateEquipmentVisibility()`:
   ```javascript
   if (this.kettlebellGroup) this.kettlebellGroup.visible = this.hasEquipment('kettlebell');
   ```
5. **Cinematica / Posizionamento**: in `refreshEquipment()`, definisci se l'oggetto segue un giunto specifico (es. mano sinistra/destra) o se ha coordinate assolute $X, Y, Z$.
6. **Supporto Onion Skin**: se l'oggetto è voluminoso e rischia di coprire il corpo, aggiungilo in `updateBodyTransparency()` per renderlo semitrasparente quando `flags.onion` è attivo.
7. **Supporto Drag 3D** (se applicabile): in `pickEquipmentProp()`, aggiungi l'oggetto alla lista `testObjects` se deve poter essere trascinato sul pavimento o nello spazio.

### Fase 2: Configurazione nell'Editor `client/src/views/EditorView.vue`
1. **Pulsante Toggle Attrezzo**: aggiungi il bottone nella barra degli attrezzi con l'icona appropriata:
   ```html
   <button type="button" class="md-filter-chip" :class="{ active: hasProp('kettlebell') }" @click="toggleProp('kettlebell')">
     <span>🔔 Kettlebell</span>
   </button>
   ```
2. **Stato Iniziale**: in `toggleProp(type)` definisci le proprietà di default (es. `{ type: 'kettlebell', hand: 'right', weight: 12 }`).
3. **Pannello Controlli Specifici**: aggiungi il blocco `v-if="hasProp('kettlebell')"` con slider, preset o selettori necessari.
4. **Helper di lettura/scrittura**: aggiungi le funzioni getter/setter per aggiornare l'oggetto e chiamare `mannequin.setEquipment()`.

### Fase 3: Localizzazione e Badge UI
1. **Traduzioni (`public/locales/it.json` e `en.json`)**: aggiungi le stringhe localizzate per il nome dell'attrezzo e le opzioni.
2. **Badge nelle Liste**: in `LibraryView.vue` ed `ExercisePickerModal.vue`, aggiungi l'icona badge se l'esercizio include l'attrezzo.

### Fase 4: Verifica e Collaudo
1. Esegui la build di produzione per verificare che Vite compili senza errori:
   ```bash
   npm run build
   ```
2. Esegui la suite di test automatizzati:
   ```bash
   DATABASE_SSL=false npm test
   ```
3. Verifica nell'editor: inserimento dell'oggetto, modifica dei parametri, dragging 3D, salvataggio dell'esercizio e reload per confermare la corretta persistenza.
