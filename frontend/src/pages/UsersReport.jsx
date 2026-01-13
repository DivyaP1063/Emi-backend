import { useState, useEffect } from 'react';
import { reportsAPI, downloadExcel } from '../services/api';

const UsersReport = () => {
    const [users, setUsers] = useState([]);
    const [retailers, setRetailers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Filters
    const [filters, setFilters] = useState({
        search: '',
        retailerId: '',
        status: '', // Combined locked/active status
        appInstallStatus: '',
        dateRange: 'all', // all, today, week, month, year, custom
        startDate: '',
        endDate: '',
    });

    const fetchRetailers = async () => {
        try {
            const response = await reportsAPI.getAllRetailers({});
            setRetailers(response.data.data);
        } catch (err) {
            console.error('Failed to fetch retailers:', err);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        setError('');

        try {
            const params = {};
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    // Convert status filter
                    if (key === 'status') {
                        if (filters[key] === 'locked') {
                            params.isLocked = 'true';
                        } else if (filters[key] === 'unlocked') {
                            params.isLocked = 'false';
                        } else if (filters[key] === 'active') {
                            params.isActive = 'true';
                        } else if (filters[key] === 'inactive') {
                            params.isActive = 'false';
                        }
                    }
                    // Handle date range
                    else if (key === 'dateRange') {
                        // Skip if 'all' - no date filter
                        if (filters[key] !== 'all') {
                            const now = new Date();
                            let startDate, endDate;

                            if (filters[key] === 'today') {
                                startDate = new Date(now.setHours(0, 0, 0, 0));
                                endDate = new Date(now.setHours(23, 59, 59, 999));
                            } else if (filters[key] === 'week') {
                                const dayOfWeek = now.getDay();
                                const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday as start
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
                    else if (key !== 'startDate' && key !== 'endDate') {
                        params[key] = filters[key];
                    }
                }
            });

            console.log('Sending params to API:', params);

            const response = await reportsAPI.getAllUsers(params);
            setUsers(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRetailers();
        fetchUsers();
    }, []);

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    // Convert status filter
                    if (key === 'status') {
                        if (filters[key] === 'locked') {
                            params.append('isLocked', 'true');
                        } else if (filters[key] === 'unlocked') {
                            params.append('isLocked', 'false');
                        } else if (filters[key] === 'active') {
                            params.append('isActive', 'true');
                        } else if (filters[key] === 'inactive') {
                            params.append('isActive', 'false');
                        }
                    }
                    // Handle date range
                    else if (key === 'dateRange') {
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
            search: '',
            retailerId: '',
            status: '',
            appInstallStatus: '',
            dateRange: 'all',
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
                            Search Retailer
                        </label>
                        <input
                            type="text"
                            placeholder="Search by retailer name or shop..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="input-field"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Retailer
                        </label>
                        <select
                            value={filters.retailerId}
                            onChange={(e) => handleFilterChange('retailerId', e.target.value)}
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Status
                        </label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="input-field"
                        >
                            <option value="">All</option>
                            <option value="locked">Locked</option>
                            <option value="unlocked">Unlocked</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            App Installation Status
                        </label>
                        <select
                            value={filters.appInstallStatus}
                            onChange={(e) => handleFilterChange('appInstallStatus', e.target.value)}
                            className="input-field"
                        >
                            <option value="">All</option>
                            <option value="installed">App Installed</option>
                            <option value="uninstalled">App Uninstalled</option>
                            <option value="not_installed">App Not Installed</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Date Range
                        </label>
                        <select
                            value={filters.dateRange}
                            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
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
                        </>
                    )}
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
                                    <th className="table-header-cell">Lock Status</th>
                                    <th className="table-header-cell">Active Status</th>
                                    <th className="table-header-cell">Retailer</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="table-cell text-center text-gray-500 py-8">
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
                                                    {user.isLocked ? 'Locked' : 'Unlocked'}
                                                </span>
                                            </td>
                                            <td className="table-cell">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.isActive
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {user.isActive ? 'Active' : 'Inactive'}
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
