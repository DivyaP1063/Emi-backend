# Customer Device API Documentation

This document describes the API endpoints used by the mobile app installed on customer devices for device registration (IMEI, FCM token, PIN, location), lock/unlock notifications, location tracking, and device status management.

## Base URL

```
http://localhost:5000/api/customer/device
```

## Authentication

These endpoints do **NOT** require JWT authentication. They use IMEI-based identification for security.

---

## Endpoints

### 1. Register/Update FCM Token

Register or update the Firebase Cloud Messaging token for a customer device. Also accepts optional device PIN and location for complete device registration when the app is first installed.

**Endpoint:** `PUT /api/customer/device/fcm-token`

**Request Body:**
```json
{
  "fcmToken": "string (required) - Firebase Cloud Messaging token",
  "imei1": "string (required) - 15-digit IMEI number",
  "devicePin": "string (optional) - 4-6 digit device PIN",
  "latitude": "number (optional) - Device latitude (-90 to 90)",
  "longitude": "number (optional) - Device longitude (-180 to 180)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "FCM token registered successfully",
  "data": {
    "customerId": "507f1f77bcf86cd799439011",
    "customerName": "John Doe",
    "isLocked": false,
    "location": {
      "latitude": 28.7041,
      "longitude": 77.1025,
      "lastUpdated": "2025-12-22T14:45:30.000Z"
    },
    "updatedAt": "2025-12-22T14:45:30.000Z"
  }
}
```

> **Note**: The `location` field in the response is only included if location data was provided and stored.

**Error Responses:**

- **400 Bad Request** - Validation error
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "msg": "Device PIN must be 4-6 digits",
      "param": "devicePin"
    }
  ]
}
```

- **404 Not Found** - Customer not found
```json
{
  "success": false,
  "message": "Customer not found with this IMEI",
  "error": "CUSTOMER_NOT_FOUND"
}
```

**Example (Kotlin - Complete Registration):**
```kotlin
// Call this when the app is first installed with all fields
suspend fun registerDevice(
    fcmToken: String,
    imei: String,
    devicePin: String,
    latitude: Double,
    longitude: Double
) {
    val request = JSONObject().apply {
        put("fcmToken", fcmToken)
        put("imei1", imei)
        put("devicePin", devicePin)
        put("latitude", latitude)
        put("longitude", longitude)
    }
    
    val response = apiClient.put(
        url = "http://your-server.com/api/customer/device/fcm-token",
        body = request
    )
    
    if (response.success) {
        Log.d("Registration", "Device registered successfully")
        val isLocked = response.data.getBoolean("isLocked")
        if (isLocked) {
            lockDevice()
        }
    }
}
```

**Example (Kotlin - FCM Token Update Only):**
```kotlin
// Call this when only FCM token needs to be updated
suspend fun updateFcmToken(fcmToken: String, imei: String) {
    val request = JSONObject().apply {
        put("fcmToken", fcmToken)
        put("imei1", imei)
    }
    
    val response = apiClient.put(
        url = "http://your-server.com/api/customer/device/fcm-token",
        body = request
    )
}
```

---

### 2. Device Lock Response Callback

Called by the mobile app after attempting to lock or unlock the device in response to an FCM notification.

**Endpoint:** `POST /api/customer/device/lock-response`

**Request Body:**
```json
{
  "imei1": "string (required) - 15-digit IMEI number",
  "lockSuccess": "boolean (required) - Whether lock/unlock was successful",
  "action": "string (required) - Either 'LOCK_DEVICE' or 'UNLOCK_DEVICE'",
  "errorMessage": "string (optional) - Error message if lockSuccess is false"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Lock response received",
  "data": {
    "customerId": "507f1f77bcf86cd799439011",
    "customerName": "John Doe",
    "currentLockStatus": true,
    "responseProcessed": true
  }
}
```

**Error Responses:**

- **400 Bad Request** - Validation error
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "msg": "action must be either LOCK_DEVICE or UNLOCK_DEVICE",
      "param": "action"
    }
  ]
}
```

