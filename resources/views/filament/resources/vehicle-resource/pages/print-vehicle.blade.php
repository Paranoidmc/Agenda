<x-filament-panels::page>
    <div class="print:block print:m-0 print:p-0 print:shadow-none">
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-2xl font-bold">Scheda Veicolo</h1>
            <button onclick="window.print()" class="print:hidden px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                <span class="flex items-center gap-2">
                    <x-heroicon-o-printer class="w-5 h-5" />
                    Stampa
                </span>
            </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div class="bg-white rounded-xl shadow p-6">
                <h2 class="text-xl font-semibold mb-4 border-b pb-2">Informazioni Generali</h2>
                <div class="space-y-3">
                    <div>
                        <h3 class="text-lg font-medium">{{ $record->brand }} {{ $record->model }}</h3>
                        <p class="text-gray-600">Targa: <span class="font-semibold">{{ $record->plate }}</span></p>
                        @if($record->year)
                            <p class="text-gray-600">Anno: {{ $record->year }} 
                                @if($record->age) ({{ $record->age }} anni) @endif
                            </p>
                        @endif
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        @if($record->type)
                            <div>
                                <h4 class="font-medium">Tipo</h4>
                                <p class="text-gray-600">{{ match($record->type) {
                                    'car' => 'Automobile',
                                    'van' => 'Furgone',
                                    'truck' => 'Camion',
                                    'bus' => 'Autobus',
                                    'trailer' => 'Rimorchio',
                                    'other' => 'Altro',
                                    default => $record->type,
                                } }}</p>
                            </div>
                        @endif
                        
                        @if($record->color)
                            <div>
                                <h4 class="font-medium">Colore</h4>
                                <p class="text-gray-600">{{ $record->color }}</p>
                            </div>
                        @endif
                        
                        @if($record->fuel_type)
                            <div>
                                <h4 class="font-medium">Carburante</h4>
                                <p class="text-gray-600">{{ match($record->fuel_type) {
                                    'petrol' => 'Benzina',
                                    'diesel' => 'Diesel',
                                    'lpg' => 'GPL',
                                    'methane' => 'Metano',
                                    'hybrid' => 'Ibrido',
                                    'electric' => 'Elettrico',
                                    'other' => 'Altro',
                                    default => $record->fuel_type,
                                } }}</p>
                            </div>
                        @endif
                        
                        @if($record->seats)
                            <div>
                                <h4 class="font-medium">Posti</h4>
                                <p class="text-gray-600">{{ $record->seats }}</p>
                            </div>
                        @endif
                    </div>
                    
                    @if($record->vin || $record->engine_number)
                        <div class="grid grid-cols-2 gap-4">
                            @if($record->vin)
                                <div>
                                    <h4 class="font-medium">Numero Telaio (VIN)</h4>
                                    <p class="text-gray-600">{{ $record->vin }}</p>
                                </div>
                            @endif
                            
                            @if($record->engine_number)
                                <div>
                                    <h4 class="font-medium">Numero Motore</h4>
                                    <p class="text-gray-600">{{ $record->engine_number }}</p>
                                </div>
                            @endif
                        </div>
                    @endif
                    
                    @if($record->weight || $record->max_load)
                        <div class="grid grid-cols-2 gap-4">
                            @if($record->weight)
                                <div>
                                    <h4 class="font-medium">Peso</h4>
                                    <p class="text-gray-600">{{ number_format($record->weight, 0, ',', '.') }} kg</p>
                                </div>
                            @endif
                            
                            @if($record->max_load)
                                <div>
                                    <h4 class="font-medium">Portata Massima</h4>
                                    <p class="text-gray-600">{{ number_format($record->max_load, 0, ',', '.') }} kg</p>
                                </div>
                            @endif
                        </div>
                    @endif
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow p-6">
                <h2 class="text-xl font-semibold mb-4 border-b pb-2">Stato Operativo</h2>
                <div class="space-y-3">
                    <div>
                        <h4 class="font-medium">Stato</h4>
                        <p>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                {{ match($record->status) {
                                    'operational' => 'bg-green-100 text-green-800',
                                    'maintenance' => 'bg-yellow-100 text-yellow-800',
                                    'out_of_service' => 'bg-red-100 text-red-800',
                                    'reserved' => 'bg-blue-100 text-blue-800',
                                    'inactive' => 'bg-gray-100 text-gray-800',
                                    default => 'bg-gray-100 text-gray-800',
                                } }}">
                                {{ match($record->status) {
                                    'operational' => 'Operativo',
                                    'maintenance' => 'In Manutenzione',
                                    'out_of_service' => 'Fuori Servizio',
                                    'reserved' => 'Riservato',
                                    'inactive' => 'Inattivo',
                                    default => $record->status,
                                } }}
                            </span>
                        </p>
                    </div>
                    
                    @if($record->odometer)
                        <div>
                            <h4 class="font-medium">Contachilometri</h4>
                            <p class="text-gray-600">{{ number_format($record->odometer, 0, ',', '.') }} km</p>
                        </div>
                    @endif
                    
                    @if($record->last_maintenance_date || $record->last_maintenance_odometer)
                        <div>
                            <h4 class="font-medium">Ultima Manutenzione</h4>
                            @if($record->last_maintenance_date)
                                <p class="text-gray-600">Data: {{ $record->last_maintenance_date->format('d/m/Y') }}</p>
                            @endif
                            @if($record->last_maintenance_odometer)
                                <p class="text-gray-600">Km: {{ number_format($record->last_maintenance_odometer, 0, ',', '.') }}</p>
                            @endif
                        </div>
                    @endif
                    
                    @if($record->maintenance_interval_km || $record->maintenance_interval_months)
                        <div>
                            <h4 class="font-medium">Intervalli Manutenzione</h4>
                            @if($record->maintenance_interval_km)
                                <p class="text-gray-600">Ogni {{ number_format($record->maintenance_interval_km, 0, ',', '.') }} km</p>
                            @endif
                            @if($record->maintenance_interval_months)
                                <p class="text-gray-600">Ogni {{ $record->maintenance_interval_months }} mesi</p>
                            @endif
                        </div>
                    @endif
                    
                    @if($record->isMaintenanceNeeded())
                        <div>
                            <h4 class="font-medium text-red-600">Manutenzione Necessaria</h4>
                            @if($record->isMaintenanceNeededByKm())
                                <p class="text-red-600">Superato intervallo km</p>
                            @endif
                            @if($record->isMaintenanceNeededByTime())
                                <p class="text-red-600">Superato intervallo temporale</p>
                            @endif
                        </div>
                    @elseif($record->km_to_next_maintenance !== null || $record->days_to_next_maintenance !== null)
                        <div>
                            <h4 class="font-medium">Prossima Manutenzione</h4>
                            @if($record->km_to_next_maintenance !== null)
                                <p class="text-gray-600">Tra {{ number_format($record->km_to_next_maintenance, 0, ',', '.') }} km</p>
                            @endif
                            @if($record->days_to_next_maintenance !== null)
                                <p class="text-gray-600">Tra {{ $record->days_to_next_maintenance }} giorni</p>
                            @endif
                        </div>
                    @endif
                </div>
            </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div class="bg-white rounded-xl shadow p-6">
                <h2 class="text-xl font-semibold mb-4 border-b pb-2">Dati Amministrativi</h2>
                <div class="space-y-3">
                    @if($record->registration_date)
                        <div>
                            <h4 class="font-medium">Data Immatricolazione</h4>
                            <p class="text-gray-600">{{ $record->registration_date->format('d/m/Y') }}</p>
                        </div>
                    @endif
                    
                    @if($record->purchase_date || $record->purchase_price)
                        <div>
                            <h4 class="font-medium">Acquisto</h4>
                            @if($record->purchase_date)
                                <p class="text-gray-600">Data: {{ $record->purchase_date->format('d/m/Y') }}</p>
                            @endif
                            @if($record->purchase_price)
                                <p class="text-gray-600">Prezzo: € {{ number_format($record->purchase_price, 2, ',', '.') }}</p>
                            @endif
                        </div>
                    @endif
                    
                    @if($record->owner)
                        <div>
                            <h4 class="font-medium">Proprietario</h4>
                            <p class="text-gray-600">{{ $record->owner }}</p>
                        </div>
                    @endif
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow p-6">
                <h2 class="text-xl font-semibold mb-4 border-b pb-2">Assicurazione</h2>
                <div class="space-y-3">
                    @if($record->insurance_company)
                        <div>
                            <h4 class="font-medium">Compagnia</h4>
                            <p class="text-gray-600">{{ $record->insurance_company }}</p>
                        </div>
                    @endif
                    
                    @if($record->insurance_policy_number)
                        <div>
                            <h4 class="font-medium">Numero Polizza</h4>
                            <p class="text-gray-600">{{ $record->insurance_policy_number }}</p>
                        </div>
                    @endif
                    
                    @if($record->insurance_expiry)
                        <div>
                            <h4 class="font-medium">Scadenza</h4>
                            <p class="text-gray-600 {{ $record->isInsuranceExpired() ? 'text-red-600 font-bold' : ($record->isInsuranceExpiringSoon() ? 'text-yellow-600 font-bold' : '') }}">
                                {{ $record->insurance_expiry->format('d/m/Y') }}
                                @if($record->isInsuranceExpired())
                                    <span class="text-red-600">(Scaduta)</span>
                                @elseif($record->isInsuranceExpiringSoon())
                                    <span class="text-yellow-600">(In scadenza)</span>
                                @endif
                            </p>
                        </div>
                    @endif
                </div>
            </div>
        </div>
        
        <div class="bg-white rounded-xl shadow p-6 mb-6">
            <h2 class="text-xl font-semibold mb-4 border-b pb-2">Scadenze</h2>
            @php
                $activeDeadlines = $record->active_deadlines;
            @endphp
            
            @if($activeDeadlines->count() > 0)
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr>
                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scadenza</th>
                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Promemoria</th>
                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            @foreach($activeDeadlines as $deadline)
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {{ $deadline->type }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {{ $deadline->expiry_date->format('d/m/Y') }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {{ $deadline->reminder_date ? $deadline->reminder_date->format('d/m/Y') : '-' }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            {{ match($deadline->status) {
                                                'active' => 'bg-green-100 text-green-800',
                                                'expired' => 'bg-red-100 text-red-800',
                                                'completed' => 'bg-blue-100 text-blue-800',
                                                default => 'bg-gray-100 text-gray-800',
                                            } }}">
                                            {{ match($deadline->status) {
                                                'active' => 'Attiva',
                                                'expired' => 'Scaduta',
                                                'completed' => 'Completata',
                                                default => $deadline->status,
                                            } }}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-sm text-gray-900">
                                        {{ $deadline->notes ?? '-' }}
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            @else
                <p class="text-gray-500">Nessuna scadenza attiva.</p>
            @endif
        </div>
        
        @if($record->notes)
            <div class="bg-white rounded-xl shadow p-6 mb-6">
                <h2 class="text-xl font-semibold mb-4 border-b pb-2">Note</h2>
                <div class="prose max-w-none">
                    <p class="whitespace-pre-line">{{ $record->notes }}</p>
                </div>
            </div>
        @endif
        
        <div class="bg-white rounded-xl shadow p-6 mb-6">
            <h2 class="text-xl font-semibold mb-4 border-b pb-2">Attività Recenti</h2>
            @php
                $recentActivities = $record->activities()->with(['driver', 'client', 'site'])->orderBy('date', 'desc')->limit(5)->get();
            @endphp
            
            @if($recentActivities->count() > 0)
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr>
                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantiere</th>
                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Autista</th>
                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            @foreach($recentActivities as $activity)
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {{ $activity->date->format('d/m/Y') }}
                                        <div class="text-xs text-gray-500">
                                            {{ match($activity->time_slot) {
                                                'morning' => 'Slot 1',
                                                'afternoon' => 'Slot 2',
                                                'full_day' => 'Slot 3',
                                                default => $activity->time_slot,
                                            } }}
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {{ $activity->client->name ?? 'N/A' }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {{ $activity->site->name ?? 'N/A' }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {{ $activity->driver->name ?? '' }} {{ $activity->driver->surname ?? '' }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            {{ match($activity->status) {
                                                'planned' => 'bg-blue-100 text-blue-800',
                                                'in_progress' => 'bg-yellow-100 text-yellow-800',
                                                'completed' => 'bg-green-100 text-green-800',
                                                'cancelled' => 'bg-red-100 text-red-800',
                                                default => 'bg-gray-100 text-gray-800',
                                            } }}">
                                            {{ match($activity->status) {
                                                'planned' => 'Pianificata',
                                                'in_progress' => 'In Corso',
                                                'completed' => 'Completata',
                                                'cancelled' => 'Annullata',
                                                default => $activity->status,
                                            } }}
                                        </span>
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            @else
                <p class="text-gray-500">Nessuna attività recente.</p>
            @endif
        </div>
        
        <div class="print:mt-8 print:text-xs text-gray-500 text-center">
            <p>Scheda generata il {{ now()->format('d/m/Y H:i') }}</p>
        </div>
    </div>
</x-filament-panels::page>