<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Site extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'address',
        'city',
        'postal_code',
        'province',
        'client_id',
        'phone',
        'email',
        'notes',
        'status',
        // Campi in italiano
        'nome',
        'indirizzo',
        'citta',
        'cap',
        'provincia',
        'cliente_id',
        'telefono',
        'note',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }
}