- **404 Not Found** - Customer not found
```json
{
  "success": false,
  "message": "Customer not found with this IMEI",
  "error": "CUSTOMER_NOT_FOUND"
}
```

**Example (Kotlin):**
```kotlin
// Call this after attempting to lock/unlock the device
suspend fun sendLockResponse(
    imei: String,
    success: Boolean,
    action: String,
    errorMessage: String? = null
) {
    val request = JSONObject().apply {
        put("imei1", imei)
        put("lockSuccess", success)
        put("action", action)
        errorMessage?.let { put("errorMessage", it) }
    }
    
    val response = apiClient.post(
        url = "http://your-server.com/api/customer/device/lock-response",
        body = request
    )
    
    Log.d("LockResponse", "Response sent: ${response.success}")
}
```

---

### 3. Get Customer Status

Get the current lock status and pending EMI information for a customer device.

**Endpoint:** `GET /api/customer/device/status/:imei1`

**URL Parameters:**
- `imei1` (required) - 15-digit IMEI number

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer status fetched successfully",
  "data": {
    "customerId": "507f1f77bcf86cd799439011",
    "customerName": "John Doe",
    "mobileNumber": "9876543210",
    "isLocked": false,
    "hasPendingEmis": true,
    "pendingEmiCount": 2,
    "registeredAt": "2025-01-15T10:30:00.000Z",
    "lastUpdated": "2025-12-21T16:45:30.000Z"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Invalid IMEI format
```json
{
  "success": false,
  "message": "Invalid IMEI format. Must be exactly 15 digits",
  "error": "VALIDATION_ERROR"
}
```

- **404 Not Found** - Customer not found
```json
{
  "success": false,
  "message": "Customer not found with this IMEI",
  "error": "CUSTOMER_NOT_FOUND"
}
```

**Example (Kotlin):**
```kotlin
// Call this periodically to check device status
suspend fun checkDeviceStatus(imei: String): DeviceStatus? {
    val response = apiClient.get(
        url = "http://your-server.com/api/customer/device/status/$imei"
    )
    
    return if (response.success) {
        DeviceStatus(
            isLocked = response.data.getBoolean("isLocked"),
            hasPendingEmis = response.data.getBoolean("hasPendingEmis"),
            pendingEmiCount = response.data.getInt("pendingEmiCount")
        )
    } else {
        null
    }
}
```

---

### 4. Get Customer Location

Fetch the current location of a customer device by IMEI.

**Endpoint:** `GET /api/customer/device/location/:imei1`

**URL Parameters:**
- `imei1` (required) - 15-digit IMEI number

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer location fetched successfully",
  "data": {
    "customerId": "507f1f77bcf86cd799439011",
    "customerName": "John Doe",
    "mobileNumber": "9876543210",
    "location": {
      "latitude": 28.7041,
      "longitude": 77.1025,
      "lastUpdated": "2025-12-22T14:30:00.000Z"
    }
  }
}
```

**Error Responses:**

- **400 Bad Request** - Invalid IMEI format
```json
{
  "success": false,
  "message": "Invalid IMEI format. Must be exactly 15 digits",
  "error": "VALIDATION_ERROR"
}
```

- **404 Not Found** - Customer not found
```json
{
  "success": false,
  "message": "Customer not found with this IMEI",
  "error": "CUSTOMER_NOT_FOUND"
}
```

- **404 Not Found** - Location not available
```json
{
  "success": false,
  "message": "Location data not available for this customer",
  "error": "LOCATION_NOT_FOUND"
}
```

**Example (Kotlin):**
```kotlin
// Fetch current device location from server
suspend fun getDeviceLocation(imei: String): Location? {
    val response = apiClient.get(
        url = "http://your-server.com/api/customer/device/location/$imei"
    )
    
    return if (response.success) {
        val locationData = response.data.getJSONObject("location")
        Location(
            latitude = locationData.getDouble("latitude"),
            longitude = locationData.getDouble("longitude"),
            lastUpdated = locationData.getString("lastUpdated")
        )
    } else {
        null
    }
}
```

---

### 5. Update Customer Location

Update the current location of a customer device. The Kotlin app should call this endpoint every 15 minutes.

**Endpoint:** `POST /api/customer/device/location`

**Request Body:**
```json
{
  "imei1": "string (required) - 15-digit IMEI number",
  "latitude": "number (required) - Device latitude (-90 to 90)",
  "longitude": "number (required) - Device longitude (-180 to 180)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "customerId": "507f1f77bcf86cd799439011",
    "customerName": "John Doe",
    "location": {
      "latitude": 28.7041,
      "longitude": 77.1025,
      "lastUpdated": "2025-12-22T14:45:30.000Z"
    }
  }
}
```

**Error Responses:**

- **400 Bad Request** - Validation error
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "msg": "Latitude must be between -90 and 90",
      "param": "latitude"
    }
  ]
}
```

