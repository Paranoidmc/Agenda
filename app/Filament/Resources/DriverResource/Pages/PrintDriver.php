<?php

namespace App\Filament\Resources\DriverResource\Pages;

use App\Filament\Resources\DriverResource;
use App\Models\Driver;
use Filament\Resources\Pages\Page;

class PrintDriver extends Page
{
    protected static string $resource = DriverResource::class;

    protected static string $view = 'filament.resources.driver-resource.pages.print-driver';
    
    public ?Driver $record = null;
    
    public function mount(Driver $record): void
    {
        $this->record = $record;
    }
}