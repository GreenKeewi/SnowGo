'use client';

import { useState, useEffect } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface AdminSettings {
  platform_fee_cents: number;
  default_max_houses_per_shoveler: number;
  base_one_time_price_cents: number;
  weekly_subscription_price_cents: number;
  biweekly_subscription_price_cents: number;
  monthly_subscription_price_cents: number;
  max_search_radius_km: number;
}

interface Statistics {
  total_jobs: number;
  completed_jobs: number;
  total_revenue_cents: number;
  platform_revenue_cents: number;
  total_payouts_cents: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useUser();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [editedSettings, setEditedSettings] = useState<AdminSettings | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'transactions'>('settings');

  useEffect(() => {
    // Check if user is admin
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.com';
    if (user && user.emailAddresses[0]?.emailAddress !== adminEmail) {
      alert('Access denied: Admin only');
      router.push('/');
      return;
    }

    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [settingsRes, transactionsRes] = await Promise.all([
        fetch('/api/admin/settings'),
        fetch('/api/admin/transactions'),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.data);
        setEditedSettings(data.data);
      }

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setStatistics(data.data.statistics);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!editedSettings) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedSettings),
      });

      if (response.ok) {
        alert('Settings saved successfully!');
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save settings');
      }
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">🔒 Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.emailAddresses[0]?.emailAddress}</span>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        {statistics && (
          <div className="grid md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600 mb-1">Total Jobs</div>
              <div className="text-2xl font-bold text-gray-900">{statistics.total_jobs}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600 mb-1">Completed</div>
              <div className="text-2xl font-bold text-green-600">{statistics.completed_jobs}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatPrice(statistics.total_revenue_cents)}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600 mb-1">Platform Fees</div>
              <div className="text-2xl font-bold text-purple-600">
                {formatPrice(statistics.platform_revenue_cents)}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600 mb-1">Paid to Shovelers</div>
              <div className="text-2xl font-bold text-orange-600">
                {formatPrice(statistics.total_payouts_cents)}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Platform Settings
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Transactions
            </button>
          </nav>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && editedSettings && (
          <div className="bg-white p-8 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-6">Platform Configuration</h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Platform Fee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform Fee (per job)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={(editedSettings.platform_fee_cents / 100).toFixed(2)}
                    onChange={(e) =>
                      setEditedSettings({
                        ...editedSettings,
                        platform_fee_cents: Math.round(parseFloat(e.target.value) * 100),
                      })
                    }
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Default: $5.00</p>
              </div>

              {/* Max Houses */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Max Houses per Shoveler
                </label>
                <input
                  type="number"
                  min="1"
                  value={editedSettings.default_max_houses_per_shoveler}
                  onChange={(e) =>
                    setEditedSettings({
                      ...editedSettings,
                      default_max_houses_per_shoveler: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">Default: 5</p>
              </div>

              {/* One-Time Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  One-Time Job Price
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={(editedSettings.base_one_time_price_cents / 100).toFixed(2)}
                    onChange={(e) =>
                      setEditedSettings({
                        ...editedSettings,
                        base_one_time_price_cents: Math.round(parseFloat(e.target.value) * 100),
                      })
                    }
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Default: $40.00</p>
              </div>

              {/* Search Radius */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Search Radius (km)
                </label>
                <input
                  type="number"
                  min="1"
                  value={editedSettings.max_search_radius_km}
                  onChange={(e) =>
                    setEditedSettings({
                      ...editedSettings,
                      max_search_radius_km: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">Default: 50 km</p>
              </div>

              {/* Weekly Subscription */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weekly Subscription Price
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={(editedSettings.weekly_subscription_price_cents / 100).toFixed(2)}
                    onChange={(e) =>
                      setEditedSettings({
                        ...editedSettings,
                        weekly_subscription_price_cents: Math.round(parseFloat(e.target.value) * 100),
                      })
                    }
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Default: $150.00</p>
              </div>

              {/* Biweekly Subscription */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Biweekly Subscription Price
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={(editedSettings.biweekly_subscription_price_cents / 100).toFixed(2)}
                    onChange={(e) =>
                      setEditedSettings({
                        ...editedSettings,
                        biweekly_subscription_price_cents: Math.round(parseFloat(e.target.value) * 100),
                      })
                    }
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Default: $250.00</p>
              </div>

              {/* Monthly Subscription */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Subscription Price
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={(editedSettings.monthly_subscription_price_cents / 100).toFixed(2)}
                    onChange={(e) =>
                      setEditedSettings({
                        ...editedSettings,
                        monthly_subscription_price_cents: Math.round(parseFloat(e.target.value) * 100),
                      })
                    }
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Default: $400.00</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t flex justify-end gap-4">
              <button
                onClick={() => setEditedSettings(settings)}
                disabled={saving}
                className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Reset
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
            <p className="text-gray-600">
              Transaction details would be displayed here. This includes job payments, platform fees,
              and shoveler payouts. For the MVP, use the Stripe dashboard for detailed transaction viewing.
            </p>
            <div className="mt-4">
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:underline"
              >
                View in Stripe Dashboard →
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
