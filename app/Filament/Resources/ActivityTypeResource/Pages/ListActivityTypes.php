<?php

namespace App\Filament\Resources\ActivityTypeResource\Pages;

use App\Filament\Resources\ActivityTypeResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListActivityTypes extends ListRecords
{
    protected static string $resource = ActivityTypeResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}