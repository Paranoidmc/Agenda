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
            if (!$documento->file_path || !Storage::disk('local')->exists($documento->file_path)) {
                Log::warning('File documento non trovato', [
                    'documento_id' => $documento->id,
                    'file_path' => $documento->file_path,
                ]);
                return null;
            }
            
            $filePath = Storage::disk('local')->path($documento->file_path);
            
            // Verifica che il file esista fisicamente
            if (!file_exists($filePath)) {
                Log::error('File documento non trovato sul filesystem', [
                    'documento_id' => $documento->id,
                    'file_path' => $documento->file_path,
                    'absolute_path' => $filePath,
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
                $mimeType = $mimeType ?: mime_content_type($filePath) ?: 'application/octet-stream';
                
                return response()->file($filePath, [
                    'Content-Type' => $mimeType,
                    'Content-Disposition' => 'inline; filename="' . addslashes($fileName) . '"',
                ]);
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
