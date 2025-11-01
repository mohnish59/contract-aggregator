'use client';
import { useState, useEffect } from 'react';
import ReactPaginate from 'react-paginate';
import Modal from 'react-modal';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
import { FaInfoCircle, FaMoon, FaSun } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';

export default function Home() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const appElement = document.getElementById('__next');
      if (appElement) {
        Modal.setAppElement(appElement);
      }
    }
  }, []);

  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [filters, setFilters] = useState({ category: '', valueMin: '', setAside: '', dateFrom: '', state: '', source: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedContract, setSelectedContract] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    fetchContracts();
  }, [filters, search]);

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const fetchContracts = async () => {
    setIsLoading(true);
    const params = new URLSearchParams(filters);
    if (search) params.append('search', search);
    const res = await fetch(`/api/contracts?${params.toString()}`);
    const data = await res.json();
    setContracts(data);
    setFilteredContracts(data);
    setIsLoading(false);
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

  // Chart data prep (contracts by state)
  const stateData = filteredContracts.reduce((acc, c) => {
    const state = c.placeOfPerformance?.state?.code || 'Unknown';
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});
  const chartData = Object.keys(stateData).map(key => ({ name: key, value: stateData[key] }));
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28EFF'];

  const paginatedContracts = filteredContracts.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  return (
    <div className={`min-h-screen p-8 ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
      <div className="flex justify-end mb-4">
        <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
          {darkMode ? <FaSun className="text-yellow-400" /> : <FaMoon className="text-gray-600" />}
        </button>
      </div>
      <h1 className="text-3xl font-bold text-center mb-8">Federal Contracts Aggregator</h1>
      <div className={`max-w-6xl mx-auto p-6 rounded-lg shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <input className={`border p-2 rounded ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-800'}`} placeholder="Search keywords" value={search} onChange={e => setSearch(e.target.value)} />
          <input className={`border p-2 rounded ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-800'}`} placeholder="Category (NAICS code, e.g. 541512 for IT)" value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} />
          <input className={`border p-2 rounded ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-800'}`} placeholder="Min Value (e.g. 100000)" value={filters.valueMin} onChange={e => setFilters({...filters, valueMin: e.target.value})} />
          <select className={`border p-2 rounded ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-800'}`} value={filters.setAside} onChange={e => setFilters({...filters, setAside: e.target.value})}>
            <option value="">Any Set-Aside</option>
            <option value="SBA">Small Business</option>
            <option value="8A">8(a)</option>
            <option value="SDVOSBC">Service-Disabled Veteran-Owned</option>
          </select>
          <input type="date" className={`border p-2 rounded ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-800'}`} value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} />
          <select className={`border p-2 rounded ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-800'}`} value={filters.state} onChange={e => setFilters({...filters, state: e.target.value})}>
            <option value="">Any State</option>
            <option value="VA">Virginia (VA)</option>
            <option value="MD">Maryland (MD)</option>
            <option value="DC">District of Columbia (DC)</option>
          </select>
          <select className={`border p-2 rounded ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-800'}`} value={filters.source} onChange={e => setFilters({...filters, source: e.target.value})}>
            <option value="">Any Source</option>
            <option value="federal">Federal</option>
            <option value="ny">New York</option>
            <option value="il">Illinois</option>
          </select>
        </div>
        <button onClick={exportCSV} className="mb-4 bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Export to CSV</button>
        {/* Dashboard Charts */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Contract Trends</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className="text-lg mb-2">Contracts by State</h3>
              <PieChart width={300} height={300}>
                <Pie data={chartData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </div>
            {/* Add more charts here later, e.g., by NAICS */}
          </div>
        </div>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2">Loading contracts...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {paginatedContracts.map(c => (
                <motion.div
                  key={c._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => openModal(c)}
                  className={`cursor-pointer p-4 rounded-lg shadow hover:shadow-lg ${darkMode ? 'bg-gray-700' : 'bg-white'}`}
                >
                  <h3 className="text-lg font-semibold mb-2">{c.title || 'N/A'}</h3>
                  <p><strong>Posted:</strong> {c.postedDate ? new Date(c.postedDate).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Value:</strong> ${c.award?.amount || 'N/A'}</p>
                  <p><strong>Set-Aside:</strong> <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-sm">{c.setAside || 'None'}</span></p>
                  <p><strong>NAICS:</strong> {c.naicsCode || 'N/A'} <FaInfoCircle data-tip="North American Industry Classification System code" className="inline text-blue-500" /></p>
                  <p><strong>State:</strong> {c.placeOfPerformance?.state?.code || 'N/A'}</p>
                  <p><strong>Source:</strong> {c.source?.toUpperCase() || 'N/A'}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        {filteredContracts.length === 0 && !isLoading && <p className="text-center mt-4">No contracts found. Try adjusting filters.</p>}
        <ReactPaginate
          breakLabel="..."
          nextLabel="Next >"
          onPageChange={handlePageClick}
          pageRangeDisplayed={5}
          pageCount={Math.ceil(filteredContracts.length / itemsPerPage)}
          previousLabel="< Previous"
          renderOnZeroPageCount={null}
          containerClassName="flex justify-center mt-6 space-x-2"
          pageClassName="px-3 py-1 border rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
          activeClassName="bg-blue-500 text-white"
        />
      </div>

      <Tooltip effect="solid" />

      <Modal
        isOpen={!!selectedContract}
        onRequestClose={closeModal}
        contentLabel="Contract Details"
        className={`max-w-2xl mx-auto p-6 rounded-lg shadow-xl overflow-auto ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'}`}
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      >
        {selectedContract && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
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
          </motion.div>
        )}
      </Modal>
    </div>
  );
}