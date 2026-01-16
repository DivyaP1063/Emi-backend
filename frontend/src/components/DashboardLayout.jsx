import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', label: 'Overview', icon: '📊' },
        { path: '/dashboard/users', label: 'Users Report', icon: '👥' },
        { path: '/dashboard/retailers', label: 'Retailers Report', icon: '🏪' },
        { path: '/dashboard/overdue-emi', label: 'Overdue EMI', icon: '⚠️' },
        { path: '/dashboard/down-payment', label: 'Down Payment Pending', icon: '💰' },
        { path: '/dashboard/emi-details', label: 'EMI Details', icon: '📋' },
        { path: '/dashboard/recovery', label: 'Recovery Report', icon: '🔄' },
        { path: '/dashboard/retailer-full', label: 'Retailer Full Report', icon: '📈' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Admin Reports Dashboard
                            </h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Welcome, {user?.name || 'Admin'}
                            </p>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <span>🚪</span>
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex overflow-x-hidden">
                {/* Sidebar */}
                <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)] sticky top-[73px]">
                    <nav className="p-4 space-y-2">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/dashboard'}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-primary-50 text-primary-700 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                    }`
                                }
                            >
                                <span className="text-xl">{item.icon}</span>
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-6 max-w-full overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
