<?php

namespace App\Filament\Resources\VehicleResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Carbon\Carbon;

class DeadlinesRelationManager extends RelationManager
{
    protected static string $relationship = 'deadlines';
    
    protected static ?string $title = 'Scadenze';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Select::make('type')
                    ->label('Tipo')
                    ->options([
                        'insurance' => 'Assicurazione',
                        'tax' => 'Bollo',
                        'revision' => 'Revisione',
                        'maintenance' => 'Manutenzione',
                        'other' => 'Altro',
                    ])
                    ->required(),
                Forms\Components\DatePicker::make('expiry_date')
                    ->label('Data Scadenza')
                    ->required()
                    ->live()
                    ->afterStateUpdated(function (Forms\Set $set, $state) {
                        if ($state) {
                            $set('reminder_date', \Carbon\Carbon::parse($state)->subDays(15)->format('Y-m-d'));
                        }
                    }),
                Forms\Components\DatePicker::make('reminder_date')
                    ->label('Data Promemoria')
                    ->before('expiry_date'),
                Forms\Components\Select::make('status')
                    ->label('Stato')
                    ->options([
                        'active' => 'Attiva',
                        'expired' => 'Scaduta',
                        'completed' => 'Completata',
                    ])
                    ->default('active'),
                Forms\Components\Textarea::make('notes')
                    ->label('Note')
                    ->maxLength(65535),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('type')
            ->columns([
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
                    ->sortable(),
                Tables\Columns\TextColumn::make('reminder_date')
                    ->label('Data Promemoria')
                    ->date('d/m/Y')
                    ->sortable(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Stato')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'active' => 'info',
                        'expired' => 'danger',
                        'completed' => 'success',
                        default => 'gray',
                    }),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('type')
                    ->label('Tipo')
                    ->options([
                        'insurance' => 'Assicurazione',
                        'tax' => 'Bollo',
                        'revision' => 'Revisione',
                        'maintenance' => 'Manutenzione',
                        'other' => 'Altro',
                    ]),
                Tables\Filters\SelectFilter::make('status')
                    ->label('Stato')
                    ->options([
                        'active' => 'Attiva',
                        'expired' => 'Scaduta',
                        'completed' => 'Completata',
                    ]),
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