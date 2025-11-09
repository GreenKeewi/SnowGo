import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            ❄️ SnowGo
          </h1>
          <p className="text-2xl text-gray-700 mb-4">
            Milton's Premier Snow Shoveling Marketplace
          </p>
          <p className="text-lg text-gray-600 mb-12">
            Connect homeowners with reliable snow shoveling services in Milton, ON
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">🏠 For Homeowners</h2>
              <ul className="text-left space-y-2 mb-6">
                <li>✓ Book one-time or recurring services</li>
                <li>✓ Secure online payments</li>
                <li>✓ Track job status</li>
                <li>✓ Milton-only service area</li>
              </ul>
              <Link 
                href="/sign-up?role=homeowner"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                Get Started
              </Link>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">⛄ For Shovelers</h2>
              <ul className="text-left space-y-2 mb-6">
                <li>✓ Flexible job selection</li>
                <li>✓ Earn money on your schedule</li>
                <li>✓ Direct payouts via Stripe</li>
                <li>✓ Jobs sorted by proximity</li>
              </ul>
              <Link 
                href="/sign-up?role=shoveler"
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
              >
                Start Earning
              </Link>
            </div>
          </div>

          <div className="bg-blue-50 p-8 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">How It Works</h3>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div>
                <div className="text-3xl mb-2">1️⃣</div>
                <h4 className="font-semibold mb-2">Sign Up</h4>
                <p className="text-gray-600">Create your account as a homeowner or shoveler</p>
              </div>
              <div>
                <div className="text-3xl mb-2">2️⃣</div>
                <h4 className="font-semibold mb-2">Connect</h4>
                <p className="text-gray-600">Homeowners post jobs, shovelers claim them</p>
              </div>
              <div>
                <div className="text-3xl mb-2">3️⃣</div>
                <h4 className="font-semibold mb-2">Complete</h4>
                <p className="text-gray-600">Get the job done and process payment securely</p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-gray-500 text-sm">
            <p>Service available only in Milton, Ontario</p>
            <p className="mt-2">
              Already have an account? <Link href="/sign-in" className="text-blue-600 hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
