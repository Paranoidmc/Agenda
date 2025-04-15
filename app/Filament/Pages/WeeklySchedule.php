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
    public $viewMode = 'driver'; // 'driver' o 'vehicle'
    
    public $activities = [];
    public $drivers = [];
    public $vehicles = [];
    public $weekDays = [];
    public $timeSlots = [
        'morning' => 'Mattina',
        'afternoon' => 'Pomeriggio',
        'full_day' => 'Giornata Intera',
    ];

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
                'name' => $driver->name
            ];
        })->values()->all();
        
        $this->vehicles = Vehicle::where('status', 'operational')->get()->map(function($vehicle) {
            return (object) [
                'id' => $vehicle->id,
                'plate' => $vehicle->plate,
                'model' => $vehicle->model
            ];
        })->values()->all();
        
        // Carica le attività per la settimana selezionata
        $query = Activity::whereBetween('date', [$this->startDate, $this->endDate])
            ->with(['driver', 'vehicle', 'client', 'site', 'activityType']);
            
        // Filtra per autista o veicolo se selezionati
        if ($this->selectedDriver) {
            $query->where('driver_id', $this->selectedDriver);
        }
        
        if ($this->selectedVehicle) {
            $query->where('vehicle_id', $this->selectedVehicle);
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
                    'name' => $activity->driver->name
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
    
    public function toggleViewMode(): void
    {
        $this->viewMode = $this->viewMode === 'driver' ? 'vehicle' : 'driver';
        $this->selectedDriver = null;
        $this->selectedVehicle = null;
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
                }
            }
        }
        
        return null;
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
                            ->options(Driver::where('status', 'active')->pluck('name', 'id'))
                            ->placeholder('Tutti gli autisti')
                            ->live()
                            ->hidden(fn () => $this->viewMode !== 'driver'),
                            
                        Select::make('selectedVehicle')
                            ->label('Filtra per Veicolo')
                            ->options(Vehicle::where('status', 'operational')->pluck('plate', 'id'))
                            ->placeholder('Tutti i veicoli')
                            ->live()
                            ->hidden(fn () => $this->viewMode !== 'vehicle'),
                    ]),
            ]);
    }
    
    public function createActivity($date, $timeSlot, $resourceId): void
    {
        $params = [
            'date' => $date,
            'time_slot' => $timeSlot,
        ];
        
        if ($this->viewMode === 'driver') {
            $params['driver_id'] = $resourceId;
        } else {
            $params['vehicle_id'] = $resourceId;
        }
        
        $url = route('filament.admin.resources.activities.create', ['query' => $params]);
        $this->redirect($url);
    }
    
    protected function getHeaderActions(): array
    {
        return [
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
                
            Action::make('toggleView')
                ->label(fn () => $this->viewMode === 'driver' ? 'Vista Veicoli' : 'Vista Autisti')
                ->icon(fn () => $this->viewMode === 'driver' ? 'heroicon-o-truck' : 'heroicon-o-user-group')
                ->action('toggleViewMode'),
                
            Action::make('newActivity')
                ->label('Nuova Attività')
                ->icon('heroicon-o-plus')
                ->url(route('filament.admin.resources.activities.create')),
        ];
    }
}