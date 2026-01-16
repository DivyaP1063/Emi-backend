import { useState, useEffect, useRef } from 'react';
import { reportsAPI, downloadExcel } from '../services/api';

const DownPaymentReport = () => {
    const [customers, setCustomers] = useState([]);
    const [retailers, setRetailers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [retailerSearchOpen, setRetailerSearchOpen] = useState(false);
    const [retailerSearchTerm, setRetailerSearchTerm] = useState('');
    const retailerDropdownRef = useRef(null);

    const [filters, setFilters] = useState({
        customerName: '',
        retailerName: '',
        retailerId: '',
        isLocked: '',
        minAmount: '',
        maxAmount: '',
        paymentStatus: 'pending', // pending, paid, all
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
            setRetailers(response.data.data);
        } catch (err) {
            console.error('Failed to fetch retailers:', err);
        }
    };

    const fetchDownPaymentPending = async () => {
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
                    // Skip startDate and endDate as they're handled in dateRange
                    else if (key !== 'startDate' && key !== 'endDate' && key !== 'retailerName') {
                        params[key] = filters[key];
                    }
                }
            });

            const response = await reportsAPI.getDownPaymentPending(params);
            setCustomers(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch down payment data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRetailers();
        fetchDownPaymentPending();
    }, []);

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
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

                            if (startDate) params.append('startDate', startDate.toISOString());
                            if (endDate) params.append('endDate', endDate.toISOString());
                        }
                    }
                    else if (key !== 'startDate' && key !== 'endDate' && key !== 'retailerName') {
                        params.append(key, filters[key]);
                    }
                }
            });
            params.append('export', 'excel');

            await downloadExcel(
                `/admin/reports/down-payment-pending?${params.toString()}`,
                `down-payment-pending-${new Date().toISOString().split('T')[0]}.xlsx`
            );
        } catch (err) {
            alert('Failed to export Excel file');
        }
    };

    const totalPending = customers.reduce((sum, c) => sum + c.emiDetails.downPaymentPending, 0);

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
                    <h2 className="text-2xl font-bold text-gray-900">Down Payment Pending Report</h2>
                    <p className="text-gray-600 mt-1">Monitor pending down payment collections</p>
                </div>
                <button onClick={handleExport} className="btn-primary flex items-center gap-2">
                    <span>📥</span>
                    Export to Excel
                </button>
            </div>

            {/* Summary Card */}
            <div className="card bg-yellow-50 border-yellow-200">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-600">Total Pending Amount</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">
                            ₹{totalPending.toLocaleString()}
                        </p>
                    </div>
                    <div className="text-5xl">💰</div>
                </div>
            </div>

            {/* Filters */}
            <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                        <input
                            type="text"
                            value={filters.customerName}
                            onChange={(e) => setFilters(prev => ({ ...prev, customerName: e.target.value }))}
                            placeholder="Search by customer name"
                            className="input-field"
                        />
                    </div>

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
                                                setFilters(prev => ({ ...prev, retailerId: '', retailerName: '' }));
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
                                                    setFilters(prev => ({
                                                        ...prev,
                                                        retailerId: retailer._id,
                                                        retailerName: `${retailer.fullName} - ${retailer.shopName}`
                                                    }));
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Lock Status</label>
                        <select
                            value={filters.isLocked}
                            onChange={(e) => setFilters(prev => ({ ...prev, isLocked: e.target.value }))}
                            className="input-field"
                        >
                            <option value="">All</option>
                            <option value="true">Locked</option>
                            <option value="false">Unlocked</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Min Amount</label>
                        <input
                            type="number"
                            value={filters.minAmount}
                            onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                            placeholder="e.g., 1000"
                            className="input-field"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Max Amount</label>
                        <input
                            type="number"
                            value={filters.maxAmount}
                            onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                            placeholder="e.g., 10000"
                            className="input-field"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                        <select
                            value={filters.paymentStatus}
                            onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
                            className="input-field"
                        >
                            <option value="all">All</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
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
                    <button onClick={fetchDownPaymentPending} className="btn-primary">Apply Filters</button>
                    <button
                        onClick={() => setFilters({
                            customerName: '',
                            retailerName: '',
                            retailerId: '',
                            isLocked: '',
                            minAmount: '',
                            maxAmount: '',
                            paymentStatus: 'pending',
                            dateRange: 'all',
                            startDate: '',
                            endDate: '',
                        })}
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
                <div className="card max-w-full">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Results ({customers.length} customers)
                        </h3>
                    </div>

                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="table">
                            <thead className="table-header">
                                <tr>
                                    <th className="table-header-cell">Customer ID</th>
                                    <th className="table-header-cell">Customer Name</th>
                                    <th className="table-header-cell">Father Name</th>
                                    <th className="table-header-cell">Mobile</th>
                                    <th className="table-header-cell">Product</th>
                                    <th className="table-header-cell">Model</th>
                                    <th className="table-header-cell">Retailer</th>
                                    <th className="table-header-cell">Total Down Payment</th>
                                    <th className="table-header-cell">Paid Amount</th>
                                    <th className="table-header-cell">Unpaid Amount</th>
                                    <th className="table-header-cell">Paid Date</th>
                                    <th className="table-header-cell">Sell Price</th>
                                    <th className="table-header-cell">District</th>
                                    <th className="table-header-cell">Pincode</th>
                                    <th className="table-header-cell">Created At</th>
                                    <th className="table-header-cell">Status</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {customers.length === 0 ? (
                                    <tr>
                                        <td colSpan="17" className="table-cell text-center text-gray-500 py-8">
                                            No data found
                                        </td>
                                    </tr>
                                ) : (
                                    customers.map((customer) => {
                                        const paidAmount = customer.emiDetails.downPayment - customer.emiDetails.downPaymentPending;

                                        return (
                                            <tr key={customer._id} className="hover:bg-gray-50">
                                                <td className="table-cell font-mono text-xs">{customer._id}</td>
                                                <td className="table-cell font-medium">{customer.fullName}</td>
                                                <td className="table-cell">{customer.fatherName || 'N/A'}</td>
                                                <td className="table-cell">{customer.mobileNumber}</td>
                                                <td className="table-cell">{customer.emiDetails.productName}</td>
                                                <td className="table-cell">{customer.emiDetails.model}</td>
                                                <td className="table-cell">{customer.retailerId?.fullName || 'N/A'}</td>
                                                <td className="table-cell">₹{customer.emiDetails.downPayment.toLocaleString()}</td>
                                                <td className="table-cell font-semibold text-green-600">
                                                    ₹{paidAmount.toLocaleString()}
                                                </td>
                                                <td className="table-cell font-semibold text-yellow-600">
                                                    ₹{customer.emiDetails.downPaymentPending.toLocaleString()}
                                                </td>
                                                <td className="table-cell">
                                                    {paidAmount > 0 && customer.emiDetails.downPaymentPending === 0
                                                        ? new Date(customer.createdAt).toLocaleDateString()
                                                        : 'Pending'}
                                                </td>
                                                <td className="table-cell">₹{customer.emiDetails.sellPrice.toLocaleString()}</td>
                                                <td className="table-cell">{customer.address.district}</td>
                                                <td className="table-cell">{customer.address.pincode}</td>
                                                <td className="table-cell">{new Date(customer.createdAt).toLocaleDateString()}</td>
                                                <td className="table-cell">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${customer.isLocked
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-green-100 text-green-800'
                                                        }`}>
                                                        {customer.isLocked ? 'Locked' : 'Unlocked'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DownPaymentReport;
