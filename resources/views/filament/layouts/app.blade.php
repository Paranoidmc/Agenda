@props([
    'livewire',
])

<x-filament::layouts.base :livewire="$livewire">
    <!-- Includi il JavaScript personalizzato -->
    <script src="/js/custom.js"></script>
    
    {{ $slot }}
</x-filament::layouts.base>