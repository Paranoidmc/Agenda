<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * Forza il valore del ruolo sempre in lowercase.
     *
     * @param string $value
     * @return void
     */
    public function setRoleAttribute(string $value): void
    {
        $this->attributes['role'] = strtolower($value);
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'refresh_token',
    ];

    public const ROLE_ADMIN = 'admin';
    public const ROLE_MANAGER = 'manager';
    public const ROLE_USER = 'user';

    public function isAdmin(): bool
    {
        return strtolower($this->role) === self::ROLE_ADMIN;
    }

    public function isManager(): bool
    {
        return strtolower($this->role) === self::ROLE_MANAGER;
    }

    public function isSimpleUser(): bool
    {
        return strtolower($this->role) === self::ROLE_USER;
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'refresh_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
    ];
}
