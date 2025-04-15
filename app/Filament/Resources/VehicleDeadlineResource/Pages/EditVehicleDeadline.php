<?php

namespace App\Filament\Resources\VehicleDeadlineResource\Pages;

use App\Filament\Resources\VehicleDeadlineResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditVehicleDeadline extends EditRecord
{
    protected static string $resource = VehicleDeadlineResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}