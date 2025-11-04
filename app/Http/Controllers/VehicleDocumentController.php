<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\DocumentoVeicolo;
use App\Models\Vehicle;
use App\Repositories\DocumentoVeicoloRepository;
use App\Services\DocumentoVeicoloService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Gate;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class VehicleDocumentController extends Controller
{
    use AuthorizesRequests;
    private DocumentoVeicoloRepository $repository;
    private DocumentoVeicoloService $service;

    public function __construct(DocumentoVeicoloRepository $repository, DocumentoVeicoloService $service)
    {
        $this->repository = $repository;
        $this->service = $service;
    }

    /**
     * Elenco documenti per veicolo e categoria
     */
    public function index(Request $request, string $veicoloId): Response
    {
        $this->authorize('viewAny', DocumentoVeicolo::class);
        $categoria = $request->query('categoria');
        $documenti = $this->repository->getByVeicoloECategoria($veicoloId, $categoria);
        return response(['data' => $documenti], 200);
    }

    /**
     * Upload documento
     */
    public function store(Request $request, string $veicoloId): Response
    {
        $this->authorize('create', DocumentoVeicolo::class);
        $validator = Validator::make($request->all(), [
            'categoria' => 'required|in:bollo,assicurazione,manutenzione,libretto_circolazione,autorizzazione_albo,altri_documenti',
            'file' => 'required|file|mimes:pdf,jpeg,png,jpg,gif|max:8192',
            'descrizione' => 'nullable|string|max:255',
            'data_scadenza' => 'nullable|date',
        ]);
        if ($validator->fails()) {
            return response(['errors' => $validator->errors()], 422);
        }
        $file = $request->file('file');
        $documento = $this->service->uploadDocumento(
            $veicoloId,
            $request->input('categoria'),
            $file,
            $request->input('descrizione'),
            $request->input('data_scadenza')
        );
        return $documento
            ? response(['data' => $documento], 201)
            : response(['error' => 'Errore upload documento'], 500);
    }

    /**
     * Download documento
     */
    public function download(string $documentoId)
    {
        $documento = $this->repository->findById($documentoId);
        if (!$documento) {
            return response(['error' => 'Documento non trovato'], 404);
        }
        $this->authorize('view', $documento);
        return $this->service->downloadDocumento($documento) ?: response(['error' => 'File non trovato'], 404);
    }

    /**
     * Elimina documento
     */
    public function destroy(string $documentoId): Response
    {
        $documento = $this->repository->findById($documentoId);
        if (!$documento) {
            return response(['error' => 'Documento non trovato'], 404);
        }
        $this->authorize('delete', $documento);
        $ok = $this->service->deleteDocumento($documento);
        return $ok ? response([], 204) : response(['error' => 'Errore eliminazione'], 500);
    }

    /**
     * Aggiorna metadati documento
     */
    public function update(Request $request, string $documentoId): Response
    {
        $documento = $this->repository->findById($documentoId);
        if (!$documento) {
            return response(['error' => 'Documento non trovato'], 404);
        }
        $this->authorize('update', $documento);
        $validator = Validator::make($request->all(), [
            'descrizione' => 'nullable|string|max:255',
            'data_scadenza' => 'nullable|date',
        ]);
        if ($validator->fails()) {
            return response(['errors' => $validator->errors()], 422);
        }
        $documento = $this->repository->findById($documentoId);
        if (!$documento) {
            return response(['error' => 'Documento non trovato'], 404);
        }
        $ok = $this->service->updateDocumento(
            $documento,
            $request->input('descrizione'),
            $request->input('data_scadenza')
        );
        return $ok ? response(['data' => $documento->fresh()], 200) : response(['error' => 'Errore aggiornamento'], 500);
    }
}
