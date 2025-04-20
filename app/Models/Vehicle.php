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
        'vin',
        'engine_number',
        'brand',
        'model',
        'color',
        'year',
        'type',
        'fuel_type',
        'seats',
        'weight',
        'max_load',
        'registration_date',
        'purchase_date',
        'purchase_price',
        'owner',
        'insurance_company',
        'insurance_policy_number',
        'insurance_expiry',
        'odometer',
        'last_maintenance_date',
        'last_maintenance_odometer',
        'maintenance_interval_km',
        'maintenance_interval_months',
        'status',
        'notes',
        // Campi in italiano
        'targa',
        'modello',
        'marca',
        'colore',
        'anno',
        'tipo',
        'carburante',
        'km',
        'note',
    ];
    
    protected $casts = [
        'registration_date' => 'date',
        'purchase_date' => 'date',
        'insurance_expiry' => 'date',
        'last_maintenance_date' => 'date',
        'weight' => 'decimal:2',
        'max_load' => 'decimal:2',
        'purchase_price' => 'decimal:2',
    ];

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }

    public function deadlines(): HasMany
    {
        return $this->hasMany(VehicleDeadline::class);
    }
    
    /**
     * Verifica se l'assicurazione è scaduta
     */
    public function isInsuranceExpired(): bool
    {
        return $this->insurance_expiry && $this->insurance_expiry->isPast();
    }
    
    /**
     * Verifica se l'assicurazione sta per scadere (entro 30 giorni)
     */
    public function isInsuranceExpiringSoon(): bool
    {
        return $this->insurance_expiry && 
               !$this->insurance_expiry->isPast() && 
               $this->insurance_expiry->diffInDays(now()) <= 30;
    }
    
    /**
     * Calcola l'età del veicolo in anni
     */
    public function getAgeAttribute(): ?int
    {
        return $this->year ? now()->year - $this->year : null;
    }
    
    /**
     * Verifica se è necessaria la manutenzione in base ai km
     */
    public function isMaintenanceNeededByKm(): bool
    {
        if (!$this->odometer || !$this->last_maintenance_odometer || !$this->maintenance_interval_km) {
            return false;
        }
        
        return ($this->odometer - $this->last_maintenance_odometer) >= $this->maintenance_interval_km;
    }
    
    /**
     * Verifica se è necessaria la manutenzione in base al tempo
     */
    public function isMaintenanceNeededByTime(): bool
    {
        if (!$this->last_maintenance_date || !$this->maintenance_interval_months) {
            return false;
        }
        
        return $this->last_maintenance_date->addMonths($this->maintenance_interval_months)->isPast();
    }
    
    /**
     * Verifica se è necessaria la manutenzione (per km o tempo)
     */
    public function isMaintenanceNeeded(): bool
    {
        return $this->isMaintenanceNeededByKm() || $this->isMaintenanceNeededByTime();
    }
    
    /**
     * Calcola i km mancanti alla prossima manutenzione
     */
    public function getKmToNextMaintenanceAttribute(): ?int
    {
        if (!$this->odometer || !$this->last_maintenance_odometer || !$this->maintenance_interval_km) {
            return null;
        }
        
        $kmSinceLastMaintenance = $this->odometer - $this->last_maintenance_odometer;
        $kmToNextMaintenance = $this->maintenance_interval_km - $kmSinceLastMaintenance;
        
        return max(0, $kmToNextMaintenance);
    }
    
    /**
     * Calcola i giorni mancanti alla prossima manutenzione
     */
    public function getDaysToNextMaintenanceAttribute(): ?int
    {
        if (!$this->last_maintenance_date || !$this->maintenance_interval_months) {
            return null;
        }
        
        $nextMaintenanceDate = $this->last_maintenance_date->addMonths($this->maintenance_interval_months);
        
        if ($nextMaintenanceDate->isPast()) {
            return 0;
        }
        
        return now()->diffInDays($nextMaintenanceDate);
    }
    
    /**
     * Restituisce il nome completo del veicolo (marca + modello)
     */
    public function getFullNameAttribute(): string
    {
        return "{$this->brand} {$this->model}";
    }
    
    /**
     * Restituisce le scadenze attive
     */
    public function getActiveDeadlinesAttribute()
    {
        return $this->deadlines()
            ->whereIn('status', ['active', 'expired'])
            ->orderBy('expiry_date')
            ->get();
    }
    
    /**
     * Restituisce le scadenze scadute
     */
    public function getExpiredDeadlinesAttribute()
    {
        return $this->deadlines()
            ->where('status', 'expired')
            ->orderBy('expiry_date')
            ->get();
    }
    
    /**
     * Restituisce le scadenze in scadenza (entro 30 giorni)
     */
    public function getUpcomingDeadlinesAttribute()
    {
        return $this->deadlines()
            ->where('status', 'active')
            ->whereDate('expiry_date', '<=', now()->addDays(30))
            ->orderBy('expiry_date')
            ->get();
    }
}