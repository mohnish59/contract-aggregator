'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({ category: '', valueMin: '', setAside: '', dateFrom: '', source: '' });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedContract, setSelectedContract] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [error, setError] = useState(null);
  const itemsPerPage = 20; // Increased for better performance
  const debounceTimerRef = useRef(null);

  // Debounce search input
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0); // Reset to first page when search changes
    }, 500); // 500ms debounce delay

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [search]);

  // Initialize dark mode on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
  }, []);

  // Apply dark mode
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const fetchContracts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      if (debouncedSearch) params.append('search', debouncedSearch);
      // Add pagination
      params.append('page', (page + 1).toString()); // API uses 1-based indexing
      params.append('limit', itemsPerPage.toString());

      const res = await fetch(`/api/contracts?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok) {
        // Parse API error response
        const errorMessage = data.message || data.error || 'Failed to fetch contracts';
        throw new Error(errorMessage);
      }
      
      setContracts(data.contracts || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      // Enhanced error handling
      let errorMessage = 'Failed to fetch contracts';
      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setContracts([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, debouncedSearch, page, itemsPerPage]);

  // Reset to page 0 when filters change (search reset is handled in debounce effect)
  useEffect(() => {
    setPage(0);
  }, [filters]);

  // Fetch contracts when filters or debounced search change
  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handlePageClick = (event) => {
    setPage(event.selected);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openModal = (contract) => {
    setSelectedContract(contract);
  };

  const closeModal = () => {
    setSelectedContract(null);
  };

  // Format currency values
  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const exportCSV = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Fetch all contracts for export (without pagination)
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('limit', '10000'); // Large limit for export

      const res = await fetch(`/api/contracts?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok) {
        const errorMessage = data.message || data.error || 'Failed to fetch contracts for export';
        throw new Error(errorMessage);
      }
      
      const allContracts = data.contracts || [];
      
      if (allContracts.length === 0) {
        setError('No contracts available to export. Try adjusting your filters.');
        return;
      }

      const csv = Papa.unparse(allContracts);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `contracts_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href); // Clean up
    } catch (err) {
      setError(err.message || 'Failed to export CSV. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, debouncedSearch]);

  // Memoized chart data preparation (contracts by state)
  const chartData = useMemo(() => {
    const stateData = contracts.reduce((acc, c) => {
      const state = c.placeOfPerformance?.state?.code || 'Unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(stateData).map(key => ({ name: key, value: stateData[key] }));
  }, [contracts]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28EFF'];

  return (
    <div className={`min-h-screen p-8 ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
      <div className="flex justify-end mb-4">
        <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
          {darkMode ? <FaSun className="text-yellow-400" /> : <FaMoon className="text-gray-600" />}
        </button>
      </div>
      <h1 className="text-3xl font-bold text-center mb-8">Federal Contracts Aggregator</h1>
      <div className={`max-w-6xl mx-auto p-6 rounded-lg shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Total Count Display */}
        <div className={`mb-6 p-4 rounded-lg border-l-4 ${
          darkMode 
            ? 'bg-blue-900/20 border-blue-500' 
            : 'bg-blue-50 border-blue-400'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-blue-200' : 'text-blue-900'}`}>
                {isLoading ? '...' : totalCount.toLocaleString()}
              </h2>
              <p className={`text-sm mt-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                {isLoading 
                  ? 'Loading contracts...' 
                  : totalCount === 1 
                    ? 'contract found' 
                    : 'contracts found'}
                {!isLoading && (debouncedSearch || Object.values(filters).some(v => v)) && (
                  <span className="ml-2 text-xs">
                    (filtered results)
                  </span>
                )}
              </p>
            </div>
            {!isLoading && totalCount > 0 && (
              <div className={`text-right ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                <p className="text-xs">Showing page {page + 1} of {Math.ceil(totalCount / itemsPerPage)}</p>
                <p className="text-xs mt-1">
                  {Math.min((page * itemsPerPage) + 1, totalCount)} - {Math.min((page + 1) * itemsPerPage, totalCount)} of {totalCount.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
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
          <select className={`border p-2 rounded ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-800'}`} value={filters.source} onChange={e => setFilters({...filters, source: e.target.value})}>
            <option value="">Any Source</option>
            <option value="federal">Federal</option>
            <option value="states">State</option>
          </select>
        </div>
        <button 
          onClick={exportCSV} 
          disabled={isLoading}
          className={`mb-4 px-4 py-2 rounded font-medium ${
            isLoading
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isLoading ? 'Exporting...' : 'Export to CSV'}
        </button>
        {/* Dashboard Charts */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Contract Trends</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className="text-lg mb-2">Contracts by State</h3>
              {chartData.length > 0 ? (
                <PieChart width={300} height={300}>
                  <Pie data={chartData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              ) : (
                <div className={`h-[300px] flex items-center justify-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <p>No data available</p>
                </div>
              )}
            </div>
            {/* Add more charts here later, e.g., by NAICS */}
          </div>
        </div>
        {error && (
          <div className={`mb-4 p-4 rounded-lg border-l-4 ${
            darkMode 
              ? 'bg-red-900/20 border-red-500 text-red-200' 
              : 'bg-red-50 border-red-400 text-red-800'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium mb-1">Error Loading Contracts</h3>
                <p className="text-sm">{error}</p>
                <button
                  onClick={() => fetchContracts()}
                  className={`mt-2 text-sm font-medium underline ${darkMode ? 'text-red-300' : 'text-red-700'}`}
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading contracts...</p>
            </div>
            {/* Loading skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg shadow ${
                    darkMode ? 'bg-gray-700 animate-pulse' : 'bg-gray-200 animate-pulse'
                  }`}
                >
                  <div className={`h-5 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded mb-3`}></div>
                  <div className={`h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded mb-2`}></div>
                  <div className={`h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded mb-2`}></div>
                  <div className={`h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded w-3/4`}></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {contracts.map(c => (
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
                  <p><strong>Posted:</strong> {formatDate(c.postedDate)}</p>
                  <p><strong>Value:</strong> {formatCurrency(c.award?.amount)}</p>
                  <p><strong>Set-Aside:</strong> <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-sm">{c.typeOfSetAsideDescription || c.typeOfSetAside || 'None'}</span></p>
                  <p><strong>NAICS:</strong> {c.naicsCode || 'N/A'} <FaInfoCircle data-tip="North American Industry Classification System code" className="inline text-blue-500" /></p>
                  <p><strong>State:</strong> {c.placeOfPerformance?.state?.code || 'N/A'}</p>
                  <p><strong>Agency:</strong> {c.subTier || c.fullParentPathName?.split('.').pop() || 'N/A'}</p>
                  <p><strong>Source:</strong> {c.source?.toUpperCase() || 'N/A'}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        {contracts.length === 0 && !isLoading && !error && (
          <div className={`text-center py-12 px-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className={`mt-4 text-lg font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
              No contracts found
            </h3>
            <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {debouncedSearch || Object.values(filters).some(v => v)
                ? 'Try adjusting your search terms or filters to find more results.'
                : 'There are currently no contracts available. Check back later or try refreshing the data.'}
            </p>
            {(debouncedSearch || Object.values(filters).some(v => v)) && (
              <button
                onClick={() => {
                  setSearch('');
                  setDebouncedSearch('');
                  setFilters({ category: '', valueMin: '', setAside: '', dateFrom: '', source: '' });
                }}
                className={`mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                  darkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
        <ReactPaginate
          breakLabel="..."
          nextLabel="Next >"
          onPageChange={handlePageClick}
          pageRangeDisplayed={5}
          pageCount={Math.ceil(totalCount / itemsPerPage)}
          forcePage={page}
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
        className={`max-w-3xl mx-auto p-6 rounded-lg shadow-xl overflow-auto max-h-[90vh] ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'}`}
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      >
        {selectedContract && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
            <h2 className="text-2xl font-bold mb-4">{selectedContract.title || 'Untitled Contract'}</h2>
            
            {/* Basic Info */}
            <section className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Basic Information</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="font-medium">Notice ID</dt>
                  <dd>{selectedContract.noticeId || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-medium">Solicitation Number</dt>
                  <dd>{selectedContract.solicitationNumber || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-medium">Type</dt>
                  <dd>{selectedContract.type || selectedContract.baseType || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-medium">Classification Code</dt>
                  <dd>{selectedContract.classificationCode || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-medium">NAICS Code</dt>
                  <dd>{selectedContract.naicsCode || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-medium">Active</dt>
                  <dd>{selectedContract.active ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
            </section>

            {/* Agency/Organization */}
            <section className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Agency Information</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="font-medium">Full Parent Path</dt>
                  <dd>{selectedContract.fullParentPathName || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-medium">Full Parent Path Code</dt>
                  <dd>{selectedContract.fullParentPathCode || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-medium">Department</dt>
                  <dd>{selectedContract.department || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-medium">Sub-Tier (Agency)</dt>
                  <dd>{selectedContract.subTier || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-medium">Office</dt>
                  <dd>{selectedContract.office || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-medium">Organization Type</dt>
                  <dd>{selectedContract.organizationType || 'N/A'}</dd>
                </div>
              </dl>
            </section>

            {/* Dates */}
            <section className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Dates</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="font-medium">Posted Date</dt>
                  <dd>{formatDate(selectedContract.postedDate)}</dd>
                </div>
                <div>
                  <dt className="font-medium">Response Deadline</dt>
                  <dd>{formatDate(selectedContract.responseDeadLine)}</dd>
                </div>
                <div>
                  <dt className="font-medium">Archive Date</dt>
                  <dd>{formatDate(selectedContract.archiveDate)}</dd>
                </div>
                <div>
                  <dt className="font-medium">Archive Type</dt>
                  <dd>{selectedContract.archiveType || 'N/A'}</dd>
                </div>
              </dl>
            </section>

            {/* Set-Aside */}
            <section className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Set-Aside</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="font-medium">Type</dt>
                  <dd>{selectedContract.typeOfSetAside || 'None'}</dd>
                </div>
                <div>
                  <dt className="font-medium">Description</dt>
                  <dd>{selectedContract.typeOfSetAsideDescription || 'N/A'}</dd>
                </div>
              </dl>
            </section>

            {/* Award Info */}
            <section className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Award Information</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="font-medium">Award Date</dt>
                  <dd>{formatDate(selectedContract.award?.date)}</dd>
                </div>
                <div>
                  <dt className="font-medium">Award Number</dt>
                  <dd>{selectedContract.award?.number || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-medium">Award Amount</dt>
                  <dd>{formatCurrency(selectedContract.award?.amount)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-medium">Awardee</dt>
                  <dd>
                    {selectedContract.award?.awardee?.name || 'N/A'}
                    {selectedContract.award?.awardee?.ueiSAM && ` (UEI: ${selectedContract.award.awardee.ueiSAM})`}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-medium">Awardee Location</dt>
                  <dd>
                    {[
                      selectedContract.award?.awardee?.location?.streetAddress,
                      selectedContract.award?.awardee?.location?.streetAddress2,
                      selectedContract.award?.awardee?.location?.city?.name,
                      selectedContract.award?.awardee?.location?.state?.code,
                      selectedContract.award?.awardee?.location?.zip,
                      selectedContract.award?.awardee?.location?.country?.name
                    ].filter(Boolean).join(', ') || 'N/A'}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Locations */}
            <section className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Locations</h3>
              <div className="mb-4">
                <h4 className="font-medium mb-1">Office Address</h4>
                <p>
                  {[
                    selectedContract.officeAddress?.city,
                    selectedContract.officeAddress?.state,
                    selectedContract.officeAddress?.zipcode,
                    selectedContract.officeAddress?.countryCode
                  ].filter(Boolean).join(', ') || 'N/A'}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Place of Performance</h4>
                <p>
                  {[
                    selectedContract.placeOfPerformance?.streetAddress,
                    selectedContract.placeOfPerformance?.streetAddress2,
                    selectedContract.placeOfPerformance?.city?.name,
                    selectedContract.placeOfPerformance?.state?.code || selectedContract.placeOfPerformance?.state?.name,
                    selectedContract.placeOfPerformance?.zip,
                    selectedContract.placeOfPerformance?.country?.name
                  ].filter(Boolean).join(', ') || 'N/A'}
                </p>
              </div>
            </section>

            {/* Contacts */}
            <section className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Points of Contact</h3>
              {selectedContract.pointOfContact && selectedContract.pointOfContact.length > 0 ? (
                <ul className="list-disc pl-5 space-y-2">
                  {selectedContract.pointOfContact.map((contact, index) => (
                    <li key={index}>
                      <div>
                        <strong>{contact.fullName || contact.name || 'N/A'}</strong>
                        {contact.email && <div>Email: {contact.email}</div>}
                        {contact.phone && <div>Phone: {contact.phone}</div>}
                        {contact.fax && <div>Fax: {contact.fax}</div>}
                        {contact.title && <div>Title: {contact.title}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>N/A</p>
              )}
            </section>

            {/* Description and Links */}
            <section className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Description and Links</h3>
              <div className="mb-4">
                <h4 className="font-medium mb-1">Description</h4>
                {selectedContract.description ? (
                  <a href={selectedContract.description} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View Full Description</a>
                ) : (
                  <p>N/A</p>
                )}
              </div>
              <div className="mb-4">
                <h4 className="font-medium mb-1">UI Link</h4>
                {selectedContract.uiLink ? (
                  <a href={selectedContract.uiLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View on SAM.gov</a>
                ) : (
                  <p>N/A</p>
                )}
              </div>
              <div className="mb-4">
                <h4 className="font-medium mb-1">Additional Info Link</h4>
                {selectedContract.additionalInfoLink ? (
                  <a href={selectedContract.additionalInfoLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Additional Info</a>
                ) : (
                  <p>N/A</p>
                )}
              </div>
              <div className="mb-4">
                <h4 className="font-medium mb-1">Resource Links</h4>
                {selectedContract.resourceLinks && selectedContract.resourceLinks.length > 0 ? (
                  <ul className="list-disc pl-5">
                    {selectedContract.resourceLinks.map((link, index) => (
                      <li key={index}>
                        <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{link}</a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>N/A</p>
                )}
              </div>
              <div>
                <h4 className="font-medium mb-1">Other Links</h4>
                {selectedContract.links && selectedContract.links.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {selectedContract.links.map((linkObj, index) => {
                      const href = linkObj?.href || linkObj?.url || (typeof linkObj === 'string' ? linkObj : null);
                      const text = linkObj?.text || linkObj?.title || href;
                      return href ? (
                        <li key={index}>
                          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{text}</a>
                        </li>
                      ) : (
                        <li key={index}>Invalid link</li>
                      );
                    })}
                  </ul>
                ) : (
                  <p>N/A</p>
                )}
              </div>
            </section>

            <button onClick={closeModal} className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Close</button>
          </motion.div>
        )}
      </Modal>
    </div>
  );
}