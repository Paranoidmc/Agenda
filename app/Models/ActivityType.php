<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ActivityType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'color',
        'nome',
        'descrizione',
        'colore',
    ];

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }
}