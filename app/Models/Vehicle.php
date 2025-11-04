<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vehicle extends Model
{
    use HasFactory;

    protected $fillable = [
        'plate', 'brand', 'model', 'year', 'type', 'status', 'notes',
        'nome', 'fuel_type', 'color', 'odometer', 'engine_hours', 'max_load', // 'name' cambiato in 'nome'
        'chassis_number', 'purchase_date', 'purchase_price', 'front_tire_size',
        'rear_tire_size', 'vin_code', 'engine_capacity', 'engine_code', 'engine_serial_number',
        'fiscal_horsepower', 'power_kw', 'registration_number', 'euro_classification',
        'gruppi', 'autista_assegnato', 'first_registration_date', 'ownership', // 'groups' cambiato in 'gruppi', 'assigned_driver' in 'autista_assegnato'
        'current_profitability', 'contract_holder', 'ownership_type', 'rental_type',
        'advance_paid', 'final_installment', 'monthly_fee', 'contract_start_date',
        'contract_end_date', 'monthly_alert', 'end_alert', 'installment_payment_day',
        'supplier', 'collection_date', 'contract_duration_months', 'contract_kilometers',
        'invoice_amount_excl_vat', 'invoice_amount_incl_vat', 'contract_equipment',
        'tomtom', 'tires', 'returned_or_redeemed', 'external_link',
        // Nuovi campi
        'matricola', 'scadenze', 'note', 'link', 'imei',
    ];
    
    protected $casts = [
        'purchase_date' => 'date',
        'first_registration_date' => 'date',
        'contract_start_date' => 'date',
        'contract_end_date' => 'date',
        'collection_date' => 'date',
        'max_load' => 'decimal:2',
        'purchase_price' => 'decimal:2',
        'advance_paid' => 'decimal:2',
        'final_installment' => 'decimal:2',
        'monthly_fee' => 'decimal:2',
        'invoice_amount_excl_vat' => 'decimal:2',
        'invoice_amount_incl_vat' => 'decimal:2',
        'power_kw' => 'decimal:2',
    ];

        public function activities()
    {
        return $this->belongsToMany(Activity::class, 'activity_vehicle');
    }

    public function deadlines(): HasMany
    {
        return $this->hasMany(VehicleDeadline::class);
    }
    
    /**
     * Relazione: tutti i documenti associati al veicolo
     */
    public function documentiVeicolo(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\App\Models\DocumentoVeicolo::class, 'veicolo_id');
    }

    /**
     * Documenti categoria "Bolli"
     */
    public function bolli(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->documentiVeicolo()->where('categoria', 'bollo');
    }

    /**
     * Documenti categoria "Assicurazioni"
     */
    public function assicurazioni(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->documentiVeicolo()->where('categoria', 'assicurazione');
    }

    /**
     * Documenti categoria "Manutenzioni"
     */
    public function manutenzioni(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->documentiVeicolo()->where('categoria', 'manutenzione');
    }

    /**
     * Documenti categoria "Libretto di Circolazione"
     */
    public function librettiCircolazione(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->documentiVeicolo()->where('categoria', 'libretto_circolazione');
    }

    /**
     * Documenti categoria "Autorizzazione Albo"
     */
    public function autorizzazioniAlbo(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->documentiVeicolo()->where('categoria', 'autorizzazione_albo');
    }

    /**
     * Documenti categoria "Altri Documenti"
     */
    public function altriDocumenti(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->documentiVeicolo()->where('categoria', 'altri_documenti');
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