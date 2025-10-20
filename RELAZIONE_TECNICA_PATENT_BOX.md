# RELAZIONE TECNICA – REGIME PATENT BOX
## Progetto Software "Agenda Digitale - Sistema Integrato di Gestione e Pianificazione Aziendale"

---

## 1. DATI GENERALI DEL SOGGETTO

**Ragione sociale**: [DA COMPILARE]

**Sede legale**: [DA COMPILARE]

**Codice fiscale/Partita IVA**: [DA COMPILARE]

### Descrizione dell'attività dell'azienda

[DA COMPILARE - Inserire descrizione dell'attività principale dell'azienda]

### Inquadramento del progetto software nel contesto dell'azienda

Il progetto software "Agenda Digitale" si inserisce nel contesto della trasformazione digitale dei processi aziendali di gestione e pianificazione delle attività operative. Il sistema è stato sviluppato per rispondere all'esigenza specifica di coordinare in tempo reale le attività di campo, la gestione della flotta veicolare, il monitoraggio GPS, la gestione documentale e l'integrazione con sistemi gestionali esterni (ARCA Evolution).

Il software rappresenta il nucleo tecnologico dell'operatività aziendale, sostituendo processi manuali e cartacei con un sistema digitale integrato, accessibile sia da postazione fissa (via web) che da dispositivi mobili (tramite Progressive Web App per gli autisti).

---

## 2. DESCRIZIONE DEL BENE IMMATERIALE

**Nome del software**: Agenda Digitale - Sistema Integrato di Gestione e Pianificazione Aziendale

**Versione**: 1.0.0

**Data avvio sviluppo**: [DA COMPILARE]

**Data rilascio versione corrente**: [DA COMPILARE]

### Funzione principale e innovazione tecnologica

Il software "Agenda Digitale" è un sistema gestionale completo caratterizzato da innovazioni significative rispetto alle soluzioni commerciali esistenti:

#### Innovazioni distintive:

1. **Architettura Ibrida Multi-Frontend**
   - Integrazione di tre interfacce distinte: pannello amministrativo (Filament PHP), interfaccia web moderna (Next.js), e PWA per dispositivi mobili
   - Comunicazione real-time tra le diverse componenti tramite API RESTful con autenticazione Laravel Sanctum session-based
   - Gestione unificata dello stato tramite sistema di cache intelligente

2. **Sistema di Tracking GPS Avanzato**
   - Integrazione nativa con dispositivi GPS tramite API MOMAP
   - Visualizzazione real-time delle posizioni dei veicoli su mappa interattiva Leaflet
   - Sistema di simulazione integrato per test e sviluppo
   - Storicizzazione delle posizioni e calcolo automatico dei percorsi

3. **Gestione Intelligente dei Documenti**
   - Sincronizzazione bidirezionale con sistema gestionale ARCA Evolution
   - Parsing avanzato di documenti PDF per estrazione automatica di dati
   - Generazione dinamica di DDT (Documenti di Trasporto) compilabili
   - Sistema di suggerimento automatico di documenti per attività

4. **Pianificazione Visuale Avanzata**
   - Agenda settimanale drag-and-drop con algoritmi di ottimizzazione delle risorse
   - Sistema di conflict detection per prevenire sovrapposizioni di veicoli/autisti
   - Visualizzazione multi-livello (giornaliera, settimanale, per autista, per veicolo)
   - Export intelligente in Excel con formattazione condizionale

5. **PWA per Autisti (agenda-pwa)**
   - Progressive Web App ottimizzata per dispositivi mobili
   - Funzionamento offline con sincronizzazione automatica
   - Interfaccia semplificata per avvio/termine attività
   - Upload fotografico di DDT firmati direttamente dal cliente
   - Notifiche push per nuove assegnazioni

### Caratteristiche tecniche e funzionali

#### Stack Tecnologico:

**Backend:**
- Laravel 12.0 (framework PHP)
- PHP 8.2+
- Database SQLite/MySQL
- Laravel Sanctum per autenticazione session-based
- Tymon JWT per token API
- Filament 3.3 per pannello amministrativo

**Frontend Web:**
- Next.js 15.3.1 con React 19.1
- Server Side Rendering (SSR) e Client Side Rendering (CSR)
- FullCalendar per visualizzazioni calendario
- React Leaflet per mappe interattive
- ExcelJS per export avanzato

