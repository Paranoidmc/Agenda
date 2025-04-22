import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            console.log('[LOGIN] Avvio login...');
            
            // 1. Ottieni il token CSRF
            await axios.get('http://localhost:8000/sanctum/csrf-cookie', {
                withCredentials: true
            });
            console.log('[LOGIN] CSRF token ottenuto');
            
            // 2. Prova login
            const loginResponse = await axios.post('http://localhost:8000/login', {
                email,
                password
            }, {
                withCredentials: true,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('[LOGIN] Risposta login:', loginResponse.data);
            
            // Salva il token e i dati utente
            localStorage.setItem('token', loginResponse.data.token);
            localStorage.setItem('user', JSON.stringify(loginResponse.data.user));
            
            // Reindirizza alla dashboard
            navigate('/dashboard');
        } catch (error) {
            console.error('[LOGIN] Errore:', error.response?.data || error.message);
            setError(error.response?.data?.error || 'Errore durante il login');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Accedi al tuo account
                    </h2>
                </div>
                {error && (
                    <div className="rounded-md bg-red-50 p-4 mb-4">
                        <div className="text-sm text-red-700">{error}</div>
                    </div>
                )}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email" className="sr-only">Email</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Accedi
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;
