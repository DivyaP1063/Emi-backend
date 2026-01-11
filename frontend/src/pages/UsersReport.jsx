import { useState, useEffect } from 'react';
import { reportsAPI, downloadExcel } from '../services/api';

const UsersReport = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Filters
    const [filters, setFilters] = useState({
        retailerId: '',
        isLocked: '',
        isActive: '',
        startDate: '',
        endDate: '',
    });

    const fetchUsers = async () => {
        setLoading(true);
        setError('');

        try {
            const params = {};
            Object.keys(filters).forEach(key => {
                if (filters[key]) params[key] = filters[key];
            });

            const response = await reportsAPI.getAllUsers(params);
            setUsers(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key]) params.append(key, filters[key]);
            });
            params.append('export', 'excel');

            await downloadExcel(
                `/admin/reports/users?${params.toString()}`,
                `users-report-${new Date().toISOString().split('T')[0]}.xlsx`
            );
        } catch (err) {
            alert('Failed to export Excel file');
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleApplyFilters = () => {
        fetchUsers();
    };

    const handleResetFilters = () => {
        setFilters({
            retailerId: '',
            isLocked: '',
            isActive: '',
            startDate: '',
            endDate: '',
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Users Report</h2>
                    <p className="text-gray-600 mt-1">
                        View all customers with EMI details
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    className="btn-primary flex items-center gap-2"
                >
                    <span>📥</span>
                    Export to Excel
                </button>
            </div>

            {/* Filters */}
            <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Lock Status
                        </label>
                        <select
                            value={filters.isLocked}
                            onChange={(e) => handleFilterChange('isLocked', e.target.value)}
                            className="input-field"
                        >
                            <option value="">All</option>
                            <option value="true">Locked</option>
                            <option value="false">Unlocked</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Active Status
                        </label>
                        <select
                            value={filters.isActive}
                            onChange={(e) => handleFilterChange('isActive', e.target.value)}
                            className="input-field"
                        >
                            <option value="">All</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="input-field"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            End Date
                        </label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="input-field"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-4">
                    <button onClick={handleApplyFilters} className="btn-primary">
                        Apply Filters
                    </button>
                    <button onClick={handleResetFilters} className="btn-secondary">
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
                            Results ({users.length})
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
                                    <th className="table-header-cell">EMI/Month</th>
                                    <th className="table-header-cell">Balance</th>
                                    <th className="table-header-cell">Status</th>
                                    <th className="table-header-cell">Retailer</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="table-cell text-center text-gray-500 py-8">
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user._id} className="hover:bg-gray-50">
                                            <td className="table-cell font-medium">{user.fullName}</td>
                                            <td className="table-cell">{user.mobileNumber}</td>
                                            <td className="table-cell">{user.emiDetails.productName}</td>
                                            <td className="table-cell">₹{user.emiDetails.sellPrice.toLocaleString()}</td>
                                            <td className="table-cell">₹{user.emiDetails.emiPerMonth.toLocaleString()}</td>
                                            <td className="table-cell">₹{user.emiDetails.balanceAmount.toLocaleString()}</td>
                                            <td className="table-cell">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.isLocked
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {user.isLocked ? 'Locked' : 'Active'}
                                                </span>
                                            </td>
                                            <td className="table-cell">{user.retailerId?.fullName || 'N/A'}</td>
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

export default UsersReport;
