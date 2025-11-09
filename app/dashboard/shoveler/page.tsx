'use client';

import { useState, useEffect } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface Job {
  id: string;
  scheduled_at: string;
  status: string;
  price_cents: number;
  payout_cents: number;
  type: string;
  line1: string;
  city: string;
  postal_code: string;
  distance_km?: number;
  homeowner_email?: string;
}

interface Profile {
  display_name: string;
  max_houses: number;
  active: boolean;
  total_completed_jobs: number;
  total_earnings_cents: number;
  pending_balance_cents: number;
  active_houses_count: number;
  onboarding_completed: boolean;
}

export default function ShovelerDashboard() {
  const { user } = useUser();
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'completed'>('available');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, openJobsRes] = await Promise.all([
        fetch('/api/shoveler/profile'),
        fetch('/api/jobs/open'),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData.data);
        setMyJobs(profileData.data.recent_jobs || []);
      }

      if (openJobsRes.ok) {
        const jobsData = await openJobsRes.json();
        setOpenJobs(jobsData.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimJob = async (jobId: string) => {
    if (!confirm('Claim this job?')) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}/claim`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Job claimed successfully!');
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to claim job');
      }
    } catch (error) {
      alert('Failed to claim job');
    }
  };

  const handleStartJob = async (jobId: string) => {
    if (!confirm('Mark this job as started?')) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}/start`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Job started!');
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to start job');
      }
    } catch (error) {
      alert('Failed to start job');
    }
  };

  const handleCompleteJob = async (jobId: string) => {
    if (!confirm('Mark this job as completed? Payment will be processed.')) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}/complete`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Job completed! Payment will be processed.');
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to complete job');
      }
    } catch (error) {
      alert('Failed to complete job');
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

  const activeJobs = myJobs.filter(j => ['claimed', 'in_progress'].includes(j.status));
  const completedJobs = myJobs.filter(j => j.status === 'completed');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!profile?.onboarding_completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">⚠️ Complete Onboarding</h2>
          <p className="text-gray-600 mb-6">
            You need to complete Stripe Connect onboarding to receive payments.
          </p>
          <button
            onClick={() => window.location.href = '/onboarding'}
            className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700"
          >
            Complete Onboarding
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">⛄ Shoveler Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.emailAddresses[0]?.emailAddress}</span>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Total Earnings</div>
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(profile?.total_earnings_cents || 0)}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Pending Balance</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatPrice(profile?.pending_balance_cents || 0)}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Completed Jobs</div>
            <div className="text-2xl font-bold text-gray-900">
              {profile?.total_completed_jobs || 0}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Active Houses</div>
            <div className="text-2xl font-bold text-purple-600">
              {profile?.active_houses_count || 0} / {profile?.max_houses || 0}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('available')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'available'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Available Jobs ({openJobs.length})
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'active'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Active Jobs ({activeJobs.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'completed'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Completed ({completedJobs.length})
            </button>
          </nav>
        </div>

        {/* Available Jobs */}
        {activeTab === 'available' && (
          <div className="space-y-4">
            {openJobs.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                No available jobs at the moment
              </div>
            ) : (
              openJobs.map((job) => (
                <div key={job.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-semibold">{job.line1}</span>
                        {job.distance_km !== undefined && (
                          <span className="text-sm text-gray-500">📍 {job.distance_km.toFixed(1)} km away</span>
                        )}
                      </div>
                      <div className="text-gray-600 text-sm mb-2">
                        {job.city}, ON {job.postal_code}
                      </div>
                      <div className="text-sm text-gray-500">
                        Scheduled: {new Date(job.scheduled_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600 mb-2">
                        {formatPrice(job.payout_cents)}
                      </div>
                      <button
                        onClick={() => handleClaimJob(job.id)}
                        disabled={(profile?.active_houses_count || 0) >= (profile?.max_houses || 0)}
                        className={`px-6 py-2 rounded-md font-medium ${
                          (profile?.active_houses_count || 0) >= (profile?.max_houses || 0)
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {(profile?.active_houses_count || 0) >= (profile?.max_houses || 0)
                          ? 'Max Houses Reached'
                          : 'Claim Job'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Active Jobs */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {activeJobs.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                No active jobs
              </div>
            ) : (
              activeJobs.map((job) => (
                <div key={job.id} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-semibold">{job.line1}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                      <div className="text-gray-600 text-sm mb-2">
                        {job.city}, ON {job.postal_code}
                      </div>
                      <div className="text-sm text-gray-500">
                        Scheduled: {new Date(job.scheduled_at).toLocaleString()}
                      </div>
                      <div className="text-sm font-medium text-green-600 mt-2">
                        Earning: {formatPrice(job.payout_cents)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {job.status === 'claimed' && (
                        <button
                          onClick={() => handleStartJob(job.id)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                        >
                          Start Job
                        </button>
                      )}
                      {job.status === 'in_progress' && (
                        <button
                          onClick={() => handleCompleteJob(job.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                        >
                          Complete Job
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Completed Jobs */}
        {activeTab === 'completed' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {completedJobs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No completed jobs yet
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earned</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {completedJobs.map((job) => (
                    <tr key={job.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(job.scheduled_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">{job.line1}, {job.city}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{job.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatPrice(job.payout_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
