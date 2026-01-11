import { useState, useEffect } from 'react';
import { reportsAPI, downloadExcel } from '../services/api';

const RetailersReport = () => {
    const [retailers, setRetailers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [filters, setFilters] = useState({
        status: '',
        city: '',
        state: '',
    });

    const fetchRetailers = async () => {
        setLoading(true);
        setError('');

        try {
            const params = {};
            Object.keys(filters).forEach(key => {
                if (filters[key]) params[key] = filters[key];
            });

            const response = await reportsAPI.getAllRetailers(params);
            setRetailers(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch retailers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRetailers();
    }, []);

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key]) params.append(key, filters[key]);
            });
            params.append('export', 'excel');

            await downloadExcel(
                `/admin/reports/retailers?${params.toString()}`,
                `retailers-report-${new Date().toISOString().split('T')[0]}.xlsx`
            );
        } catch (err) {
            alert('Failed to export Excel file');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Retailers Report</h2>
                    <p className="text-gray-600 mt-1">View all retailers with business details</p>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            className="input-field"
                        >
                            <option value="">All</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                            <option value="SUSPENDED">Suspended</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                        <input
                            type="text"
                            value={filters.city}
                            onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                            placeholder="Enter city"
                            className="input-field"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                        <input
                            type="text"
                            value={filters.state}
                            onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
                            placeholder="Enter state"
                            className="input-field"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-4">
                    <button onClick={fetchRetailers} className="btn-primary">Apply Filters</button>
                    <button
                        onClick={() => setFilters({ status: '', city: '', state: '' })}
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
                        <h3 className="text-lg font-semibold text-gray-900">Results ({retailers.length})</h3>
                    </div>

                    <div className="table-container">
                        <table className="table">
                            <thead className="table-header">
                                <tr>
                                    <th className="table-header-cell">Retailer Name</th>
                                    <th className="table-header-cell">Shop Name</th>
                                    <th className="table-header-cell">Mobile</th>
                                    <th className="table-header-cell">Email</th>
                                    <th className="table-header-cell">City</th>
                                    <th className="table-header-cell">State</th>
                                    <th className="table-header-cell">Status</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {retailers.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="table-cell text-center text-gray-500 py-8">
                                            No retailers found
                                        </td>
                                    </tr>
                                ) : (
                                    retailers.map((retailer) => (
                                        <tr key={retailer._id} className="hover:bg-gray-50">
                                            <td className="table-cell font-medium">{retailer.fullName}</td>
                                            <td className="table-cell">{retailer.shopName}</td>
                                            <td className="table-cell">{retailer.mobileNumber}</td>
                                            <td className="table-cell">{retailer.email}</td>
                                            <td className="table-cell">{retailer.address.city}</td>
                                            <td className="table-cell">{retailer.address.state}</td>
                                            <td className="table-cell">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${retailer.status === 'ACTIVE'
                                                        ? 'bg-green-100 text-green-800'
                                                        : retailer.status === 'SUSPENDED'
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {retailer.status}
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

export default RetailersReport;
