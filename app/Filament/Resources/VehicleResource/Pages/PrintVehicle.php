<?php

namespace App\Filament\Resources\VehicleResource\Pages;

use App\Filament\Resources\VehicleResource;
use App\Models\Vehicle;
use Filament\Resources\Pages\Page;

class PrintVehicle extends Page
{
    protected static string $resource = VehicleResource::class;

    protected static string $view = 'filament.resources.vehicle-resource.pages.print-vehicle';
    
    public ?Vehicle $record = null;
    
    public function mount(Vehicle $record): void
    {
        $this->record = $record;
    }
}