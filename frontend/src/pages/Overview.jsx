import { Link } from 'react-router-dom';

const Overview = () => {
    const reportCards = [
        {
            title: 'Users Report',
            description: 'View all customers with EMI details and filters',
            icon: '👥',
            link: '/dashboard/users',
            color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
        },
        {
            title: 'Retailers Report',
            description: 'View all retailers with business details and filters',
            icon: '🏪',
            link: '/dashboard/retailers',
            color: 'bg-green-50 border-green-200 hover:bg-green-100',
        },
        {
            title: 'Overdue EMI Report',
            description: 'Track customers with overdue EMI payments',
            icon: '⚠️',
            link: '/dashboard/overdue-emi',
            color: 'bg-red-50 border-red-200 hover:bg-red-100',
        },
        {
            title: 'Down Payment Pending',
            description: 'Monitor pending down payment collections',
            icon: '💰',
            link: '/dashboard/down-payment',
            color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Reports Overview</h2>
                <p className="text-gray-600 mt-1">
                    Select a report type to view detailed information and export data
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reportCards.map((card) => (
                    <Link
                        key={card.link}
                        to={card.link}
                        className={`card ${card.color} transition-all duration-200 cursor-pointer border-2`}
                    >
                        <div className="flex items-start gap-4">
                            <div className="text-4xl">{card.icon}</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                    {card.title}
                                </h3>
                                <p className="text-sm text-gray-600">{card.description}</p>
                            </div>
                            <div className="text-gray-400">→</div>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="card bg-primary-50 border-primary-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    📋 Quick Guide
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                    <li>• Use filters to narrow down report data</li>
                    <li>• Click "Export to Excel" to download reports</li>
                    <li>• Click on individual records for detailed views</li>
                    <li>• All reports support date range filtering</li>
                </ul>
            </div>
        </div>
    );
};

export default Overview;
