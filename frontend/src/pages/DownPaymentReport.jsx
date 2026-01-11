import { useState, useEffect } from 'react';
import { reportsAPI, downloadExcel } from '../services/api';

const DownPaymentReport = () => {
    const [customers, setCustomers] = useState([]);
    const [retailers, setRetailers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [filters, setFilters] = useState({
        retailerId: '',
        isLocked: '',
        minAmount: '',
        maxAmount: '',
    });

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
                if (filters[key]) params[key] = filters[key];
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
                if (filters[key]) params.append(key, filters[key]);
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Retailer</label>
                        <select
                            value={filters.retailerId}
                            onChange={(e) => setFilters(prev => ({ ...prev, retailerId: e.target.value }))}
                            className="input-field"
                        >
                            <option value="">All Retailers</option>
                            {retailers.map((retailer) => (
                                <option key={retailer._id} value={retailer._id}>
                                    {retailer.fullName} - {retailer.shopName}
                                </option>
                            ))}
                        </select>
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
                </div>

                <div className="flex gap-3 mt-4">
                    <button onClick={fetchDownPaymentPending} className="btn-primary">Apply Filters</button>
                    <button
                        onClick={() => setFilters({ retailerId: '', isLocked: '', minAmount: '', maxAmount: '' })}
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
                            Results ({customers.length} customers)
                        </h3>
                    </div>

                    <div className="table-container">
                        <table className="table">
                            <thead className="table-header">
                                <tr>
                                    <th className="table-header-cell">Customer Name</th>
                                    <th className="table-header-cell">Mobile</th>
                                    <th className="table-header-cell">Product</th>
                                    <th className="table-header-cell">Retailer</th>
                                    <th className="table-header-cell">Total Down Payment</th>
                                    <th className="table-header-cell">Pending Amount</th>
                                    <th className="table-header-cell">Status</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {customers.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="table-cell text-center text-gray-500 py-8">
                                            No pending down payments found
                                        </td>
                                    </tr>
                                ) : (
                                    customers.map((customer) => (
                                        <tr key={customer._id} className="hover:bg-gray-50">
                                            <td className="table-cell font-medium">{customer.fullName}</td>
                                            <td className="table-cell">{customer.mobileNumber}</td>
                                            <td className="table-cell">{customer.emiDetails.productName}</td>
                                            <td className="table-cell">{customer.retailerId?.fullName || 'N/A'}</td>
                                            <td className="table-cell">₹{customer.emiDetails.downPayment.toLocaleString()}</td>
                                            <td className="table-cell font-semibold text-yellow-600">
                                                ₹{customer.emiDetails.downPaymentPending.toLocaleString()}
                                            </td>
                                            <td className="table-cell">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${customer.isLocked
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {customer.isLocked ? 'Locked' : 'Active'}
                                                </span>
                                            </td>
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

export default DownPaymentReport;
