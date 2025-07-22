<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Documento extends Model
{
    use HasFactory;

    protected $table = 'documenti';

    protected $fillable = [
        'codice_doc',
        'numero_doc',
        'data_doc',
        'client_id',
        'site_id',
        'driver_id',
        'totale_doc'
    ];

    protected $casts = [
        'data_doc' => 'date',
        'totale_doc' => 'decimal:2'
    ];

    /**
     * Relazione con il cliente
     */
    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    /**
     * Relazione con la sede
     */
    public function sede(): BelongsTo
    {
        return $this->belongsTo(Site::class, 'site_id');
    }

    /**
     * Relazione con l'autista
     */
    public function autista(): BelongsTo
    {
        return $this->belongsTo(Driver::class, 'driver_id');
    }

    /**
     * Relazione con le righe del documento
     */
    public function righe(): HasMany
    {
        return $this->hasMany(RigaDocumento::class, 'documento_id');
    }
}
