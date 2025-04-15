<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleDeadline extends Model
{
    use HasFactory;

    protected $fillable = [
        'vehicle_id',
        'type',
        'expiry_date',
        'reminder_date',
        'notes',
        'status',
    ];

    protected $casts = [
        'expiry_date' => 'date',
        'reminder_date' => 'date',
    ];

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }
    
    protected static function booted()
    {
        static::creating(function ($deadline) {
            if ($deadline->expiry_date && $deadline->expiry_date->isPast() && $deadline->status === 'active') {
                $deadline->status = 'expired';
            }
        });
        
        static::updating(function ($deadline) {
            if ($deadline->expiry_date && $deadline->expiry_date->isPast() && $deadline->status === 'active') {
                $deadline->status = 'expired';
            } elseif ($deadline->expiry_date && !$deadline->expiry_date->isPast() && $deadline->status === 'expired') {
                $deadline->status = 'active';
            }
        });
    }
}