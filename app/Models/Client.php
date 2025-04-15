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
        'address',
        'city',
        'postal_code',
        'province',
        'email',
        'phone',
        'vat_number',
        'fiscal_code',
        'notes',
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