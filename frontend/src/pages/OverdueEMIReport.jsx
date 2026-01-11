import { useState, useEffect } from 'react';
import { reportsAPI, downloadExcel } from '../services/api';

const OverdueEMIReport = () => {
    const [overdueCustomers, setOverdueCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [filters, setFilters] = useState({
        retailerId: '',
        minDaysOverdue: '',
        maxDaysOverdue: '',
        minAmount: '',
        maxAmount: '',
    });

    const fetchOverdueEMI = async () => {
        setLoading(true);
        setError('');

        try {
            const params = {};
            Object.keys(filters).forEach(key => {
                if (filters[key]) params[key] = filters[key];
            });

            const response = await reportsAPI.getOverdueEMI(params);
            setOverdueCustomers(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch overdue EMI data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOverdueEMI();
    }, []);

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key]) params.append(key, filters[key]);
            });
            params.append('export', 'excel');

            await downloadExcel(
                `/admin/reports/overdue-emi?${params.toString()}`,
                `overdue-emi-report-${new Date().toISOString().split('T')[0]}.xlsx`
            );
        } catch (err) {
            alert('Failed to export Excel file');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Overdue EMI Report</h2>
                    <p className="text-gray-600 mt-1">Track customers with overdue EMI payments</p>
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
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Min Days Overdue</label>
                        <input
                            type="number"
                            value={filters.minDaysOverdue}
                            onChange={(e) => setFilters(prev => ({ ...prev, minDaysOverdue: e.target.value }))}
                            placeholder="e.g., 7"
                            className="input-field"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Max Days Overdue</label>
                        <input
                            type="number"
                            value={filters.maxDaysOverdue}
                            onChange={(e) => setFilters(prev => ({ ...prev, maxDaysOverdue: e.target.value }))}
                            placeholder="e.g., 30"
                            className="input-field"
                        />
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
                    <button onClick={fetchOverdueEMI} className="btn-primary">Apply Filters</button>
                    <button
                        onClick={() => setFilters({ retailerId: '', minDaysOverdue: '', maxDaysOverdue: '', minAmount: '', maxAmount: '' })}
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
                            Results ({overdueCustomers.length} customers)
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
                                    <th className="table-header-cell">Overdue EMIs</th>
                                    <th className="table-header-cell">Total Overdue Amount</th>
                                    <th className="table-header-cell">Status</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {overdueCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="table-cell text-center text-gray-500 py-8">
                                            No overdue EMIs found
                                        </td>
                                    </tr>
                                ) : (
                                    overdueCustomers.map((customer) => (
                                        <tr key={customer._id} className="hover:bg-gray-50">
                                            <td className="table-cell font-medium">{customer.fullName}</td>
                                            <td className="table-cell">{customer.mobileNumber}</td>
                                            <td className="table-cell">{customer.emiDetails.productName}</td>
                                            <td className="table-cell">{customer.retailerId?.fullName || 'N/A'}</td>
                                            <td className="table-cell">
                                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                                    {customer.totalOverdueEmis} EMI(s)
                                                </span>
                                            </td>
                                            <td className="table-cell font-semibold text-red-600">
                                                ₹{customer.totalOverdueAmount.toLocaleString()}
                                            </td>
                                            <td className="table-cell">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${customer.isLocked
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-yellow-100 text-yellow-800'
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

export default OverdueEMIReport;
