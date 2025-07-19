<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\DocumentoVeicolo;
use Illuminate\Support\Collection;

class DocumentoVeicoloRepository
{
    /**
     * Restituisce i documenti di un veicolo per categoria
     */
    public function getByVeicoloECategoria(string $veicoloId, string $categoria): Collection
    {
        return DocumentoVeicolo::where('veicolo_id', $veicoloId)
            ->where('categoria', $categoria)
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Trova un documento per ID
     */
    public function findById(string $id): ?DocumentoVeicolo
    {
        return DocumentoVeicolo::find($id);
    }

    /**
     * Elimina un documento
     */
    public function delete(DocumentoVeicolo $documento): void
    {
        $documento->delete();
    }
}
