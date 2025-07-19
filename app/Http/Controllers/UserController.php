<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // L'autorizzazione è gestita automaticamente da UserPolicy::viewAny()
        return response()->json(User::all());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // L'autorizzazione è gestita automaticamente da UserPolicy::create()
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'role' => ['required', Rule::in([User::ROLE_ADMIN, User::ROLE_MANAGER, User::ROLE_USER])],
            'password' => 'required|string|min:8',
        ]);

        $user = User::create([
            ...$validated,
            'password' => Hash::make($validated['password'])
        ]);

        Log::info('User created', ['admin_id' => auth()->id(), 'user_id' => $user->id]);

        return response()->json($user, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user)
    {
        // L'autorizzazione è gestita automaticamente da UserPolicy::view()
        return response()->json($user);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $user)
    {
        // L'autorizzazione è gestita automaticamente da UserPolicy::update()
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', Rule::unique('users')->ignore($user->id)],
            'role' => ['sometimes', Rule::in([User::ROLE_ADMIN, User::ROLE_MANAGER, User::ROLE_USER])],
            'password' => 'nullable|string|min:8',
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        Log::info('User updated', ['admin_id' => auth()->id(), 'user_id' => $user->id]);

        return response()->json($user);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user)
    {
        // L'autorizzazione è gestita automaticamente da UserPolicy::delete()
        $user->delete();

        Log::info('User deleted', ['admin_id' => auth()->id(), 'user_id' => $user->id]);

        return response()->json(['message' => 'Utente eliminato']);
    }
}
