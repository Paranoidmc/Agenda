<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'address',
        'city',
        'postal_code',
        'province',
        'vat_number',
        'fiscal_code',
        'codice_arca',
        'notes',
        // Campi in italiano
        'nome',
        'telefono',
        'indirizzo',
        'citta',
        'cap',
        'provincia',
        'partita_iva',
        'codice_fiscale',
        'note',
    ];

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }

    public function sites(): HasMany
    {
        return $this->hasMany(Site::class);
    }
}
