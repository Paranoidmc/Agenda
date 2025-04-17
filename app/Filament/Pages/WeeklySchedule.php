<?php

namespace App\Filament\Pages;

use App\Models\Activity;
use App\Models\Driver;
use App\Models\Vehicle;
use Carbon\Carbon;
use Filament\Pages\Page;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Grid;
use Filament\Forms\Form;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Actions\Action;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\WeeklyScheduleExport;
use Filament\Notifications\Notification;
use Illuminate\Support\Collection;
use Illuminate\Support\HtmlString;
use Illuminate\Database\Eloquent\Builder;

class WeeklySchedule extends Page implements HasForms
{
    use InteractsWithForms;

    protected static ?string $navigationIcon = 'heroicon-o-calendar';

    protected static string $view = 'filament.pages.weekly-schedule';
    
    protected static ?string $navigationLabel = 'Agenda Settimanale';
    
    protected static ?string $title = 'Agenda Settimanale';
    
    protected static ?string $navigationGroup = 'Pianificazione';
    
    protected static ?int $navigationSort = 10;

    public ?array $data = [];
    
    public $startDate;
    public $endDate;
    public $selectedDriver = null;
    public $selectedVehicle = null;
    public $selectedClient = null;
    public $viewMode = 'driver'; // 'driver', 'vehicle' o 'activity'
    
    public $activities = [];
    public $drivers = [];
    public $vehicles = [];
    public $clients = [];
    public $weekDays = [];
    public $timeSlots = [
        'morning' => 'Slot 1',
        'afternoon' => 'Slot 2',
        'full_day' => 'Slot 3',
    ];

    public function exportExcel()
    {
        // Prepara i dati per la tabella export
        $rows = [];
        if ($this->viewMode === 'driver') {
            foreach ($this->drivers as $driver) {
                $row = ['label' => $driver->name, 'days' => []];
                foreach ($this->weekDays as $day) {
                    $cell = [];
                    foreach ($this->timeSlots as $slotKey => $slotName) {
                        // Qui $day può essere array o oggetto, quindi usiamo ->date se oggetto, altrimenti ['date']
                        $date = is_array($day) ? $day['date'] : $day->date;
                        $activity = $this->getActivityForSlot($date, $slotKey, $driver->id);
                        if ($activity) {
                            $cell[] = [
                                'activityType' => isset($activity->activityType) && is_object($activity->activityType) ? $activity->activityType->name : '',
                                'client' => isset($activity->client) && is_object($activity->client) ? $activity->client->name : '',
                                'site' => isset($activity->site) && is_object($activity->site) ? $activity->site->name : '',
                                'vehicle' => isset($activity->vehicle) && is_object($activity->vehicle) ? $activity->vehicle->plate : '',
                                'slot' => isset($this->timeSlots[$activity->time_slot]) ? $this->timeSlots[$activity->time_slot] : $activity->time_slot,
                            ];
                        }
                    }
                    $row['days'][] = $cell;
                }
                $rows[] = $row;
            }
        }
        // Puoi aggiungere anche per vehicle e activity viewMode se serve
        return Excel::download(new WeeklyScheduleExport([
            'weekDays' => $this->weekDays,
            'rows' => $rows,
        ]), 'agenda-settimanale.xlsx');
    }

    public function mount(): void
    {
        // Imposta la settimana corrente come default
        $this->startDate = Carbon::now()->startOfWeek()->format('Y-m-d');
        $this->endDate = Carbon::now()->endOfWeek()->format('Y-m-d');
        
        $this->loadData();
        
        $this->form->fill();
    }
    
