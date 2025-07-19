<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class PromoteUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:promote {email}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Promote a user to the admin role';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("User with email '{$email}' not found.");
            return 1;
        }

        $user->role = User::ROLE_ADMIN;
        $user->save();

        $this->info("User '{$user->name}' ({$email}) has been promoted to Admin.");

        return 0;
    }
}
