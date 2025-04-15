<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Driver extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'surname',
        'email',
        'phone',
        'license_number',
        'license_expiry',
        'notes',
        'status',
    ];

    protected $casts = [
        'license_expiry' => 'date',
    ];

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }
}