    public function loadData(): void
    {
        // Carica i giorni della settimana
        $this->weekDays = $this->getWeekDays();
        
        // Carica autisti e veicoli - convert to array to avoid Livewire serialization issues
        $this->drivers = Driver::where('status', 'active')->get()->map(function($driver) {
            return (object) [
                'id' => $driver->id,
                'name' => $driver->name . ' ' . $driver->surname
            ];
        })->values()->all();
        
        $this->vehicles = Vehicle::where('status', 'operational')->get()->map(function($vehicle) {
            return (object) [
                'id' => $vehicle->id,
                'plate' => $vehicle->plate,
                'model' => $vehicle->model
            ];
        })->values()->all();
        
        // Carica i clienti
        $this->clients = \App\Models\Client::with('sites')
            ->get()
            ->map(function($client) {
                return (object) [
                    'id' => $client->id,
                    'name' => $client->name,
                    'sites' => $client->sites->map(function($site) {
                        return (object) [
                            'id' => $site->id,
                            'name' => $site->name
                        ];
                    })->values()->all()
                ];
            })->values()->all();
        
        // Carica le attività per la settimana selezionata
        $query = Activity::whereBetween('date', [$this->startDate, $this->endDate])
            ->with(['driver', 'vehicle', 'client', 'site', 'activityType']);
            
        // Filtra per autista, veicolo o cliente se selezionati
        if ($this->selectedDriver && $this->viewMode === 'driver') {
            $query->where('driver_id', $this->selectedDriver);
        }
        
        if ($this->selectedVehicle && $this->viewMode === 'vehicle') {
            $query->where('vehicle_id', $this->selectedVehicle);
        }
        
        if ($this->selectedClient && $this->viewMode === 'activity') {
            $query->where('client_id', $this->selectedClient);
        }
        
        // Get activities and manually process them to avoid Livewire serialization issues
        $activities = $query->get();
        
        // Reset activities array
        $this->activities = [];
        
        // Manually group activities by date
        foreach ($activities as $activity) {
            $dateKey = $activity->date->format('Y-m-d');
            
            if (!isset($this->activities[$dateKey])) {
                $this->activities[$dateKey] = [];
            }
            
            // Store only the necessary data
            $this->activities[$dateKey][] = [
                'id' => $activity->id,
                'time_slot' => $activity->time_slot,
                'driver_id' => $activity->driver_id,
                'vehicle_id' => $activity->vehicle_id,
                'client_id' => $activity->client_id,
                'site_id' => $activity->site_id,
                'status' => $activity->status,
                'activityType' => [
                    'name' => $activity->activityType->name ?? 'N/A'
                ],
                'client' => [
                    'name' => $activity->client->name ?? 'N/A'
                ],
                'site' => [
                    'name' => $activity->site->name ?? 'N/A'
                ],
                'driver' => $activity->driver ? [
                    'name' => $activity->driver->name . ' ' . $activity->driver->surname
                ] : null,
                'vehicle' => $activity->vehicle ? [
                    'plate' => $activity->vehicle->plate
                ] : null
            ];
        }
    }
    
    protected function getWeekDays(): array
    {
        $days = [];
        $startDate = Carbon::parse($this->startDate);
        
        for ($i = 0; $i < 7; $i++) {
            $date = $startDate->copy()->addDays($i);
            $days[$date->format('Y-m-d')] = [
                'date' => $date->format('Y-m-d'),
                'day_name' => $date->locale('it')->isoFormat('dddd'),
                'day_number' => $date->format('d'),
                'month' => $date->locale('it')->isoFormat('MMMM'),
                'is_today' => $date->isToday(),
            ];
        }
        
        return $days;
    }
    
    public function previousWeek(): void
    {
        $this->startDate = Carbon::parse($this->startDate)->subWeek()->format('Y-m-d');
        $this->endDate = Carbon::parse($this->endDate)->subWeek()->format('Y-m-d');
        $this->loadData();
    }
    
    public function nextWeek(): void
    {
        $this->startDate = Carbon::parse($this->startDate)->addWeek()->format('Y-m-d');
        $this->endDate = Carbon::parse($this->endDate)->addWeek()->format('Y-m-d');
        $this->loadData();
    }
    
    public function currentWeek(): void
    {
        $this->startDate = Carbon::now()->startOfWeek()->format('Y-m-d');
        $this->endDate = Carbon::now()->endOfWeek()->format('Y-m-d');
        $this->loadData();
    }
    
    public function setViewMode(string $mode): void
    {
        $this->viewMode = $mode;
        $this->selectedDriver = null;
        $this->selectedVehicle = null;
        $this->selectedClient = null;
        $this->loadData();
    }
    
    public function updatedSelectedClient(): void
    {
        $this->loadData();
    }
    
    public function updatedSelectedDriver(): void
    {
        $this->loadData();
    }
    
    public function updatedSelectedVehicle(): void
    {
        $this->loadData();
    }
    
    public function getActivityForSlot($date, $timeSlot, $resourceId): ?object
    {
        if (!isset($this->activities[$date])) {
            return null;
        }
        
        foreach ($this->activities[$date] as $activityData) {
            if ($activityData['time_slot'] === $timeSlot) {
                if ($this->viewMode === 'driver' && $activityData['driver_id'] == $resourceId) {
                    // Convert array to object for blade template compatibility
                    return json_decode(json_encode($activityData));
                } elseif ($this->viewMode === 'vehicle' && $activityData['vehicle_id'] == $resourceId) {
                    // Convert array to object for blade template compatibility
                    return json_decode(json_encode($activityData));
                } elseif ($this->viewMode === 'activity' && $activityData['client_id'] == $resourceId) {
                    // Convert array to object for blade template compatibility
                    return json_decode(json_encode($activityData));
                }
            }
        }
        
        return null;
    }
    
