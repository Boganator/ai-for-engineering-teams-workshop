'use client';

import { useState } from 'react';
import { mockCustomers, Customer } from '@/data/mock-customers';
import CustomerSelector from '@/components/CustomerSelector';
import DomainHealthWidget from '@/components/DomainHealthWidget';
import MarketIntelligenceWidget from '@/components/MarketIntelligenceWidget';
import CustomerHealthMonitoring from '@/components/CustomerHealthMonitoring';
import PredictiveIntelligenceWidget from '@/components/PredictiveIntelligenceWidget';

export default function Home() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Customer Intelligence Dashboard
        </h1>
        <p className="text-gray-600">
          AI for Engineering Teams Workshop - Your Progress
        </p>
      </header>

      {/* Progress Indicator */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Workshop Progress</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p>✅ Setup Complete - Next.js app is running</p>
          <p>✅ Exercise 3: CustomerCard component</p>
          <p>✅ Exercise 4: CustomerSelector integration</p>
          <p>✅ Exercise 5: Domain Health widget</p>
          <p className="text-gray-400">⏳ Exercise 9: Production-ready features</p>
        </div>
      </div>

      {/* Main Dashboard */}
      <div className="space-y-8">
        {/* Customer Selector + Domain Health side by side on wider screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-1 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Customers</h3>
            <CustomerSelector
              customers={mockCustomers}
              onSelect={setSelectedCustomer}
            />
          </section>

          <section className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              <DomainHealthWidget customer={selectedCustomer} />
              <MarketIntelligenceWidget company={selectedCustomer?.company ?? null} />
              <CustomerHealthMonitoring customer={selectedCustomer} />
              <PredictiveIntelligenceWidget customer={selectedCustomer} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
