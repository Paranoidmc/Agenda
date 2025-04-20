# Piano di Modernizzazione UI/UX Agenda (Stile TeamSystem)

## 1. Analisi delle principali pagine/componenti
- Weekly Schedule (settimanale autisti/veicoli)
- Tabelle risorse (driver, vehicle, attività, ecc)
- Sidebar di navigazione
- Header/topbar
- Card, modali, pulsanti
- Form di inserimento/modifica
- Stati vuoti, loader, notifiche

## 2. Lista componenti da modernizzare/riscrivere
### Core:
1. Sidebar/Menu di navigazione
2. Header/Topbar
3. Tabella dati generica (con azioni, ricerca, paginazione, responsive)
4. Card attività/evento
5. Grid settimanale (schedule)
6. Modale generica
7. Form input moderno (convalidato, accessibile)
8. Pulsanti e icone
9. Loader/spinner
10. Tooltip e notifiche

## 3. Approccio consigliato
- **Step 1:** Sidebar + Header (React o Blade, a seconda di dove vuoi la logica)
- **Step 2:** Tabella dati moderna (React, ispirata a TeamSystem)
- **Step 3:** Card e modali
- **Step 4:** Grid settimanale (schedule) in React
- **Step 5:** Form e input
- **Step 6:** Loader, tooltip, notifiche

## 4. Prossima azione
- Preparare la struttura base per i componenti React (con Vite già pronto in Laravel)
- Mostrare Sidebar + una Tabella React moderna, pronte da montare in Filament/Blade
- Fornire guida di integrazione (come “mountare” React in Blade/Filament)

**Nota:** Seguire questa lista, implementando e integrando ogni componente, fino a completamento.
