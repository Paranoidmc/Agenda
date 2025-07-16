<?php

namespace App\Http\Controllers;

use App\Models\ActivityType;
use Illuminate\Http\Request;

class ActivityTypeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $activityTypes = ActivityType::all();
        
        // Aggiungiamo i campi in italiano per ogni tipo di attività
        $activityTypes = $activityTypes->map(function ($type) {
            // Assicurati che tutti i campi siano definiti
            $type->name = $type->name ?? '';
            $type->description = $type->description ?? '';
            $type->color = $type->color ?? '';
            
            // Aggiungi i campi in italiano
            $type->nome = $type->name;
            $type->descrizione = $type->description;
            $type->colore = $type->color;
            
            return $type;
        });
        
        return response()->json([
            'data' => $activityTypes
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nome' => 'required|string|max:255',
            'descrizione' => 'nullable|string',
            'colore' => 'nullable|string|max:20',
        ]);

        // Map Italian field names to English field names
        $data = [
            'name' => $validated['nome'],
            'description' => $validated['descrizione'] ?? null,
            'color' => $validated['colore'] ?? null,
        ];

        $activityType = ActivityType::create($data);
        return response()->json($activityType, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(ActivityType $activityType)
    {
        // Assicurati che tutti i campi siano definiti
        $activityType->name = $activityType->name ?? '';
        $activityType->description = $activityType->description ?? '';
        $activityType->color = $activityType->color ?? '';
        
        // Aggiungiamo i campi in italiano
        $activityType->nome = $activityType->name;
        $activityType->descrizione = $activityType->description;
        $activityType->colore = $activityType->color;
        
        return response()->json($activityType);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, ActivityType $activityType)
    {
        $validated = $request->validate([
            'nome' => 'sometimes|required|string|max:255',
            'descrizione' => 'nullable|string',
            'colore' => 'nullable|string|max:20',
        ]);

        // Map Italian field names to English field names
        $data = [];
        if (isset($validated['nome'])) {
            $data['name'] = $validated['nome'];
        }
        if (isset($validated['descrizione'])) {
            $data['description'] = $validated['descrizione'];
        }
        if (isset($validated['colore'])) {
            $data['color'] = $validated['colore'];
        }

        $activityType->update($data);
        return response()->json($activityType);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ActivityType $activityType)
    {
        $activityType->delete();
        return response()->json(null, 204);
    }
}
