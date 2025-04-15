<?php

namespace App\Filament\Widgets;

use App\Models\VehicleDeadline;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Illuminate\Database\Eloquent\Builder;

class UpcomingDeadlinesWidget extends BaseWidget
{
    protected static ?int $sort = 1;
    
    protected int | string | array $columnSpan = 'full';
    
    protected static ?string $heading = 'Scadenze Imminenti';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                VehicleDeadline::query()
                    ->where('status', 'active')
                    ->where('expiry_date', '<=', now()->addDays(30))
                    ->orderBy('expiry_date')
            )
            ->columns([
                Tables\Columns\TextColumn::make('vehicle.plate')
                    ->label('Veicolo')
                    ->searchable(),
                Tables\Columns\TextColumn::make('type')
                    ->label('Tipo')
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'insurance' => 'Assicurazione',
                        'tax' => 'Bollo',
                        'revision' => 'Revisione',
                        'maintenance' => 'Manutenzione',
                        'other' => 'Altro',
                        default => $state,
                    }),
                Tables\Columns\TextColumn::make('expiry_date')
                    ->label('Data Scadenza')
                    ->date('d/m/Y')
                    ->sortable()
                    ->color(fn (VehicleDeadline $record): string => 
                        $record->expiry_date->isPast() ? 'danger' : 
                        ($record->expiry_date->diffInDays(now()) < 15 ? 'warning' : 'success')
                    ),
                Tables\Columns\TextColumn::make('days_remaining')
                    ->label('Giorni Rimanenti')
                    ->state(function (VehicleDeadline $record): string {
                        $days = $record->expiry_date->diffInDays(now(), false);
                        if ($days < 0) {
                            return abs($days) . ' giorni fa';
                        } elseif ($days === 0) {
                            return 'Oggi';
                        } else {
                            return $days . ' giorni';
                        }
                    })
                    ->color(fn (VehicleDeadline $record): string => 
                        $record->expiry_date->isPast() ? 'danger' : 
                        ($record->expiry_date->diffInDays(now()) < 15 ? 'warning' : 'success')
                    ),
            ])
            ->actions([
                Tables\Actions\Action::make('edit')
                    ->label('Modifica')
                    ->url(fn (VehicleDeadline $record): string => route('filament.admin.resources.vehicle-deadlines.edit', $record))
                    ->icon('heroicon-o-pencil'),
            ]);
    }
}