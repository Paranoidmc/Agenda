<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Activity extends Model
{
    use HasFactory;

    protected $fillable = [
        'descrizione', 'data_inizio', 'data_fine',
        'client_id', 'site_id',
        'activity_type_id', 'status', 'start_location',
        'end_location', 'notes', 'completed_at'
    ];

    protected $casts = [
        'data_inizio' => 'datetime',
        'data_fine' => 'datetime',
        'completed_at' => 'datetime',
    ];
    
        protected static function booted()
    {
        static::saving(function ($activity) {
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
    
    public function syncResourcesAndSave(array $activityData, array $resourcesData = [])
    {
        $this->fill($activityData);
        $this->save();

        // Rimuovi le vecchie risorse e inserisci le nuove
        $this->resources()->delete();

        if (!empty($resourcesData)) {
            $this->resources()->createMany($resourcesData);
        }

        return $this;
    }

    public function resources()
    {
        return $this->hasMany(ActivityResource::class);
    }

    /**
     * Relazione molti-a-molti con Vehicle tramite tabella pivot activity_vehicle
     */
    public function vehicles(): BelongsToMany
    {
        return $this->belongsToMany(Vehicle::class, 'activity_vehicle');
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
