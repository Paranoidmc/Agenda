<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VehicleComplete extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'vehicles_complete';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'scadenze', 'nome', 'targa', 'modello', 'tipo_carburante', 'status_mezzo',
        'colore', 'km_attuali', 'ore_motore', 'portata_kg', 'numero_telaio',
        'data_acquisto', 'costo_acquisto', 'misura_gomme_anteriori', 'misura_gomme_posteriori',
        'codice_vin', 'cilindrata', 'codice_motore', 'numero_serie_motore',
        'cavalli_fiscali', 'potenza_kw', 'matricola', 'classificazione_euro',
        'gruppi_autista_assegnato', 'data_prima_immatricolazione', 'proprieta',
        'redditivita_attuale', 'intestatario_contratto', 'tipo_proprieta',
        'tipologia_noleggio', 'anticipo_versato', 'maxirata_finale',
        'importo_rata_mensile', 'data_inizio_contratto', 'data_fine_contratto',
        'alert_mensile', 'alert_fine', 'giorno_pagamento_rata', 'fornitore',
        'data_ritiro', 'durata_contrattuale_mesi', 'km_contrattuali',
        'canone_fattura_iva_esclusa', 'canone_fattura_iva_inclusa',
        'dotazioni_contratto', 'note', 'tom_tom', 'pneumatici',
        'veicolo_riconsegnato_riscattato', 'link',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'data_acquisto' => 'date',
        'data_prima_immatricolazione' => 'date',
        'data_inizio_contratto' => 'date',
        'data_fine_contratto' => 'date',
        'data_ritiro' => 'date',
        'portata_kg' => 'decimal:2',
        'costo_acquisto' => 'decimal:2',
        'anticipo_versato' => 'decimal:2',
        'maxirata_finale' => 'decimal:2',
        'importo_rata_mensile' => 'decimal:2',
        'canone_fattura_iva_esclusa' => 'decimal:2',
        'canone_fattura_iva_inclusa' => 'decimal:2',
        'potenza_kw' => 'decimal:2',
    ];

    /**
     * Get the deadlines for the vehicle.
     */
    public function deadlines(): HasMany
    {
        return $this->hasMany(VehicleDeadline::class, 'vehicle_id');
    }

    /**
     * Get the activities for the vehicle.
     */
    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class, 'vehicle_id');
    }

    /**
     * Get the full name of the vehicle.
     *
     * @return string
     */
    public function getFullNameAttribute(): string
    {
        return "{$this->nome} {$this->modello}";
    }

    /**
     * Get the active deadlines for the vehicle.
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getActiveDeadlinesAttribute()
    {
        return $this->deadlines()
            ->whereIn('status', ['active', 'expired'])
            ->orderBy('expiry_date')
            ->get();
    }

    /**
     * Get the expired deadlines for the vehicle.
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getExpiredDeadlinesAttribute()
    {
        return $this->deadlines()
            ->where('status', 'expired')
            ->orderBy('expiry_date')
            ->get();
    }

    /**
     * Get the upcoming deadlines for the vehicle.
     *
     * @return \Illuminate\Database\Eloquent\Collection
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