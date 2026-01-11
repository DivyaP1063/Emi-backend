# EMI Admin Reports - Frontend

React-based admin dashboard for viewing and exporting EMI reports.

## Features

- **Authentication**: OTP-based admin login
- **Reports Dashboard**: Overview of all report types
- **Users Report**: View all customers with filters
- **Retailers Report**: View all retailers with filters
- **Overdue EMI Report**: Track overdue payments
- **Down Payment Pending**: Monitor pending down payments
- **Excel Export**: Download reports in Excel format
- **Responsive Design**: Works on all devices

## Tech Stack

- React 18
- Vite
- React Router DOM
- Axios
- Tailwind CSS

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:5000/api
```

For production, update the API URL to your backend server URL.

## Deployment on Render

1. Push code to GitHub
2. Create a new Web Service on Render
3. Connect your repository
4. Set build command: `npm install && npm run build`
5. Set start command: `npm run preview`
6. Add environment variable: `VITE_API_URL` with your backend API URL
7. Deploy!

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── DashboardLayout.jsx
│   └── ProtectedRoute.jsx
├── context/            # React context
│   └── AuthContext.jsx
├── pages/              # Page components
│   ├── Login.jsx
│   ├── Overview.jsx
│   ├── UsersReport.jsx
│   ├── RetailersReport.jsx
│   ├── OverdueEMIReport.jsx
│   └── DownPaymentReport.jsx
├── services/           # API services
│   └── api.js
├── App.jsx            # Main app component
├── main.jsx           # Entry point
└── index.css          # Global styles
```

## API Integration

The frontend communicates with the backend API at `/api/admin/reports/` endpoints:

- `GET /api/admin/reports/users` - All users report
- `GET /api/admin/reports/retailers` - All retailers report
- `GET /api/admin/reports/overdue-emi` - Overdue EMI report
- `GET /api/admin/reports/down-payment-pending` - Down payment pending report

All endpoints support `?export=excel` query parameter for Excel download.
