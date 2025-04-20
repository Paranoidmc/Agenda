# Documentazione Backend Agenda

Questa documentazione riassume le principali entità, relazioni e API del backend Laravel per il gestionale Agenda, estratte direttamente dai controller.

## Entità principali

### 1. Clienti (`Client`)
- **Campi:**
  - nome, indirizzo, citta, cap, provincia, telefono, partita_iva, codice_fiscale, note
- **Relazioni:**
  - `activities` (Attività)
  - `sites` (Sedi)

### 2. Veicoli (`Vehicle`)
- **Campi:**
  - targa, modello, marca, colore, anno, tipo, carburante, km, note
- **Relazioni:**
  - `activities` (Attività)
  - `deadlines` (Scadenze)

### 3. Sedi (`Site`)
- **Campi:**
  - nome, indirizzo, citta, cap, provincia, telefono, note
- **Relazioni:**
  - `client` (Cliente)
  - `activities` (Attività)

### 4. Attività (`Activity`)
- **Campi:**
  - titolo, descrizione, data_inizio, data_fine, stato, note
- **Relazioni:**
  - `client` (Cliente)
  - `driver` (Autista)
  - `vehicle` (Veicolo)
  - `site` (Sede)
  - `activityType` (Tipo Attività)

### 5. Autisti (`Driver`)
- **Campi:**
  - nome, cognome, telefono, indirizzo, citta, cap, provincia, codice_fiscale, patente, scadenza_patente, note
- **Relazioni:**
  - `activities` (Attività)

### 6. Tipi Attività (`ActivityType`)
- **Campi:**
  - nome, descrizione, colore


## API REST principali

### Clienti
- `GET /api/clients` — Lista tutti i clienti (con attività e sedi)
- `POST /api/clients` — Crea un nuovo cliente
- `GET /api/clients/{id}` — Mostra un cliente
- `PUT/PATCH /api/clients/{id}` — Aggiorna un cliente
- `DELETE /api/clients/{id}` — Elimina un cliente

### Veicoli
- `GET /api/vehicles` — Lista tutti i veicoli (con attività e scadenze)
- `POST /api/vehicles` — Crea un nuovo veicolo
- `GET /api/vehicles/{id}` — Mostra un veicolo
- `PUT/PATCH /api/vehicles/{id}` — Aggiorna un veicolo
- `DELETE /api/vehicles/{id}` — Elimina un veicolo

### Sedi
- `GET /api/sites` — Lista tutte le sedi (con cliente e attività)
- `POST /api/sites` — Crea una nuova sede
- `GET /api/sites/{id}` — Mostra una sede
- `PUT/PATCH /api/sites/{id}` — Aggiorna una sede
- `DELETE /api/sites/{id}` — Elimina una sede

### Attività
- `GET /api/activities` — Lista tutte le attività (con cliente, autista, veicolo, sede, tipo)
- `POST /api/activities` — Crea una nuova attività
- `GET /api/activities/{id}` — Mostra una attività
- `PUT/PATCH /api/activities/{id}` — Aggiorna una attività
- `DELETE /api/activities/{id}` — Elimina una attività

### Autisti
- `GET /api/drivers` — Lista tutti gli autisti (con attività)
- `POST /api/drivers` — Crea un nuovo autista
- `GET /api/drivers/{id}` — Mostra un autista
- `PUT/PATCH /api/drivers/{id}` — Aggiorna un autista
- `DELETE /api/drivers/{id}` — Elimina un autista

### Tipi Attività
- `GET /api/activity-types` — Lista tutti i tipi di attività
- `POST /api/activity-types` — Crea un nuovo tipo attività
- `GET /api/activity-types/{id}` — Mostra un tipo attività
- `PUT/PATCH /api/activity-types/{id}` — Aggiorna un tipo attività
- `DELETE /api/activity-types/{id}` — Elimina un tipo attività


## Note aggiuntive
- I controller mappano i campi inglesi dei model in chiave italiana nelle risposte JSON.
- Le relazioni sono caricate con `with()` nelle index e show.
- Le validazioni sono già presenti nei controller per i campi di input.

---

_Questo file è generato automaticamente leggendo la logica dei controller Laravel. Aggiorna la documentazione se modifichi le API o i model._
