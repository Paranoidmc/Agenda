<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RigaDocumento extends Model
{
    use HasFactory;

    protected $table = 'righe_documento';

    protected $fillable = [
        'documento_id',
        'codice_articolo',
        'descrizione',
        'unita_misura',
        'quantita',
        'prezzo_unitario',
        'sconto',
        'imponibile',
        'iva',
        'totale',
        'riga_numero'
    ];

    protected $casts = [
        'quantita' => 'decimal:3',
        'prezzo_unitario' => 'decimal:2',
        'sconto' => 'decimal:2',
        'imponibile' => 'decimal:2',
        'iva' => 'decimal:2',
        'totale' => 'decimal:2'
    ];

    /**
     * Relazione con il documento
     */
    public function documento(): BelongsTo
    {
        return $this->belongsTo(Documento::class, 'documento_id');
    }
}
