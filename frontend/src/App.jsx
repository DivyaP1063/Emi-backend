import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DesktopOnly from './components/DesktopOnly';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import UsersReport from './pages/UsersReport';
import RetailersReport from './pages/RetailersReport';
import OverdueEMIReport from './pages/OverdueEMIReport';
import DownPaymentReport from './pages/DownPaymentReport';
import EMIReport from './pages/EMIReport';
import RecoveryReport from './pages/RecoveryReport';
import RetailerFullReport from './pages/RetailerFullReport';

function App() {
    return (
        <DesktopOnly>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />

                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <DashboardLayout />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<Overview />} />
                            <Route path="users" element={<UsersReport />} />
                            <Route path="retailers" element={<RetailersReport />} />
                            <Route path="overdue-emi" element={<OverdueEMIReport />} />
                            <Route path="down-payment" element={<DownPaymentReport />} />
                            <Route path="emi-details" element={<EMIReport />} />
                            <Route path="recovery" element={<RecoveryReport />} />
                            <Route path="retailer-full" element={<RetailerFullReport />} />
                        </Route>

                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </DesktopOnly>
    );
}

export default App;
