<?php

namespace App\Filament\Resources;

use App\Filament\Resources\DriverResource\Pages;
use App\Filament\Resources\DriverResource\RelationManagers;
use App\Models\Driver;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Collection;

class DriverResource extends Resource
{
    protected static ?string $model = Driver::class;

    protected static ?string $navigationIcon = 'heroicon-o-user-group';
    
    protected static ?string $navigationGroup = 'Anagrafiche';
    
    protected static ?int $navigationSort = 30;
    
    protected static ?string $modelLabel = 'Autista';
    
    protected static ?string $pluralModelLabel = 'Autisti';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Tabs::make('Tabs')
                    ->tabs([
                        Forms\Components\Tabs\Tab::make('Informazioni Personali')
                            ->schema([
                                Forms\Components\Section::make('Dati Anagrafici')
                                    ->schema([
                                        Forms\Components\TextInput::make('name')
                                            ->label('Nome')
                                            ->required()
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('surname')
                                            ->label('Cognome')
                                            ->required()
                                            ->maxLength(255),
                                        Forms\Components\DatePicker::make('birth_date')
                                            ->label('Data di Nascita')
                                            ->displayFormat('d/m/Y'),
                                        Forms\Components\TextInput::make('birth_place')
                                            ->label('Luogo di Nascita')
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('fiscal_code')
                                            ->label('Codice Fiscale')
                                            ->maxLength(16),
                                    ])->columns(2),
                                
                                Forms\Components\Section::make('Contatti')
                                    ->schema([
                                        Forms\Components\TextInput::make('email')
                                            ->label('Email')
                                            ->email()
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('phone')
                                            ->label('Telefono')
                                            ->tel()
                                            ->maxLength(255),
                                    ])->columns(2),
                                
                                Forms\Components\Section::make('Indirizzo')
                                    ->schema([
                                        Forms\Components\TextInput::make('address')
                                            ->label('Indirizzo')
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('city')
                                            ->label('Città')
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('postal_code')
                                            ->label('CAP')
                                            ->maxLength(10),
                                        Forms\Components\TextInput::make('province')
                                            ->label('Provincia')
                                            ->maxLength(2),
                                    ])->columns(2),
                            ]),
                        
                        Forms\Components\Tabs\Tab::make('Patente')
                            ->schema([
                                Forms\Components\Section::make('Dati Patente')
                                    ->schema([
                                        Forms\Components\TextInput::make('license_number')
                                            ->label('Numero Patente')
                                            ->maxLength(255),
                                        Forms\Components\Select::make('license_type')
                                            ->label('Tipo Patente')
                                            ->options([
                                                'B' => 'B - Auto',
                                                'C' => 'C - Camion',
                                                'CE' => 'CE - Camion con rimorchio',
                                                'D' => 'D - Autobus',
                                                'DE' => 'DE - Autobus con rimorchio',
                                                'CQC' => 'CQC - Carta Qualificazione Conducente',
                                            ])
                                            ->multiple(),
                                        Forms\Components\DatePicker::make('license_issue_date')
                                            ->label('Data Rilascio')
                                            ->displayFormat('d/m/Y'),
                                        Forms\Components\TextInput::make('license_issued_by')
                                            ->label('Ente Rilascio')
                                            ->maxLength(255),
                                        Forms\Components\DatePicker::make('license_expiry')
                                            ->label('Data Scadenza')
                                            ->displayFormat('d/m/Y')
                                            ->hint('La data di scadenza della patente')
                                            ->hintColor('danger')
                                            ->hintIcon('heroicon-m-exclamation-triangle')
                                            ->afterStateHydrated(function ($component, $state) {
                                                if ($state && Carbon::parse($state)->isPast()) {
                                                    $component->hintIcon('heroicon-m-exclamation-triangle');
                                                    $component->hintColor('danger');
                                                    $component->hint('Patente scaduta!');
                                                } elseif ($state && Carbon::parse($state)->diffInDays(now()) <= 30) {
                                                    $component->hintIcon('heroicon-m-exclamation-triangle');
                                                    $component->hintColor('warning');
                                                    $component->hint('Patente in scadenza entro 30 giorni!');
                                                }
                                            }),
                                    ])->columns(2),
                            ]),
                        
                        Forms\Components\Tabs\Tab::make('Informazioni Lavorative')
                            ->schema([
                                Forms\Components\Section::make('Dati Lavorativi')
                                    ->schema([
                                        Forms\Components\DatePicker::make('hire_date')
                                            ->label('Data Assunzione')
                                            ->displayFormat('d/m/Y'),
                                        Forms\Components\DatePicker::make('termination_date')
                                            ->label('Data Cessazione')
                                            ->displayFormat('d/m/Y'),
                                        Forms\Components\TextInput::make('employee_id')
                                            ->label('Matricola')
                                            ->maxLength(255),
                                        Forms\Components\Select::make('status')
                                            ->label('Stato')
                                            ->options([
                                                'active' => 'Attivo',
                                                'inactive' => 'Inattivo',
                                                'on_leave' => 'In Ferie/Permesso',
                                                'sick' => 'Malattia',
                                            ])
                                            ->default('active'),
                                    ])->columns(2),
                                
                                Forms\Components\Section::make('Note')
                                    ->schema([
                                        Forms\Components\Textarea::make('notes')
                                            ->label('Note')
                                            ->maxLength(65535)
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
                Tables\Columns\TextColumn::make('name')
                    ->label('Nome Completo')
                    ->formatStateUsing(fn ($state, $record) => "{$record->name} {$record->surname}")
                    ->searchable(['name', 'surname'])
                    ->sortable(['name', 'surname'])
                    ->description(fn ($record) => $record->employee_id ? "Matricola: {$record->employee_id}" : null),
                
                Tables\Columns\TextColumn::make('age')
                    ->label('Età')
                    ->formatStateUsing(fn ($state) => $state ? "{$state} anni" : '-')
                    ->sortable(query: function (Builder $query, string $direction): Builder {
                        return $query->orderBy('birth_date', $direction === 'desc' ? 'asc' : 'desc');
                    })
                    ->toggleable(),
                
                Tables\Columns\TextColumn::make('phone')
                    ->label('Telefono')
                    ->searchable()
                    ->toggleable(),
                
                Tables\Columns\TextColumn::make('license_type')
                    ->label('Tipo Patente')
                    ->formatStateUsing(fn ($state) => is_array($state) ? implode(', ', $state) : $state)
                    ->toggleable(),
                
                Tables\Columns\TextColumn::make('license_expiry')
                    ->label('Scadenza Patente')
                    ->date('d/m/Y')
                    ->sortable()
                    ->color(fn ($record) => 
                        $record->isLicenseExpired()
                            ? 'danger' 
                            : ($record->isLicenseExpiringSoon()
                                ? 'warning' 
                                : 'success')
                    )
                    ->icon(fn ($record) => 
                        $record->isLicenseExpired()
                            ? 'heroicon-o-exclamation-triangle'
                            : ($record->isLicenseExpiringSoon()
                                ? 'heroicon-o-clock'
                                : 'heroicon-o-check-circle')
                    )
                    ->description(fn ($record) => 
                        $record->isLicenseExpired()
                            ? 'Patente scaduta'
                            : ($record->isLicenseExpiringSoon()
                                ? 'In scadenza'
                                : null)
                    ),
                
                Tables\Columns\TextColumn::make('hire_date')
                    ->label('Data Assunzione')
                    ->date('d/m/Y')
                    ->sortable()
                    ->toggleable(),
                
                Tables\Columns\TextColumn::make('service_years')
                    ->label('Anzianità')
                    ->formatStateUsing(fn ($state) => $state !== null ? "{$state} " . ($state == 1 ? 'anno' : 'anni') : '-')
                    ->toggleable(),
                
                Tables\Columns\TextColumn::make('status')
                    ->label('Stato')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'active' => 'success',
                        'inactive' => 'danger',
                        'on_leave' => 'warning',
                        'sick' => 'gray',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'active' => 'Attivo',
                        'inactive' => 'Inattivo',
                        'on_leave' => 'In Ferie/Permesso',
                        'sick' => 'Malattia',
                        default => $state,
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
                        'active' => 'Attivo',
                        'inactive' => 'Inattivo',
                        'on_leave' => 'In Ferie/Permesso',
                        'sick' => 'Malattia',
                    ])
                    ->multiple(),
                
                Tables\Filters\Filter::make('license_expired')
                    ->label('Patente Scaduta')
                    ->query(fn (Builder $query): Builder => $query->whereDate('license_expiry', '<', now())),
                
                Tables\Filters\Filter::make('license_expiring_soon')
                    ->label('Patente in Scadenza')
                    ->query(fn (Builder $query): Builder => 
                        $query->whereDate('license_expiry', '>=', now())
                             ->whereDate('license_expiry', '<=', now()->addDays(30))
                    ),
                
                Tables\Filters\SelectFilter::make('license_type')
                    ->label('Tipo Patente')
                    ->options([
                        'B' => 'B - Auto',
                        'C' => 'C - Camion',
                        'CE' => 'CE - Camion con rimorchio',
                        'D' => 'D - Autobus',
                        'DE' => 'DE - Autobus con rimorchio',
                        'CQC' => 'CQC - Carta Qualificazione Conducente',
                    ])
                    ->query(function (Builder $query, array $data) {
                        if (empty($data['values'])) {
                            return $query;
                        }
                        
                        return $query->where(function (Builder $query) use ($data) {
                            foreach ($data['values'] as $value) {
                                $query->orWhereJsonContains('license_type', $value);
                            }
                        });
                    })
                    ->multiple(),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\ActionGroup::make([
                    Tables\Actions\Action::make('print_details')
                        ->label('Stampa Scheda')
                        ->icon('heroicon-o-printer')
                        ->url(fn ($record) => route('filament.admin.resources.drivers.print', $record))
                        ->openUrlInNewTab(),
                    
                    Tables\Actions\Action::make('change_status')
                        ->label('Cambia Stato')
                        ->icon('heroicon-o-arrow-path')
                        ->form([
                            Forms\Components\Select::make('status')
                                ->label('Nuovo Stato')
                                ->options([
                                    'active' => 'Attivo',
                                    'inactive' => 'Inattivo',
                                    'on_leave' => 'In Ferie/Permesso',
                                    'sick' => 'Malattia',
                                ])
                                ->required(),
                            Forms\Components\Textarea::make('note')
                                ->label('Nota')
                                ->placeholder('Inserisci una nota opzionale sul cambio di stato'),
                        ])
                        ->action(function (Driver $record, array $data): void {
                            $oldStatus = $record->status;
                            $record->status = $data['status'];
                            
                            if (!empty($data['note'])) {
                                $statusNote = "Cambio stato da " . match ($oldStatus) {
                                    'active' => 'Attivo',
                                    'inactive' => 'Inattivo',
                                    'on_leave' => 'In Ferie/Permesso',
                                    'sick' => 'Malattia',
                                    default => $oldStatus,
                                } . " a " . match ($data['status']) {
                                    'active' => 'Attivo',
                                    'inactive' => 'Inattivo',
                                    'on_leave' => 'In Ferie/Permesso',
                                    'sick' => 'Malattia',
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
                                    'active' => 'Attivo',
                                    'inactive' => 'Inattivo',
                                    'on_leave' => 'In Ferie/Permesso',
                                    'sick' => 'Malattia',
                                ])
                                ->required(),
                        ])
                        ->action(function (Collection $records, array $data): void {
                            $records->each(function ($record) use ($data) {
                                $record->status = $data['status'];
                                $record->save();
                            });
                            
                            Filament\Notifications\Notification::make()
                                ->title('Stato aggiornato per ' . $records->count() . ' autisti')
                                ->success()
                                ->send();
                        }),
                    
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('name', 'asc');
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\ActivitiesRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListDrivers::route('/'),
            'create' => Pages\CreateDriver::route('/create'),
            'edit' => Pages\EditDriver::route('/{record}/edit'),
            'print' => Pages\PrintDriver::route('/{record}/print'),
        ];
    }
}