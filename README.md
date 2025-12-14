# Admin Backend API

A Node.js Express backend API for managing retailers in an admin application.

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication
- **Cloudinary** - Image storage
- **Express Validator** - Input validation
- **Helmet** - Security headers
- **Express Rate Limit** - API rate limiting

## Features

- ✅ OTP-based authentication for admin users
- ✅ JWT token authentication
- ✅ Create and manage retailers
- ✅ Search and filter retailers with pagination
- ✅ Rate limiting for OTP requests
- ✅ Input validation and error handling
- ✅ Security best practices
- ✅ MongoDB with Mongoose ODM
- ✅ Cloudinary integration ready

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```

   Update the `.env` file with your actual values:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/admin_app
   JWT_SECRET=your_secure_jwt_secret_key
   JWT_EXPIRES_IN=24h
   OTP_EXPIRY_MINUTES=5
   OTP_MAX_ATTEMPTS=3
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

3. **Set up MongoDB:**
   
   Make sure MongoDB is running locally or use MongoDB Atlas.

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   ├── database.js       # MongoDB connection
│   │   └── cloudinary.js     # Cloudinary configuration
│   ├── controllers/
│   │   ├── authController.js # Authentication logic
│   │   └── retailerController.js # Retailer management
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication middleware
│   │   └── rateLimiter.js    # Rate limiting middleware
│   ├── models/
│   │   ├── Admin.js          # Admin model
│   │   ├── Retailer.js       # Retailer model
│   │   └── OTP.js            # OTP model
│   ├── routes/
│   │   ├── authRoutes.js     # Authentication routes
│   │   ├── retailerRoutes.js # Retailer routes
│   │   └── index.js          # Main router
│   ├── utils/
│   │   ├── jwt.js            # JWT utilities
│   │   └── otpService.js     # OTP generation & verification
│   └── server.js             # Main server file
├── .env                      # Environment variables (create from .env.example)
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore file
├── package.json              # Dependencies
└── README.md                 # This file
```

## API Endpoints

### Base URL
```
http://localhost:5000/api/admin
```

### Authentication (No auth required)

#### 1. Send OTP
- **POST** `/auth/send-otp`
- **Body:**
  ```json
  {
    "mobileNumber": "9876543210"
  }
  ```

#### 2. Verify OTP
- **POST** `/auth/verify-otp`
- **Body:**
  ```json
  {
    "mobileNumber": "9876543210",
    "otp": "123456"
  }
  ```

### Retailers (Auth required)

#### 3. Create Retailer
- **POST** `/retailers`
- **Headers:** `Authorization: Bearer {token}`
- **Body:**
  ```json
  {
    "basicInfo": {
      "fullName": "Retailer Name",
      "email": "retailer@example.com",
      "mobileNumber": "9876543210",
      "shopName": "Shop Name"
    },
    "address": {
      "country": "India",
      "state": "Maharashtra",
      "city": "Mumbai",
      "address": "Complete address"
    },
    "permissions": {
      "canPayEmiDownPayment": true,
      "dpPending": false,
      "autoLockDay": 30,
      "serverAadharVerify": true,
      "allowElectronic": true,
      "allowIPhone": false,
      "allow8Month": true,
      "allow4Month": false
    }
  }
  ```

#### 4. Get All Retailers
- **GET** `/retailers?page=1&limit=20&search=query&status=ACTIVE`
- **Headers:** `Authorization: Bearer {token}`
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 20)
  - `search` (optional): Search by name, email, or mobile
  - `status` (optional): Filter by status (ACTIVE, INACTIVE, SUSPENDED)

## Running the Server

### Development Mode (with auto-restart):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server will start on `http://localhost:5000` (or the port specified in `.env`)

## Initial Setup

Before using the API, you need to create an admin user in MongoDB:

```javascript
// Connect to MongoDB and run this:
db.admins.insertOne({
  name: "Admin Name",
  email: "admin@example.com",
  mobileNumber: "9999999999",
  isActive: true,
  role: "ADMIN",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## Testing

### Test Credentials (Development Only)
- **Mobile:** 9999999999
- **OTP:** 123456

**Important:** Disable test credentials in production by setting `NODE_ENV=production`

### Test with cURL

1. **Send OTP:**
   ```bash
   curl -X POST http://localhost:5000/api/admin/auth/send-otp ^
   -H "Content-Type: application/json" ^
   -d "{\"mobileNumber\":\"9999999999\"}"
   ```

2. **Verify OTP:**
   ```bash
   curl -X POST http://localhost:5000/api/admin/auth/verify-otp ^
   -H "Content-Type: application/json" ^
   -d "{\"mobileNumber\":\"9999999999\",\"otp\":\"123456\"}"
   ```

3. **Create Retailer:**
   ```bash
   curl -X POST http://localhost:5000/api/admin/retailers ^
   -H "Content-Type: application/json" ^
   -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
   -d "{\"basicInfo\":{\"fullName\":\"Test Retailer\",\"email\":\"test@example.com\",\"mobileNumber\":\"9876543210\",\"shopName\":\"Test Shop\"},\"address\":{\"country\":\"India\",\"state\":\"Maharashtra\",\"city\":\"Mumbai\",\"address\":\"Test Address\"},\"permissions\":{\"canPayEmiDownPayment\":true,\"dpPending\":false,\"autoLockDay\":30,\"serverAadharVerify\":true,\"allowElectronic\":true,\"allowIPhone\":false,\"allow8Month\":true,\"allow4Month\":false}}"
   ```

## Security Features

- ✅ Helmet for security headers
- ✅ CORS enabled
- ✅ Rate limiting (3 OTP requests per 5 minutes)
- ✅ JWT authentication with 24-hour expiry
- ✅ OTP with 5-minute expiry and 3 attempt limit
- ✅ Input validation on all endpoints
- ✅ Unique constraints on mobile and email

## Error Codes

- `UNAUTHORIZED_ACCESS` - Not authorized to access
- `INVALID_TOKEN` - JWT token invalid or expired
- `VALIDATION_ERROR` - Request validation failed
- `DUPLICATE_MOBILE` - Mobile number already exists
- `DUPLICATE_EMAIL` - Email already exists
- `INVALID_OTP` - OTP is invalid or expired
- `SERVER_ERROR` - Internal server error
- `RATE_LIMIT_EXCEEDED` - Too many requests

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use a strong `JWT_SECRET`
3. Disable test credentials
4. Set up MongoDB Atlas or production MongoDB
5. Configure SMS gateway for OTP (Twilio, MSG91, etc.)
6. Set up Cloudinary for production
7. Use a reverse proxy (Nginx)
8. Enable HTTPS
9. Set up monitoring and logging

## Notes

- OTP sending is currently mocked. Integrate with an SMS gateway for production.
- Cloudinary is configured but not used in the current endpoints. Ready for image uploads.
- Make sure to create at least one admin user in MongoDB before testing.

## License

ISC
