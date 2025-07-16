<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ActivityResource extends Model
{
    use HasFactory;

    protected $table = 'activity_resource';

    protected $fillable = [
        'activity_id',
        'driver_id',
        'vehicle_id',
    ];

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }
}
