'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [contracts, setContracts] = useState([]);
  const [filters, setFilters] = useState({ category: '', valueMin: '', setAside: '', dateFrom: '', state: '' });
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchContracts();
  }, [filters, search]);

  const fetchContracts = async () => {
    const params = new URLSearchParams(filters);
    if (search) params.append('search', search);
    const res = await fetch(`/api/contracts?${params.toString()}`);
    const data = await res.json();
    setContracts(data);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Federal Contracts Aggregator</h1>
      <input placeholder="Search keywords" value={search} onChange={e => setSearch(e.target.value)} style={{ margin: '10px' }} />
      <input placeholder="Category (NAICS code, e.g. 541512 for IT)" value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} style={{ margin: '10px' }} />
      <input placeholder="Min Value (e.g. 100000)" value={filters.valueMin} onChange={e => setFilters({...filters, valueMin: e.target.value})} style={{ margin: '10px' }} />
      <select value={filters.setAside} onChange={e => setFilters({...filters, setAside: e.target.value})} style={{ margin: '10px' }}>
        <option value="">Any Set-Aside</option>
        <option value="SBA">Small Business</option>
        <option value="8A">8(a)</option>
        <option value="SDVOSBC">Service-Disabled Veteran-Owned</option>
        {/* You can add more options later based on common set-aside codes from SAM docs */}
      </select>
      <input type="date" placeholder="Posted From Date" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} style={{ margin: '10px' }} />
      <select value={filters.state} onChange={e => setFilters({...filters, state: e.target.value})} style={{ margin: '10px' }}>
        <option value="">Any State</option>
        <option value="VA">Virginia (VA)</option>
        <option value="MD">Maryland (MD)</option>
        <option value="DC">District of Columbia (DC)</option>
        <option value="NY">New York (NY)</option>
        <option value="IL">Illinois (IL)</option>
        {/* Add more states later if needed */}
      </select>
      <ul>
        {contracts.map(c => (
          <li key={c._id} style={{ margin: '10px 0' }}>
            <strong>{c.title}</strong> - Posted: {new Date(c.postedDate).toLocaleDateString()} - Value: ${c.award.amount || 'N/A'} - Set-Aside: {c.setAside || 'None'} - NAICS: {c.naicsCode || 'N/A'} - State: {c.placeOfPerformance?.state?.code || 'N/A'}
          </li>
        ))}
      </ul>
    </div>
  );
}