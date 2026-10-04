### Tempo rimanente
*STATO: Da fare*
Aggiungere nel Player un finisce alle: xx:xx. Esempio se inizio una scheda alle 18 e dura 49 minuti il finisce visualizzerà "Finisce alle 18:49". Calcolalo all'inizio e poi calcolalo quando si preme il pulsante di "salto" perché il tempo in quel caso diminuisce.

### Bug Builder
*STATO: Da fare*
In firefox se il EditorView.vue sta riproducendo i frame dell'esercizio ed apro la tendina per selezionare il gruppo muscolare, la pagina va in tilt. Se non è evidente il problema, stoppare la riproduzione dei frames quando si apre il dropdown del gruppo muscolare.

### Riposizionamento Fotogrammi
*STATO: Da fare*
In EditorView.vue aggiungere la possibilità di cambiare l'orine dei fotogrammi. Al drag&drop se F1 | F2 | F3 e sposto F3 prima di F2 dovrò comunque vedere F1 | F2 | F3 ma F2 conterrà F3 e F3 conterrà F2. Insomma non cambia l'orine del "Nome" del fotogramma ma del ccontenuto.

### Duplicazione Esercizio 
*STATO: Da fare*
In LibraryView.vue spostare il pulsante "elimina" all'interno di un menu dropdown (come quello nelle schede in home page), e aggiungere (oltre ad elimina) un "Duplica", che riporta alla pagina di EditorView con già tutto compilato e con i fotogrammi impostati pronto per essere salvato come nuovo esercizio (aggiungere "(Copia)" in fondo al nome dell'esercizio per rendere evidente che si tratta di un esercizio NUOVO)