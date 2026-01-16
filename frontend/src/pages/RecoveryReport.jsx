import { useState, useEffect } from 'react';
import { reportsAPI, downloadExcel } from '../services/api';

const RecoveryReport = () => {
    const [recoveryData, setRecoveryData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [filters, setFilters] = useState({
        recoveryPersonId: '',
        recoveryHeadId: '',
        collectionStatus: '',
        paymentStatus: '',
        dateRange: 'all',
        startDate: '',
        endDate: '',
    });

    const fetchRecoveryReport = async () => {
        setLoading(true);
        setError('');

        try {
            const params = {};
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

                            if (startDate) params.startDate = startDate.toISOString();
                            if (endDate) params.endDate = endDate.toISOString();
                        }
                    }
                    else if (key !== 'startDate' && key !== 'endDate') {
                        params[key] = filters[key];
                    }
                }
            });

            const response = await reportsAPI.getRecoveryReport(params);
            setRecoveryData(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch recovery report');
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
                `/admin/reports/recovery?${params.toString()}`,
                `recovery-report-${new Date().toISOString().split('T')[0]}.xlsx`
            );
        } catch (err) {
            alert('Failed to export Excel file');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Recovery Report</h2>
                    <p className="text-gray-600 mt-1">Track recovery persons and device collections</p>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Collection Status</label>
                        <select
                            value={filters.collectionStatus}
                            onChange={(e) => setFilters(prev => ({ ...prev, collectionStatus: e.target.value }))}
                            className="input-field"
                        >
                            <option value="">All</option>
                            <option value="collected">Collected</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                        <select
                            value={filters.paymentStatus}
                            onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
                            className="input-field"
                        >
                            <option value="">All</option>
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
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
                    <button onClick={fetchRecoveryReport} className="btn-primary">Apply Filters</button>
                    <button
                        onClick={() => setFilters({ recoveryPersonId: '', recoveryHeadId: '', collectionStatus: '', paymentStatus: '', dateRange: 'all', startDate: '', endDate: '' })}
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
                            Results ({recoveryData.length} assignments)
                        </h3>
                    </div>

                    <div className="table-container">
                        <table className="table">
                            <thead className="table-header">
                                <tr>
                                    <th className="table-header-cell">Recovery Person</th>
                                    <th className="table-header-cell">Customer Name</th>
                                    <th className="table-header-cell">Father Name</th>
                                    <th className="table-header-cell">Mobile</th>
                                    <th className="table-header-cell">Product</th>
                                    <th className="table-header-cell">Device Collected</th>
                                    <th className="table-header-cell">Collection Date</th>
                                    <th className="table-header-cell">Money Received</th>
                                    <th className="table-header-cell">Balance Amount</th>
                                    <th className="table-header-cell">District</th>
                                    <th className="table-header-cell">Pincode</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {recoveryData.length === 0 ? (
                                    <tr>
                                        <td colSpan="11" className="table-cell text-center text-gray-500 py-8">
                                            No recovery data found
                                        </td>
                                    </tr>
                                ) : (
                                    recoveryData.map((data, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="table-cell font-medium">{data.recoveryPersonName}</td>
                                            <td className="table-cell">{data.customerName}</td>
                                            <td className="table-cell">{data.fatherName || 'N/A'}</td>
                                            <td className="table-cell">{data.mobile}</td>
                                            <td className="table-cell">{data.product}</td>
                                            <td className="table-cell">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${data.isCollected
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {data.isCollected ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                            <td className="table-cell">
                                                {data.collectionDate ? new Date(data.collectionDate).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="table-cell">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${data.moneyReceived
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {data.moneyReceived ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                            <td className="table-cell font-semibold">₹{data.balanceAmount.toLocaleString()}</td>
                                            <td className="table-cell">{data.district}</td>
                                            <td className="table-cell">{data.pincode}</td>
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

export default RecoveryReport;