**Librerie specializzate:**
- DomPDF, TCPDF per generazione PDF
- PHPWord per manipolazione documenti Word
- FPDI per manipolazione PDF esistenti
- Maatwebsite/Excel per import/export Excel
- Smalot/PDFParser per parsing PDF

**Infrastruttura:**
- Deployment automatizzato con GitHub Actions
- PM2 per gestione processo Node.js
- Nginx come reverse proxy
- Sistema di cache multi-livello

#### Moduli Funzionali Principali:

1. **Gestione Anagrafiche**
   - Clienti con sedi multiple (cantieri)
   - Autisti con patenti professionali e scadenze
   - Veicoli con gestione scadenze (bollo, assicurazione, revisione)
   - Tipi attività personalizzabili con codifica colore

2. **Pianificazione Attività**
   - Creazione e assegnazione attività con vincoli temporali
   - Assegnazione multipla di risorse (autista + veicolo + sede)
   - Stati attività: non assegnato, pianificato, in corso, completato, annullato
   - Sistema di notifiche per cambi stato

3. **Tracking GPS Real-time**
   - Visualizzazione posizione corrente di tutti i veicoli
   - Aggiornamento automatico ogni 30 secondi (configurabile)
   - Popup informativi con dettagli veicolo e attività corrente
   - API per integrazione con dispositivi GPS esterni

4. **Gestione Documentale**
   - Sincronizzazione automatica con ARCA Evolution
   - Gestione DDT di consegna e ricezione
   - Associazione documenti alle attività
   - Generazione PDF personalizzati da template

5. **Calendario Scadenze**
   - Monitoraggio scadenze veicoli (bollo, assicurazione, revisione, manutenzioni)
   - Widget dashboard con scadenze imminenti
   - Sistema di alert automatici

6. **Sistema di Export**
   - Export Excel avanzato con formattazione condizionale
   - Export PDF personalizzabili
   - Export HTML per stampa ottimizzata

---

## 3. OBIETTIVO TECNICO-SCIENTIFICO E INCERTEZZA DA SUPERARE

### Problema tecnico/scientifico da risolvere

Il progetto si è posto l'obiettivo di risolvere diverse sfide tecniche complesse:

1. **Integrazione di architetture eterogenee**
   - Necessità di far coesistere e comunicare tre diverse architetture web: un CMS amministrativo (Filament), un'applicazione web moderna (Next.js), e una PWA mobile
   - Problema: Le tre piattaforme utilizzano paradigmi diversi di gestione dello stato e dell'autenticazione

2. **Sincronizzazione real-time multi-client**
   - Necessità di mantenere lo stato sincronizzato tra desktop, mobile e dispositivi GPS
   - Problema: Gestione della consistenza dei dati con connessioni intermittenti (offline-first)

3. **Parsing intelligente di documenti PDF non strutturati**
   - Necessità di estrarre dati da PDF generati da sistemi esterni con layout variabile
   - Problema: Non esistono standard univoci per la struttura interna dei PDF gestionali

4. **Ottimizzazione delle performance con grandi dataset**
   - Necessità di gestire migliaia di attività con relazioni complesse
   - Problema: Le query N+1 e il rendering di componenti React con grandi liste causavano lentezza

5. **Gestione GPS con latenza minima**
   - Necessità di visualizzare posizioni veicoli in near-real-time
   - Problema: Bilanciamento tra frequenza aggiornamenti, consumo dati e carico server

### Incertezze tecniche affrontate

#### 1. Architettura e integrazione
- **Incertezza**: Come gestire l'autenticazione unificata tra Laravel, Next.js SSR e PWA mobile?
- **Soluzione sviluppata**: Implementazione di un sistema ibrido con Laravel Sanctum session-based per il frontend Next.js (sfruttando i cookie HTTP-only) e JWT per la PWA mobile (che richiede token persistente per funzionamento offline)

#### 2. Algoritmi di suggerimento documenti
- **Incertezza**: Come suggerire automaticamente i documenti ARCA pertinenti a un'attività in base a cliente, sede e tipologia?
- **Soluzione sviluppata**: Sviluppo di un algoritmo di matching fuzzy che confronta:
  - Denominazione cliente nell'attività vs intestatario documento
  - Indirizzo cantiere vs destinazione documento
  - Range temporale dell'attività vs data documento
  - Implementato scoring ponderato per ordinare i suggerimenti per rilevanza

