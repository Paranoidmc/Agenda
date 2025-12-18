<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Response;
use App\Models\Documento;
use setasign\Fpdi\Fpdi;
use setasign\Fpdi\PdfReader\PdfReader;
use Barryvdh\DomPDF\Facade\Pdf;

class DocumentiController extends Controller
{
    /**
     * Lista documenti con filtri e relazioni
     */
    public function index(Request $request)
    {
        $query = Documento::with(['cliente', 'sede', 'autista']);

        // Applica filtri
        if ($request->filled('cliente')) {
            $query->where('client_id', $request->input('cliente'));
        }
        
        if ($request->filled('sede')) {
            $query->where('site_id', $request->input('sede'));
        }
        
        if ($request->filled('codice_documento')) {
            $query->where('codice_doc', 'like', '%' . $request->input('codice_documento') . '%');
        }
        
        if ($request->filled('data_inizio')) {
            $query->whereDate('data_doc', '>=', $request->input('data_inizio'));
        }
        
        if ($request->filled('data_fine')) {
            $query->whereDate('data_doc', '<=', $request->input('data_fine'));
        }

        // Aggiungi ricerca se presente
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('codice_doc', 'like', "%{$search}%")
                  ->orWhere('numero_doc', 'like', "%{$search}%")
                  ->orWhereHas('cliente', function($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('sede', function($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
            });
        }

        // Ordina per data decrescente
        $query->orderBy('data_doc', 'desc')
              ->orderBy('numero_doc', 'desc');

        $documenti = $query->paginate($request->input('per_page', 50));

        // Trasforma i dati secondo la specifica API Arca
        $documentiFormatted = $documenti->getCollection()->map(function ($documento) {
            // Recupera righe documento
            $righe = DB::table('righe_documento')
                ->where('documento_id', $documento->id)
                ->get()
                ->map(function ($riga) {
                    return [
                        'id' => $riga->id,
                        'idDoc' => $riga->documento_id,
                        'riga' => $riga->riga,
                        'articolo' => $riga->codice_articolo,
                        'descrizione' => $riga->descrizione,
                        'unita' => $riga->unita,
                        'quantita' => $riga->quantita,
                        'prezzo' => $riga->prezzo_unitario,
                        'sconto' => $riga->sconto,
                        'prezzoScontato' => $riga->prezzo_scontato,
                        'codiceIva' => $riga->codice_iva,
                        'totaleRiga' => $riga->totale_riga,
                        'dataConsegna' => $riga->data_consegna
                    ];
                })->toArray();

            return [
                'id' => $documento->id,
                'codiceDoc' => $documento->codice_doc,
                'codiceCliente' => $documento->cliente->codice_arca ?? '',
                'codiceDestinazione' => $documento->sede->codice_arca ?? '',
                'nomeCliente' => $documento->cliente->name ?? '',
                'nomeSede' => $documento->sede->name ?? '',
                'numeroDoc' => $documento->numero_doc,
                'dataDoc' => $documento->data_doc,
                'numeroDocRif' => $documento->numero_doc_rif,
                'dataDocRif' => $documento->data_doc_rif,
                'dataConsegna' => $documento->data_consegna,
                'agente1' => $documento->agente1,
                'agente2' => $documento->agente2,
                'nomeAgente1' => $this->getDriverNameByCode($documento->agente1),
                'nomeAgente2' => $this->getDriverNameByCode($documento->agente2),
                'totaleImponibileDoc' => $documento->totale_imponibile_doc,
                'totaleImpostaDoc' => $documento->totale_imposta_doc,
                'totaleScontoDoc' => $documento->totale_sconto_doc,
                'totaleDoc' => $documento->totale_doc,
                // Aggiungi oggetto sede completo per frontend
                'sede' => $documento->sede ? [
                    'id' => $documento->sede->id,
                    'name' => $documento->sede->name,
                    'address' => $documento->sede->address,
                    'city' => $documento->sede->city,
                    'province' => $documento->sede->province,
                    'postal_code' => $documento->sede->postal_code,
                    'codice_arca' => $documento->sede->codice_arca
                ] : null,
                // Aggiungi oggetto cliente completo per frontend
                'cliente' => $documento->cliente ? [
                    'id' => $documento->cliente->id,
                    'name' => $documento->cliente->name,
                    'phone' => $documento->cliente->phone,
                    'codice_arca' => $documento->cliente->codice_arca
                ] : null,
                'righe' => $righe
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $documentiFormatted,
            'total' => $documenti->total(),
            'current_page' => $documenti->currentPage(),
            'last_page' => $documenti->lastPage(),
            'per_page' => $documenti->perPage()
        ]);
    }

    /**
     * Dettaglio documento con righe
     */
    public function show($id)
    {
        $documento = Documento::with(['cliente', 'sede', 'autista'])
            ->findOrFail($id);

        if (!$documento) {
            return response()->json([
                'success' => false,
                'message' => 'Documento non trovato'
            ], 404);
        }

        // Recupera righe documento
        $righe = DB::table('righe_documento')
            ->where('documento_id', $id)
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'documento' => $documento,
                'righe' => $righe
            ]
        ]);
    }

    /**
     * Genera PDF documento utilizzando template PDF
     */
    public function generatePdf($id)
    {
        try {
            \Log::info('🚀 Inizio generazione PDF', ['documento_id' => $id]);
            
            $documento = Documento::with(['cliente', 'sede', 'autista'])->findOrFail($id);
            $righe = DB::table('righe_documento')->where('documento_id', $documento->id)->get();

            \Log::info('📄 Documento caricato', [
                'documento_id' => $documento->id,
                'codice_doc' => $documento->codice_doc,
                'numero_doc' => $documento->numero_doc,
                'righe_count' => $righe->count()
            ]);

            // Path del template Word
            $templatePath = public_path('assets/pdf-templates/Documento (1).docx');
            
            if (!file_exists($templatePath)) {
                \Log::error('❌ Template Word non trovato', ['path' => $templatePath]);
                return response()->json([
                    'success' => false,
                    'message' => 'Template Word non trovato: ' . $templatePath
                ], 404);
            }

            \Log::info('📋 Template Word trovato', ['path' => $templatePath]);

            // Genera Word da template con placeholder sostituiti
            // Processa il template Word sostituendo i placeholder
            $wordContent = $this->fillWordTemplate($templatePath, $documento, $righe);
            
            \Log::info('✅ Template Word processato con successo');
            
            // Salva temporaneamente il Word processato
            $tempWordPath = sys_get_temp_dir() . '/documento_temp_' . time() . '.docx';
            file_put_contents($tempWordPath, $wordContent);
            
            \Log::info('💾 File Word temporaneo salvato', ['temp_path' => $tempWordPath]);
            
            // Converti Word in PDF mantenendo il layout del template
            \Log::info('🔄 Inizio conversione Word→PDF con layout preservato');
            $pdfContent = $this->convertWordToPdfWithLayout($tempWordPath, $documento, $righe);
            
            \Log::info('✅ Conversione PDF completata');
            
            // Pulisci il file temporaneo
            if (file_exists($tempWordPath)) {
                unlink($tempWordPath);
            }
            
            \Log::info('🗑️ File temporaneo eliminato');
            
            // Restituisci il PDF
            $filename = 'documento-' . ($documento->codice_doc ?? 'DOC') . '-' . ($documento->numero_doc ?? 'N/A') . '.pdf';
            
            \Log::info('📥 Invio PDF al client', ['filename' => $filename]);
            
            return response($pdfContent)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
            
        } catch (\Exception $e) {
            \Log::error('❌ Errore nella generazione PDF', [
                'documento_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Errore nella generazione PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Controlla quanti documenti ci sono di oggi dall'API Arca
     */
    public function checkOggiArca()
    {
        try {
            // Recupera credenziali
            $row = DB::table('settings')->where('key', 'arca_credentials')->first();
            if (!$row) {
                return response()->json([
                    'success' => false,
                    'message' => 'Credenziali Arca non trovate'
                ], 404);
            }
            
            $creds = json_decode(\Crypt::decryptString($row->value), true);
            $username = $creds['username'] ?? '';
            $password = $creds['password'] ?? '';
            
            if (!$username || !$password) {
                return response()->json([
                    'success' => false,
                    'message' => 'Credenziali Arca incomplete'
                ], 400);
            }
            
            // Login
            $client = new \GuzzleHttp\Client([
                'base_uri' => 'http://94.23.67.156:8082/api-arca/cgf/',
                'timeout' => 60,
            ]);
            
            $res = $client->post('auth/login', [
                'json' => ['username' => $username, 'password' => $password]
            ]);
            $body = json_decode($res->getBody(), true);
            $token = $body['token'] ?? null;
            
            if (!$token) {
                throw new \Exception('Token JWT non ricevuto');
            }
            
            // Chiedi documenti di oggi
            $headers = ['Authorization' => 'Bearer ' . $token];
            $oggi = date('Ymd'); // Formato YYYYMMDD
            
            $res = $client->get('documenti/date', [
                'headers' => $headers,
                'query' => [
                    'dataInizio' => $oggi,
                    'dataFine' => $oggi
                ],
                'timeout' => 60
            ]);
            
            $list = json_decode($res->getBody(), true);
            
            if (!is_array($list)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Risposta API non valida'
                ], 500);
            }
            
            $count = count($list);
            
            // Controlla nel database locale
            $dbCount = \App\Models\Documento::whereDate('data_doc', date('Y-m-d'))->count();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'oggi' => date('Y-m-d'),
                    'api_arca' => $count,
                    'database_locale' => $dbCount,
                    'mancanti' => max(0, $count - $dbCount),
                    'documenti' => array_slice($list, 0, 10) // Primi 10 per preview
                ]
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Errore check documenti oggi Arca: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Sincronizza manualmente i documenti del giorno corrente
     */
    public function sincronizzaOggi()
    {
        try {
            // Imposta il tempo massimo di esecuzione a 5 minuti
            set_time_limit(300);
            
            // Esegui il comando di sincronizzazione per oggi (ultimi 3 giorni per sicurezza)
            Artisan::call('arca:sync-documenti', [
                '--giorni' => 3,
                '--retry' => 2
            ]);
            
            $output = Artisan::output();
            
            // Estrai i numeri effettivi dall'output del comando
            $documentiSincronizzati = 0;
            $righeSincronizzate = 0;
            
            if (preg_match('/📄 Documenti sincronizzati: (\d+)/', $output, $matches)) {
                $documentiSincronizzati = (int) $matches[1];
            }
            
            if (preg_match('/📋 Righe documento sincronizzate: (\d+)/', $output, $matches)) {
                $righeSincronizzate = (int) $matches[1];
            }
            
            // Conta anche i totali nel database per informazione
            $totaleDocs = Documento::count();
            $totaleRighe = DB::table('righe_documento')->count();
            
            return response()->json([
                'success' => true,
                'message' => 'Sincronizzazione documenti di oggi completata con successo',
                'data' => [
                    'documenti' => $documentiSincronizzati, // Documenti sincronizzati oggi
                    'righe' => $righeSincronizzate, // Righe sincronizzate oggi
                    'totale_documenti' => $totaleDocs, // Totale documenti nel DB
                    'totale_righe' => $totaleRighe, // Totale righe nel DB
                    'output' => $output
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Errore sincronizzazione documenti oggi: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Errore durante la sincronizzazione: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Suggerisci documenti per attività
     */
    public function suggerisciPerAttivita(Request $request)
    {
        $clientId = $request->input('client_id');
        $siteId = $request->input('site_id');
        $driverId = $request->input('driver_id');

        $query = DB::table('documenti')
            ->leftJoin('clients', 'documenti.client_id', '=', 'clients.id')
            ->leftJoin('sites', 'documenti.site_id', '=', 'sites.id')
            ->leftJoin('drivers', 'documenti.driver_id', '=', 'drivers.id')
            ->select([
                'documenti.*',
                'clients.name as client_name',
                'sites.name as site_name',
                'drivers.name as driver_name',
                'drivers.surname as driver_surname'
            ]);

        // Priorità suggerimenti
        $suggestions = [];

        // 1. Documenti con cliente, sede e autista corrispondenti
        if ($clientId && $siteId && $driverId) {
            $exact = $query->clone()
                ->where('documenti.client_id', $clientId)
                ->where('documenti.site_id', $siteId)
                ->where('documenti.driver_id', $driverId)
                ->orderBy('documenti.data_doc', 'desc')
                ->limit(3)
                ->get();
            
            foreach ($exact as $doc) {
                $suggestions[] = [
                    'documento' => $doc,
                    'match_score' => 100,
                    'match_reason' => 'Cliente, sede e autista corrispondenti'
                ];
            }
        }

        // 2. Documenti con cliente e sede corrispondenti
        if ($clientId && $siteId && count($suggestions) < 5) {
            $clientSite = $query->clone()
                ->where('documenti.client_id', $clientId)
                ->where('documenti.site_id', $siteId)
                ->whereNotIn('documenti.id', collect($suggestions)->pluck('documento.id'))
                ->orderBy('documenti.data_doc', 'desc')
                ->limit(5 - count($suggestions))
                ->get();

            foreach ($clientSite as $doc) {
                $suggestions[] = [
                    'documento' => $doc,
                    'match_score' => 80,
                    'match_reason' => 'Cliente e sede corrispondenti'
                ];
            }
        }

        // 3. Documenti con solo cliente corrispondente
        if ($clientId && count($suggestions) < 5) {
            $clientOnly = $query->clone()
                ->where('documenti.client_id', $clientId)
                ->whereNotIn('documenti.id', collect($suggestions)->pluck('documento.id'))
                ->orderBy('documenti.data_doc', 'desc')
                ->limit(5 - count($suggestions))
                ->get();

            foreach ($clientOnly as $doc) {
                $suggestions[] = [
                    'documento' => $doc,
                    'match_score' => 60,
                    'match_reason' => 'Cliente corrispondente'
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => $suggestions
        ]);
    }

    /**
     * Template HTML di default per PDF
     */
    private function getDefaultTemplate()
    {
        return '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Documento {{codice_doc}}/{{numero_doc}}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    font-size: 12px;
                    line-height: 1.4;
                    margin: 20px;
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 30px; 
                    border-bottom: 2px solid #333;
                    padding-bottom: 20px;
                }
                .header h1 {
                    color: #333;
                    margin: 0 0 10px 0;
                }
                .info-section { 
                    margin-bottom: 25px; 
                    padding: 15px;
                    background-color: #f9f9f9;
                    border-left: 4px solid #007bff;
                }
                .info-section h3 {
                    margin: 0 0 10px 0;
                    color: #333;
                }
                .righe table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 20px;
                }
                .righe th, .righe td { 
                    border: 1px solid #ddd; 
                    padding: 8px; 
                    text-align: left;
                }
                .righe th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                }
                .totale {
                    text-align: right;
                    margin-top: 20px;
                    padding: 15px;
                    background-color: #e9ecef;
                    border: 1px solid #dee2e6;
                }
                .totale h3 {
                    margin: 0;
                    color: #28a745;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Documento {{codice_doc}}/{{numero_doc}}</h1>
                <p><strong>Data:</strong> {{data_doc}}</p>
            </div>
            
            <div class="info-section">
                <h3>Informazioni Cliente</h3>
                <p><strong>Cliente:</strong> {{cliente_nome}}</p>
                <p><strong>Telefono:</strong> {{cliente_telefono}}</p>
            </div>

            <div class="info-section">
                <h3>Informazioni Consegna</h3>
                <p><strong>Sede:</strong> {{sede_nome}}</p>
                <p><strong>Indirizzo:</strong> {{sede_indirizzo}}</p>
                <p><strong>Autista:</strong> {{autista_nome}} {{autista_cognome}}</p>
            </div>
            
            <div class="righe">
                <h3>Dettaglio Righe</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Articolo</th>
                            <th>Descrizione</th>
                            <th>Quantità</th>
                            <th>Prezzo Unit.</th>
                            <th>Sconto</th>
                            <th>Totale Riga</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{righe}}
                    </tbody>
                </table>
            </div>
            
            <div class="totale">
                <h3>Totale Documento: €{{totale_doc}}</h3>
            </div>
        </body>
        </html>';
    }

    /**
     * Sostituisce i placeholder nel template
     */
    private function replacePlaceholders($template, $documento, $righe)
    {
        // Placeholder documento con tutti i campi della specifica API Arca
        $replacements = [
            // Dati documento base
            '{{codice_doc}}' => $documento->codice_doc ?? '',
            '{{numero_doc}}' => $documento->numero_doc ?? '',
            '{{data_doc}}' => $documento->data_doc ? date('d/m/Y', strtotime($documento->data_doc)) : '',
            '{{numero_doc_rif}}' => $documento->numero_doc_rif ?? '',
            '{{data_doc_rif}}' => $documento->data_doc_rif ? date('d/m/Y', strtotime($documento->data_doc_rif)) : '',
            '{{data_consegna}}' => $documento->data_consegna ? date('d/m/Y', strtotime($documento->data_consegna)) : '',
            
            // Agenti
            '{{agente1}}' => $documento->agente1 ?? '',
            '{{agente2}}' => $documento->agente2 ?? '',
            
            // Dati cliente (da relazione Eloquent o fallback legacy)
            '{{cliente_nome}}' => $documento->cliente->name ?? $documento->client_name ?? 'N/A',
            '{{cliente_telefono}}' => $documento->cliente->phone ?? $documento->client_phone ?? 'N/A',
            '{{cliente_indirizzo}}' => $documento->cliente->address ?? 'N/A',
            '{{cliente_citta}}' => $documento->cliente->city ?? 'N/A',
            '{{cliente_cap}}' => $documento->cliente->postal_code ?? 'N/A',
            '{{cliente_provincia}}' => $documento->cliente->province ?? 'N/A',
            '{{cliente_email}}' => $documento->cliente->email ?? 'N/A',
            '{{cliente_piva}}' => $documento->cliente->vat_number ?? 'N/A',
            '{{cliente_cf}}' => $documento->cliente->fiscal_code ?? 'N/A',
            
            // Dati sede (da relazione Eloquent o fallback legacy)
            '{{sede_nome}}' => $documento->sede->name ?? $documento->site_name ?? 'N/A',
            '{{sede_indirizzo}}' => $documento->sede->address ?? $documento->site_address ?? 'N/A',
            '{{sede_citta}}' => $documento->sede->city ?? 'N/A',
            '{{sede_cap}}' => $documento->sede->postal_code ?? 'N/A',
            '{{sede_provincia}}' => $documento->sede->province ?? 'N/A',
            
            // Dati autista (da relazione Eloquent o fallback legacy)
            '{{autista_nome}}' => $documento->autista->name ?? $documento->driver_name ?? '',
            '{{autista_cognome}}' => $documento->autista->surname ?? $documento->driver_surname ?? '',
            '{{autista_email}}' => $documento->autista->email ?? '',
            
            // Totali documento con tutti i campi della specifica API Arca
            '{{totale_imponibile_doc}}' => number_format($documento->totale_imponibile_doc ?? 0, 2, ',', '.'),
            '{{totale_imposta_doc}}' => number_format($documento->totale_imposta_doc ?? 0, 2, ',', '.'),
            '{{totale_sconto_doc}}' => number_format($documento->totale_sconto_doc ?? 0, 2, ',', '.'),
            '{{totale_doc}}' => number_format($documento->totale_doc ?? 0, 2, ',', '.')
        ];

        // Genera HTML righe
        $righeHtml = '';
        foreach ($righe as $riga) {
            $righeHtml .= '<tr>';
            $righeHtml .= '<td>' . ($riga->codice_articolo ?? '') . '</td>';
            $righeHtml .= '<td>' . ($riga->descrizione ?? '') . '</td>';
            $righeHtml .= '<td>' . ($riga->quantita ?? '') . '</td>';
            $righeHtml .= '<td>€' . number_format($riga->prezzo_unitario ?? 0, 2, ',', '.') . '</td>';
            $righeHtml .= '<td>' . ($riga->sconto ?? '') . '</td>';
            $righeHtml .= '<td>€' . number_format($riga->totale_riga ?? 0, 2, ',', '.') . '</td>';
            $righeHtml .= '</tr>';
        }

        $replacements['{{righe}}'] = $righeHtml;

        return str_replace(array_keys($replacements), array_values($replacements), $template);
    }

    /**
     * Recupera il nome dell'autista dal codice Arca
     */
    private function getDriverNameByCode($codiceArca)
    {
        if (empty($codiceArca)) {
            return null;
        }

        $driver = \App\Models\Driver::where('codice_arca', $codiceArca)->first();
        
        if ($driver) {
            return trim($driver->name . ' ' . $driver->surname);
        }

        return $codiceArca; // Fallback al codice se non trovato
    }

    /**
     * Sincronizzazione manuale documenti
     */
    public function syncDocumenti(Request $request)
    {
        try {
            // Imposta il tempo massimo di esecuzione a 10 minuti
            set_time_limit(600);
            
            // Esegue il comando di sincronizzazione
            \Artisan::call('arca:sync-documenti', [
                '--giorni' => $request->input('giorni', 7),
                '--retry' => 3
            ]);
            
            $output = \Artisan::output();
            
            // Estrai i numeri effettivi dall'output del comando
            $documentiSincronizzati = 0;
            $righeSincronizzate = 0;
            
            if (preg_match('/📄 Documenti sincronizzati: (\d+)/', $output, $matches)) {
                $documentiSincronizzati = (int) $matches[1];
            }
            
            if (preg_match('/📋 Righe documento sincronizzate: (\d+)/', $output, $matches)) {
                $righeSincronizzate = (int) $matches[1];
            }
            
            // Conta anche i totali nel database per informazione
            $totaleDocs = \App\Models\Documento::count();
            $totaleRighe = DB::table('righe_documento')->count();
            
            return response()->json([
                'success' => true,
                'message' => 'Sincronizzazione completata con successo',
                'data' => [
                    'documenti' => $documentiSincronizzati, // Documenti sincronizzati
                    'righe' => $righeSincronizzate, // Righe sincronizzate
                    'totale_documenti' => $totaleDocs, // Totale documenti nel DB
                    'totale_righe' => $totaleRighe, // Totale righe nel DB
                    'output' => $output
                ]
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Errore sincronizzazione documenti: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Errore durante la sincronizzazione: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Riempie il PDF template con i dati del documento
     */
    private function fillWordTemplate($templatePath, $documento, $righe)
    {
        try {
            // Imposta la locale italiana per Carbon
            \Carbon\Carbon::setLocale('it');
            
            // Carica il template Word
            $templateProcessor = new \PhpOffice\PhpWord\TemplateProcessor($templatePath);
            
            \Log::info('🔍 Template Word caricato', [
                'template_path' => $templatePath,
                'documento_id' => $documento->id,
                'variables' => $templateProcessor->getVariables() // Vede i placeholder nel template
            ]);
            
            // Sostituisce i placeholder del documento (formato PhpWord: ${NOME_CAMPO})
            $templateProcessor->setValue('CODICE_DOC', $documento->codice_doc ?? 'Non disponibile');
            $templateProcessor->setValue('NUMERO_DOC', $documento->numero_doc ?? 'Non disponibile');
            $templateProcessor->setValue('DATA_DOC', $documento->data_doc ? \Carbon\Carbon::parse($documento->data_doc)->locale('it')->format('d/m/Y') : 'Non disponibile');
            $templateProcessor->setValue('DATA_CONSEGNA', $documento->data_consegna ? \Carbon\Carbon::parse($documento->data_consegna)->locale('it')->format('d/m/Y') : 'Non disponibile');
            
            \Log::info('\u2705 Placeholder sostituiti', [
                'codice_doc' => $documento->codice_doc,
                'numero_doc' => $documento->numero_doc,
                'data_doc' => $documento->data_doc,
                'data_consegna' => $documento->data_consegna,
                'cliente' => $documento->cliente->name ?? 'N/A',
                'sede' => $documento->sede->name ?? 'N/A',
                'cliente_completo' => $documento->cliente,
                'sede_completa' => $documento->sede,
                'autista_completo' => $documento->autista,
                'prima_riga' => count($righe) > 0 ? $righe[0] : 'Nessuna riga'
            ]);
        
            // Cliente (usando i campi corretti dal database)
            $templateProcessor->setValue('NOME_CLIENTE', $documento->cliente->name ?? 'Cliente non specificato');
            $templateProcessor->setValue('CODICE_CLIENTE', $documento->cliente->codice_arca ?? '');
            $templateProcessor->setValue('TELEFONO_CLIENTE', $documento->cliente->phone ?? '');
            $templateProcessor->setValue('INDIRIZZO_CLIENTE', $documento->cliente->address ?? '');
            $templateProcessor->setValue('CITTA_CLIENTE', $documento->cliente->city ?? '');
            $templateProcessor->setValue('PROVINCIA_CLIENTE', $documento->cliente->province ?? '');
            $templateProcessor->setValue('CAP_CLIENTE', $documento->cliente->postal_code ?? ''); // Corretto: postal_code
            
            // Partita IVA del cliente (IMPORTANTE: non il codice IVA della riga!)
            $templateProcessor->setValue('PARTITA_IVA_CLIENTE', $documento->cliente->vat_number ?? '');
            
            // Indirizzo completo destinazione
            $indirizzoCompleto = ($documento->sede->address ?? '') . ', ' . 
                               ($documento->sede->city ?? '') . ' (' . 
                               ($documento->sede->province ?? '') . ') ' . 
                               ($documento->sede->postal_code ?? '');
            $templateProcessor->setValue('INDIRIZZO_COMPLETO_DESTINAZIONE', trim($indirizzoCompleto, ', '));
            
            // Documento
            $templateProcessor->setValue('CODICE_DOC', $documento->codice_doc ?? '');
            $templateProcessor->setValue('NUMERO_DOC_RIF', $documento->numero_doc ?? '');
            $templateProcessor->setValue('DATA_DOC_RIF', $documento->data_doc ? \Carbon\Carbon::parse($documento->data_doc)->format('d/m/Y') : '');
            
            // Agente/Autista
            $nomeAutista = '';
            if ($documento->autista) {
                $nomeAutista = trim(($documento->autista->name ?? '') . ' ' . ($documento->autista->surname ?? ''));
            }
            $templateProcessor->setValue('NOME_AGENTE1', $nomeAutista ?: 'Autista non specificato');
            
            // Gestione TUTTE le righe documento - Concatenazione in unico placeholder
            if (count($righe) > 0) {
                \Log::info('📝 Gestione ' . count($righe) . ' righe documento con concatenazione');
                
                // Crea stringa con tutte le righe formattate
                $tutteLeRighe = '';
                $dataConsegnaGlobale = $documento->data_consegna ?? $documento->data_doc;
                $dataConsegnaFormatted = $dataConsegnaGlobale ? \Carbon\Carbon::parse($dataConsegnaGlobale)->format('d/m/Y') : '';
                
                foreach ($righe as $index => $riga) {
                    $numeroRiga = $index + 1;
                    
                    // Formatta ogni riga come testo
                    $rigaFormattata = sprintf(
                        "%d. %s - %s\n" .
                        "   Codice: %s | Unità: %s | Quantità: %s | Prezzo: %s € | Totale: %s €\n" .
                        "   Data consegna: %s | IVA: %s\n\n",
                        $numeroRiga,
                        $riga->codice_articolo ?? 'N/A',
                        $riga->descrizione ?? 'Descrizione non disponibile',
                        $riga->codice_articolo ?? '',
                        $riga->unita ?? 'PZ',
                        number_format($riga->quantita ?? 0, 2, ',', '.'),
                        number_format($riga->prezzo_unitario ?? 0, 2, ',', '.'),
                        number_format($riga->totale_riga ?? 0, 2, ',', '.'),
                        $dataConsegnaFormatted,
                        trim($riga->codice_iva ?? '') . '%'
                    );
                    
                    $tutteLeRighe .= $rigaFormattata;
                    
                    \Log::info('✅ Riga ' . $numeroRiga . ' aggiunta', [
                        'articolo' => $riga->codice_articolo,
                        'descrizione' => substr($riga->descrizione ?? '', 0, 50),
                        'quantita' => $riga->quantita
                    ]);
                }
                
                // Crea placeholder separati per ogni campo di tutte le righe
                $tuttiGliArticoli = '';
                $tutteLeDescrizioni = '';
                $tutteLeUnita = '';
                $tutteLeQuantita = '';
                $tuttiIPrezzi = '';
                $tuttiITotali = '';
                $tutteLeDataConsegna = '';
                $tuttiICodiciIva = '';
                
                foreach ($righe as $index => $riga) {
                    $numeroRiga = $index + 1;
                    
                    // Concatena ogni campo separatamente
                    $tuttiGliArticoli .= ($riga->codice_articolo ?? '') . "\n";
                    $tutteLeDescrizioni .= ($riga->descrizione ?? '') . "\n";
                    $tutteLeUnita .= ($riga->unita ?? 'PZ') . "\n";
                    $tutteLeQuantita .= number_format($riga->quantita ?? 0, 2, ',', '.') . "\n";
                    $tuttiIPrezzi .= number_format($riga->prezzo_unitario ?? 0, 2, ',', '.') . " €\n";
                    $tuttiITotali .= number_format($riga->totale_riga ?? 0, 2, ',', '.') . " €\n";
                    $tutteLeDataConsegna .= $dataConsegnaFormatted . "\n";
                    $tuttiICodiciIva .= trim($riga->codice_iva ?? '') . "%\n";
                }
                
                // Crea anche formato tabulare per mantenere allineamento
                $righeTabellari = '';
                foreach ($righe as $index => $riga) {
                    $numeroRiga = $index + 1;
                    
                    // Formato tabulare con spaziatura fissa
                    $righeTabellari .= sprintf(
                        "%-15s | %-40s | %-8s | %10s | %12s | %12s\n",
                        substr($riga->codice_articolo ?? '', 0, 15),
                        substr($riga->descrizione ?? '', 0, 40),
                        $riga->unita ?? 'PZ',
                        number_format($riga->quantita ?? 0, 2, ',', '.'),
                        number_format($riga->prezzo_unitario ?? 0, 2, ',', '.') . ' €',
                        number_format($riga->totale_riga ?? 0, 2, ',', '.') . ' €'
                    );
                }
                
                // Sostituisce i placeholder separati
                $templateProcessor->setValue('TUTTE_LE_RIGHE_ARTICOLO', trim($tuttiGliArticoli));
                $templateProcessor->setValue('TUTTE_LE_RIGHE_DESCRIZIONE', trim($tutteLeDescrizioni));
                $templateProcessor->setValue('TUTTE_LE_RIGHE_UNITA', trim($tutteLeUnita));
                $templateProcessor->setValue('TUTTE_LE_RIGHE_QUANTITA', trim($tutteLeQuantita));
                $templateProcessor->setValue('TUTTE_LE_RIGHE_PREZZO', trim($tuttiIPrezzi));
                $templateProcessor->setValue('TUTTE_LE_RIGHE_TOTALE', trim($tuttiITotali));
                $templateProcessor->setValue('TUTTE_LE_RIGHE_DATA_CONSEGNA', trim($tutteLeDataConsegna));
                $templateProcessor->setValue('TUTTE_LE_RIGHE_CODICE_IVA', trim($tuttiICodiciIva));
                
                // Placeholder tabulare per layout stabile
                $templateProcessor->setValue('TUTTE_LE_RIGHE_TABELLA', trim($righeTabellari));
                
                // Sostituisce anche il placeholder completo per compatibilità
                $templateProcessor->setValue('TUTTE_LE_RIGHE', $tutteLeRighe);
                
                // Mantieni anche i placeholder della prima riga per compatibilità
                $primaRiga = $righe[0];
                $templateProcessor->setValue('RIGA_ARTICOLO', $primaRiga->codice_articolo ?? '');
                $templateProcessor->setValue('RIGA_DESCRIZIONE', $primaRiga->descrizione ?? '');
                $templateProcessor->setValue('RIGA_UNITA', $primaRiga->unita ?? '');
                $templateProcessor->setValue('RIGA_QUANTITA', number_format($primaRiga->quantita ?? 0, 2, ',', '.'));
                $templateProcessor->setValue('RIGA_PREZZO', number_format($primaRiga->prezzo_unitario ?? 0, 2, ',', '.') . ' €');
                $templateProcessor->setValue('RIGA_TOTALE', number_format($primaRiga->totale_riga ?? 0, 2, ',', '.') . ' €');
                $templateProcessor->setValue('RIGA_DATA_CONSEGNA', $dataConsegnaFormatted);
                $templateProcessor->setValue('RIGA_CODICE_IVA', trim($primaRiga->codice_iva ?? '') . '%');
                
                \Log::info('🎉 Tutte le righe concatenate in TUTTE_LE_RIGHE', [
                    'numero_righe' => count($righe),
                    'lunghezza_testo' => strlen($tutteLeRighe)
                ]);
            }
            
            // Salva il documento Word processato in un file temporaneo
            $tempWordPath = tempnam(sys_get_temp_dir(), 'documento_') . '.docx';
            $templateProcessor->saveAs($tempWordPath);
            
            \Log::info('💾 File Word salvato temporaneamente', [
                'temp_path' => $tempWordPath,
                'file_size' => filesize($tempWordPath)
            ]);
            
            // RESTITUISCE DIRETTAMENTE IL WORD PROCESSATO (rispetta il template dell'utente)
            \Log::info('✅ Template Word processato con successo, restituisco il file Word originale');
            
            // Leggi il contenuto del Word processato
            $wordContent = file_get_contents($tempWordPath);
            
            // Pulisci il file temporaneo
            unlink($tempWordPath);
            
            return $wordContent;
            
        } catch (\Exception $e) {
            \Log::error('❌ Errore nel processamento template Word', [
                'error' => $e->getMessage(),
                'template_path' => $templatePath,
                'documento_id' => $documento->id ?? 'N/A'
            ]);
            
            // In caso di errore, restituisce il template originale
            return file_get_contents($templatePath);
        }
    }
    
    /**
     * Converte un file Word in PDF mantenendo il layout esatto del template
     */
    private function convertWordToPdfWithLayout($wordPath, $documento = null, $righe = [])
    {
        \Log::info('🔄 Inizio conversione Word→PDF con LibreOffice');
        
        try {
            // Path per il PDF di output
            $outputDir = sys_get_temp_dir();
            $pdfPath = $outputDir . '/' . basename($wordPath, '.docx') . '.pdf';
            
            // Comando LibreOffice per convertire Word in PDF mantenendo layout
            $command = "soffice --headless --convert-to pdf --outdir '{$outputDir}' '{$wordPath}' 2>&1";
            
            \Log::info('💻 Esecuzione comando LibreOffice', ['command' => $command]);
            
            // Esegui la conversione
            $output = shell_exec($command);
            
            \Log::info('📝 Output LibreOffice', ['output' => $output]);
            
            // Verifica che il PDF sia stato creato
            if (!file_exists($pdfPath)) {
                throw new \Exception('LibreOffice non ha creato il file PDF: ' . $pdfPath);
            }
            
            // Leggi il contenuto del PDF
            $pdfContent = file_get_contents($pdfPath);
            
            // Pulisci il file PDF temporaneo
            unlink($pdfPath);
            
            \Log::info('✅ Conversione Word→PDF completata con LibreOffice');
            
            return $pdfContent;
            
        } catch (\Exception $e) {
            \Log::error('❌ Errore conversione LibreOffice, fallback a DomPDF', ['error' => $e->getMessage()]);
            
            // Fallback: usa il metodo DomPDF esistente
            return $this->convertWordToPdf($wordPath, $documento, $righe);
        }
    }
    
    /**
     * Converte un file Word in PDF usando DomPDF con template semplificato (FALLBACK)
     */
    private function convertWordToPdf($wordPath, $documento, $righe)
    {
        \Log::info('🔄 Fallback: generazione PDF con template HTML semplificato');
        
        // Crea HTML semplificato con i dati del documento
        $html = $this->createSimplePdfTemplate($documento, $righe);
        
        // Usa DomPDF per convertire HTML in PDF
        $dompdf = new \Dompdf\Dompdf();
        $dompdf->getOptions()->setChroot(public_path());
        $dompdf->getOptions()->setIsRemoteEnabled(true);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();
        
        \Log::info('✅ PDF generato con template semplificato');
        
        return $dompdf->output();
    }
    
    /**
     * Crea un template HTML semplificato per la generazione PDF
     */
    private function createSimplePdfTemplate($documento, $righe)
    {
        $cliente = $documento->cliente ?? null;
        $destinazione = $documento->destinazione ?? null;
        $autista = $documento->autista ?? null;
        
        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Documento</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; }
        .header { text-align: center; margin-bottom: 20px; }
        .info-row { margin: 5px 0; }
        .label { font-weight: bold; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        .table th { background-color: #f5f5f5; }
        .totals { margin-top: 20px; text-align: right; }
    </style>
</head>
<body>';
        
        // Header
        $html .= '<div class="header">';
        $html .= '<h2>DOCUMENTO DI TRASPORTO</h2>';
        $html .= '<div class="info-row"><span class="label">Numero:</span> ' . ($documento->numero_doc ?? 'N/A') . '</div>';
        $html .= '<div class="info-row"><span class="label">Data:</span> ' . ($documento->data_doc ? date('d/m/Y', strtotime($documento->data_doc)) : 'N/A') . '</div>';
        $html .= '</div>';
        
        // Cliente
        if ($cliente) {
            $html .= '<div class="info-row"><span class="label">Cliente:</span> ' . ($cliente->name ?? 'N/A') . '</div>';
            $html .= '<div class="info-row"><span class="label">Telefono:</span> ' . ($cliente->phone ?? 'N/A') . '</div>';
        }
        
        // Destinazione
        if ($destinazione) {
            $html .= '<div class="info-row"><span class="label">Destinazione:</span> ' . ($destinazione->name ?? 'N/A') . '</div>';
            $html .= '<div class="info-row"><span class="label">Indirizzo:</span> ' . ($destinazione->address ?? 'N/A') . '</div>';
        }
        
        // Autista
        if ($autista) {
            $html .= '<div class="info-row"><span class="label">Autista:</span> ' . ($autista->nome ?? 'N/A') . ' ' . ($autista->cognome ?? '') . '</div>';
        }
        
        // Tabella righe
        if (!empty($righe)) {
            $html .= '<table class="table">';
            $html .= '<thead><tr><th>Articolo</th><th>Descrizione</th><th>Quantità</th><th>Prezzo</th><th>Totale</th></tr></thead>';
            $html .= '<tbody>';
            
            foreach ($righe as $riga) {
                $html .= '<tr>';
                $html .= '<td>' . ($riga->articolo ?? 'N/A') . '</td>';
                $html .= '<td>' . ($riga->descrizione ?? 'N/A') . '</td>';
                $html .= '<td>' . ($riga->quantita ?? '0') . '</td>';
                $html .= '<td>€ ' . number_format($riga->prezzo ?? 0, 2) . '</td>';
                $html .= '<td>€ ' . number_format($riga->totale ?? 0, 2) . '</td>';
                $html .= '</tr>';
            }
            
            $html .= '</tbody></table>';
        }
        
        // Totali
        $html .= '<div class="totals">';
        $html .= '<div class="info-row"><span class="label">Totale Documento:</span> € ' . number_format($documento->totale ?? 0, 2) . '</div>';
        $html .= '</div>';
        
        $html .= '</body></html>';
        
        return $html;
    }
    
    /**
     * Estrae HTML dal Word preservando il layout del template
     */
    private function extractHtmlFromWord($wordPath, $documento, $righe)
    {
        \Log::info('📋 Estrazione HTML da Word con layout template');
        
        // Per ora usa il metodo semplificato ma con stili migliorati
        // In futuro si può implementare una conversione più sofisticata
        return $this->createEnhancedHtmlFromWordData($documento, $righe);
    }
    
    /**
     * Crea HTML migliorato dai dati del documento per la conversione PDF
     */
    private function createEnhancedHtmlFromWordData($documento, $righe)
    {
        $dataConsegnaGlobale = $documento->data_consegna ?? $documento->data_doc;
        $dataConsegnaFormatted = $dataConsegnaGlobale ? \Carbon\Carbon::parse($dataConsegnaGlobale)->format('d/m/Y') : '';
        
        // Crea HTML con stili che rispettano il template
        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Documento ' . ($documento->codice_doc ?? '') . ' #' . ($documento->numero_doc ?? '') . '</title>
            <style>
                @page { 
                    margin: 2cm; 
                    size: A4;
                }
                body { 
                    font-family: Arial, sans-serif; 
                    font-size: 11pt; 
                    line-height: 1.3;
                    color: #000;
                    margin: 0;
                    padding: 0;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #000;
                    padding-bottom: 15px;
                }
                .company-name {
                    font-size: 18pt;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                .document-title {
                    font-size: 14pt;
                    font-weight: bold;
                    margin: 20px 0;
                }
                .info-section {
                    margin: 15px 0;
                }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 5px 0;
                }
                .label {
                    font-weight: bold;
                    width: 30%;
                }
                .value {
                    width: 65%;
                }
                .table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                .table th, .table td {
                    border: 1px solid #000;
                    padding: 8px;
                    text-align: left;
                }
                .table th {
                    background-color: #f0f0f0;
                    font-weight: bold;
                }
                .totals {
                    margin-top: 20px;
                    text-align: right;
                }
                .total-row {
                    margin: 5px 0;
                }
                .final-total {
                    font-size: 12pt;
                    font-weight: bold;
                    border-top: 2px solid #000;
                    padding-top: 10px;
                }
            </style>
        </head>
        <body>';
        
        // Header con nome azienda
        $html .= '
            <div class="header">
                <div class="company-name">AZIENDA TRASPORTI</div>
                <div class="document-title">DOCUMENTO DI TRASPORTO</div>
            </div>';
        
        // Informazioni documento
        $html .= '
            <div class="info-section">
                <div class="info-row">
                    <span class="label">Numero Documento:</span>
                    <span class="value">' . ($documento->codice_doc ?? '') . ' #' . ($documento->numero_doc ?? '') . '</span>
                </div>
                <div class="info-row">
                    <span class="label">Data Documento:</span>
                    <span class="value">' . ($documento->data_doc ? \Carbon\Carbon::parse($documento->data_doc)->format('d/m/Y') : '') . '</span>
                </div>
                <div class="info-row">
                    <span class="label">Data Trasporto:</span>
                    <span class="value">' . $dataConsegnaFormatted . '</span>
                </div>
            </div>';
        
        // Informazioni cliente
        $cliente = $documento->cliente;
        if ($cliente) {
            $html .= '
                <div class="info-section">
                    <div class="info-row">
                        <span class="label">Cliente:</span>
                        <span class="value">' . ($cliente->name ?? '') . '</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Indirizzo:</span>
                        <span class="value">' . ($cliente->address ?? '') . '</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Città:</span>
                        <span class="value">' . ($cliente->city ?? '') . ' (' . ($cliente->province ?? '') . ') ' . ($cliente->postal_code ?? '') . '</span>
                    </div>
                    <div class="info-row">
                        <span class="label">P.IVA:</span>
                        <span class="value">' . ($cliente->vat_number ?? '') . '</span>
                    </div>
                </div>';
        }
        
        // Informazioni destinazione
        $destinazione = $documento->destinazione;
        if ($destinazione) {
            $html .= '
                <div class="info-section">
                    <div class="info-row">
                        <span class="label">Destinazione:</span>
                        <span class="value">' . ($destinazione->name ?? '') . '</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Indirizzo Destinazione:</span>
                        <span class="value">' . ($destinazione->address ?? '') . ', ' . ($destinazione->city ?? '') . '</span>
                    </div>
                </div>';
        }
        
        // Tabella righe
        if (!empty($righe)) {
            $html .= '
                <table class="table">
                    <thead>
                        <tr>
                            <th>Articolo</th>
                            <th>Descrizione</th>
                            <th>Unità</th>
                            <th>Quantità</th>
                            <th>Prezzo Unit.</th>
                            <th>Totale</th>
                        </tr>
                    </thead>
                    <tbody>';
            
            foreach ($righe as $riga) {
                $html .= '
                        <tr>
                            <td>' . ($riga->codice_articolo ?? '') . '</td>
                            <td>' . ($riga->descrizione ?? '') . '</td>
                            <td>' . ($riga->unita ?? '') . '</td>
                            <td>' . number_format($riga->quantita ?? 0, 2, ',', '.') . '</td>
                            <td>€ ' . number_format($riga->prezzo_unitario ?? 0, 2, ',', '.') . '</td>
                            <td>€ ' . number_format($riga->totale_riga ?? 0, 2, ',', '.') . '</td>
                        </tr>';
            }
            
            $html .= '
                    </tbody>
                </table>';
        }
        
        // Totali
        $html .= '
            <div class="totals">
                <div class="total-row">Imponibile: € ' . number_format($documento->imponibile ?? 0, 2, ',', '.') . '</div>
                <div class="total-row">IVA: € ' . number_format($documento->iva ?? 0, 2, ',', '.') . '</div>
                <div class="total-row final-total">TOTALE: € ' . number_format($documento->totale_doc ?? 0, 2, ',', '.') . '</div>
            </div>';
        
        // Informazioni autista
        $autista = $documento->autista;
        if ($autista) {
            $html .= '
                <div class="info-section" style="margin-top: 30px; border-top: 1px solid #ccc; padding-top: 15px;">
                    <div class="info-row">
                        <span class="label">Autista:</span>
                        <span class="value">' . ($autista->name ?? '') . ' ' . ($autista->surname ?? '') . '</span>
                    </div>
                </div>';
        }
        
        $html .= '
        </body>
        </html>';
        
        return $html;
    }
    
    /**
     * Crea HTML dai dati del documento per la conversione PDF (metodo originale)
     */
    private function createHtmlFromWordData($documento, $righe)
    {
        $dataConsegnaGlobale = $documento->data_consegna ?? $documento->data_doc;
        $dataConsegnaFormatted = $dataConsegnaGlobale ? \Carbon\Carbon::parse($dataConsegnaGlobale)->format('d/m/Y') : '';
        
        // Crea HTML strutturato
        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; font-size: 12px; }
                .header { text-align: center; margin-bottom: 20px; }
                .info-section { margin-bottom: 15px; }
                .label { font-weight: bold; }
                .righe-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .righe-table th, .righe-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                .righe-table th { background-color: #f5f5f5; }
                .totali { margin-top: 20px; text-align: right; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>' . ($documento->codice_doc ?? '') . ' #' . ($documento->numero_doc ?? '') . '</h2>
                <p>Data: ' . ($documento->data_doc ? \Carbon\Carbon::parse($documento->data_doc)->format('d/m/Y') : '') . '</p>
            </div>
            
            <div class="info-section">
                <p><span class="label">Cliente:</span> ' . ($documento->cliente->name ?? '') . '</p>
                <p><span class="label">Partita IVA:</span> ' . ($documento->cliente->vat_number ?? '') . '</p>
                <p><span class="label">Destinazione:</span> ' . ($documento->sede->name ?? '') . '</p>
                <p><span class="label">Indirizzo:</span> ' . ($documento->sede->address ?? '') . ', ' . ($documento->sede->city ?? '') . '</p>
                <p><span class="label">Autista:</span> ' . (($documento->autista->name ?? '') . ' ' . ($documento->autista->surname ?? '')) . '</p>
                <p><span class="label">Data consegna:</span> ' . $dataConsegnaFormatted . '</p>
            </div>
            
            <table class="righe-table">
                <thead>
                    <tr>
                        <th>Articolo</th>
                        <th>Descrizione</th>
                        <th>Unità</th>
                        <th>Quantità</th>
                        <th>Prezzo</th>
                        <th>Totale</th>
                        <th>IVA</th>
                    </tr>
                </thead>
                <tbody>';
        
        // Aggiungi le righe
        foreach ($righe as $riga) {
            $html .= '
                    <tr>
                        <td>' . ($riga->codice_articolo ?? '') . '</td>
                        <td>' . ($riga->descrizione ?? '') . '</td>
                        <td>' . ($riga->unita ?? 'PZ') . '</td>
                        <td>' . number_format($riga->quantita ?? 0, 2, ',', '.') . '</td>
                        <td>' . number_format($riga->prezzo_unitario ?? 0, 2, ',', '.') . ' €</td>
                        <td>' . number_format($riga->totale_riga ?? 0, 2, ',', '.') . ' €</td>
                        <td>' . trim($riga->codice_iva ?? '') . '%</td>
                    </tr>';
        }
        
        $html .= '
                </tbody>
            </table>
            
            <div class="totali">
                <p><span class="label">Totale documento:</span> ' . number_format($documento->totale_doc ?? 0, 2, ',', '.') . ' €</p>
            </div>
        </body>
        </html>';
        
        return $html;
    }

    /**
     * Suggerisce documenti allegabili per un'attività in base a cliente e data
     */
    public function suggestDocumentsForActivity(Request $request)
    {
        try {
            $clientId = $request->input('client_id');
            $dataInizio = $request->input('data_inizio'); // formato Y-m-d
            
            \Log::info('🔍 suggestDocumentsForActivity chiamata', [
                'client_id' => $clientId,
                'data_inizio' => $dataInizio,
                'request_all' => $request->all()
            ]);
            
            // Validazione parametri (solo cliente e data sono obbligatori)
            if (!$clientId || !$dataInizio) {
                \Log::warning('❌ Parametri mancanti per suggerimento documenti', [
                    'client_id' => $clientId,
                    'data_inizio' => $dataInizio
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Parametri mancanti: client_id e data_inizio sono obbligatori'
                ], 400);
            }

            // Converti la data in formato Carbon per confronti
            $dataAttivita = \Carbon\Carbon::parse($dataInizio);
            \Log::info('📅 Data attività parsata', [
                'data_originale' => $dataInizio,
                'data_carbon' => $dataAttivita->format('Y-m-d H:i:s')
            ]);
            
            // Prima verifica: quanti documenti ci sono per questo cliente?
            $totalDocumentiCliente = Documento::where('client_id', $clientId)->count();
            \Log::info('📊 Documenti totali per cliente', [
                'client_id' => $clientId,
                'totale_documenti' => $totalDocumentiCliente
            ]);
            
            // Query per trovare documenti corrispondenti (solo cliente, non più destinazione)
            $query = Documento::with(['cliente', 'sede', 'autista'])
                ->where('client_id', $clientId);
            
            // Cerca documenti nella stessa data o in un range di ±7 giorni
            // IMPORTANTE: Usa data_consegna se presente, altrimenti data_doc come fallback
            $dataMin = $dataAttivita->copy()->subDays(7);
            $dataMax = $dataAttivita->copy()->addDays(7);
            
            \Log::info('📅 Range date per ricerca (data_consegna con fallback data_doc)', [
                'data_min' => $dataMin->format('Y-m-d'),
                'data_max' => $dataMax->format('Y-m-d'),
                'data_attivita' => $dataAttivita->format('Y-m-d'),
                'strategia' => 'data_consegna se presente, altrimenti data_doc'
            ]);
            
            // Query con fallback: usa data_consegna se non è null, altrimenti data_doc
            $query->where(function($q) use ($dataMin, $dataMax) {
                $q->where(function($subQ) use ($dataMin, $dataMax) {
                    // Caso 1: data_consegna non è null e nel range
                    $subQ->whereNotNull('data_consegna')
                         ->whereBetween('data_consegna', [$dataMin->format('Y-m-d'), $dataMax->format('Y-m-d')]);
                })->orWhere(function($subQ) use ($dataMin, $dataMax) {
                    // Caso 2: data_consegna è null, usa data_doc nel range
                    $subQ->whereNull('data_consegna')
                         ->whereBetween('data_doc', [$dataMin->format('Y-m-d'), $dataMax->format('Y-m-d')]);
                });
            });
            
            // Debug: esegui query e conta risultati
            $documentiCount = $query->count();
            \Log::info('🔍 Risultati query documenti', [
                'documenti_trovati' => $documentiCount,
                'sql_query' => $query->toSql(),
                'bindings' => $query->getBindings()
            ]);
            
            // Ordina per priorità: prima data esatta, poi più vicine
            $documenti = $query->get()->map(function ($documento) use ($dataAttivita) {
                // Calcola la differenza in giorni dalla data dell'attività
                // USA data_consegna se presente, altrimenti data_doc come fallback
                $dataRiferimento = $documento->data_consegna ?? $documento->data_doc;
                $dataConsegna = \Carbon\Carbon::parse($dataRiferimento);
                $giorniDifferenza = abs($dataAttivita->diffInDays($dataConsegna));
                
                // Priorità: 0 = data esatta, poi crescente per giorni di distanza
                $priorita = $giorniDifferenza === 0 ? 0 : $giorniDifferenza + 100;
                
                return [
                    'id' => $documento->id,
                    'codice_doc' => $documento->codice_doc,
                    'numero_doc' => $documento->numero_doc,
                    'data_doc' => $documento->data_doc, // Data emissione (per info)
                    'data_consegna' => $documento->data_consegna, // Data trasporto (per matching)
                    'giorni_differenza' => $giorniDifferenza,
                    'priorita' => $priorita,
                    'data_esatta' => $giorniDifferenza === 0,
                    'cliente' => $documento->cliente ? [
                        'id' => $documento->cliente->id,
                        'name' => $documento->cliente->name,
                        'codice_arca' => $documento->cliente->codice_arca
                    ] : null,
                    'destinazione' => $documento->sede ? [
                        'id' => $documento->sede->id,
                        'name' => $documento->sede->name,
                        'address' => $documento->sede->address,
                        'city' => $documento->sede->city,
                        'province' => $documento->sede->province,
                        'codice_arca' => $documento->sede->codice_arca
                    ] : null,
                    'totale_doc' => $documento->totale_doc,
                    'match_score' => $this->calculateMatchScore($documento, $dataAttivita)
                ];
            })
            // Ordina per priorità: prima documenti data esatta (priorità 0), poi per vicinanza
            ->sortBy(['priorita', 'giorni_differenza'])
            ->take(10); // Aumentiamo a 10 per mostrare più opzioni
            
            \Log::info('\u2705 Risultato finale suggerimento documenti', [
                'documenti_processati' => $documenti->count(),
                'documenti_finali' => $documenti->values()->all(),
                'client_id' => $clientId,
                'data_attivita' => $dataAttivita->format('Y-m-d')
            ]);
            
            return response()->json([
                'success' => true,
                'data' => $documenti->values()->all(),
                'message' => count($documenti) > 0 ? 
                    'Trovati ' . count($documenti) . ' documenti suggeriti' : 
                    'Nessun documento trovato per i criteri specificati'
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Errore nel suggerimento documenti per attività: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Errore interno del server'
            ], 500);
        }
    }
    
    /**
     * Calcola un punteggio di corrispondenza per il documento
     */
    private function calculateMatchScore($documento, $dataAttivita)
    {
        $score = 100; // Punteggio base
        
        // Penalizza in base alla distanza temporale
        $dataDoc = \Carbon\Carbon::parse($documento->data_doc);
        $giorniDifferenza = abs($dataAttivita->diffInDays($dataDoc));
        
        if ($giorniDifferenza == 0) {
            $score += 50; // Bonus per stessa data
        } else {
            $score -= ($giorniDifferenza * 5); // Penalità per ogni giorno di distanza
        }
        
        // Bonus per documenti con totale più alto (presumibilmente più importanti)
        if ($documento->totale_doc > 1000) {
            $score += 20;
        } elseif ($documento->totale_doc > 500) {
            $score += 10;
        }
        
        return max(0, $score); // Non andare sotto zero
    }
}
