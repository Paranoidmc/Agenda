<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfessionalDriverLicense extends Model
{
    use HasFactory;

    protected $table = 'driver_professional_licenses';

    protected $fillable = [
        'driver_id',
        'tipo',
        'numero',
        'ente_rilascio',
        'rilasciata_il',
        'scadenza',
        'note',
    ];

    protected $casts = [
        'rilasciata_il' => 'date',
        'scadenza' => 'date',
    ];

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }
}
