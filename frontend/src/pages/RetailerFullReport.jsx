import { useState, useEffect, useRef } from 'react';
import { reportsAPI, downloadExcel } from '../services/api';

const RetailerFullReport = () => {
    const [retailerData, setRetailerData] = useState(null);
    const [retailers, setRetailers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [retailerSearchOpen, setRetailerSearchOpen] = useState(false);
    const [retailerSearchTerm, setRetailerSearchTerm] = useState('');
    const [selectedRetailerId, setSelectedRetailerId] = useState('');
    const retailerDropdownRef = useRef(null);

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

    const fetchRetailerReport = async () => {
        if (!selectedRetailerId) {
            setError('Please select a retailer');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await reportsAPI.getRetailerFullReport(selectedRetailerId);
            setRetailerData(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch retailer report');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!selectedRetailerId) {
            alert('Please select a retailer');
            return;
        }

        try {
            await downloadExcel(
                `/admin/reports/retailer-full/${selectedRetailerId}?export=excel`,
                `retailer-report-${new Date().toISOString().split('T')[0]}.xlsx`
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

    const selectedRetailer = retailers.find(r => r._id === selectedRetailerId);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Retailer Full Report</h2>
                    <p className="text-gray-600 mt-1">Complete details of a retailer and all their customers</p>
                </div>
                <button onClick={handleExport} className="btn-primary flex items-center gap-2" disabled={!selectedRetailerId}>
                    <span>📥</span>
                    Export to Excel
                </button>
            </div>

            {/* Retailer Selection */}
            <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Retailer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div ref={retailerDropdownRef}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Retailer</label>
                        <div className="relative">
                            <div
                                className="input-field cursor-pointer flex items-center justify-between"
                                onClick={() => setRetailerSearchOpen(!retailerSearchOpen)}
                            >
                                <span className={selectedRetailer ? 'text-gray-900' : 'text-gray-500'}>
                                    {selectedRetailer ? `${selectedRetailer.fullName} - ${selectedRetailer.shopName}` : 'Select a Retailer'}
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
                                        {filteredRetailers.map((retailer) => (
                                            <div
                                                key={retailer._id}
                                                className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${selectedRetailerId === retailer._id ? 'bg-primary-50 text-primary-700' : ''
                                                    }`}
                                                onClick={() => {
                                                    setSelectedRetailerId(retailer._id);
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

                    <div className="flex items-end">
                        <button onClick={fetchRetailerReport} className="btn-primary w-full">
                            Load Report
                        </button>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            )}

            {/* Results */}
            {!loading && retailerData && (
                <>
                    {/* Retailer Info Card */}
                    <div className="card">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Retailer Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Full Name</p>
                                <p className="font-medium">{retailerData.retailer.fullName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Shop Name</p>
                                <p className="font-medium">{retailerData.retailer.shopName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Email</p>
                                <p className="font-medium">{retailerData.retailer.email}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Mobile Number</p>
                                <p className="font-medium">{retailerData.retailer.mobileNumber}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">City</p>
                                <p className="font-medium">{retailerData.retailer.address.city}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Status</p>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${retailerData.retailer.status === 'ACTIVE'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {retailerData.retailer.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Summary Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="card">
                            <p className="text-sm text-gray-600">Total Customers</p>
                            <p className="text-2xl font-bold text-gray-900">{retailerData.summary.totalCustomers}</p>
                        </div>
                        <div className="card">
                            <p className="text-sm text-gray-600">Total EMI Amount</p>
                            <p className="text-2xl font-bold text-gray-900">₹{retailerData.summary.totalEMIAmount.toLocaleString()}</p>
                        </div>
                        <div className="card">
                            <p className="text-sm text-gray-600">Pending Amount</p>
                            <p className="text-2xl font-bold text-orange-600">₹{retailerData.summary.totalPendingAmount.toLocaleString()}</p>
                        </div>
                        <div className="card">
                            <p className="text-sm text-gray-600">DP Pending</p>
                            <p className="text-2xl font-bold text-yellow-600">₹{retailerData.summary.totalDownPaymentPending.toLocaleString()}</p>
                        </div>
                        <div className="card">
                            <p className="text-sm text-gray-600">Locked Customers</p>
                            <p className="text-2xl font-bold text-red-600">{retailerData.summary.lockedCustomers}</p>
                        </div>
                        <div className="card">
                            <p className="text-sm text-gray-600">Active Customers</p>
                            <p className="text-2xl font-bold text-green-600">{retailerData.summary.activeCustomers}</p>
                        </div>
                    </div>

                    {/* Customers Table */}
                    <div className="card">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Customers ({retailerData.customers.length})
                        </h3>

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
                                        <th className="table-header-cell">DP Pending</th>
                                        <th className="table-header-cell">Paid EMIs</th>
                                        <th className="table-header-cell">Lock Status</th>
                                        <th className="table-header-cell">Active Status</th>
                                    </tr>
                                </thead>
                                <tbody className="table-body">
                                    {retailerData.customers.length === 0 ? (
                                        <tr>
                                            <td colSpan="10" className="table-cell text-center text-gray-500 py-8">
                                                No customers found
                                            </td>
                                        </tr>
                                    ) : (
                                        retailerData.customers.map((customer) => {
                                            const paidEmis = customer.emiDetails.emiMonths.filter(e => e.paid).length;
                                            const totalEmis = customer.emiDetails.emiMonths.length;

                                            return (
                                                <tr key={customer._id} className="hover:bg-gray-50">
                                                    <td className="table-cell font-medium">{customer.fullName}</td>
                                                    <td className="table-cell">{customer.mobileNumber}</td>
                                                    <td className="table-cell">{customer.emiDetails.productName}</td>
                                                    <td className="table-cell">₹{customer.emiDetails.sellPrice.toLocaleString()}</td>
                                                    <td className="table-cell">₹{customer.emiDetails.emiPerMonth.toLocaleString()}</td>
                                                    <td className="table-cell">₹{customer.emiDetails.balanceAmount.toLocaleString()}</td>
                                                    <td className="table-cell text-yellow-600 font-semibold">₹{customer.emiDetails.downPaymentPending.toLocaleString()}</td>
                                                    <td className="table-cell">
                                                        <span className="text-green-600">{paidEmis}</span>/{totalEmis}
                                                    </td>
                                                    <td className="table-cell">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${customer.isLocked
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-green-100 text-green-800'
                                                            }`}>
                                                            {customer.isLocked ? 'Locked' : 'Unlocked'}
                                                        </span>
                                                    </td>
                                                    <td className="table-cell">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${customer.isActive
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {customer.isActive ? 'Active' : 'Inactive'}
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
                </>
            )}
        </div>
    );
};

export default RetailerFullReport;
