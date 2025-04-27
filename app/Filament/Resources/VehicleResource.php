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
                                        Forms\Components\TextInput::make('name')->label('Nome')->maxLength(255),
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
                                        Forms\Components\TextInput::make('color')->label('Colore')->maxLength(64),
                                        Forms\Components\TextInput::make('odometer')->label('Chilometraggio')->numeric(),
                                        Forms\Components\TextInput::make('engine_hours')->label('Ore motore')->numeric(),
                                        Forms\Components\TextInput::make('max_load')->label('Portata max')->numeric(),
                                        Forms\Components\TextInput::make('chassis_number')->label('Numero telaio')->maxLength(255),
                                        Forms\Components\DatePicker::make('purchase_date')->label('Data acquisto'),
                                        Forms\Components\TextInput::make('purchase_price')->label('Prezzo acquisto')->numeric(),
                                        Forms\Components\TextInput::make('front_tire_size')->label('Misura gomme anteriori')->maxLength(64),
                                        Forms\Components\TextInput::make('rear_tire_size')->label('Misura gomme posteriori')->maxLength(64),
                                        Forms\Components\TextInput::make('vin_code')->label('VIN')->maxLength(255),
                                        Forms\Components\TextInput::make('engine_capacity')->label('Cilindrata')->maxLength(64),
                                        Forms\Components\TextInput::make('engine_code')->label('Codice motore')->maxLength(64),
                                        Forms\Components\TextInput::make('engine_serial_number')->label('Matricola motore')->maxLength(64),
                                        Forms\Components\TextInput::make('fiscal_horsepower')->label('Cavalli fiscali')->maxLength(64),
                                        Forms\Components\TextInput::make('power_kw')->label('Potenza kW')->numeric(),
                                        Forms\Components\TextInput::make('registration_number')->label('Numero immatricolazione')->maxLength(64),
                                        Forms\Components\TextInput::make('euro_classification')->label('Classe Euro')->maxLength(32),
                                        Forms\Components\TextInput::make('groups')->label('Gruppi')->maxLength(64),
                                        Forms\Components\TextInput::make('assigned_driver')->label('Autista assegnato')->maxLength(255),
                                        Forms\Components\DatePicker::make('first_registration_date')->label('Data prima immatricolazione'),
                                        Forms\Components\TextInput::make('ownership')->label('Proprietà')->maxLength(255),
                                        Forms\Components\TextInput::make('current_profitability')->label('Redditività attuale')->maxLength(255),
                                        Forms\Components\TextInput::make('contract_holder')->label('Intestatario contratto')->maxLength(255),
                                        Forms\Components\TextInput::make('ownership_type')->label('Tipo proprietà')->maxLength(255),
                                        Forms\Components\TextInput::make('rental_type')->label('Tipo noleggio')->maxLength(255),
                                        Forms\Components\TextInput::make('advance_paid')->label('Anticipo pagato')->numeric(),
                                        Forms\Components\TextInput::make('final_installment')->label('Maxi rata')->numeric(),
                                        Forms\Components\TextInput::make('monthly_fee')->label('Canone mensile')->numeric(),
                                        Forms\Components\DatePicker::make('contract_start_date')->label('Inizio contratto'),
                                        Forms\Components\DatePicker::make('contract_end_date')->label('Fine contratto'),
                                        Forms\Components\TextInput::make('monthly_alert')->label('Allerta mensile')->maxLength(32),
                                        Forms\Components\TextInput::make('end_alert')->label('Allerta fine')->maxLength(32),
                                        Forms\Components\TextInput::make('installment_payment_day')->label('Giorno pagamento rata')->maxLength(8),
                                        Forms\Components\TextInput::make('supplier')->label('Fornitore')->maxLength(255),
                                        Forms\Components\DatePicker::make('collection_date')->label('Data ritiro'),
                                        Forms\Components\TextInput::make('contract_duration_months')->label('Durata contratto (mesi)')->numeric(),
                                        Forms\Components\TextInput::make('contract_kilometers')->label('Km contratto')->numeric(),
                                        Forms\Components\TextInput::make('invoice_amount_excl_vat')->label('Fattura (IVA esclusa)')->numeric(),
                                        Forms\Components\TextInput::make('invoice_amount_incl_vat')->label('Fattura (IVA inclusa)')->numeric(),
                                        Forms\Components\Textarea::make('contract_equipment')->label('Dotazioni contratto'),
                                        Forms\Components\TextInput::make('tomtom')->label('TomTom')->maxLength(64),
                                        Forms\Components\TextInput::make('tires')->label('Gomme')->maxLength(64),
                                        Forms\Components\TextInput::make('returned_or_redeemed')->label('Restituito/Riscattato')->maxLength(32),
                                        Forms\Components\Textarea::make('link')->label('Link esterno'),
                                        Forms\Components\Textarea::make('external_note')->label('Nota esterno'),
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
                Tables\Columns\TextColumn::make('plate')->label('Targa')->searchable(),
                Tables\Columns\TextColumn::make('brand')->label('Marca')->searchable(),
                Tables\Columns\TextColumn::make('model')->label('Modello')->searchable(),
                Tables\Columns\TextColumn::make('year')->label('Anno')->sortable(),
                Tables\Columns\TextColumn::make('type')->label('Tipo'),
                Tables\Columns\TextColumn::make('status')->label('Stato'),
                Tables\Columns\TextColumn::make('notes')->label('Note'),
                Tables\Columns\TextColumn::make('name')->label('Nome'),
                Tables\Columns\TextColumn::make('fuel_type')->label('Tipo Carburante'),
                Tables\Columns\TextColumn::make('color')->label('Colore'),
                Tables\Columns\TextColumn::make('odometer')->label('Chilometraggio'),
                Tables\Columns\TextColumn::make('engine_hours')->label('Ore motore'),
                Tables\Columns\TextColumn::make('max_load')->label('Portata max'),
                Tables\Columns\TextColumn::make('chassis_number')->label('Numero telaio'),
                Tables\Columns\TextColumn::make('purchase_date')->label('Data acquisto')->date(),
                Tables\Columns\TextColumn::make('purchase_price')->label('Prezzo acquisto'),
                Tables\Columns\TextColumn::make('front_tire_size')->label('Misura gomme anteriori'),
                Tables\Columns\TextColumn::make('rear_tire_size')->label('Misura gomme posteriori'),
                Tables\Columns\TextColumn::make('vin_code')->label('VIN'),
                Tables\Columns\TextColumn::make('engine_capacity')->label('Cilindrata'),
                Tables\Columns\TextColumn::make('engine_code')->label('Codice motore'),
                Tables\Columns\TextColumn::make('engine_serial_number')->label('Matricola motore'),
                Tables\Columns\TextColumn::make('fiscal_horsepower')->label('Cavalli fiscali'),
                Tables\Columns\TextColumn::make('power_kw')->label('Potenza kW'),
                Tables\Columns\TextColumn::make('registration_number')->label('Numero immatricolazione'),
                Tables\Columns\TextColumn::make('euro_classification')->label('Classe Euro'),
                Tables\Columns\TextColumn::make('groups')->label('Gruppi'),
                Tables\Columns\TextColumn::make('assigned_driver')->label('Autista assegnato'),
                Tables\Columns\TextColumn::make('first_registration_date')->label('Data prima immatricolazione')->date(),
                Tables\Columns\TextColumn::make('ownership')->label('Proprietà'),
                Tables\Columns\TextColumn::make('current_profitability')->label('Redditività attuale'),
                Tables\Columns\TextColumn::make('contract_holder')->label('Intestatario contratto'),
                Tables\Columns\TextColumn::make('ownership_type')->label('Tipo proprietà'),
                Tables\Columns\TextColumn::make('rental_type')->label('Tipo noleggio'),
                Tables\Columns\TextColumn::make('advance_paid')->label('Anticipo pagato'),
                Tables\Columns\TextColumn::make('final_installment')->label('Maxi rata'),
                Tables\Columns\TextColumn::make('monthly_fee')->label('Canone mensile'),
                Tables\Columns\TextColumn::make('contract_start_date')->label('Inizio contratto')->date(),
                Tables\Columns\TextColumn::make('contract_end_date')->label('Fine contratto')->date(),
                Tables\Columns\TextColumn::make('monthly_alert')->label('Allerta mensile'),
                Tables\Columns\TextColumn::make('end_alert')->label('Allerta fine'),
                Tables\Columns\TextColumn::make('installment_payment_day')->label('Giorno pagamento rata'),
                Tables\Columns\TextColumn::make('supplier')->label('Fornitore'),
                Tables\Columns\TextColumn::make('collection_date')->label('Data ritiro')->date(),
                Tables\Columns\TextColumn::make('contract_duration_months')->label('Durata contratto (mesi)'),
                Tables\Columns\TextColumn::make('contract_kilometers')->label('Km contratto'),
                Tables\Columns\TextColumn::make('invoice_amount_excl_vat')->label('Fattura (IVA esclusa)'),
                Tables\Columns\TextColumn::make('invoice_amount_incl_vat')->label('Fattura (IVA inclusa)'),
                Tables\Columns\TextColumn::make('contract_equipment')->label('Dotazioni contratto'),
                Tables\Columns\TextColumn::make('tomtom')->label('TomTom'),
                Tables\Columns\TextColumn::make('tires')->label('Gomme'),
                Tables\Columns\TextColumn::make('returned_or_redeemed')->label('Restituito/Riscattato'),
                Tables\Columns\TextColumn::make('link')->label('Link esterno'),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('type')
                    ->options([
                        'car' => 'Automobile',
                        'van' => 'Furgone',
                        'truck' => 'Camion',
                        'bus' => 'Autobus',
                        'trailer' => 'Rimorchio',
                        'other' => 'Altro',
                    ]),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
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
            'print' => Pages\PrintVehicle::route('/{record}/print'),
        ];
    }
}