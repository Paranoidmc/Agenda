# Template PDF Documenti

Questa cartella contiene i template per la generazione PDF dei documenti Arca.

## Come caricare il template

1. Carica il tuo file template PDF in questa cartella
2. Rinomina il file come `documento-template.pdf` o `documento-template.html`
3. Il sistema lo utilizzerà automaticamente per generare i PDF dei documenti

## Formati supportati

- **HTML**: Template HTML con placeholder per i dati del documento
- **PDF**: Template PDF base da personalizzare con i dati

## Placeholder disponibili

I seguenti placeholder saranno sostituiti automaticamente:

- `{{codice_doc}}` - Codice documento
- `{{numero_doc}}` - Numero documento  
- `{{data_doc}}` - Data documento
- `{{cliente_nome}}` - Nome cliente
- `{{cliente_telefono}}` - Telefono cliente
- `{{sede_nome}}` - Nome sede/cantiere
- `{{sede_indirizzo}}` - Indirizzo sede
- `{{autista_nome}}` - Nome autista
- `{{autista_cognome}}` - Cognome autista
- `{{totale_doc}}` - Totale documento
- `{{righe}}` - Lista righe documento

## Esempio template HTML

```html
<!DOCTYPE html>
<html>
<head>
    <title>Documento {{codice_doc}}/{{numero_doc}}</title>
    <style>
        body { font-family: Arial, sans-serif; }
        .header { text-align: center; margin-bottom: 30px; }
        .cliente { margin-bottom: 20px; }
        .righe table { width: 100%; border-collapse: collapse; }
        .righe th, .righe td { border: 1px solid #ddd; padding: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Documento {{codice_doc}}/{{numero_doc}}</h1>
        <p>Data: {{data_doc}}</p>
    </div>
    
    <div class="cliente">
        <h3>Cliente: {{cliente_nome}}</h3>
        <p>Telefono: {{cliente_telefono}}</p>
        <p>Sede: {{sede_nome}} - {{sede_indirizzo}}</p>
        <p>Autista: {{autista_nome}} {{autista_cognome}}</p>
    </div>
    
    <div class="righe">
        <table>
            <thead>
                <tr>
                    <th>Articolo</th>
                    <th>Descrizione</th>
                    <th>Quantità</th>
                    <th>Prezzo</th>
                    <th>Totale</th>
                </tr>
            </thead>
            <tbody>
                {{righe}}
            </tbody>
        </table>
    </div>
    
    <div class="totale">
        <h3>Totale: €{{totale_doc}}</h3>
    </div>
</body>
</html>
```
