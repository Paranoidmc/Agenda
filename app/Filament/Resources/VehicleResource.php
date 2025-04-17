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
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Collection;

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
                Forms\Components\Tabs::make('Tabs')
                    ->tabs([
                        Forms\Components\Tabs\Tab::make('Informazioni Generali')
                            ->schema([
                                Forms\Components\Section::make('Dati Identificativi')
                                    ->schema([
                                        Forms\Components\TextInput::make('plate')
                                            ->label('Targa')
                                            ->required()
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('vin')
                                            ->label('Numero Telaio (VIN)')
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('engine_number')
                                            ->label('Numero Motore')
                                            ->maxLength(255),
                                    ])->columns(3),
                                
                                Forms\Components\Section::make('Caratteristiche')
                                    ->schema([
                                        Forms\Components\TextInput::make('brand')
                                            ->label('Marca')
                                            ->required()
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('model')
                                            ->label('Modello')
                                            ->required()
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('color')
                                            ->label('Colore')
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('year')
                                            ->label('Anno')
                                            ->numeric()
                                            ->minValue(1900)
                                            ->maxValue(date('Y') + 1),
                                        Forms\Components\Select::make('type')
                                            ->label('Tipo Veicolo')
                                            ->options([
                                                'car' => 'Automobile',
                                                'van' => 'Furgone',
                                                'truck' => 'Camion',
                                                'bus' => 'Autobus',
                                                'trailer' => 'Rimorchio',
                                                'other' => 'Altro',
                                            ]),
                                        Forms\Components\Select::make('fuel_type')
                                            ->label('Tipo Carburante')
                                            ->options([
                                                'petrol' => 'Benzina',
                                                'diesel' => 'Diesel',
                                                'lpg' => 'GPL',
                                                'methane' => 'Metano',
                                                'hybrid' => 'Ibrido',
                                                'electric' => 'Elettrico',
                                                'other' => 'Altro',
                                            ]),
                                    ])->columns(3),
                                
                                Forms\Components\Section::make('Specifiche Tecniche')
                                    ->schema([
                                        Forms\Components\TextInput::make('seats')
                                            ->label('Numero Posti')
                                            ->numeric()
                                            ->minValue(1),
                                        Forms\Components\TextInput::make('weight')
                                            ->label('Peso (kg)')
                                            ->numeric()
                                            ->step(0.01),
                                        Forms\Components\TextInput::make('max_load')
                                            ->label('Portata Massima (kg)')
                                            ->numeric()
                                            ->step(0.01),
                                    ])->columns(3),
                            ]),
                        
                        Forms\Components\Tabs\Tab::make('Dati Amministrativi')
                            ->schema([
                                Forms\Components\Section::make('Registrazione')
                                    ->schema([
                                        Forms\Components\DatePicker::make('registration_date')
                                            ->label('Data Immatricolazione')
                                            ->displayFormat('d/m/Y'),
                                        Forms\Components\DatePicker::make('purchase_date')
                                            ->label('Data Acquisto')
                                            ->displayFormat('d/m/Y'),
                                        Forms\Components\TextInput::make('purchase_price')
                                            ->label('Prezzo Acquisto (€)')
                                            ->numeric()
                                            ->step(0.01),
                                        Forms\Components\TextInput::make('owner')
                                            ->label('Proprietario')
                                            ->maxLength(255),
                                    ])->columns(2),
                                
                                Forms\Components\Section::make('Assicurazione')
                                    ->schema([
                                        Forms\Components\TextInput::make('insurance_company')
                                            ->label('Compagnia Assicurativa')
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('insurance_policy_number')
                                            ->label('Numero Polizza')
                                            ->maxLength(255),
                                        Forms\Components\DatePicker::make('insurance_expiry')
                                            ->label('Scadenza Assicurazione')
                                            ->displayFormat('d/m/Y')
                                            ->hint('La data di scadenza dell\'assicurazione')
                                            ->hintColor('danger')
                                            ->hintIcon('heroicon-m-exclamation-triangle')
                                            ->afterStateHydrated(function ($component, $state) {
                                                if ($state && Carbon::parse($state)->isPast()) {
                                                    $component->hintIcon('heroicon-m-exclamation-triangle');
                                                    $component->hintColor('danger');
                                                    $component->hint('Assicurazione scaduta!');
                                                } elseif ($state && Carbon::parse($state)->diffInDays(now()) <= 30) {
                                                    $component->hintIcon('heroicon-m-exclamation-triangle');
                                                    $component->hintColor('warning');
                                                    $component->hint('Assicurazione in scadenza entro 30 giorni!');
                                                }
                                            }),
                                    ])->columns(3),
                            ]),
                        
                        Forms\Components\Tabs\Tab::make('Manutenzione')
                            ->schema([
                                Forms\Components\Section::make('Stato Attuale')
                                    ->schema([
                                        Forms\Components\TextInput::make('odometer')
                                            ->label('Contachilometri Attuale (km)')
                                            ->numeric()
                                            ->minValue(0),
                                        Forms\Components\Select::make('status')
                                            ->label('Stato Operativo')
                                            ->options([
                                                'operational' => 'Operativo',
                                                'maintenance' => 'In Manutenzione',
                                                'out_of_service' => 'Fuori Servizio',
                                                'reserved' => 'Riservato',
                                                'inactive' => 'Inattivo',
                                            ])
                                            ->default('operational'),
                                    ])->columns(2),
                                
                                Forms\Components\Section::make('Ultima Manutenzione')
                                    ->schema([
                                        Forms\Components\DatePicker::make('last_maintenance_date')
                                            ->label('Data Ultima Manutenzione')
                                            ->displayFormat('d/m/Y'),
                                        Forms\Components\TextInput::make('last_maintenance_odometer')
                                            ->label('Km all\'Ultima Manutenzione')
                                            ->numeric()
                                            ->minValue(0),
                                    ])->columns(2),
                                
                                Forms\Components\Section::make('Intervalli di Manutenzione')
                                    ->schema([
                                        Forms\Components\TextInput::make('maintenance_interval_km')
                                            ->label('Intervallo Manutenzione (km)')
                                            ->numeric()
                                            ->minValue(0)
                                            ->placeholder('Es. 10000 km'),
                                        Forms\Components\TextInput::make('maintenance_interval_months')
                                            ->label('Intervallo Manutenzione (mesi)')
                                            ->numeric()
                                            ->minValue(0)
                                            ->placeholder('Es. 12 mesi'),
                                    ])->columns(2),
                            ]),
                        
                        Forms\Components\Tabs\Tab::make('Note')
                            ->schema([
                                Forms\Components\Section::make('Note e Osservazioni')
                                    ->schema([
                                        Forms\Components\Textarea::make('notes')
                                            ->label('Note')
                                            ->maxLength(65535)
                                            ->rows(10)
                                            ->columnSpanFull(),
                                    ]),
                            ]),
                    ])
                    ->persistTabInQueryString()
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('plate')
                    ->label('Targa')
                    ->searchable()
                    ->sortable()
                    ->copyable()
                    ->weight('bold'),
                
                Tables\Columns\TextColumn::make('brand')
                    ->label('Marca')
                    ->searchable()
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('model')
                    ->label('Modello')
                    ->searchable()
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('type')
                    ->label('Tipo')
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'car' => 'Automobile',
                        'van' => 'Furgone',
                        'truck' => 'Camion',
                        'bus' => 'Autobus',
                        'trailer' => 'Rimorchio',
                        'other' => 'Altro',
                        default => $state,
                    })
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'car' => 'info',
                        'van' => 'success',
                        'truck' => 'warning',
                        'bus' => 'danger',
                        'trailer' => 'gray',
                        default => 'gray',
                    })
                    ->toggleable(),
                
                Tables\Columns\TextColumn::make('year')
                    ->label('Anno')
                    ->sortable()
                    ->toggleable(),
                
                Tables\Columns\TextColumn::make('age')
                    ->label('Età')
                    ->formatStateUsing(fn ($state) => $state ? "{$state} anni" : '-')
                    ->sortable(query: function (Builder $query, string $direction): Builder {
                        return $query->orderBy('year', $direction === 'desc' ? 'asc' : 'desc');
                    })
                    ->toggleable(),
                
                Tables\Columns\TextColumn::make('odometer')
                    ->label('Km')
                    ->formatStateUsing(fn ($state) => $state ? number_format($state, 0, ',', '.') . ' km' : '-')
                    ->sortable()
                    ->toggleable(),
                
                Tables\Columns\TextColumn::make('insurance_expiry')
                    ->label('Scadenza Assicurazione')
                    ->date('d/m/Y')
                    ->sortable()
                    ->color(fn ($record) => 
                        $record->isInsuranceExpired()
                            ? 'danger' 
                            : ($record->isInsuranceExpiringSoon()
                                ? 'warning' 
                                : 'success')
                    )
                    ->icon(fn ($record) => 
                        $record->isInsuranceExpired()
                            ? 'heroicon-o-exclamation-triangle'
                            : ($record->isInsuranceExpiringSoon()
                                ? 'heroicon-o-clock'
                                : 'heroicon-o-check-circle')
                    )
                    ->description(fn ($record) => 
                        $record->isInsuranceExpired()
                            ? 'Assicurazione scaduta'
                            : ($record->isInsuranceExpiringSoon()
                                ? 'In scadenza'
                                : null)
                    )
                    ->toggleable(),
                
                Tables\Columns\TextColumn::make('status')
                    ->label('Stato')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'operational' => 'success',
                        'maintenance' => 'warning',
                        'out_of_service' => 'danger',
                        'reserved' => 'info',
                        'inactive' => 'gray',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'operational' => 'Operativo',
                        'maintenance' => 'In Manutenzione',
                        'out_of_service' => 'Fuori Servizio',
                        'reserved' => 'Riservato',
                        'inactive' => 'Inattivo',
                        default => $state,
                    }),
                
                Tables\Columns\TextColumn::make('maintenance_status')
                    ->label('Manutenzione')
                    ->state(function ($record) {
                        if ($record->isMaintenanceNeededByKm() && $record->isMaintenanceNeededByTime()) {
                            return 'both';
                        } elseif ($record->isMaintenanceNeededByKm()) {
                            return 'km';
                        } elseif ($record->isMaintenanceNeededByTime()) {
                            return 'time';
                        } else {
                            return 'ok';
                        }
                    })
                    ->formatStateUsing(function ($state, $record) {
                        if ($state === 'both') {
                            return 'Necessaria (km e tempo)';
                        } elseif ($state === 'km') {
                            return 'Necessaria (km)';
                        } elseif ($state === 'time') {
                            return 'Necessaria (tempo)';
                        } else {
                            if ($record->km_to_next_maintenance !== null && $record->days_to_next_maintenance !== null) {
                                return "OK ({$record->km_to_next_maintenance} km / {$record->days_to_next_maintenance} giorni)";
                            } elseif ($record->km_to_next_maintenance !== null) {
                                return "OK ({$record->km_to_next_maintenance} km)";
                            } elseif ($record->days_to_next_maintenance !== null) {
                                return "OK ({$record->days_to_next_maintenance} giorni)";
                            } else {
                                return 'Non configurata';
                            }
                        }
                    })
                    ->badge()
                    ->color(function ($state) {
                        return match ($state) {
                            'both' => 'danger',
                            'km', 'time' => 'warning',
                            'ok' => 'success',
                            default => 'gray',
                        };
                    })
                    ->icon(function ($state) {
                        return match ($state) {
                            'both', 'km', 'time' => 'heroicon-o-wrench',
                            'ok' => 'heroicon-o-check-circle',
                            default => 'heroicon-o-question-mark-circle',
                        };
                    })
                    ->toggleable(),
                
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
                        'reserved' => 'Riservato',
                        'inactive' => 'Inattivo',
                    ])
                    ->multiple(),
                
                Tables\Filters\SelectFilter::make('type')
                    ->label('Tipo Veicolo')
                    ->options([
                        'car' => 'Automobile',
                        'van' => 'Furgone',
                        'truck' => 'Camion',
                        'bus' => 'Autobus',
                        'trailer' => 'Rimorchio',
                        'other' => 'Altro',
                    ])
                    ->multiple(),
                
                Tables\Filters\SelectFilter::make('fuel_type')
                    ->label('Tipo Carburante')
                    ->options([
                        'petrol' => 'Benzina',
                        'diesel' => 'Diesel',
                        'lpg' => 'GPL',
                        'methane' => 'Metano',
                        'hybrid' => 'Ibrido',
                        'electric' => 'Elettrico',
                        'other' => 'Altro',
                    ])
                    ->multiple(),
                
                Tables\Filters\Filter::make('insurance_expired')
                    ->label('Assicurazione Scaduta')
                    ->query(fn (Builder $query): Builder => $query->whereDate('insurance_expiry', '<', now())),
                
                Tables\Filters\Filter::make('insurance_expiring_soon')
                    ->label('Assicurazione in Scadenza')
                    ->query(fn (Builder $query): Builder => 
                        $query->whereDate('insurance_expiry', '>=', now())
                             ->whereDate('insurance_expiry', '<=', now()->addDays(30))
                    ),
                
                Tables\Filters\Filter::make('maintenance_needed')
                    ->label('Manutenzione Necessaria')
                    ->query(function (Builder $query): Builder {
                        return $query->where(function (Builder $query) {
                            // Manutenzione necessaria per km
                            $query->whereRaw('odometer - last_maintenance_odometer >= maintenance_interval_km')
                                ->whereNotNull('odometer')
                                ->whereNotNull('last_maintenance_odometer')
                                ->whereNotNull('maintenance_interval_km');
                        })->orWhere(function (Builder $query) {
                            // Manutenzione necessaria per tempo
                            $query->whereRaw('DATE_ADD(last_maintenance_date, INTERVAL maintenance_interval_months MONTH) <= CURDATE()')
                                ->whereNotNull('last_maintenance_date')
                                ->whereNotNull('maintenance_interval_months');
                        });
                    }),
                
                Tables\Filters\Filter::make('age')
                    ->label('Età Veicolo')
                    ->form([
                        Forms\Components\TextInput::make('min_age')
                            ->label('Età Minima (anni)')
                            ->numeric()
                            ->minValue(0),
                        Forms\Components\TextInput::make('max_age')
                            ->label('Età Massima (anni)')
                            ->numeric()
                            ->minValue(0),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['min_age'],
                                fn (Builder $query, $minAge): Builder => $query->where('year', '<=', now()->year - $minAge),
                            )
                            ->when(
                                $data['max_age'],
                                fn (Builder $query, $maxAge): Builder => $query->where('year', '>=', now()->year - $maxAge),
                            );
                    }),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\ActionGroup::make([
                    Tables\Actions\Action::make('print_details')
                        ->label('Stampa Scheda')
                        ->icon('heroicon-o-printer')
                        ->url(fn ($record) => route('filament.admin.resources.vehicles.print', $record))
                        ->openUrlInNewTab(),
                    
                    Tables\Actions\Action::make('update_odometer')
                        ->label('Aggiorna Km')
                        ->icon('heroicon-o-arrow-path')
                        ->form([
                            Forms\Components\TextInput::make('odometer')
                                ->label('Contachilometri Attuale (km)')
                                ->numeric()
                                ->minValue(fn ($record) => $record->odometer ?? 0)
                                ->required(),
                            Forms\Components\Textarea::make('note')
                                ->label('Nota')
                                ->placeholder('Inserisci una nota opzionale sull\'aggiornamento del contachilometri'),
                        ])
                        ->action(function (Vehicle $record, array $data): void {
                            $oldOdometer = $record->odometer;
                            $record->odometer = $data['odometer'];
                            
                            if (!empty($data['note'])) {
                                $odometerNote = "Aggiornamento contachilometri da " . 
                                    ($oldOdometer ? number_format($oldOdometer, 0, ',', '.') : '0') . 
                                    " km a " . number_format($data['odometer'], 0, ',', '.') . 
                                    " km il " . now()->format('d/m/Y') . ".\nNota: " . $data['note'];
                                
                                $record->notes = $record->notes 
                                    ? $record->notes . "\n\n" . $odometerNote
                                    : $odometerNote;
                            }
                            
                            $record->save();
                            
                            Filament\Notifications\Notification::make()
                                ->title('Contachilometri aggiornato')
                                ->success()
                                ->send();
                        }),
                    
                    Tables\Actions\Action::make('change_status')
                        ->label('Cambia Stato')
                        ->icon('heroicon-o-arrow-path')
                        ->form([
                            Forms\Components\Select::make('status')
                                ->label('Nuovo Stato')
                                ->options([
                                    'operational' => 'Operativo',
                                    'maintenance' => 'In Manutenzione',
                                    'out_of_service' => 'Fuori Servizio',
                                    'reserved' => 'Riservato',
                                    'inactive' => 'Inattivo',
                                ])
                                ->required(),
                            Forms\Components\Textarea::make('note')
                                ->label('Nota')
                                ->placeholder('Inserisci una nota opzionale sul cambio di stato'),
                        ])
                        ->action(function (Vehicle $record, array $data): void {
                            $oldStatus = $record->status;
                            $record->status = $data['status'];
                            
                            if (!empty($data['note'])) {
                                $statusNote = "Cambio stato da " . match ($oldStatus) {
                                    'operational' => 'Operativo',
                                    'maintenance' => 'In Manutenzione',
                                    'out_of_service' => 'Fuori Servizio',
                                    'reserved' => 'Riservato',
                                    'inactive' => 'Inattivo',
                                    default => $oldStatus,
                                } . " a " . match ($data['status']) {
                                    'operational' => 'Operativo',
                                    'maintenance' => 'In Manutenzione',
                                    'out_of_service' => 'Fuori Servizio',
                                    'reserved' => 'Riservato',
                                    'inactive' => 'Inattivo',
                                    default => $data['status'],
                                } . " il " . now()->format('d/m/Y') . ".\nNota: " . $data['note'];
                                
                                $record->notes = $record->notes 
                                    ? $record->notes . "\n\n" . $statusNote
                                    : $statusNote;
                            }
                            
                            $record->save();
                            
                            Filament\Notifications\Notification::make()
                                ->title('Stato aggiornato')
                                ->success()
                                ->send();
                        }),
                    
                    Tables\Actions\Action::make('register_maintenance')
                        ->label('Registra Manutenzione')
                        ->icon('heroicon-o-wrench')
                        ->form([
                            Forms\Components\DatePicker::make('maintenance_date')
                                ->label('Data Manutenzione')
                                ->default(now())
                                ->required(),
                            Forms\Components\TextInput::make('maintenance_odometer')
                                ->label('Contachilometri (km)')
                                ->default(fn ($record) => $record->odometer)
                                ->numeric()
                                ->required(),
                            Forms\Components\Textarea::make('maintenance_description')
                                ->label('Descrizione Intervento')
                                ->required(),
                            Forms\Components\TextInput::make('maintenance_cost')
                                ->label('Costo Intervento (€)')
                                ->numeric()
                                ->step(0.01),
                        ])
                        ->action(function (Vehicle $record, array $data): void {
                            // Aggiorna i dati dell'ultima manutenzione
                            $record->last_maintenance_date = $data['maintenance_date'];
                            $record->last_maintenance_odometer = $data['maintenance_odometer'];
                            
                            // Aggiorna il contachilometri se necessario
                            if ($record->odometer < $data['maintenance_odometer']) {
                                $record->odometer = $data['maintenance_odometer'];
                            }
                            
                            // Aggiungi una nota sulla manutenzione
                            $maintenanceNote = "Manutenzione effettuata il " . Carbon::parse($data['maintenance_date'])->format('d/m/Y') . 
                                " a " . number_format($data['maintenance_odometer'], 0, ',', '.') . " km.\n" .
                                "Intervento: " . $data['maintenance_description'];
                                
                            if (!empty($data['maintenance_cost'])) {
                                $maintenanceNote .= "\nCosto: € " . number_format($data['maintenance_cost'], 2, ',', '.');
                            }
                            
                            $record->notes = $record->notes 
                                ? $record->notes . "\n\n" . $maintenanceNote
                                : $maintenanceNote;
                            
                            // Se il veicolo era in manutenzione, riportalo operativo
                            if ($record->status === 'maintenance') {
                                $record->status = 'operational';
                            }
                            
                            $record->save();
                            
                            Filament\Notifications\Notification::make()
                                ->title('Manutenzione registrata')
                                ->success()
                                ->send();
                        }),
                    
                    Tables\Actions\DeleteAction::make(),
                ]),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\BulkAction::make('change_status_bulk')
                        ->label('Cambia Stato')
                        ->icon('heroicon-o-arrow-path')
                        ->form([
                            Forms\Components\Select::make('status')
                                ->label('Nuovo Stato')
                                ->options([
                                    'operational' => 'Operativo',
                                    'maintenance' => 'In Manutenzione',
                                    'out_of_service' => 'Fuori Servizio',
                                    'reserved' => 'Riservato',
                                    'inactive' => 'Inattivo',
                                ])
                                ->required(),
                        ])
                        ->action(function (Collection $records, array $data): void {
                            $records->each(function ($record) use ($data) {
                                $record->status = $data['status'];
                                $record->save();
                            });
                            
                            Filament\Notifications\Notification::make()
                                ->title('Stato aggiornato per ' . $records->count() . ' veicoli')
                                ->success()
                                ->send();
                        }),
                    
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('plate', 'asc');
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
            'print' => Pages\PrintVehicle::route('/{record}/print'),
        ];
    }
}