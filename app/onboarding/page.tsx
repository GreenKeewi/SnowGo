'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const [role, setRole] = useState<'homeowner' | 'shoveler' | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          display_name: displayName || undefined,
          phone: phone || undefined,
          bio: bio || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      // Redirect based on role
      if (role === 'shoveler' && data.data.onboarding_url) {
        // Redirect to Stripe Connect onboarding
        window.location.href = data.data.onboarding_url;
      } else {
        // Redirect to dashboard
        router.push(role === 'homeowner' ? '/dashboard/homeowner' : '/dashboard/shoveler');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Welcome to SnowGo!</h2>
          <p className="mt-2 text-gray-600">Let's set up your account</p>
          {user && (
            <p className="mt-1 text-sm text-gray-500">Signed in as {user.emailAddresses[0]?.emailAddress}</p>
          )}
        </div>

        {!role ? (
          <div className="bg-white p-8 rounded-lg shadow space-y-4">
            <h3 className="text-xl font-semibold mb-4">I am a...</h3>
            <button
              onClick={() => setRole('homeowner')}
              className="w-full p-6 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <div className="text-2xl mb-2">🏠</div>
              <div className="font-semibold text-lg">Homeowner</div>
              <div className="text-sm text-gray-600">I need snow shoveling services</div>
            </button>
            <button
              onClick={() => setRole('shoveler')}
              className="w-full p-6 text-left border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition"
            >
              <div className="text-2xl mb-2">⛄</div>
              <div className="font-semibold text-lg">Shoveler</div>
              <div className="text-sm text-gray-600">I want to offer snow shoveling services</div>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow space-y-6">
            <button
              type="button"
              onClick={() => setRole(null)}
              className="text-sm text-blue-600 hover:underline"
            >
              ← Change role
            </button>

            <div>
              <h3 className="text-xl font-semibold mb-4">
                {role === 'homeowner' ? '🏠 Homeowner Setup' : '⛄ Shoveler Setup'}
              </h3>
              {role === 'shoveler' && (
                <p className="text-sm text-gray-600 mb-4">
                  After completing this form, you'll be redirected to set up payments with Stripe Connect.
                </p>
              )}
            </div>

            {role === 'shoveler' && (
              <>
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                    Bio (Optional)
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Tell homeowners about yourself..."
                  />
                </div>
              </>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-md text-white font-medium ${
                role === 'homeowner'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-green-600 hover:bg-green-700'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Setting up...' : 'Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
