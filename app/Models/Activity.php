<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Activity extends Model
{
    use HasFactory;

    protected $fillable = [
        'descrizione', 'data_inizio', 'data_fine',
        'driver_id', 'vehicle_id', 'client_id', 'site_id',
        'activity_type_id', 'status', 'start_location',
        'end_location', 'note', 'completed_at'
    ];

    protected $casts = [
        'data_inizio' => 'datetime',
        'data_fine' => 'datetime',
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
        
        // Nessuna logica speciale per gli altri stati (planned, in_progress, doc_issued, cancelled)
        // ma possiamo aggiungere qui se necessario in futuro
    }
    
    protected static function validateScheduleConflict($activity)
    {
        // Se sono specificati orari di inizio e fine, utilizziamo quelli per il controllo dei conflitti
        $useSpecificTimes = $activity->start_time && $activity->end_time;
        
        // Check for driver schedule conflicts
        $driverQuery = static::where('driver_id', $activity->driver_id)
            ->where('data_inizio', $activity->data_inizio)
            ->where('id', '!=', $activity->id)
            ->where('status', '!=', 'cancelled');
            
        if ($useSpecificTimes) {
            // Se ci sono orari specifici, verifichiamo la sovrapposizione degli orari
            $driverQuery->where(function ($query) use ($activity) {
                // Verifica se ci sono attività che si sovrappongono con gli orari specificati
                $query->where(function ($q) use ($activity) {
                    // Attività che inizia durante l'attività corrente
                    $q->whereNotNull('start_time')
                      ->whereNotNull('end_time')
                      ->where('start_time', '>=', $activity->start_time)
                      ->where('start_time', '<', $activity->end_time);
                })->orWhere(function ($q) use ($activity) {
                    // Attività che finisce durante l'attività corrente
                    $q->whereNotNull('start_time')
                      ->whereNotNull('end_time')
                      ->where('end_time', '>', $activity->start_time)
                      ->where('end_time', '<=', $activity->end_time);
                })->orWhere(function ($q) use ($activity) {
                    // Attività che include completamente l'attività corrente
                    $q->whereNotNull('start_time')
                      ->whereNotNull('end_time')
                      ->where('start_time', '<=', $activity->start_time)
                      ->where('end_time', '>=', $activity->end_time);
                })->orWhere(function ($q) use ($activity) {
                    // Attività senza orari specifici (usa solo time_slot)
                    $q->whereNull('start_time')
                      ->whereNull('end_time');
                });
            });
        } else {
            // Altrimenti, utilizziamo il controllo basato su time_slot
            $driverQuery->where(function ($query) use ($activity) {
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
            });
        }
        
        $conflictingDriverActivities = $driverQuery->exists();
            
        if ($conflictingDriverActivities) {
            throw new \Exception("L'autista è già impegnato in questa fascia oraria.");
        }
        
        // Check for vehicle schedule conflicts
        $vehicleQuery = static::where('vehicle_id', $activity->vehicle_id)
            ->where('data_inizio', $activity->data_inizio)
            ->where('id', '!=', $activity->id)
            ->where('status', '!=', 'cancelled');
            
        if ($useSpecificTimes) {
            // Se ci sono orari specifici, verifichiamo la sovrapposizione degli orari
            $vehicleQuery->where(function ($query) use ($activity) {
                // Verifica se ci sono attività che si sovrappongono con gli orari specificati
                $query->where(function ($q) use ($activity) {
                    // Attività che inizia durante l'attività corrente
                    $q->whereNotNull('start_time')
                      ->whereNotNull('end_time')
                      ->where('start_time', '>=', $activity->start_time)
                      ->where('start_time', '<', $activity->end_time);
                })->orWhere(function ($q) use ($activity) {
                    // Attività che finisce durante l'attività corrente
                    $q->whereNotNull('start_time')
                      ->whereNotNull('end_time')
                      ->where('end_time', '>', $activity->start_time)
                      ->where('end_time', '<=', $activity->end_time);
                })->orWhere(function ($q) use ($activity) {
                    // Attività che include completamente l'attività corrente
                    $q->whereNotNull('start_time')
                      ->whereNotNull('end_time')
                      ->where('start_time', '<=', $activity->start_time)
                      ->where('end_time', '>=', $activity->end_time);
                })->orWhere(function ($q) use ($activity) {
                    // Attività senza orari specifici (usa solo time_slot)
                    $q->whereNull('start_time')
                      ->whereNull('end_time');
                });
            });
        } else {
            // Altrimenti, utilizziamo il controllo basato su time_slot
            $vehicleQuery->where(function ($query) use ($activity) {
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
            });
        }
        
        $conflictingVehicleActivities = $vehicleQuery->exists();
            
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