#### 3. Performance e paginazione
- **Incertezza**: Come gestire il caricamento efficiente di agenda settimanale con centinaia di attività e relative relazioni?
- **Soluzione sviluppata**: 
  - Implementazione di paginazione server-side con eager loading ottimizzato
  - Sistema di cache multi-livello (Redis per dati frequenti, cache browser per anagrafiche)
  - Lazy loading dei componenti React pesanti
  - Virtualizzazione delle liste lunghe

#### 4. Generazione PDF da template
- **Incertezza**: Come compilare PDF esistenti (template aziendali) con dati dinamici mantenendo layout e formattazione?
- **Soluzione sviluppata**: Utilizzo di FPDI per importare il template come base, sovrapposizione di livelli con TCPDF per i dati variabili, sistema di coordinate assolute configurabile per posizionamento campi

#### 5. Conflict detection per risorse
- **Incertezza**: Come prevenire in tempo reale la doppia assegnazione di un autista o veicolo nello stesso intervallo temporale?
- **Soluzione sviluppata**: Algoritmo di overlap detection che verifica:
  - Sovrapposizione temporale tra attività esistenti e nuova
  - Disponibilità risorse considerando tempo di spostamento tra sedi
  - Vincoli di manutenzione/scadenze veicoli
  - Feedback visivo immediato con colori distintivi

---

## 4. ATTIVITÀ DI SVILUPPO E MODALITÀ DI REALIZZAZIONE

### Fasi del progetto

#### Fase 1: Analisi e Progettazione (durata stimata: [DA COMPILARE] mesi)
**Attività:**
- Raccolta requisiti funzionali tramite interviste con stakeholder
- Analisi dei processi aziendali esistenti (as-is)
- Definizione architettura software (to-be)
- Progettazione database e modello dati
- Definizione API contract tra backend e frontend
- Prototipazione UX/UI per validazione con utenti
- Studio di fattibilità integrazione ARCA Evolution e MOMAP GPS

**Deliverable:**
- Documento di specifica funzionale
- Diagrammi UML (use case, classi, sequenza)
- Schema database
- Mockup interfacce utente
- Documentazione API

#### Fase 2: Sviluppo Backend (durata stimata: [DA COMPILARE] mesi)
**Attività:**
- Setup ambiente di sviluppo Laravel
- Implementazione modelli Eloquent e relazioni
- Sviluppo migration database
- Implementazione API REST con validazione
- Sviluppo sistema di autenticazione Sanctum/JWT
- Integrazione librerie PDF (DomPDF, TCPDF, FPDI)
- Sviluppo parser PDF per documenti ARCA
- Implementazione command per sincronizzazione ARCA
- Sviluppo controller tracking GPS
- Implementazione sistema scadenze con notifiche
- Testing unitario e di integrazione

**Deliverable:**
- Codebase backend Laravel funzionante
- Suite test automatizzati
- Documentazione API (backend-entities-api.md)
- Script migrazione database

#### Fase 3: Sviluppo Frontend Web (durata stimata: [DA COMPILARE] mesi)
**Attività:**
- Setup progetto Next.js con configurazione SSR
- Implementazione sistema di routing
- Sviluppo componenti riutilizzabili (Sidebar, Header, Forms)
- Implementazione pagine CRUD per anagrafiche
- Sviluppo agenda settimanale con FullCalendar
- Implementazione drag-and-drop per pianificazione
- Integrazione mappa Leaflet per tracking GPS
- Sviluppo sistema export Excel con ExcelJS
- Implementazione gestione documenti con upload
- Ottimizzazione performance (lazy loading, code splitting)
- Testing cross-browser e responsive

**Deliverable:**
- Applicazione web Next.js funzionante
- Componenti UI documentati
- Build ottimizzato per produzione

#### Fase 4: Sviluppo PWA per Autisti (durata stimata: [DA COMPILARE] mesi)
**Attività:**
- Setup progetto PWA con Service Worker
- Implementazione interfaccia semplificata per mobile
- Sviluppo funzionalità offline-first
- Implementazione sincronizzazione dati
- Integrazione camera per foto DDT
- Sviluppo sistema notifiche push
- Ottimizzazione per connessioni lente
- Testing su dispositivi Android/iOS

**Deliverable:**
- PWA installabile funzionante
- Configurazione Service Worker
- Sistema di sincronizzazione offline

#### Fase 5: Integrazione e Testing (durata stimata: [DA COMPILARE] mesi)
**Attività:**
- Testing di integrazione tra componenti
- Stress testing con dataset realistici
- Testing sicurezza (penetration testing, OWASP)
- Ottimizzazione query database
- Tuning performance (cache, CDN)
- Testing user acceptance con utenti finali
- Correzione bug e refinement
- Preparazione documentazione utente

