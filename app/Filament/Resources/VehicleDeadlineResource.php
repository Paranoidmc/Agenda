<?php

namespace App\Filament\Resources;

use App\Filament\Resources\VehicleDeadlineResource\Pages;
use App\Filament\Resources\VehicleDeadlineResource\RelationManagers;
use App\Models\VehicleDeadline;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Carbon\Carbon;

class VehicleDeadlineResource extends Resource
{
    protected static ?string $model = VehicleDeadline::class;

    protected static ?string $navigationIcon = 'heroicon-o-clock';
    
    protected static ?string $navigationGroup = 'Pianificazione';
    
    protected static ?int $navigationSort = 30;
    
    protected static ?string $modelLabel = 'Scadenza Veicolo';
    
    protected static ?string $pluralModelLabel = 'Scadenze Veicoli';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Informazioni Scadenza')
                    ->schema([
                        Forms\Components\Select::make('vehicle_id')
                            ->label('Veicolo')
                            ->relationship('vehicle', 'plate')
                            ->required()
                            ->searchable()
                            ->preload(),
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
                                    $set('reminder_date', Carbon::parse($state)->subDays(15)->format('Y-m-d'));
                                }
                            }),
                        Forms\Components\DatePicker::make('reminder_date')
                            ->label('Data Promemoria')
                            ->before('expiry_date')
                            ->default(fn (Forms\Get $get) => 
                                $get('expiry_date') ? Carbon::parse($get('expiry_date'))->subDays(15) : null
                            ),
                    ])->columns(2),
                
                Forms\Components\Section::make('Stato')
                    ->schema([
                        Forms\Components\Select::make('status')
                            ->label('Stato')
                            ->options([
                                'active' => 'Attiva',
                                'expired' => 'Scaduta',
                                'completed' => 'Completata',
                            ])
                            ->default('active'),
                        Forms\Components\Toggle::make('pagato')
                            ->label('Pagato'),
                        Forms\Components\TextInput::make('importo')
                            ->label('Importo')
                            ->numeric()
                            ->minValue(0)
                            ->step(0.01),
                        Forms\Components\Textarea::make('notes')
                            ->label('Note')
                            ->maxLength(65535)
                            ->columnSpanFull(),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
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
                        ($record->expiry_date->diffInDays(now()) < 30 ? 'warning' : 'success')
                    ),
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
        default => 'secondary',
    }),
Tables\Columns\IconColumn::make('pagato')
    ->label('Pagato')
    ->boolean(),
Tables\Columns\TextColumn::make('importo')
    ->label('Importo')
    ->money('EUR', true),
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
                Tables\Filters\SelectFilter::make('vehicle_id')
                    ->label('Veicolo')
                    ->relationship('vehicle', 'plate'),
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
                Tables\Filters\Filter::make('expiring_soon')
                    ->label('In Scadenza')
                    ->query(fn (Builder $query): Builder => $query->where('expiry_date', '<=', now()->addDays(30))->where('status', 'active')),
                Tables\Filters\Filter::make('expired')
                    ->label('Scadute')
                    ->query(fn (Builder $query): Builder => $query->where('expiry_date', '<', now())->where('status', 'active')),
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
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListVehicleDeadlines::route('/'),
            'create' => Pages\CreateVehicleDeadline::route('/create'),
            'edit' => Pages\EditVehicleDeadline::route('/{record}/edit'),
        ];
    }
}