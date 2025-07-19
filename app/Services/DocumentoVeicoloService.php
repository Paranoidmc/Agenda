<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\DocumentoVeicolo;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
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
     * Restituisce il file per il download
     */
    public function downloadDocumento(DocumentoVeicolo $documento)
    {
        try {
            if ($documento->file_path && Storage::disk('local')->exists($documento->file_path)) {
                return Storage::disk('local')->download($documento->file_path);
            }
            return null;
        } catch (Exception $e) {
            Log::error('Errore download documento veicolo', [
                'documento_id' => $documento->id,
                'error' => $e->getMessage(),
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
