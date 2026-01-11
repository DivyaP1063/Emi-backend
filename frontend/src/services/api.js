import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('adminToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminData');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    requestOTP: (mobileNumber) =>
        api.post('/admin/auth/send-otp', { mobileNumber }),

    verifyOTP: (mobileNumber, otp) =>
        api.post('/admin/auth/verify-otp', { mobileNumber, otp }),
};

// Reports API
export const reportsAPI = {
    // Users Reports
    getAllUsers: (params) =>
        api.get('/admin/reports/users', { params }),

    getUser: (id, params) =>
        api.get(`/admin/reports/users/${id}`, { params }),

    // Retailers Reports
    getAllRetailers: (params) =>
        api.get('/admin/reports/retailers', { params }),

    getRetailer: (id, params) =>
        api.get(`/admin/reports/retailers/${id}`, { params }),

    // Overdue EMI Reports
    getOverdueEMI: (params) =>
        api.get('/admin/reports/overdue-emi', { params }),

    getCustomerOverdueEMI: (customerId, params) =>
        api.get(`/admin/reports/overdue-emi/${customerId}`, { params }),

    // Down Payment Pending Reports
    getDownPaymentPending: (params) =>
        api.get('/admin/reports/down-payment-pending', { params }),

    getCustomerDownPaymentPending: (customerId, params) =>
        api.get(`/admin/reports/down-payment-pending/${customerId}`, { params }),
};

// Helper function to download Excel
export const downloadExcel = async (url, filename) => {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await axios.get(`${API_BASE_URL}${url}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            responseType: 'blob',
        });

        const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = filename;
        link.click();

        window.URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error('Error downloading Excel:', error);
        throw error;
    }
};

export default api;
