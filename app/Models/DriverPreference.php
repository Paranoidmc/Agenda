<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DriverPreference extends Model
{
    protected $fillable = [
        'is_global',
        'user_id',
        'driver_order',
        'hidden_drivers',
    ];

    protected $casts = [
        'is_global' => 'boolean',
        'driver_order' => 'array',
        'hidden_drivers' => 'array',
    ];

    /**
     * Relazione con User
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Ottiene o crea le preferenze globali
     */
    public static function getGlobal(): ?self
    {
        return self::where('is_global', true)
            ->whereNull('user_id')
            ->first();
    }

    /**
     * Ottiene o crea le preferenze per un utente
     */
    public static function getUserPreferences(int $userId): ?self
    {
        return self::where('is_global', false)
            ->where('user_id', $userId)
            ->first();
    }

    /**
     * Salva le preferenze globali
     */
    public static function saveGlobal(array $driverOrder, array $hiddenDrivers): self
    {
        $pref = self::getGlobal();
        
        if (!$pref) {
            $pref = new self();
            $pref->is_global = true;
            $pref->user_id = null;
        }
        
        $pref->driver_order = $driverOrder;
        $pref->hidden_drivers = $hiddenDrivers;
        $pref->save();
        
        return $pref;
    }

    /**
     * Salva le preferenze per un utente
     */
    public static function saveUserPreferences(int $userId, array $driverOrder, array $hiddenDrivers): self
    {
        $pref = self::getUserPreferences($userId);
        
        if (!$pref) {
            $pref = new self();
            $pref->is_global = false;
            $pref->user_id = $userId;
        }
        
        $pref->driver_order = $driverOrder;
        $pref->hidden_drivers = $hiddenDrivers;
        $pref->save();
        
        return $pref;
    }
}
