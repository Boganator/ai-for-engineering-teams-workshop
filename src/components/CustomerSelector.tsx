'use client';

import { useState } from 'react';
import { Customer } from '@/data/mock-customers';
import CustomerCard from '@/components/CustomerCard';

export interface CustomerSelectorProps {
  customers: Customer[];
  onSelect: (customer: Customer) => void;
}

export default function CustomerSelector({ customers, onSelect }: CustomerSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const filtered = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q);
  });

  function handleSelect(customer: Customer) {
    setSelectedCustomerId(customer.id);
    onSelect(customer);
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Search by name or company…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Search customers"
      />
      <div className="overflow-y-auto max-h-96 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">No customers found</p>
        ) : (
          filtered.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              isSelected={customer.id === selectedCustomerId}
              onClick={() => handleSelect(customer)}
            />
          ))
        )}
      </div>
    </div>
  );
}
