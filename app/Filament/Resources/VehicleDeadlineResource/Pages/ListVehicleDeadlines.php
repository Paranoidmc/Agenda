<?php

namespace App\Filament\Resources\VehicleDeadlineResource\Pages;

use App\Filament\Resources\VehicleDeadlineResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListVehicleDeadlines extends ListRecords
{
    protected static string $resource = VehicleDeadlineResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}