<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleRental extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'vehicle_id',
        'contract_holder',
        'ownership_type',
        'rental_type',
        'advance_paid',
        'final_installment',
        'monthly_fee',
        'contract_start_date',
        'contract_end_date',
        'monthly_alert',
        'end_alert',
        'installment_payment_day',
        'supplier',
        'collection_date',
        'contract_duration_months',
        'contract_kilometers',
        'invoice_amount_excl_vat',
        'invoice_amount_incl_vat',
        'contract_equipment',
        'returned_or_redeemed',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'contract_start_date' => 'date',
        'contract_end_date' => 'date',
        'collection_date' => 'date',
        'advance_paid' => 'decimal:2',
        'final_installment' => 'decimal:2',
        'monthly_fee' => 'decimal:2',
        'invoice_amount_excl_vat' => 'decimal:2',
        'invoice_amount_incl_vat' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    /**
     * Relazione con il veicolo
     */
    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    /**
     * Scope per contratti attivi
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope per contratti scaduti
     */
    public function scopeExpired($query)
    {
        return $query->where('contract_end_date', '<', now());
    }

    /**
     * Scope per contratti futuri
     */
    public function scopeUpcoming($query)
    {
        return $query->where('contract_start_date', '>', now());
    }

    /**
     * Scope per contratti attualmente attivi
     */
    public function scopeCurrentlyActive($query)
    {
        $now = now();
        return $query->where('is_active', true)
            ->where('contract_start_date', '<=', $now)
            ->where('contract_end_date', '>=', $now);
    }
}
