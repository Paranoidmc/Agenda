<x-filament-panels::page>
    <div class="print:block print:m-0 print:p-0 print:shadow-none">
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-2xl font-bold">Scheda Autista</h1>
            <button onclick="window.print()" class="print:hidden px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                <span class="flex items-center gap-2">
                    <x-heroicon-o-printer class="w-5 h-5" />
                    Stampa
                </span>
            </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div class="bg-white rounded-xl shadow p-6">
                <h2 class="text-xl font-semibold mb-4 border-b pb-2">Informazioni Personali</h2>
                <div class="space-y-3">
                    <div>
                        <h3 class="text-lg font-medium">{{ $record->name }} {{ $record->surname }}</h3>
                        @if($record->birth_date)
                            <p class="text-gray-600">Nato il {{ $record->birth_date->format('d/m/Y') }} 
                                @if($record->birth_place) a {{ $record->birth_place }} @endif
                                @if($record->age) ({{ $record->age }} anni) @endif
                            </p>
                        @endif
                        @if($record->fiscal_code)
                            <p class="text-gray-600">Codice Fiscale: {{ $record->fiscal_code }}</p>
                        @endif
                    </div>
                    
                    @if($record->address)
                        <div>
                            <h4 class="font-medium">Indirizzo</h4>
                            <p class="text-gray-600">{{ $record->full_address }}</p>
                        </div>
                    @endif
                    
                    <div>
                        <h4 class="font-medium">Contatti</h4>
                        @if($record->phone)
                            <p class="text-gray-600">Tel: {{ $record->phone }}</p>
                        @endif
                        @if($record->email)
                            <p class="text-gray-600">Email: {{ $record->email }}</p>
                        @endif
                    </div>
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow p-6">
                <h2 class="text-xl font-semibold mb-4 border-b pb-2">Informazioni Lavorative</h2>
                <div class="space-y-3">
                    <div>
                        <h4 class="font-medium">Stato</h4>
                        <p>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                {{ match($record->status) {
                                    'active' => 'bg-green-100 text-green-800',
                                    'inactive' => 'bg-red-100 text-red-800',
                                    'on_leave' => 'bg-yellow-100 text-yellow-800',
                                    'sick' => 'bg-gray-100 text-gray-800',
                                    default => 'bg-gray-100 text-gray-800',
                                } }}">
                                {{ match($record->status) {
                                    'active' => 'Attivo',
                                    'inactive' => 'Inattivo',
                                    'on_leave' => 'In Ferie/Permesso',
                                    'sick' => 'Malattia',
                                    default => $record->status,
                                } }}
                            </span>
                        </p>
                    </div>
                    
                    @if($record->employee_id)
                        <div>
                            <h4 class="font-medium">Matricola</h4>
                            <p class="text-gray-600">{{ $record->employee_id }}</p>
                        </div>
                    @endif
                    
                    @if($record->hire_date)
                        <div>
                            <h4 class="font-medium">Data Assunzione</h4>
                            <p class="text-gray-600">{{ $record->hire_date->format('d/m/Y') }}
                                @if($record->service_years) ({{ $record->service_years }} {{ $record->service_years == 1 ? 'anno' : 'anni' }} di servizio) @endif
                            </p>
                        </div>
                    @endif
                    
                    @if($record->termination_date)
                        <div>
                            <h4 class="font-medium">Data Cessazione</h4>
                            <p class="text-gray-600">{{ $record->termination_date->format('d/m/Y') }}</p>
                        </div>
                    @endif
                </div>
            </div>
        </div>
        
        <div class="bg-white rounded-xl shadow p-6 mb-6">
            <h2 class="text-xl font-semibold mb-4 border-b pb-2">Patente</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-3">
                    @if($record->license_number)
                        <div>
                            <h4 class="font-medium">Numero Patente</h4>
                            <p class="text-gray-600">{{ $record->license_number }}</p>
                        </div>
                    @endif
                    
                    @if($record->license_type)
                        <div>
                            <h4 class="font-medium">Tipo Patente</h4>
                            <p class="text-gray-600">{{ is_array($record->license_type) ? implode(', ', $record->license_type) : $record->license_type }}</p>
                        </div>
                    @endif
                    
                    @if($record->license_issued_by)
                        <div>
                            <h4 class="font-medium">Ente Rilascio</h4>
                            <p class="text-gray-600">{{ $record->license_issued_by }}</p>
                        </div>
                    @endif
                </div>
                
                <div class="space-y-3">
                    @if($record->license_issue_date)
                        <div>
                            <h4 class="font-medium">Data Rilascio</h4>
                            <p class="text-gray-600">{{ $record->license_issue_date->format('d/m/Y') }}</p>
                        </div>
                    @endif
                    
                    @if($record->license_expiry)
                        <div>
                            <h4 class="font-medium">Data Scadenza</h4>
                            <p class="text-gray-600 {{ $record->isLicenseExpired() ? 'text-red-600 font-bold' : ($record->isLicenseExpiringSoon() ? 'text-yellow-600 font-bold' : '') }}">
                                {{ $record->license_expiry->format('d/m/Y') }}
                                @if($record->isLicenseExpired())
                                    <span class="text-red-600">(Scaduta)</span>
                                @elseif($record->isLicenseExpiringSoon())
                                    <span class="text-yellow-600">(In scadenza)</span>
                                @endif
                            </p>
                        </div>
                    @endif
                </div>
            </div>
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
                $recentActivities = $record->activities()->with(['client', 'site', 'vehicle'])->orderBy('date', 'desc')->limit(5)->get();
            @endphp
            
            @if($recentActivities->count() > 0)
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr>
                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantiere</th>
                                <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veicolo</th>
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
                                        {{ $activity->vehicle->plate ?? 'N/A' }}
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