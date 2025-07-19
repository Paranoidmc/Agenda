<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DocumentoVeicolo extends Model
{
    use HasFactory, SoftDeletes, HasUuids;

    protected $table = 'documenti_veicolo';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'veicolo_id',
        'categoria',
        'file_path',
        'descrizione',
        'data_scadenza',
    ];

    protected $casts = [
        'data_scadenza' => 'date',
    ];

    public function veicolo()
    {
        return $this->belongsTo(Vehicle::class, 'veicolo_id');
    }
}
