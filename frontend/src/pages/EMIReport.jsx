import { useState, useEffect, useRef } from 'react';
import { reportsAPI, downloadExcel } from '../services/api';

const EMIReport = () => {
    const [emiDetails, setEmiDetails] = useState([]);
    const [retailers, setRetailers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [retailerSearchOpen, setRetailerSearchOpen] = useState(false);
    const [retailerSearchTerm, setRetailerSearchTerm] = useState('');
    const retailerDropdownRef = useRef(null);

    const [filters, setFilters] = useState({
        retailerId: '',
        customerId: '',
        customerSearch: '',
        emiStatus: '',
        dateRange: 'all',
        startDate: '',
        endDate: '',
    });

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (retailerDropdownRef.current && !retailerDropdownRef.current.contains(event.target)) {
                setRetailerSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchRetailers = async () => {
        try {
            const response = await reportsAPI.getAllRetailers({});
            setRetailers(response.data.data || []);
        } catch (err) {
            console.error('Error fetching retailers:', err);
        }
    };

    useEffect(() => {
        fetchRetailers();
    }, []);

    const fetchEMIDetails = async () => {
        setLoading(true);
        setError('');

        try {
            const params = {};
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    // Handle date range
                    if (key === 'dateRange') {
                        if (filters[key] !== 'all') {
                            const now = new Date();
                            let startDate, endDate;

                            if (filters[key] === 'today') {
                                startDate = new Date(now.setHours(0, 0, 0, 0));
                                endDate = new Date(now.setHours(23, 59, 59, 999));
                            } else if (filters[key] === 'week') {
                                const dayOfWeek = now.getDay();
                                const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                                startDate = new Date(now);
                                startDate.setDate(now.getDate() - diff);
                                startDate.setHours(0, 0, 0, 0);
                                endDate = new Date();
                                endDate.setHours(23, 59, 59, 999);
                            } else if (filters[key] === 'month') {
                                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                                endDate = new Date();
                                endDate.setHours(23, 59, 59, 999);
                            } else if (filters[key] === 'year') {
                                startDate = new Date(now.getFullYear(), 0, 1);
                                endDate = new Date();
                                endDate.setHours(23, 59, 59, 999);
                            } else if (filters[key] === 'custom') {
                                if (filters.startDate) {
                                    startDate = new Date(filters.startDate);
                                    startDate.setHours(0, 0, 0, 0);
                                }
                                if (filters.endDate) {
                                    endDate = new Date(filters.endDate);
                                    endDate.setHours(23, 59, 59, 999);
                                }
                            }

                            if (startDate) params.startDate = startDate.toISOString();
                            if (endDate) params.endDate = endDate.toISOString();
                        }
                    }
                    else if (key !== 'startDate' && key !== 'endDate') {
                        params[key] = filters[key];
                    }
                }
            });

            const response = await reportsAPI.getEMIDetails(params);
            setEmiDetails(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch EMI details');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    if (key === 'dateRange') {
                        if (filters[key] !== 'all') {
                            const now = new Date();
                            let startDate, endDate;

                            if (filters[key] === 'today') {
                                startDate = new Date(now.setHours(0, 0, 0, 0));
                                endDate = new Date(now.setHours(23, 59, 59, 999));
                            } else if (filters[key] === 'week') {
                                const dayOfWeek = now.getDay();
                                const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                                startDate = new Date(now);
                                startDate.setDate(now.getDate() - diff);
                                startDate.setHours(0, 0, 0, 0);
                                endDate = new Date();
                                endDate.setHours(23, 59, 59, 999);
                            } else if (filters[key] === 'month') {
                                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                                endDate = new Date();
                                endDate.setHours(23, 59, 59, 999);
                            } else if (filters[key] === 'year') {
                                startDate = new Date(now.getFullYear(), 0, 1);
                                endDate = new Date();
                                endDate.setHours(23, 59, 59, 999);
                            } else if (filters[key] === 'custom') {
                                if (filters.startDate) {
                                    startDate = new Date(filters.startDate);
                                    startDate.setHours(0, 0, 0, 0);
                                }
                                if (filters.endDate) {
                                    endDate = new Date(filters.endDate);
                                    endDate.setHours(23, 59, 59, 999);
                                }
                            }

                            if (startDate) params.append('startDate', startDate.toISOString());
                            if (endDate) params.append('endDate', endDate.toISOString());
                        }
                    }
                    else if (key !== 'startDate' && key !== 'endDate') {
                        params.append(key, filters[key]);
                    }
                }
            });
            params.append('export', 'excel');

            await downloadExcel(
                `/admin/reports/emi-details?${params.toString()}`,
                `emi-details-report-${new Date().toISOString().split('T')[0]}.xlsx`
            );
        } catch (err) {
            alert('Failed to export Excel file');
        }
    };

    const filteredRetailers = retailers.filter(retailer => {
        if (!retailerSearchTerm) return true;
        const searchLower = retailerSearchTerm.toLowerCase();
        return retailer.fullName.toLowerCase().includes(searchLower) ||
            retailer.shopName.toLowerCase().includes(searchLower);
    });

    const selectedRetailer = retailers.find(r => r._id === filters.retailerId);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">EMI Details Report</h2>
                    <p className="text-gray-600 mt-1">Month-by-month EMI breakdown for all customers</p>
                </div>
                <button onClick={handleExport} className="btn-primary flex items-center gap-2">
                    <span>📥</span>
                    Export to Excel
                </button>
            </div>

            {/* Filters */}
            <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div ref={retailerDropdownRef}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Retailer</label>
                        <div className="relative">
                            <div
                                className="input-field cursor-pointer flex items-center justify-between"
                                onClick={() => setRetailerSearchOpen(!retailerSearchOpen)}
                            >
                                <span className={selectedRetailer ? 'text-gray-900' : 'text-gray-500'}>
                                    {selectedRetailer ? `${selectedRetailer.fullName} - ${selectedRetailer.shopName}` : 'All Retailers'}
                                </span>
                                <span className="text-gray-400">▼</span>
                            </div>

                            {retailerSearchOpen && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
                                    <div className="p-2 border-b border-gray-200">
                                        <input
                                            type="text"
                                            value={retailerSearchTerm}
                                            onChange={(e) => setRetailerSearchTerm(e.target.value)}
                                            placeholder="Search retailers..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    <div className="overflow-y-auto max-h-48">
                                        <div
                                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                            onClick={() => {
                                                setFilters(prev => ({ ...prev, retailerId: '' }));
                                                setRetailerSearchOpen(false);
                                                setRetailerSearchTerm('');
                                            }}
                                        >
                                            All Retailers
                                        </div>
                                        {filteredRetailers.map((retailer) => (
                                            <div
                                                key={retailer._id}
                                                className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${filters.retailerId === retailer._id ? 'bg-primary-50 text-primary-700' : ''
                                                    }`}
                                                onClick={() => {
                                                    setFilters(prev => ({ ...prev, retailerId: retailer._id }));
                                                    setRetailerSearchOpen(false);
                                                    setRetailerSearchTerm('');
                                                }}
                                            >
                                                {retailer.fullName} - {retailer.shopName}
                                            </div>
                                        ))}
                                        {filteredRetailers.length === 0 && (
                                            <div className="px-4 py-2 text-gray-500 text-center">
                                                No retailers found
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Customer Search</label>
                        <input
                            type="text"
                            value={filters.customerSearch}
                            onChange={(e) => setFilters(prev => ({ ...prev, customerSearch: e.target.value }))}
                            placeholder="Search by name, mobile, or IMEI..."
                            className="input-field"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">EMI Status</label>
                        <select
                            value={filters.emiStatus}
                            onChange={(e) => setFilters(prev => ({ ...prev, emiStatus: e.target.value }))}
                            className="input-field"
                        >
                            <option value="">All</option>
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                        <select
                            value={filters.dateRange}
                            onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                            className="input-field"
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="year">This Year</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>

                    {filters.dateRange === 'custom' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                <input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                                    className="input-field"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                                <input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="input-field"
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="flex gap-3 mt-4">
                    <button onClick={fetchEMIDetails} className="btn-primary">Apply Filters</button>
                    <button
                        onClick={() => {
                            setFilters({ retailerId: '', customerId: '', customerSearch: '', emiStatus: '', dateRange: 'all', startDate: '', endDate: '' });
                            setRetailerSearchTerm('');
                        }}
                        className="btn-secondary"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Results */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Results ({emiDetails.length} customers)
                        </h3>
                    </div>

                    <div className="table-container">
                        <table className="table">
                            <thead className="table-header">
                                <tr>
                                    <th className="table-header-cell">Customer Name</th>
                                    <th className="table-header-cell">Mobile</th>
                                    <th className="table-header-cell">Product</th>
                                    <th className="table-header-cell">Sell Price</th>
                                    <th className="table-header-cell">Balance</th>
                                    <th className="table-header-cell">Retailer</th>
                                    {emiDetails.length > 0 && emiDetails[0].emiMonths && emiDetails[0].emiMonths.map((_, index) => (
                                        <th key={index} className="table-header-cell">EMI {index + 1}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {emiDetails.length === 0 ? (
                                    <tr>
                                        <td colSpan="20" className="table-cell text-center text-gray-500 py-8">
                                            No EMI details found
                                        </td>
                                    </tr>
                                ) : (
                                    emiDetails.map((customer, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="table-cell font-medium">{customer.fullName}</td>
                                            <td className="table-cell">{customer.mobileNumber}</td>
                                            <td className="table-cell">{customer.productName}</td>
                                            <td className="table-cell">₹{customer.sellPrice?.toLocaleString()}</td>
                                            <td className="table-cell">₹{customer.balanceAmount?.toLocaleString()}</td>
                                            <td className="table-cell">{customer.retailerId?.fullName || 'N/A'}</td>
                                            {customer.emiMonths && customer.emiMonths.map((emi, emiIndex) => (
                                                <td key={emiIndex} className="table-cell">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${emi.paid
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                            {emi.paid ? 'Paid' : 'Pending'}
                                                        </span>
                                                        {emi.paidDate && (
                                                            <span className="text-xs text-gray-500">
                                                                {new Date(emi.paidDate).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EMIReport;
