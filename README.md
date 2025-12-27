# EMI Backend - Device Management & Payment System

Backend API for managing EMI (Equated Monthly Installment) payments with integrated device provisioning and remote management using Android Management API.

---

## 🚀 Features

### Core Functionality

- **EMI Management** - Track customer payments, installments, and overdue accounts
- **Device Provisioning** - QR code-based Android device setup via AMAPI
- **Remote Lock/Unlock** - Control device access based on payment status (via FCM)
- **Multi-Role System** - Admin, Retailer, Accountant, Recovery Head, Recovery Person
- **Real-time Monitoring** - Device location tracking and activity monitoring
- **Automated Reminders** - Cron jobs for EMI reminders and auto-lock

### Android Management API (AMAPI)

- Enterprise device enrollment
- Policy enforcement (app restrictions, security settings)
- QR code generation for device provisioning
- Webhook integration for device status updates
- Factory reset capability (emergency)

### Payment & Financial

- Customer registration and KYC
- EMI calculation and tracking
- Late fee management
- Payment history
- Device collection tracking

---

## 🛠️ Tech Stack

**Backend:**

- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication

**External Services:**

- Firebase Cloud Messaging (FCM) - Device notifications
- Google Android Management API (AMAPI) - Device management
- Cloudinary - Image storage

**DevOps:**

- Render (Deployment)
- Docker support
- Redis (optional caching)

---

## 📦 Installation

### Prerequisites

- Node.js (v18+)
- MongoDB
- Firebase project (for FCM)
- Google Cloud project (for AMAPI)

### Quick Start

```bash
# Clone repository
git clone <repo-url>
cd Emi-backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your credentials

# Run development server
npm run dev

# Run production server
npm start
```

---

## ⚙️ Environment Configuration

### Required Variables

```env
# Database
MONGODB_URI=mongodb+srv://...

# Authentication
JWT_SECRET=your_secret_key

# Firebase (FCM)
FIREBASE_SERVICE_ACCOUNT_BASE64=<base64_encoded_json>

# Android Management API
ANDROID_MANAGEMENT_ENABLED=true
ANDROID_MANAGEMENT_SERVICE_ACCOUNT_PATH=./android-manager.json
ANDROID_MANAGEMENT_ENTERPRISE_ID=enterprises/LC...
ANDROID_MANAGEMENT_DEFAULT_POLICY_ID=policy1
AMAPI_WEBHOOK_SECRET=your_webhook_secret

# Backend Config
BACKEND_URL=https://your-backend.com
APP_SIGNATURE_CHECKSUM=your_app_sha256
PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION=https://...
```

**See `.env.example` for complete configuration.**

---

## 👥 User Roles

| Role                | Capabilities                                              |
| ------------------- | --------------------------------------------------------- |
| **Admin**           | Full system access, AMAPI management, all customer data   |
| **Retailer**        | Register customers, generate QR codes, view own customers |
| **Accountant**      | View financial data, payment tracking                     |
| **Recovery Head**   | Manage recovery persons, assign customers                 |
| **Recovery Person** | Field operations, device collection                       |

---

## 📱 AMAPI Integration

### Device Provisioning Flow

1. **Retailer generates QR code** (during device sale)
2. **Customer scans QR** (during Android setup)
3. **Device auto-enrolls** with enterprise management
4. **Policy applied** (app restrictions, security)
5. **Backend notified** via webhook

### Key Endpoints

**Retailer:**

```
POST /api/retailer/device-setup/qr/:customerId
```

**Admin:**

```
POST /api/admin/amapi/qr/:customerId
GET  /api/admin/amapi/devices
POST /api/admin/amapi/devices/:imei/factory-reset
```

**Webhook:**

```
POST /api/webhooks/amapi
```

---

## 🔒 Device Lock/Unlock

**Method:** Firebase Cloud Messaging (NOT AMAPI)

- Payment received → Unlock via FCM notification
- Payment overdue → Lock via FCM notification
- Custom lock screen with payment info
- App sends confirmation callback

**AMAPI is NOT used for payment locks** - only for provisioning and emergency actions.

---

## 📊 API Structure

```
/api
├── /admin          - Admin operations
├── /retailer       - Retailer operations
├── /accountant     - Financial operations
├── /recovery-head  - Recovery management
├── /recovery-person - Field operations
├── /customer/device - Customer device endpoints
└── /webhooks       - External webhooks (AMAPI)
```

---

## 🔄 Background Jobs

**Cron Service:**

- EMI reminders (every 12 hours)
- Auto-lock overdue devices
- Activity monitoring (location-based timeout)

**Device Activity Monitor:**

- Tracks location updates
- Auto-locks inactive devices (15 min timeout)
- Unlocks on activity resume

---

## 🗄️ Database Models

- **Customer** - Customer details, EMI data, device info
- **Admin** - System administrators
- **Retailer** - Shop/retailer accounts
- **Accountant** - Finance team members
- **RecoveryHead** - Recovery managers
- **RecoveryPerson** - Field agents

---

## 🚀 Deployment

### Render (Recommended)

1. **Push to GitHub** (credentials in `.gitignore`)
2. **Create Render service** (Web Service)
3. **Add environment variables** in Render dashboard
4. **Add secret files:**
   - `android-manager.json` (AMAPI service account)
5. **Deploy**

### Environment-Specific Settings

**Production:**

- Use secret files for credentials (not in Git)
- Enable AMAPI webhook signature verification
- Configure Firebase service account via base64

---

## 🧪 Testing

**Quick API Test:**

```bash
# Health check
curl https://your-backend.com/api/health

# Login (admin)
POST /api/admin/send-otp
POST /api/admin/verify-otp
```

**AMAPI Test:**

```bash
# Generate QR (requires auth)
POST /api/retailer/device-setup/qr/:customerId
Authorization: Bearer <token>
```

---

## 📝 Key Features Summary

✅ Multi-role authentication system  
✅ EMI payment tracking  
✅ Android device provisioning (AMAPI)  
✅ Remote device lock/unlock (FCM)  
✅ Location-based activity monitoring  
✅ Automated payment reminders  
✅ QR code device setup  
✅ Enterprise policy enforcement  
✅ Device collection tracking  
✅ Factory reset capability

---

## 🔐 Security

- JWT-based authentication
- Role-based access control (RBAC)
- Webhook signature verification (AMAPI)
- Environment variable encryption
- Service account isolation

---

## 📚 Documentation

- API endpoints: See source code controllers
- AMAPI setup: Check `.env.example` comments
- Webhooks: `src/controllers/amapiWebhookController.js`

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

---

## 📄 License

ISC

---

**Built for EMI device management with enterprise-grade Android provisioning.**
