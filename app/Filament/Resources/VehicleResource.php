<?php

namespace App\Filament\Resources;

use App\Filament\Resources\VehicleResource\Pages;
use App\Filament\Resources\VehicleResource\RelationManagers;
use App\Models\Vehicle;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class VehicleResource extends Resource
{
    protected static ?string $model = Vehicle::class;

    protected static ?string $navigationIcon = 'heroicon-o-truck';
    
    protected static ?string $navigationGroup = 'Anagrafiche';
    
    protected static ?int $navigationSort = 40;
    
    protected static ?string $modelLabel = 'Veicolo';
    
    protected static ?string $pluralModelLabel = 'Veicoli';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Informazioni Veicolo')
                    ->schema([
                        Forms\Components\TextInput::make('plate')
                            ->label('Targa')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\TextInput::make('brand')
                            ->label('Marca')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\TextInput::make('model')
                            ->label('Modello')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\TextInput::make('year')
                            ->label('Anno')
                            ->numeric()
                            ->minValue(1900)
                            ->maxValue(date('Y') + 1),
                    ])->columns(2),
                
                Forms\Components\Section::make('Dettagli')
                    ->schema([
                        Forms\Components\TextInput::make('type')
                            ->label('Tipo')
                            ->maxLength(255),
                        Forms\Components\Select::make('status')
                            ->label('Stato')
                            ->options([
                                'operational' => 'Operativo',
                                'maintenance' => 'In Manutenzione',
                                'out_of_service' => 'Fuori Servizio',
                            ])
                            ->default('operational'),
                        Forms\Components\Textarea::make('notes')
                            ->label('Note')
                            ->maxLength(65535)
                            ->columnSpanFull(),
                    ])->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('plate')
                    ->label('Targa')
                    ->searchable(),
                Tables\Columns\TextColumn::make('brand')
                    ->label('Marca')
                    ->searchable(),
                Tables\Columns\TextColumn::make('model')
                    ->label('Modello')
                    ->searchable(),
                Tables\Columns\TextColumn::make('year')
                    ->label('Anno')
                    ->sortable(),
                Tables\Columns\TextColumn::make('type')
                    ->label('Tipo')
                    ->searchable(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Stato')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'operational' => 'success',
                        'maintenance' => 'warning',
                        'out_of_service' => 'danger',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Data Creazione')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('updated_at')
                    ->label('Ultimo Aggiornamento')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->label('Stato')
                    ->options([
                        'operational' => 'Operativo',
                        'maintenance' => 'In Manutenzione',
                        'out_of_service' => 'Fuori Servizio',
                    ]),
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

    public static function getRelations(): array
    {
        return [
            RelationManagers\DeadlinesRelationManager::class,
            RelationManagers\ActivitiesRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListVehicles::route('/'),
            'create' => Pages\CreateVehicle::route('/create'),
            'edit' => Pages\EditVehicle::route('/{record}/edit'),
        ];
    }
}