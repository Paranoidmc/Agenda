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
        'birth_date',
        'birth_place',
        'fiscal_code',
        'address',
        'city',
        'postal_code',
        'province',
        'email',
        'phone',
        'license_number',
        'license_type',
        'license_issue_date',
        'license_issued_by',
        'license_expiry',
        'hire_date',
        'termination_date',
        'employee_id',
        'notes',
        'status',
        // Campi in italiano
        'nome',
        'cognome',
        'telefono',
        'indirizzo',
        'citta',
        'cap',
        'provincia',
        'codice_fiscale',
        'patente',
        'scadenza_patente',
        'note',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'license_issue_date' => 'date',
        'license_expiry' => 'date',
        'hire_date' => 'date',
        'termination_date' => 'date',
    ];
    
    protected static function booted()
    {
        static::creating(function ($driver) {
            static::checkLicenseExpiry($driver);
        });
        
        static::updating(function ($driver) {
            static::checkLicenseExpiry($driver);
        });
    }
    
    protected static function checkLicenseExpiry($driver)
    {
        // If license is expired and driver is active, set a warning in notes
        if ($driver->license_expiry && $driver->license_expiry->isPast() && $driver->status === 'active') {
            $warningMessage = "ATTENZIONE: Patente scaduta il " . $driver->license_expiry->format('d/m/Y');
            
            if (!str_contains($driver->notes ?? '', $warningMessage)) {
                $driver->notes = $driver->notes 
                    ? $driver->notes . "\n\n" . $warningMessage
                    : $warningMessage;
            }
        }
    }
    
    /**
     * Verifica se la patente è scaduta
     */
    public function isLicenseExpired(): bool
    {
        return $this->license_expiry && $this->license_expiry->isPast();
    }
    
    /**
     * Verifica se la patente sta per scadere (entro 30 giorni)
     */
    public function isLicenseExpiringSoon(): bool
    {
        return $this->license_expiry && 
               !$this->license_expiry->isPast() && 
               $this->license_expiry->diffInDays(now()) <= 30;
    }
    
    /**
     * Calcola l'età dell'autista
     */
    public function getAgeAttribute(): ?int
    {
        return $this->birth_date ? $this->birth_date->age : null;
    }
    
    /**
     * Calcola l'anzianità di servizio
     */
    public function getServiceYearsAttribute(): ?int
    {
        if (!$this->hire_date) {
            return null;
        }
        
        $endDate = $this->termination_date ?? now();
        return $this->hire_date->diffInYears($endDate);
    }
    
    /**
     * Restituisce l'indirizzo completo
     */
    public function getFullAddressAttribute(): ?string
    {
        if (!$this->address) {
            return null;
        }
        
        $parts = [$this->address];
        
        if ($this->postal_code || $this->city) {
            $parts[] = trim($this->postal_code . ' ' . $this->city);
        }
        
        if ($this->province) {
            $parts[] = $this->province;
        }
        
        return implode(', ', array_filter($parts));
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }
    
    // Get the driver's full name
    public function getFullNameAttribute(): string
    {
        return "{$this->name} {$this->surname}";
    }
}