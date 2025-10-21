# Agenda Noleggio Veicoli

## Descrizione
La pagina **Agenda Noleggio** permette di visualizzare e gestire i contratti di noleggio dei veicoli attraverso un calendario interattivo.

## Funzionalità Principali

### 1. Calendario Visivo
- Visualizzazione mensile, settimanale e giornaliera dei contratti di noleggio
- Ogni veicolo viene mostrato con un evento colorato che copre il periodo del contratto
- Colori distintivi basati sullo stato del contratto

### 2. Statistiche Dashboard
La pagina mostra statistiche in tempo reale:
- **Totale Noleggi**: Numero totale di veicoli con contratto
- **Contratti Attivi**: Contratti attualmente in corso
- **In Scadenza**: Contratti che scadono nei prossimi 30 giorni
- **Scaduti**: Contratti già terminati
- **Futuri**: Contratti non ancora iniziati
- **Canoni Mensili Totali**: Somma dei canoni mensili di tutti i contratti attivi

### 3. Sistema di Colori
- 🟢 **Verde**: Contratto attivo (oltre 30 giorni alla scadenza)
- 🟠 **Arancione**: In scadenza (entro 30 giorni)
- 🔴 **Rosso**: Contratto scaduto
- 🔵 **Blu**: Contratto futuro (non ancora iniziato)

### 4. Tooltip Informativi
Passando il mouse su un veicolo, viene mostrato un tooltip con:
- Targa, marca e modello del veicolo
- Date di inizio e fine contratto
- Tipo di noleggio
- Intestatario del contratto
- Canone mensile
- Durata in mesi
- Chilometri contrattuali
- Fornitore
- Note aggiuntive

### 5. Navigazione Rapida
Cliccando su un veicolo nel calendario, si viene reindirizzati alla pagina di dettaglio del veicolo.

## Campi del Contratto

Per visualizzare un veicolo nell'Agenda Noleggio, è necessario compilare almeno:
- **Data Inizio Contratto** (`contract_start_date`)
- **Data Fine Contratto** (`contract_end_date`)

Altri campi opzionali ma utili:
- `contract_holder` - Intestatario del contratto
- `rental_type` - Tipo di noleggio (es. lungo termine, breve termine)
- `monthly_fee` - Canone mensile
- `contract_duration_months` - Durata in mesi
- `contract_kilometers` - Chilometri contrattuali
- `supplier` - Fornitore/società di noleggio
- `advance_paid` - Anticipo versato
- `final_installment` - Maxi rata finale
- `installment_payment_day` - Giorno di pagamento rata
- `monthly_alert` - Avviso mensile
- `end_alert` - Avviso fine contratto
- `invoice_amount_excl_vat` - Importo fattura senza IVA
- `invoice_amount_incl_vat` - Importo fattura con IVA
- `contract_equipment` - Dotazioni incluse nel contratto

## API Endpoints

### GET `/api/rental-vehicles`
Restituisce tutti i veicoli con contratto di noleggio.

**Query Parameters:**
- `date` - Filtra per veicoli noleggiati in una data specifica
- `active=1` - Mostra solo contratti attivi (non scaduti)

### GET `/api/rental-vehicles/statistics`
Restituisce statistiche aggregate sui contratti di noleggio.

### GET `/api/rental-vehicles/{id}`
Restituisce i dettagli di un singolo veicolo noleggiato.

## Struttura File

### Backend
- **Controller**: `app/Http/Controllers/RentalVehicleController.php`
- **Routes**: Definite in `routes/api.php`
- **Migration**: `database/migrations/2025_10_20_114347_add_vehicle_contract_fields_to_vehicles_table.php`
- **Model**: `app/Models/Vehicle.php` (già esistente, con i nuovi campi)

### Frontend
- **Pagina**: `frontend/app/agenda-noleggio/page.jsx`
- **Link nella Sidebar**: Aggiunto nel menu "Pianificazione"

## Come Utilizzare

1. **Accedere alla pagina**: Clicca su "Pianificazione" → "Agenda Noleggio" nel menu laterale

2. **Aggiungere un contratto**:
   - Vai alla pagina di modifica di un veicolo
   - Compila almeno i campi "Data Inizio Contratto" e "Data Fine Contratto"
   - Salva il veicolo
   - Il veicolo apparirà automaticamente nel calendario

3. **Visualizzare i dettagli**:
   - Passa il mouse su un veicolo nel calendario per vedere i dettagli
   - Clicca sul veicolo per andare alla sua pagina di dettaglio

4. **Filtrare per periodo**:
   - Usa i pulsanti del calendario per navigare tra mesi, settimane o giorni
   - Usa i pulsanti "Precedente", "Successivo" e "Oggi" per muoverti nel tempo

## Note Tecniche

- La pagina utilizza **FullCalendar** per la visualizzazione del calendario
- I dati sono caricati via API da Laravel
- La pagina è protetta da autenticazione (richiede login)
- Le date sono formattate secondo il locale italiano
- I tooltip sono implementati con HTML personalizzato per migliore UX

## Sviluppi Futuri

Possibili miglioramenti:
- Filtri avanzati (per fornitore, tipo noleggio, ecc.)
- Export dei dati in Excel/PDF
- Notifiche automatiche per contratti in scadenza
- Grafici di analisi dei costi di noleggio
- Confronto tra periodi diversi
- Integrazione con sistema di fatturazione