    public function getActivitiesForClientSite($date, $clientId, $siteId = null): array
    {
        if (!isset($this->activities[$date])) {
            return [];
        }
        
        $result = [];
        foreach ($this->activities[$date] as $activityData) {
            if ($activityData['client_id'] == $clientId) {
                if ($siteId === null || $activityData['site_id'] == $siteId) {
                    $result[] = json_decode(json_encode($activityData));
                }
            }
        }
        
        return $result;
    }
    
    public function getStatusColor($status): string
    {
        return match ($status) {
            'planned' => 'bg-blue-100 border-blue-500 text-blue-800',
            'in_progress' => 'bg-yellow-100 border-yellow-500 text-yellow-800',
            'completed' => 'bg-green-100 border-green-500 text-green-800',
            'cancelled' => 'bg-red-100 border-red-500 text-red-800',
            default => 'bg-gray-100 border-gray-500 text-gray-800',
        };
    }
    
    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Grid::make(2)
                    ->schema([
                        Select::make('selectedDriver')
                            ->label('Filtra per Autista')
                            ->options(Driver::where('status', 'active')
                                ->get()
                                ->mapWithKeys(function ($driver) {
                                    return [$driver->id => $driver->name . ' ' . $driver->surname];
                                }))
                            ->placeholder('Tutti gli autisti')
                            ->live()
                            ->hidden(fn () => $this->viewMode !== 'driver'),
                            
                        Select::make('selectedVehicle')
                            ->label('Filtra per Veicolo')
                            ->options(Vehicle::where('status', 'operational')->pluck('plate', 'id'))
                            ->placeholder('Tutti i veicoli')
                            ->live()
                            ->hidden(fn () => $this->viewMode !== 'vehicle'),
                            
                        Select::make('selectedClient')
                            ->label('Filtra per Cliente')
                            ->options(\App\Models\Client::pluck('name', 'id'))
                            ->placeholder('Tutti i clienti')
                            ->live()
                            ->hidden(fn () => $this->viewMode !== 'activity'),
                    ]),
            ]);
    }
    
    public function createActivity($date, $timeSlot, $resourceId, $siteId = null): void
    {
        $params = [
            'date' => $date,
            'time_slot' => $timeSlot,
        ];
        
        if ($this->viewMode === 'driver') {
            $params['driver_id'] = $resourceId;
        } elseif ($this->viewMode === 'vehicle') {
            $params['vehicle_id'] = $resourceId;
        } elseif ($this->viewMode === 'activity') {
            $params['client_id'] = $resourceId;
            if ($siteId) {
                $params['site_id'] = $siteId;
            }
        }
        
        $url = route('filament.admin.resources.activities.create', ['query' => $params]);
        $this->redirect($url);
    }
    
    protected function getHeaderActions(): array
    {
        return [
            // Prima riga pulsanti
            Action::make('previousWeek')
                ->label('Settimana Precedente')
                ->icon('heroicon-o-arrow-left')
                ->action('previousWeek'),
                
            Action::make('currentWeek')
                ->label('Settimana Corrente')
                ->icon('heroicon-o-calendar')
                ->action('currentWeek'),
                
            Action::make('nextWeek')
                ->label('Settimana Successiva')
                ->icon('heroicon-o-arrow-right')
                ->action('nextWeek'),
                
            Action::make('viewDrivers')
                ->label('Vista Autisti')
                ->icon('heroicon-o-user-group')
                ->color(fn () => $this->viewMode === 'driver' ? 'primary' : 'gray')
                ->action(fn () => $this->setViewMode('driver')),
                
            Action::make('viewVehicles')
                ->label('Vista Veicoli')
                ->icon('heroicon-o-truck')
                ->color(fn () => $this->viewMode === 'vehicle' ? 'primary' : 'gray')
                ->action(fn () => $this->setViewMode('vehicle')),
                
            Action::make('viewActivities')
                ->label('Vista Attività')
                ->icon('heroicon-o-clipboard-document-list')
                ->color(fn () => $this->viewMode === 'activity' ? 'primary' : 'gray')
                ->action(fn () => $this->setViewMode('activity')),
                
            Action::make('newActivity')
                ->label('Nuova Attività')
                ->icon('heroicon-o-plus')
                ->url(route('filament.admin.resources.activities.create')),
            // Seconda riga pulsanti
            Action::make('exportExcel')
                ->label('Esporta Excel')
                ->icon('heroicon-o-arrow-down-tray')
                ->action('exportExcel')
                ->color('success'),
        ];
    }
}