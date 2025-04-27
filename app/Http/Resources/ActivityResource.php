<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Restituisci tutti i campi originali + le date formattate in Europe/Rome
        return array_merge(parent::toArray($request), [
            'data_inizio' => $this->when(
                $this->data_inizio,
                optional($this->data_inizio)->setTimezone('Europe/Rome')->format('Y-m-d\TH:i:sP')
            ),
            'data_fine' => $this->when(
                $this->data_fine,
                optional($this->data_fine)->setTimezone('Europe/Rome')->format('Y-m-d\TH:i:sP')
            ),
        ]);
    }
}
