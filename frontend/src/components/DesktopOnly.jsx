import { useState, useEffect } from 'react';

const DesktopOnly = ({ children }) => {
    const [isDesktop, setIsDesktop] = useState(true);

    useEffect(() => {
        const checkScreenSize = () => {
            // Consider desktop if width is >= 1024px (standard tablet landscape and above)
            setIsDesktop(window.innerWidth >= 1024);
        };

        // Check on mount
        checkScreenSize();

        // Add resize listener
        window.addEventListener('resize', checkScreenSize);

        // Cleanup
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    if (!isDesktop) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="card text-center">
                        <div className="text-6xl mb-6">💻</div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">
                            Desktop Access Required
                        </h1>
                        <p className="text-gray-600 mb-6">
                            The Admin Reports Dashboard is optimized for desktop and laptop devices only.
                        </p>
                        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
                            <p className="text-sm text-gray-700">
                                <strong>Please access this dashboard from:</strong>
                            </p>
                            <ul className="text-sm text-gray-600 mt-2 space-y-1">
                                <li>🖥️ Desktop Computer</li>
                                <li>💻 Laptop</li>
                                <li>📱 Tablet (Landscape mode, 1024px+)</li>
                            </ul>
                        </div>
                        <p className="text-xs text-gray-500">
                            For the best experience, we recommend using a screen width of at least 1024 pixels.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return children;
};

export default DesktopOnly;
