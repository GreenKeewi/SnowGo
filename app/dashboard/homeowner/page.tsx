'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, UserButton } from '@clerk/nextjs';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface Address {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  postal_code: string;
}

interface Job {
  id: string;
  scheduled_at: string;
  status: string;
  price_cents: number;
  type: string;
  line1: string;
  city: string;
  shoveler_name: string | null;
  shoveler_email: string | null;
}

export default function HomeownerDashboard() {
  const router = useRouter();
  const { user } = useUser();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [showBookJob, setShowBookJob] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');

  // New address form
  const [newAddress, setNewAddress] = useState({
    label: '',
    line1: '',
    line2: '',
    city: 'Milton',
    postal_code: '',
  });

  // Book job form
  const [scheduledAt, setScheduledAt] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [addressesRes, jobsRes] = await Promise.all([
        fetch('/api/addresses'),
        fetch('/api/jobs'),
      ]);

      if (addressesRes.ok) {
        const addressesData = await addressesRes.json();
        setAddresses(addressesData.data || []);
      }

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobs(jobsData.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAddress),
      });

      if (response.ok) {
        setShowAddAddress(false);
        setNewAddress({ label: '', line1: '', line2: '', city: 'Milton', postal_code: '' });
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to add address');
      }
    } catch (error) {
      alert('Failed to add address');
    }
  };

  const handleBookJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAddress || !scheduledAt) {
      alert('Please select an address and schedule date');
      return;
    }

    try {
      const response = await fetch('/api/book/one-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address_id: selectedAddress,
          scheduled_at: scheduledAt,
        }),
      });

      const data = await response.json();

      if (response.ok && data.data.checkout_url) {
        // Redirect to Stripe checkout
        window.location.href = data.data.checkout_url;
      } else {
        alert(data.error || 'Failed to book job');
      }
    } catch (error) {
      alert('Failed to book job');
    }
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'claimed': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">🏠 Homeowner Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.emailAddresses[0]?.emailAddress}</span>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Addresses Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">My Addresses</h2>
              <button
                onClick={() => setShowAddAddress(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
              >
                + Add Address
              </button>
            </div>

            {showAddAddress && (
              <form onSubmit={handleAddAddress} className="bg-white p-6 rounded-lg shadow mb-4">
                <h3 className="font-semibold mb-4">Add New Address</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Label (e.g., Home)"
                    value={newAddress.label}
                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Street Address"
                    required
                    value={newAddress.line1}
                    onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Apt, Suite, etc. (optional)"
                    value={newAddress.line2}
                    onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Postal Code (L9T, L9E, or L0P)"
                    required
                    value={newAddress.postal_code}
                    onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
                      Add Address
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddAddress(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {addresses.length === 0 ? (
                <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
                  No addresses added yet
                </div>
              ) : (
                addresses.map((addr) => (
                  <div key={addr.id} className="bg-white p-4 rounded-lg shadow">
                    {addr.label && <div className="font-semibold text-sm text-gray-600">{addr.label}</div>}
                    <div className="text-gray-900">{addr.line1}</div>
                    {addr.line2 && <div className="text-gray-600 text-sm">{addr.line2}</div>}
                    <div className="text-gray-600 text-sm">
                      {addr.city}, ON {addr.postal_code}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Book Job Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Book a Job</h2>
            
            {addresses.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
                Add an address first to book a job
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <form onSubmit={handleBookJob} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Address
                    </label>
                    <select
                      value={selectedAddress}
                      onChange={(e) => setSelectedAddress(e.target.value)}
                      required
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Choose an address...</option>
                      {addresses.map((addr) => (
                        <option key={addr.id} value={addr.id}>
                          {addr.label ? `${addr.label} - ` : ''}{addr.line1}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scheduled Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      required
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 font-medium"
                  >
                    Book One-Time Job ($40)
                  </button>
                </form>

                <div className="mt-4 pt-4 border-t text-sm text-gray-500">
                  <p>• Platform fee: $5.00</p>
                  <p>• Shoveler earns: $35.00</p>
                  <p>• Payment via Stripe</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Jobs History */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">My Jobs</h2>
          {jobs.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
              No jobs yet
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shoveler</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(job.scheduled_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">{job.line1}, {job.city}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{job.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(job.status)}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{formatPrice(job.price_cents)}</td>
                      <td className="px-6 py-4 text-sm">
                        {job.shoveler_name || job.shoveler_email || 'Not assigned'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
