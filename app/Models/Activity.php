<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Activity extends Model
{
    use HasFactory;

    protected $fillable = [
        'date',
        'time_slot',
        'driver_id',
        'vehicle_id',
        'client_id',
        'site_id',
        'activity_type_id',
        'status',
        'start_location',
        'end_location',
        'notes',
        'completed_at',
    ];

    protected $casts = [
        'date' => 'date',
        'completed_at' => 'datetime',
    ];
    
    protected static function booted()
    {
        static::creating(function ($activity) {
            static::validateScheduleConflict($activity);
            static::handleCompletedStatus($activity);
        });
        
        static::updating(function ($activity) {
            static::validateScheduleConflict($activity);
            static::handleCompletedStatus($activity);
        });
    }
    
    protected static function handleCompletedStatus($activity)
    {
        // If status is changed to completed, set completed_at timestamp
        if ($activity->status === 'completed' && $activity->completed_at === null) {
            $activity->completed_at = now();
        }
        
        // If status is changed from completed to something else, clear completed_at
        if ($activity->status !== 'completed' && $activity->completed_at !== null) {
            $activity->completed_at = null;
        }
    }
    
    protected static function validateScheduleConflict($activity)
    {
        // Check for driver schedule conflicts
        $conflictingDriverActivities = static::where('driver_id', $activity->driver_id)
            ->where('date', $activity->date)
            ->where('id', '!=', $activity->id)
            ->where(function ($query) use ($activity) {
                if ($activity->time_slot === 'full_day') {
                    // Full day conflicts with any time slot
                    return $query;
                } elseif ($activity->time_slot === 'morning') {
                    // Morning conflicts with morning or full day
                    return $query->whereIn('time_slot', ['morning', 'full_day']);
                } elseif ($activity->time_slot === 'afternoon') {
                    // Afternoon conflicts with afternoon or full day
                    return $query->whereIn('time_slot', ['afternoon', 'full_day']);
                }
            })
            ->where('status', '!=', 'cancelled')
            ->exists();
            
        if ($conflictingDriverActivities) {
            throw new \Exception("L'autista è già impegnato in questa fascia oraria.");
        }
        
        // Check for vehicle schedule conflicts
        $conflictingVehicleActivities = static::where('vehicle_id', $activity->vehicle_id)
            ->where('date', $activity->date)
            ->where('id', '!=', $activity->id)
            ->where(function ($query) use ($activity) {
                if ($activity->time_slot === 'full_day') {
                    // Full day conflicts with any time slot
                    return $query;
                } elseif ($activity->time_slot === 'morning') {
                    // Morning conflicts with morning or full day
                    return $query->whereIn('time_slot', ['morning', 'full_day']);
                } elseif ($activity->time_slot === 'afternoon') {
                    // Afternoon conflicts with afternoon or full day
                    return $query->whereIn('time_slot', ['afternoon', 'full_day']);
                }
            })
            ->where('status', '!=', 'cancelled')
            ->exists();
            
        if ($conflictingVehicleActivities) {
            throw new \Exception("Il veicolo è già impegnato in questa fascia oraria.");
        }
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function activityType(): BelongsTo
    {
        return $this->belongsTo(ActivityType::class);
    }
}