- **404 Not Found** - Customer not found
```json
{
  "success": false,
  "message": "Customer not found with this IMEI",
  "error": "CUSTOMER_NOT_FOUND"
}
```

**Example (Kotlin):**
```kotlin
// Update device location every 15 minutes
class LocationUpdateWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    
    override suspend fun doWork(): Result {
        val location = getCurrentLocation() ?: return Result.retry()
        
        val request = JSONObject().apply {
            put("imei1", getDeviceImei())
            put("latitude", location.latitude)
            put("longitude", location.longitude)
        }
        
        return try {
            val response = apiClient.post(
                url = "http://your-server.com/api/customer/device/location",
                body = request
            )
            
            if (response.success) {
                Log.d("Location", "Location updated successfully")
                Result.success()
            } else {
                Result.retry()
            }
        } catch (e: Exception) {
            Log.e("Location", "Failed to update location", e)
            Result.retry()
        }
    }
}

// Schedule periodic location updates
fun scheduleLocationUpdates(context: Context) {
    val locationUpdateRequest = PeriodicWorkRequestBuilder<LocationUpdateWorker>(
        15, TimeUnit.MINUTES
    ).build()
    
    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        "location_update",
        ExistingPeriodicWorkPolicy.KEEP,
        locationUpdateRequest
    )
}
```

---

## FCM Notification Payload

When the admin locks or unlocks a customer, the backend sends an FCM notification with the following structure:

**Notification:**
```json
{
  "title": "Device Lock Alert" or "Device Unlock Alert",
  "body": "Your device has been locked due to pending EMI payments." or "Your device has been unlocked. Thank you for your payment."
}
```

**Data Payload:**
```json
{
  "action": "LOCK_DEVICE" or "UNLOCK_DEVICE",
  "timestamp": "2025-12-21T16:45:30.000Z",
  "type": "DEVICE_LOCK_STATUS"
}
```

**Example (Kotlin - FCM Service):**
```kotlin
class MyFirebaseMessagingService : FirebaseMessagingService() {
    
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val data = remoteMessage.data
        
        when (data["type"]) {
            "DEVICE_LOCK_STATUS" -> {
                val action = data["action"]
                handleLockAction(action)
            }
        }
    }
    
    private fun handleLockAction(action: String?) {
        when (action) {
            "LOCK_DEVICE" -> {
                val success = lockDevice()
                sendLockResponse(
                    imei = getDeviceImei(),
                    success = success,
                    action = "LOCK_DEVICE",
                    errorMessage = if (!success) "Failed to lock device" else null
                )
            }
            "UNLOCK_DEVICE" -> {
                val success = unlockDevice()
                sendLockResponse(
                    imei = getDeviceImei(),
                    success = success,
                    action = "UNLOCK_DEVICE",
                    errorMessage = if (!success) "Failed to unlock device" else null
                )
            }
        }
    }
    
    override fun onNewToken(token: String) {
        // Register new FCM token with backend
        CoroutineScope(Dispatchers.IO).launch {
            registerFcmToken(token, getDeviceImei())
        }
    }
}
```

