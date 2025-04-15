<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vehicle extends Model
{
    use HasFactory;

    protected $fillable = [
        'plate',
        'brand',
        'model',
        'year',
        'type',
        'status',
        'notes',
    ];

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }

    public function deadlines(): HasMany
    {
        return $this->hasMany(VehicleDeadline::class);
    }
}