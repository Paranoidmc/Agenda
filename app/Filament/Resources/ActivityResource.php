<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ActivityResource\Pages;
use App\Filament\Resources\ActivityResource\RelationManagers;
use App\Models\Activity;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class ActivityResource extends Resource
{
    protected static ?string $model = Activity::class;

    protected static ?string $navigationIcon = 'heroicon-o-clipboard-document-list';
    
    protected static ?string $navigationGroup = 'Pianificazione';
    
    protected static ?int $navigationSort = 20;
    
    protected static ?string $modelLabel = 'Attività';
    
    protected static ?string $pluralModelLabel = 'Attività';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Informazioni Attività')
                    ->schema([
                        Forms\Components\DateTimePicker::make('data_inizio')
                            ->label('Data/Ora Inizio')
                            ->required(),
                        Forms\Components\DateTimePicker::make('data_fine')
                            ->label('Data/Ora Fine'),
                        Forms\Components\Select::make('activity_type_id')
                            ->label('Tipo Attività')
                            ->relationship('activityType', 'name')
                            ->required()
                            ->searchable()
                            ->preload(),
                        Forms\Components\Select::make('status')
                            ->label('Stato')
                            ->options([
                                'planned' => 'Non assegnato',
                                'in_progress' => 'Assegnato',
                                'doc_issued' => 'Doc Emesso',
                                'completed' => 'Completato',
                                'cancelled' => 'Annullato',
                            ])
                            ->default('planned')
                            ->required(),
                    ])->columns(2),
                
                Forms\Components\Section::make('Assegnazione')
                    ->schema([
                        Forms\Components\Select::make('driver_id')
                            ->label('Autista')
                            ->nullable()
                            ->relationship('driver', 'name', function (Builder $query) {
                                return $query->where('status', 'active');
                            })
                            ->getOptionLabelFromRecordUsing(fn (Model $record) => "{$record->name} {$record->surname}")
                            ->searchable()
                            ->preload(),
                        Forms\Components\Select::make('vehicle_id')
                            ->label('Veicolo')
                            ->nullable()
                            ->relationship('vehicle', 'targa', function (Builder $query) {
                                return $query->where('status', 'active');
                            })
                            ->searchable()
                            ->preload(),
                Forms\Components\Section::make('Cliente e Cantiere')
                    ->schema([
                        Forms\Components\Select::make('client_id')
                            ->label('Cliente')
                            ->relationship('client', 'name')
                            ->required()
                            ->searchable()
                            ->preload()
                            ->live()
                            ->afterStateUpdated(function (Forms\Set $set) {
                                $set('site_id', null);
                            }),
                        Forms\Components\Select::make('site_id')
                            ->label('Cantiere')
                            ->relationship('site', 'name', function (Builder $query, Forms\Get $get) {
                                return $query->where('client_id', $get('client_id'));
                            })
                            ->required()
                            ->searchable()
                            ->preload()
                            ->disabled(fn (Forms\Get $get) => !$get('client_id')),
                    ])->columns(2),
                
                Forms\Components\Section::make('Dettagli')
                    ->schema([
                        Forms\Components\TextInput::make('start_location')
                            ->label('Luogo di Partenza')
                            ->maxLength(255),
                        Forms\Components\TextInput::make('end_location')
                            ->label('Luogo di Arrivo')
                            ->maxLength(255),
                        Forms\Components\Textarea::make('notes')
                            ->label('Note')
                            ->maxLength(65535)
                            ->columnSpanFull(),
                    ])->columns(2)
            ])
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('data_inizio')
                    ->label('Data/Ora Inizio')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
                Tables\Columns\TextColumn::make('data_fine')
                    ->label('Data/Ora Fine')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
                Tables\Columns\TextColumn::make('driver.name')
                    ->label('Autista')
                    ->formatStateUsing(fn ($state, $record) => $record->driver ? "{$record->driver->name} {$record->driver->surname}" : '')
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
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'planned' => 'Non assegnato',
                        'in_progress' => 'Assegnato',
                        'doc_issued' => 'Doc Emesso',
                        'completed' => 'Completato',
                        'cancelled' => 'Annullato',
                        default => $state,
                    })
                    ->color(fn (string $state): string => match ($state) {
                        'planned' => 'info', // Azzurro
                        'in_progress' => 'warning', // Giallo
                        'doc_issued' => 'danger', // Rosso
                        'completed' => 'success', // Verde
                        'cancelled' => 'gray', // Rosa (usiamo gray perché non c'è un colore rosa predefinito)
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
                Tables\Filters\Filter::make('date_range')
                    ->form([
                        Forms\Components\DatePicker::make('date_from')
                            ->label('Da'),
                        Forms\Components\DatePicker::make('date_to')
                            ->label('A'),
                    ])
                    ->query(function (Builder $query, array $data) {
                        if ($data['date_from']) {
                            $query->whereDate('data_inizio', '>=', $data['date_from']);
                        }
                        if ($data['date_to']) {
                            $query->whereDate('data_inizio', '<=', $data['date_to']);
                        }
                    }),
                Tables\Filters\SelectFilter::make('driver_id')
                    ->label('Autista')
                    ->relationship('driver', 'name')
                    ->getOptionLabelFromRecordUsing(fn (Model $record) => "{$record->name} {$record->surname}"),
                Tables\Filters\SelectFilter::make('vehicle_id')
                    ->label('Veicolo')
                    ->relationship('vehicle', 'plate'),
                Tables\Filters\SelectFilter::make('client_id')
                    ->label('Cliente')
                    ->relationship('client', 'name'),
                Tables\Filters\SelectFilter::make('status')
                    ->label('Stato')
                    ->options([
                        'planned' => 'Non assegnato',
                        'in_progress' => 'Assegnato',
                        'doc_issued' => 'Doc Emesso',
                        'completed' => 'Completato',
                        'cancelled' => 'Annullato',
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
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListActivities::route('/'),
            'create' => Pages\CreateActivity::route('/create'),
            'edit' => Pages\EditActivity::route('/{record}/edit'),
        ];
    }
}