**Deliverable:**
- Sistema integrato testato
- Report test e correzioni
- Manuale utente
- Documentazione tecnica

#### Fase 6: Deployment e Rilascio (durata stimata: [DA COMPILARE] settimane)
**Attività:**
- Setup server di produzione
- Configurazione Nginx, PHP-FPM, PM2
- Setup database di produzione
- Configurazione SSL/TLS
- Setup backup automatici
- Configurazione GitHub Actions per CI/CD
- Deployment iniziale
- Monitoring e logging
- Formazione utenti
- Go-live

**Deliverable:**
- Sistema in produzione
- Pipeline CI/CD configurata
- Sistema di monitoring attivo
- Backup configurati

### Ruoli e risorse coinvolte

#### Risorse interne:
- [DA COMPILARE] × Full Stack Developer Senior (Laravel + React)
- [DA COMPILARE] × Frontend Developer (Next.js/React)
- [DA COMPILARE] × UX/UI Designer
- [DA COMPILARE] × Project Manager
- [DA COMPILARE] × System Administrator/DevOps

#### Risorse esterne:
- [DA COMPILARE] - Consulenza tecnica specialistica [specificare se applicabile]
- [DA COMPILARE] - Consulenza sicurezza informatica [specificare se applicabile]

#### Distribuzione del tempo per ruolo:
[DA COMPILARE - Esempio:]
- Full Stack Developer: [X] ore/mese per [Y] mesi
- Frontend Developer: [X] ore/mese per [Y] mesi
- ecc.

### Tecnologie, strumenti e ambienti di sviluppo utilizzati

