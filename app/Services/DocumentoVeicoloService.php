<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\DocumentoVeicolo;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Response;
use Exception;

class DocumentoVeicoloService
{
    /**
     * Carica un nuovo documento per un veicolo
     *
     * @param string $veicoloId
     * @param string $categoria
     * @param UploadedFile $file
     * @param string|null $descrizione
     * @param string|null $dataScadenza
     * @return DocumentoVeicolo|null
     */
    public function uploadDocumento(string $veicoloId, string $categoria, UploadedFile $file, ?string $descrizione = null, ?string $dataScadenza = null): ?DocumentoVeicolo
    {
        try {
            $path = "veicoli/{$veicoloId}/documenti/";
            $filename = Str::uuid()->toString() . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs($path, $filename, 'local');

            $documento = DocumentoVeicolo::create([
                'veicolo_id' => $veicoloId,
                'categoria' => $categoria,
                'file_path' => $filePath,
                'descrizione' => $descrizione,
                'data_scadenza' => $dataScadenza,
            ]);
            return $documento;
        } catch (Exception $e) {
            Log::error('Errore upload documento veicolo', [
                'veicolo_id' => $veicoloId,
                'categoria' => $categoria,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Elimina un documento (soft delete + elimina file fisico)
     */
    public function deleteDocumento(DocumentoVeicolo $documento): bool
    {
        try {
            if ($documento->file_path && Storage::disk('local')->exists($documento->file_path)) {
                Storage::disk('local')->delete($documento->file_path);
            }
            $documento->delete();
            return true;
        } catch (Exception $e) {
            Log::error('Errore eliminazione documento veicolo', [
                'documento_id' => $documento->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Restituisce il file per il download o la visualizzazione
     */
    public function downloadDocumento(DocumentoVeicolo $documento, bool $inline = false): ?Response
    {
        try {
            Log::info('Download documento richiesto', [
                'documento_id' => $documento->id,
                'inline' => $inline,
                'file_path' => $documento->file_path,
            ]);
            
            if (!$documento->file_path || !Storage::disk('local')->exists($documento->file_path)) {
                Log::warning('File documento non trovato in Storage', [
                    'documento_id' => $documento->id,
                    'file_path' => $documento->file_path,
                ]);
                return null;
            }
            
            $filePath = Storage::disk('local')->path($documento->file_path);
            Log::info('Percorso file calcolato', [
                'documento_id' => $documento->id,
                'file_path' => $documento->file_path,
                'absolute_path' => $filePath,
                'file_exists' => file_exists($filePath),
                'is_readable' => is_readable($filePath),
            ]);
            
            // Verifica che il file esista fisicamente
            if (!file_exists($filePath)) {
                Log::error('File documento non trovato sul filesystem', [
                    'documento_id' => $documento->id,
                    'file_path' => $documento->file_path,
                    'absolute_path' => $filePath,
                ]);
                return null;
            }
            
            if (!is_readable($filePath)) {
                Log::error('File documento non leggibile', [
                    'documento_id' => $documento->id,
                    'file_path' => $filePath,
                    'permissions' => substr(sprintf('%o', fileperms($filePath)), -4),
                ]);
                return null;
            }
            
            $mimeType = Storage::disk('local')->mimeType($documento->file_path);
            $fileName = basename($documento->file_path);
            
            // Rimuovi il prefisso UUID dal nome file se presente
            if (strpos($fileName, '_') !== false) {
                $parts = explode('_', $fileName, 2);
                if (count($parts) === 2 && strlen($parts[0]) === 36) {
                    $fileName = $parts[1]; // Prendi solo la parte dopo l'UUID
                }
            }
            
            if ($inline) {
                // Per visualizzazione inline nel browser
                $mimeType = $mimeType ?: (function_exists('mime_content_type') ? @mime_content_type($filePath) : null);
                
                // Fallback per determinare il MIME type dall'estensione
                if (!$mimeType) {
                    $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
                    $mimeTypes = [
                        'pdf' => 'application/pdf',
                        'jpg' => 'image/jpeg',
                        'jpeg' => 'image/jpeg',
                        'png' => 'image/png',
                        'gif' => 'image/gif',
                    ];
                    $mimeType = $mimeTypes[$extension] ?? 'application/octet-stream';
                }
                
                // Per visualizzazione inline, leggi il file e restituiscilo con gli header corretti
                try {
                    $fileContent = @file_get_contents($filePath);
                    if ($fileContent === false) {
                        Log::error('Impossibile leggere il contenuto del file', [
                            'documento_id' => $documento->id,
                            'file_path' => $filePath,
                            'error' => error_get_last(),
                        ]);
                        return null;
                    }
                    
                    $fileSize = strlen($fileContent);
                    Log::info('File caricato per visualizzazione', [
                        'documento_id' => $documento->id,
                        'file_size' => $fileSize,
                        'mime_type' => $mimeType,
                        'file_name' => $fileName,
                    ]);
                    
                    // Restituisci il file con gli header corretti per visualizzazione inline
                    // Usa l'array di header invece di header() multipli per evitare problemi
                    return response($fileContent, 200, [
                        'Content-Type' => $mimeType,
                        'Content-Disposition' => 'inline; filename="' . addslashes($fileName) . '"',
                        'Content-Length' => (string)$fileSize,
                        'Cache-Control' => 'private, max-age=3600',
                    ]);
                } catch (\Exception $readException) {
                    Log::error('Errore durante la lettura del file', [
                        'documento_id' => $documento->id,
                        'file_path' => $filePath,
                        'error' => $readException->getMessage(),
                        'trace' => $readException->getTraceAsString(),
                    ]);
                    return null;
                }
            } else {
                // Per download
                return Storage::disk('local')->download($documento->file_path, $fileName);
            }
        } catch (Exception $e) {
            Log::error('Errore download documento veicolo', [
                'documento_id' => $documento->id,
                'file_path' => $documento->file_path,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return null;
        }
    }

    /**
     * Aggiorna i metadati del documento (descrizione, data_scadenza)
     */
    public function updateDocumento(DocumentoVeicolo $documento, ?string $descrizione = null, ?string $dataScadenza = null): bool
    {
        try {
            if ($descrizione !== null) {
                $documento->descrizione = $descrizione;
            }
            if ($dataScadenza !== null) {
                $documento->data_scadenza = $dataScadenza;
            }
            $documento->save();
            return true;
        } catch (Exception $e) {
            Log::error('Errore aggiornamento documento veicolo', [
                'documento_id' => $documento->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }
}
