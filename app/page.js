'use client';
import { useState, useEffect } from 'react';
import ReactPaginate from 'react-paginate';
import Modal from 'react-modal';
import Papa from 'papaparse';

Modal.setAppElement('#__next');

export default function Home() {
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [filters, setFilters] = useState({ category: '', valueMin: '', setAside: '', dateFrom: '', state: '', source: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedContract, setSelectedContract] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchContracts();
  }, [filters, search]);

  const fetchContracts = async () => {
    const params = new URLSearchParams(filters);
    if (search) params.append('search', search);
    const res = await fetch(`/api/contracts?${params.toString()}`);
    const data = await res.json();
    setContracts(data);
    setFilteredContracts(data);
    setPage(0);
  };

  const handlePageClick = (event) => {
    setPage(event.selected);
  };

  const openModal = (contract) => {
    setSelectedContract(contract);
  };

  const closeModal = () => {
    setSelectedContract(null);
  };

  const exportCSV = () => {
    const csv = Papa.unparse(filteredContracts);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'contracts.csv';
    link.click();
  };

  const paginatedContracts = filteredContracts.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-center mb-8">Federal Contracts Aggregator</h1>
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <input className="border p-2 rounded" placeholder="Search keywords" value={search} onChange={e => setSearch(e.target.value)} />
          <input className="border p-2 rounded" placeholder="Category (NAICS code, e.g. 541512 for IT)" value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} />
          <input className="border p-2 rounded" placeholder="Min Value (e.g. 100000)" value={filters.valueMin} onChange={e => setFilters({...filters, valueMin: e.target.value})} />
          <select className="border p-2 rounded" value={filters.setAside} onChange={e => setFilters({...filters, setAside: e.target.value})}>
            <option value="">Any Set-Aside</option>
            <option value="SBA">Small Business</option>
            <option value="8A">8(a)</option>
            <option value="SDVOSBC">Service-Disabled Veteran-Owned</option>
          </select>
          <input type="date" className="border p-2 rounded" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} />
          <select className="border p-2 rounded" value={filters.state} onChange={e => setFilters({...filters, state: e.target.value})}>
            <option value="">Any State</option>
            <option value="VA">Virginia (VA)</option>
            <option value="MD">Maryland (MD)</option>
            <option value="DC">District of Columbia (DC)</option>
          </select>
          <select className="border p-2 rounded" value={filters.source} onChange={e => setFilters({...filters, source: e.target.value})}>
            <option value="">Any Source</option>
            <option value="federal">Federal</option>
            <option value="ny">New York</option>
            <option value="il">Illinois</option>
          </select>
        </div>
        <button onClick={exportCSV} className="mb-4 bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Export to CSV</button>
        <table className="w-full border-collapse table-auto">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th className="p-3">Title</th>
              <th className="p-3">Posted Date</th>
              <th className="p-3">Value</th>
              <th className="p-3">Set-Aside</th>
              <th className="p-3">NAICS</th>
              <th className="p-3">State</th>
              <th className="p-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {paginatedContracts.map(c => (
              <tr key={c._id} onClick={() => openModal(c)} className="cursor-pointer hover:bg-gray-100 border-b">
                <td className="p-3">{c.title || 'N/A'}</td>
                <td className="p-3">{c.postedDate ? new Date(c.postedDate).toLocaleDateString() : 'N/A'}</td>
                <td className="p-3">${c.award?.amount || 'N/A'}</td>
                <td className="p-3">{c.setAside || 'None'}</td>
                <td className="p-3">{c.naicsCode || 'N/A'}</td>
                <td className="p-3">{c.placeOfPerformance?.state?.code || 'N/A'}</td>
                <td className="p-3">{c.source?.toUpperCase() || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredContracts.length === 0 && <p className="text-center mt-4">No contracts found. Try adjusting filters.</p>}
        <ReactPaginate
          breakLabel="..."
          nextLabel="Next >"
          onPageChange={handlePageClick}
          pageRangeDisplayed={5}
          pageCount={Math.ceil(filteredContracts.length / itemsPerPage)}
          previousLabel="< Previous"
          renderOnZeroPageCount={null}
          containerClassName="flex justify-center mt-6 space-x-2"
          pageClassName="px-3 py-1 border rounded cursor-pointer hover:bg-gray-200"
          activeClassName="bg-blue-500 text-white"
        />
      </div>

      <Modal
        isOpen={!!selectedContract}
        onRequestClose={closeModal}
        contentLabel="Contract Details"
        className="max-w-2xl mx-auto mt-20 p-6 bg-white rounded-lg shadow-xl overflow-auto"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      >
        {selectedContract && (
          <div>
            <h2 className="text-2xl font-bold mb-4">{selectedContract.title || 'Untitled Contract'}</h2>
            <p className="mb-2"><strong>Description:</strong> {selectedContract.description || 'N/A'}</p>
            <p className="mb-2"><strong>Posted:</strong> {selectedContract.postedDate ? new Date(selectedContract.postedDate).toLocaleDateString() : 'N/A'}</p>
            <p className="mb-2"><strong>Due:</strong> {selectedContract.dueDate ? new Date(selectedContract.dueDate).toLocaleDateString() : 'N/A'}</p>
            <p className="mb-2"><strong>Value:</strong> ${selectedContract.award?.amount || 'N/A'}</p>
            <p className="mb-2"><strong>Set-Aside:</strong> {selectedContract.setAside || 'None'}</p>
            <p className="mb-2"><strong>NAICS:</strong> {selectedContract.naicsCode || 'N/A'}</p>
            <p className="mb-2"><strong>State:</strong> {selectedContract.placeOfPerformance?.state?.code || 'N/A'}</p>
            <p className="mb-2"><strong>Source:</strong> {selectedContract.source?.toUpperCase() || 'N/A'}</p>
            <p className="mb-4"><strong>Link:</strong> {selectedContract.link ? <a href={selectedContract.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View Original</a> : 'N/A'}</p>
            <button onClick={closeModal} className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Close</button>
          </div>
        )}
      </Modal>
    </div>
  );
}