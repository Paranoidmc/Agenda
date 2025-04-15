<?php

namespace App\Filament\Resources\DriverResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class ActivitiesRelationManager extends RelationManager
{
    protected static string $relationship = 'activities';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\DatePicker::make('date')
                    ->label('Data')
                    ->required(),
                Forms\Components\Select::make('time_slot')
                    ->label('Fascia Oraria')
                    ->options([
                        'morning' => 'Mattina',
                        'afternoon' => 'Pomeriggio',
                        'full_day' => 'Giornata Intera',
                    ])
                    ->required(),
                Forms\Components\Select::make('vehicle_id')
                    ->label('Veicolo')
                    ->relationship('vehicle', 'plate')
                    ->required(),
                Forms\Components\Select::make('client_id')
                    ->label('Cliente')
                    ->relationship('client', 'name')
                    ->required(),
                Forms\Components\Select::make('site_id')
                    ->label('Cantiere')
                    ->relationship('site', 'name')
                    ->required(),
                Forms\Components\Select::make('activity_type_id')
                    ->label('Tipo Attività')
                    ->relationship('activityType', 'name')
                    ->required(),
                Forms\Components\Select::make('status')
                    ->label('Stato')
                    ->options([
                        'planned' => 'Pianificata',
                        'in_progress' => 'In Corso',
                        'completed' => 'Completata',
                        'cancelled' => 'Annullata',
                    ])
                    ->default('planned'),
                Forms\Components\TextInput::make('start_location')
                    ->label('Luogo di Partenza')
                    ->maxLength(255),
                Forms\Components\TextInput::make('end_location')
                    ->label('Luogo di Arrivo')
                    ->maxLength(255),
                Forms\Components\Textarea::make('notes')
                    ->label('Note')
                    ->maxLength(65535),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('date')
                    ->label('Data')
                    ->date('d/m/Y')
                    ->sortable(),
                Tables\Columns\TextColumn::make('time_slot')
                    ->label('Fascia Oraria')
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'morning' => 'Mattina',
                        'afternoon' => 'Pomeriggio',
                        'full_day' => 'Giornata Intera',
                        default => $state,
                    }),
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
            ->filters([
                //
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make(),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }
}