---

## Integration Flow

### 1. App Installation Flow

```mermaid
sequenceDiagram
    participant App as Mobile App
    participant FCM as Firebase
    participant GPS as Location Service
    participant API as Backend API

    App->>FCM: Request FCM Token
    FCM-->>App: Return FCM Token
    App->>App: Get Device IMEI
    App->>App: Get Device PIN from User
    App->>GPS: Get Current Location
    GPS-->>App: Return Coordinates
    App->>API: PUT /api/customer/device/fcm-token
    Note over App,API: Send IMEI, FCM Token, PIN, Location
    API-->>App: Device Registered + Lock Status
    App->>App: Apply Lock Status if Locked
```

### 2. Device Lock Flow

```mermaid
sequenceDiagram
    participant Admin as Admin Panel
    participant API as Backend API
    participant FCM as Firebase
    participant App as Mobile App

    Admin->>API: PUT /api/admin/customers/:id/lock {isLocked: true}
    API->>FCM: Send Lock Notification
    FCM-->>App: Push Notification
    App->>App: Lock Device
    App->>API: POST /api/customer/device/lock-response {lockSuccess: true}
    API-->>App: Response Received
```

### 3. Location Tracking Flow

```mermaid
sequenceDiagram
    participant App as Mobile App
    participant GPS as Location Service
    participant API as Backend API
    participant Worker as Background Worker

    Note over Worker: Every 15 minutes
    Worker->>GPS: Get Current Location
    GPS-->>Worker: Return Coordinates
    Worker->>API: POST /api/customer/device/location
    Note over Worker,API: Send IMEI, Latitude, Longitude
    API-->>Worker: Location Updated
    Worker->>Worker: Schedule Next Update
```

---

## Error Handling

The mobile app should handle the following scenarios:

1. **No Internet Connection**: Queue the FCM token registration and lock responses for retry when connection is restored
2. **Invalid IMEI**: Ensure IMEI is exactly 15 digits before making API calls
3. **FCM Token Refresh**: Re-register the token whenever Firebase provides a new one
4. **Lock Failure**: Send lock response with `lockSuccess: false` and include error message
5. **Server Unreachable**: Implement exponential backoff for retries

---

## Security Considerations

1. **IMEI Validation**: All endpoints validate IMEI format (exactly 15 digits)
2. **No Authentication Required**: These endpoints are designed for device-level access without user authentication
3. **Rate Limiting**: Standard rate limiting applies to prevent abuse
4. **HTTPS Only**: In production, ensure all API calls use HTTPS
5. **FCM Token Security**: Never expose FCM tokens in logs or error messages

---

## Testing

### Test Complete Device Registration

```bash
curl -X PUT http://localhost:5000/api/customer/device/fcm-token \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "test-fcm-token-123456",
    "imei1": "123456789012345",
    "devicePin": "1234",
    "latitude": 28.7041,
    "longitude": 77.1025
  }'
```

### Test FCM Token Update

```bash
curl -X PUT http://localhost:5000/api/customer/device/fcm-token \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "test-fcm-token-123456",
    "imei1": "123456789012345"
  }'
```

### Test Lock Response

```bash
curl -X POST http://localhost:5000/api/customer/device/lock-response \
  -H "Content-Type: application/json" \
  -d '{
    "imei1": "123456789012345",
    "lockSuccess": true,
    "action": "LOCK_DEVICE"
  }'
```

### Test Get Status

```bash
curl -X GET http://localhost:5000/api/customer/device/status/123456789012345
```

### Test Get Location

```bash
curl -X GET http://localhost:5000/api/customer/device/location/123456789012345
```

### Test Update Location

```bash
curl -X POST http://localhost:5000/api/customer/device/location \
  -H "Content-Type: application/json" \
  -d '{
    "imei1": "123456789012345",
    "latitude": 28.7050,
    "longitude": 77.1030
  }'
```
