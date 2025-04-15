<?php

namespace App\Filament\Widgets;

use App\Models\Activity;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Illuminate\Database\Eloquent\Builder;

class TodayActivitiesWidget extends BaseWidget
{
    protected static ?int $sort = 2;
    
    protected int | string | array $columnSpan = 'full';
    
    protected static ?string $heading = 'Attività di Oggi';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                Activity::query()
                    ->where('date', now()->format('Y-m-d'))
                    ->orderBy('time_slot')
            )
            ->columns([
                Tables\Columns\TextColumn::make('time_slot')
                    ->label('Fascia Oraria')
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'morning' => 'Mattina',
                        'afternoon' => 'Pomeriggio',
                        'full_day' => 'Giornata Intera',
                        default => $state,
                    }),
                Tables\Columns\TextColumn::make('driver.name')
                    ->label('Autista')
                    ->searchable(),
                Tables\Columns\TextColumn::make('vehicle.plate')
                    ->label('Veicolo')
                    ->searchable(),
                Tables\Columns\TextColumn::make('client.name')
                    ->label('Cliente')
                    ->searchable(),
                Tables\Columns\TextColumn::make('site.name')
                    ->label('Cantiere')
                    ->searchable(),
                Tables\Columns\TextColumn::make('activityType.name')
                    ->label('Tipo Attività'),
                Tables\Columns\TextColumn::make('status')
                    ->label('Stato')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'planned' => 'info',
                        'in_progress' => 'warning',
                        'completed' => 'success',
                        'cancelled' => 'danger',
                        default => 'gray',
                    }),
            ])
            ->actions([
                Tables\Actions\Action::make('edit')
                    ->label('Modifica')
                    ->url(fn (Activity $record): string => route('filament.admin.resources.activities.edit', $record))
                    ->icon('heroicon-o-pencil'),
                Tables\Actions\Action::make('complete')
                    ->label('Completa')
                    ->icon('heroicon-o-check')
                    ->color('success')
                    ->visible(fn (Activity $record): bool => $record->status !== 'completed' && $record->status !== 'cancelled')
                    ->action(function (Activity $record): void {
                        $record->update([
                            'status' => 'completed',
                            'completed_at' => now(),
                        ]);
                    }),
            ]);
    }
}