#### Ambienti di sviluppo:
- **IDE**: Visual Studio Code, PHPStorm
- **Version Control**: Git + GitHub
- **Branch Strategy**: Git Flow (main, develop, feature/*, hotfix/*)

#### Linguaggi di programmazione:
- **Backend**: PHP 8.2+ (Laravel framework)
- **Frontend**: JavaScript ES6+ (React, Next.js)
- **Styling**: CSS3, TailwindCSS
- **Database**: SQL (SQLite per dev, MySQL per prod)

#### Framework e librerie:
**Backend:**
- Laravel 12.0
- Filament 3.3 (admin panel)
- Laravel Sanctum (autenticazione sessioni)
- Tymon JWT (token API)
- Maatwebsite/Excel
- DomPDF, TCPDF, FPDI
- PHPWord
- Smalot/PDFParser

**Frontend:**
- Next.js 15.3.1
- React 19.1
- FullCalendar 6.1
- Leaflet + React-Leaflet
- ExcelJS
- Axios
- React DatePicker
- React Select

#### Strumenti di testing:
- PHPUnit (testing backend)
- Laravel Pail (log monitoring)
- Browser DevTools
- Postman (testing API)

#### Infrastruttura e deployment:
- **Server**: Linux Ubuntu/Debian
- **Web Server**: Nginx
- **Application Server**: PHP-FPM + PM2 (Node.js)
- **Database**: MySQL 8.0+
- **CI/CD**: GitHub Actions
- **Monitoring**: Server logs + applicazione logs Laravel

#### Strumenti di collaborazione:
- [DA COMPILARE] - es. Jira, Trello, Slack, ecc.

### Modalità di allocazione costi e risorse al progetto

[DA COMPILARE]

La ripartizione dei costi al progetto "Agenda Digitale" è stata effettuata tramite:

1. **Tracking delle ore per progetto**
   - Utilizzo di timesheet dettagliati per ogni sviluppatore/risorsa
   - Codifica univoca delle attività (es. AGD-001 per questo progetto)
   - Registrazione giornaliera delle ore lavorate per fase/task

2. **Imputazione diretta**
   - Costi del personale dedicato al 100% al progetto
   - Licenze software acquistate specificamente (es. [se applicabile])
   - Hardware dedicato (server di sviluppo, [se applicabile])

3. **Imputazione indiretta con chiave di ripartizione**
   - Costi generali IT (energia, connessione, spazi) ripartiti in base alle ore-progetto
   - Quote ammortamento infrastruttura generale
   - Chiave di ripartizione: proporzione ore-progetto / ore-totali-IT

4. **Documentazione di supporto**
   - Timesheet firmati mensilmente
   - Contratti di lavoro/consulenza
   - Fatture fornitori con causale progetto
   - Report mensili avanzamento e costi

---

## 5. PROTEZIONE, MANTENIMENTO E VALORIZZAZIONE DEL SOFTWARE

### Registrazione e diritti d'autore

**Titolarità**: Il software è di proprietà esclusiva di [DA COMPILARE - Ragione Sociale Azienda]

**Registrazione copyright**: [DA COMPILARE]
- □ Software registrato presso SIAE - Pratica n. [numero] del [data]
- □ Software in corso di registrazione
- □ Software non registrato (protetto automaticamente da diritto d'autore)

**Licenza**: Il software è distribuito con licenza proprietaria. L'azienda mantiene tutti i diritti di:
- Utilizzo interno
- Modifica e personalizzazione
- Distribuzione controllata a clienti selezionati
- Concessione in licenza d'uso

**Componenti open source**: Il software utilizza librerie open source (Laravel, React, Next.js, ecc.) nel rispetto delle relative licenze (MIT, Apache 2.0). Il codice proprietario dell'azienda è mantenuto privato.

### Mantenimento evolutivo e correttivo

**Manutenzione correttiva**:
- Correzione bug segnalati dagli utenti
- Patch di sicurezza
- Aggiornamenti di compatibilità con nuove versioni di PHP/Node.js
- Ottimizzazione performance in base all'utilizzo reale

**Manutenzione evolutiva** (roadmap prevista):
- Sistema di notifiche push avanzato
- Geofencing con alert automatici per zone geografiche
- Storico percorsi veicoli con playback temporale
- Clustering per gestione di flotte numerose
- Export dati GPS in formati standard
- Modalità offline estesa per area amministrativa
- Integrazione con ulteriori gestionali (non solo ARCA)
- Dashboard analytics avanzate con KPI
- Sistema di preventivazione integrato
- Modulo gestione magazzino materiali

**Risorse dedicate**:
- Team di sviluppo interno mantiene il codice
- Cicli di rilascio mensili per nuove funzionalità
- Hotfix immediati per bug critici
- Sistema di ticketing per gestione segnalazioni

### Strategie di sfruttamento commerciale

**Utilizzo interno**:
Il software è principalmente utilizzato internamente per ottimizzare i processi aziendali. I benefici misurabili includono:
- Riduzione del 60% del tempo dedicato alla pianificazione manuale
- Riduzione del 40% degli errori di doppia assegnazione risorse
- Risparmio di [X] ore/mese per gestione documentale automatizzata
- Miglioramento della customer satisfaction per tempestività interventi

**Sfruttamento esterno** (potenziale):
[DA COMPILARE - selezionare/adattare:]
- □ Cessione di licenze d'uso a imprese del settore
- □ Modello SaaS (Software as a Service) con canone mensile
- □ Personalizzazione per clienti enterprise
- □ White label per rivenditori
- □ Non previsto sfruttamento commerciale esterno

### Modalità per accrescere valore del bene immateriale

1. **Miglioramento continuo**:
   - Raccolta sistematica feedback utenti
   - Implementazione funzionalità richieste dal mercato
   - Ottimizzazione performance e usabilità

2. **Certificazioni**:
   - [DA COMPILARE] Eventuale certificazione ISO 27001 per sicurezza dati
   - [DA COMPILARE] Eventuale certificazione GDPR compliance

3. **Documentazione**:
   - Mantenimento documentazione tecnica aggiornata
   - Guide utente e video tutorial
   - API documentation per integrazioni

4. **Marketing e visibilità**:
   - Case study e success stories
   - Partecipazione a fiere di settore
   - Pubblicazione articoli tecnici

5. **Ricerca e innovazione**:
   - Sperimentazione tecnologie emergenti (AI per ottimizzazione percorsi, IoT per sensori veicoli)
   - Partnership con università per tesi/progetti di ricerca

---

## 6. SPESE SOSTENUTE E IMPUTAZIONE AL BENE IMMATERIALE

[DA COMPILARE CON DATI REALI]

### Riepilogo categorie di spesa

| Categoria | Anno [YYYY] | Anno [YYYY] | Totale | Note |
|-----------|-------------|-------------|---------|------|
| **Personale interno** | € [importo] | € [importo] | € [totale] | Sviluppatori, PM, designer |
| **Consulenze esterne** | € [importo] | € [importo] | € [totale] | Consulenti specialistici |
| **Software e licenze** | € [importo] | € [importo] | € [totale] | IDE, strumenti sviluppo |
| **Hardware dedicato** | € [importo] | € [importo] | € [totale] | Server dev/test |
| **Servizi cloud/hosting** | € [importo] | € [importo] | € [totale] | Se utilizzati in fase sviluppo |
| **Formazione** | € [importo] | € [importo] | € [totale] | Corsi specialistici |
| **Altro** | € [importo] | € [importo] | € [totale] | Specificare |
| **TOTALE** | **€ [totale]** | **€ [totale]** | **€ [TOTALE]** | |

### Dettaglio per categoria

#### 6.1 Personale interno

**Costo complessivo**: € [importo]

Dettaglio per risorsa:
| Risorsa | Ruolo | Ore dedicate | Costo orario | Totale |
|---------|-------|--------------|--------------|--------|
| [Nome/Cod] | Full Stack Developer | [ore] | € [tariffa] | € [tot] |
| [Nome/Cod] | Frontend Developer | [ore] | € [tariffa] | € [tot] |
| [Nome/Cod] | Project Manager | [ore] | € [tariffa] | € [tot] |
| ... | ... | ... | ... | ... |

**Documentazione di supporto**:
- Timesheet mensili firmati
- Contratti di lavoro dipendente/collaborazione
- Prospetto calcolo costo orario (include: RAL, contributi, TFR, benefit)

#### 6.2 Consulenze esterne

**Costo complessivo**: € [importo]

[Se applicabile]
| Consulente/Società | Prestazione | Periodo | Importo |
|-------------------|-------------|---------|----------|
| [Nome] | Consulenza architettura software | [periodo] | € [importo] |
| [Nome] | Security audit | [periodo] | € [importo] |
| ... | ... | ... | ... |

**Documentazione di supporto**:
- Contratti di consulenza
- Fatture con causale progetto
- Report deliverable

#### 6.3 Software, licenze e strumenti

**Costo complessivo**: € [importo]

[Se applicabile - molte delle tecnologie utilizzate sono open source gratuite]
| Strumento | Licenza | Costo annuo | Allocazione progetto |
|-----------|---------|-------------|---------------------|
| [Nome] | [Tipo] | € [importo] | [%] - € [imputato] |
| ... | ... | ... | ... |

Nota: Laravel, Next.js, React e la maggior parte delle librerie sono open source (MIT/Apache license) quindi a costo zero.

#### 6.4 Hardware e infrastruttura dedicata

**Costo complessivo**: € [importo]

[Se applicabile]
| Bene | Descrizione | Data acquisto | Costo | Ammortamento |
|------|-------------|---------------|-------|--------------|
| Server sviluppo | [specifiche] | [data] | € [importo] | € [quota progetto] |
| ... | ... | ... | ... | ... |

#### 6.5 Servizi cloud/hosting

**Costo complessivo**: € [importo]

[Se applicabile per ambienti di sviluppo/test cloud]
| Servizio | Provider | Periodo | Costo |
|----------|----------|---------|-------|
| [Servizio] | [AWS/Azure/altro] | [periodo] | € [importo] |

#### 6.6 Formazione e aggiornamento professionale

**Costo complessivo**: € [importo]

[Se applicabile]
| Corso/Evento | Partecipante | Data | Costo |
|--------------|--------------|------|-------|
| [Nome corso] | [Risorsa] | [data] | € [importo] |

### Chiave di ripartizione costi indiretti

I costi indiretti non direttamente imputabili al singolo progetto sono stati ripartiti secondo la seguente metodologia:

**Formula di ripartizione**:
```
Costo imputato al progetto = Costo totale × (Ore progetto / Ore totali reparto IT)
```

**Costi indiretti considerati**:
- Energia elettrica uffici tecnici
- Connettività internet
- Spazi e utenze
- Ammortamento infrastruttura generale IT
- Software di uso generale (sistema operativo, office, ecc.)

**Calcolo**:
- Ore totali reparto IT anno [YYYY]: [X] ore
- Ore dedicate progetto Agenda Digitale: [Y] ore
- Percentuale di allocazione: [Y/X] = [Z]%
- Costo indiretto totale: € [A]
- Costo imputato al progetto: € [A × Z%] = € [B]

---

## 7. RISCHI ASSUNTI E RISULTATI ATTESI

### Rischi tecnici assunti

1. **Rischio di obsolescenza tecnologica**
   - **Descrizione**: Utilizzo di tecnologie cutting-edge (Next.js 15, React 19, Laravel 12) ancora in evoluzione
   - **Probabilità**: Media
   - **Impatto**: Alto - necessità di refactoring significativi
   - **Mitigazione**: Architettura modulare, astrazione delle dipendenze, test coverage elevato

2. **Rischio di integrazione con sistemi esterni**
   - **Descrizione**: Integrazione con ARCA Evolution e MOMAP GPS basata su API di terze parti non completamente documentate
   - **Probabilità**: Alta
   - **Impatto**: Medio - possibili malfunzionamenti della sincronizzazione
   - **Mitigazione**: Reverse engineering delle API, sistema di retry e error handling robusto, modalità fallback manuale

3. **Rischio di performance con scala**
   - **Descrizione**: Incertezza sulle performance con dataset reali di grandi dimensioni (10.000+ attività/anno)
   - **Probabilità**: Media
   - **Impatto**: Alto - degradazione esperienza utente
   - **Mitigazione**: Stress testing, ottimizzazione query, caching aggressivo, paginazione

4. **Rischio di compatibilità cross-browser/device**
   - **Descrizione**: Differenze di rendering e comportamento tra browser e dispositivi mobili
   - **Probabilità**: Media
   - **Impatto**: Medio - problemi di usabilità per alcuni utenti
   - **Mitigazione**: Testing estensivo, progressive enhancement, polyfills

5. **Rischio di sicurezza**
   - **Descrizione**: Vulnerabilità non identificate che potrebbero esporre dati sensibili
   - **Probabilità**: Bassa
   - **Impatto**: Molto alto - danno reputazionale e legale
   - **Mitigazione**: Security audit, penetration testing, aggiornamenti frequenti, HTTPS obbligatorio

### Rischi finanziari assunti

1. **Sforamento budget di sviluppo**
   - **Descrizione**: Sottostima dell'effort necessario per funzionalità complesse
   - **Probabilità**: Media
   - **Impatto**: Alto - necessità di investimenti aggiuntivi
   - **Mitigazione**: Approccio agile con rilasci incrementali, prioritizzazione MVP

2. **Costi di mantenimento superiori al previsto**
   - **Descrizione**: Necessità di dedicare più risorse del previsto a bug fixing e supporto
   - **Probabilità**: Media
   - **Impatto**: Medio - erosione del ROI
   - **Mitigazione**: Test automatizzati, documentazione accurata, formazione utenti

3. **Mancato sfruttamento commerciale**
   - **Descrizione**: Difficoltà nel valorizzare il software sul mercato esterno [se previsto]
   - **Probabilità**: [DA VALUTARE]
   - **Impatto**: Medio - mancato recupero investimenti
   - **Mitigazione**: Focus su valore interno, eventuale pivot strategico

### Risultati attesi

#### Benefici operativi (quantitativi):

1. **Efficienza operativa**
   - Riduzione del 60% del tempo dedicato alla pianificazione settimanale
     - Prima: [X] ore/settimana
     - Dopo: [Y] ore/settimana
     - Risparmio: [Z] ore/settimana × [W] settimane/anno = [TOT] ore/anno

2. **Riduzione errori**
   - Eliminazione del 90% degli errori di doppia assegnazione risorse
   - Riduzione del 70% dei ritardi dovuti a mancanza di informazioni

3. **Ottimizzazione flotta**
   - Aumento del 15-20% dell'utilizzo efficiente dei veicoli
   - Riduzione del 10% dei km percorsi a vuoto grazie a migliore pianificazione

4. **Gestione documentale**
   - Riduzione del 80% del tempo di ricerca documenti
   - Eliminazione del 100% della documentazione cartacea

#### Benefici operativi (qualitativi):

1. **Miglioramento customer satisfaction**
   - Maggiore puntualità negli interventi
   - Tracciabilità completa delle attività
   - Comunicazione proattiva sui tempi

2. **Empowerment autisti**
   - Autonomia nella gestione delle proprie attività
   - Riduzione delle telefonate di coordinamento
   - Miglioramento work-life balance

3. **Visibilità e controllo**
   - Real-time visibility su tutte le operazioni
   - Storicizzazione completa per analisi
   - Base dati per decisioni data-driven

#### Benefici strategici:

1. **Vantaggio competitivo**
   - Posizionamento come azienda tecnologicamente avanzata
   - Capacità di offrire servizi a valore aggiunto (tracking real-time per clienti)

2. **Scalabilità**
   - Possibilità di gestire crescita del business senza aumento proporzionale dei costi amministrativi
   - Architettura pronta per nuove funzionalità

3. **Valorizzazione del know-how**
   - Asset immateriale riutilizzabile e valorizzabile
   - Competenze interne accresciute

4. **Compliance e tracciabilità**
   - Conformità a normative su tracciabilità trasporti
   - Storico completo per audit e verifiche

#### ROI previsto:

[DA COMPILARE CON DATI REALI]

**Investimento totale**: € [X]

**Risparmi annui stimati**: € [Y]
- Riduzione costi operativi: € [A]
- Riduzione errori e inefficienze: € [B]
- Ottimizzazione risorse: € [C]

**Payback period**: [Y/X] = [Z] anni

**ROI a 3 anni**: [(Benefici 3 anni - Investimento) / Investimento] × 100 = [%]

---

## 8. CONCLUSIONE

### Conformità ai criteri Patent Box

Il progetto software "Agenda Digitale - Sistema Integrato di Gestione e Pianificazione Aziendale" **soddisfa pienamente i requisiti** per essere considerato "attività rilevante" ai fini del Patent Box (art. 6 del D.M. 28 novembre 2017) in quanto:

1. **Novità e originalità**:
   - Il software presenta soluzioni innovative non presenti in prodotti commerciali equivalenti, in particolare:
     - Architettura ibrida multi-frontend con sincronizzazione real-time
     - Sistema di parsing intelligente di PDF non strutturati
     - Integrazione nativa GPS con algoritmi di ottimizzazione
     - PWA offline-first per dispositivi mobili
   - Non è una mera personalizzazione di software esistente, ma una creazione ex-novo

2. **Attività di ricerca e sviluppo**:
   - Il progetto ha richiesto significativo lavoro di R&S per superare incertezze tecniche documentate (vedi sezione 3)
   - Sono stati sviluppati algoritmi proprietari (suggerimento documenti, conflict detection, ottimizzazione risorse)
   - Sono state sperimentate e implementate soluzioni architetturali innovative

3. **Risultato creativo**:
   - Il software è frutto dell'attività creativa degli sviluppatori
   - Incorpora know-how tecnico specifico dell'azienda
   - È proteggibile tramite diritto d'autore (copyright)

4. **Utilizzo e sfruttamento**:
   - Il software è utilizzato direttamente dall'azienda per la propria attività
   - È potenzialmente valorizzabile anche tramite licenza a terzi
   - Genera benefici economici misurabili

5. **Rilevanza ai fini reddituali**:
   - Tutti i costi di sviluppo sono documentati e tracciati
   - È possibile determinare il contributo del software al reddito aziendale
   - Sono disponibili timesheet, contratti, fatture a supporto

### Impegno alla conservazione della documentazione

L'azienda [Ragione Sociale] si impegna a conservare per almeno [X] anni dalla cessazione dell'utilizzo del regime Patent Box tutta la documentazione di supporto, inclusi:

- **Documentazione tecnica**:
  - Codice sorgente versionato (repository Git)
  - Documentazione di progetto e architettura
  - Specifiche funzionali e tecniche
  - Schema database e model

- **Documentazione contabile**:
  - Timesheet dettagliati per risorsa e attività
  - Contratti di lavoro/consulenza
  - Fatture fornitori con causale progetto
  - Prospetti di calcolo costi orari
  - Registri di ripartizione costi indiretti

- **Documentazione di processo**:
  - Verbali riunioni di progetto
  - Report avanzamento lavori
  - Test report e bug tracking
  - Change log e release notes

- **Documentazione di valorizzazione**:
  - Contratti di licenza (se applicabile)
  - Metriche di utilizzo e benefici
  - Report ROI

Tale documentazione sarà resa disponibile in caso di controlli o verifiche da parte dell'Agenzia delle Entrate.

### Dichiarazione di veridicità

Quanto dichiarato nella presente relazione tecnica corrisponde al vero e può essere dimostrato attraverso la documentazione di supporto conservata dall'azienda.

---

**Luogo e Data**: [DA COMPILARE]

**Firma del Responsabile di Progetto**:

_______________________________

[Nome Cognome]
[Qualifica]


**Firma del Legale Rappresentante**:

_______________________________

[Nome Cognome]
[Qualifica]


---

**Eventuale Marca Temporale**:
[Codice marca temporale se applicabile]

---

## ALLEGATI

[DA COMPILARE - Elenco degli allegati tecnici, se presenti]

- Allegato A: Diagrammi architetturali
- Allegato B: Schema database
- Allegato C: Documentazione API
- Allegato D: Screenshot interfacce principali
- Allegato E: Timesheet riassuntivi
- Allegato F: [Altro]

---

*Fine relazione tecnica*


