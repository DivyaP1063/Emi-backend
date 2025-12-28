# AMAPI Checksum - CORRECT FORMAT GUIDE

## Critical Discovery

**The issue:** Android expects **base64 URL-safe encoded SHA-256**, NOT hex format!

---

## Two Checksums Required

### 1. APK Package Checksum
**What:** SHA-256 hash of the APK file itself  
**Format:** Base64 URL-safe encoded  
**Env Var:** `APP_PACKAGE_CHECKSUM`

### 2. APK Signature Checksum  
**What:** SHA-256 hash of the certificate  
**Format:** Base64 URL-safe encoded  
**Env Var:** `APP_SIGNATURE_CHECKSUM`

---

## How to Generate Correct Checksums

### Step 1: Get SHA-256 of APK File

```bash
# Get SHA-256 hex of APK file
sha256sum app-release.apk
# Output: 3bf7c85e775463da9f6a8bc55f5e91234567890abcdef...
```

### Step 2: Convert to Base64 URL-Safe

```bash
# Method 1: Using Python
python3 << EOF
import hashlib
import base64

# Read APK file
with open('app-release.apk', 'rb') as f:
    apk_data = f.read()

# Calculate SHA-256
sha256 = hashlib.sha256(apk_data).digest()

# Encode as base64 URL-safe
base64_checksum = base64.urlsafe_b64encode(sha256).decode('utf-8').rstrip('=')
print(f"APP_PACKAGE_CHECKSUM={base64_checksum}")
EOF
```

### Step 3: Get Certificate SHA-256 in Base64

```bash
# Get certificate from APK
apksigner verify --print-certs app-release.apk | grep "SHA-256 digest"
# Output: b0c774c851ad4552554bb2e7575ba9a2566e7fc15294ee38199e35c54bfd53b8

# Convert hex to base64 URL-safe
python3 << EOF
import base64

# Your SHA-256 hex from apksigner
hex_checksum = "b0c774c851ad4552554bb2e7575ba9a2566e7fc15294ee38199e35c54bfd53b8"

# Convert hex to bytes
bytes_checksum = bytes.fromhex(hex_checksum)

# Encode as base64 URL-safe
base64_checksum = base64.urlsafe_b64encode(bytes_checksum).decode('utf-8').rstrip('=')
print(f"APP_SIGNATURE_CHECKSUM={base64_checksum}")
EOF
```

---

## Quick Python Script (All-in-One)

```python
#!/usr/bin/env python3
import hashlib
import base64
import subprocess

# Path to your APK
apk_path = 'app-release.apk'

# 1. Calculate APK file checksum
with open(apk_path, 'rb') as f:
    apk_checksum = base64.urlsafe_b64encode(
        hashlib.sha256(f.read()).digest()
    ).decode('utf-8').rstrip('=')

# 2. Get certificate checksum from apksigner
result = subprocess.run(
    ['apksigner', 'verify', '--print-certs', apk_path],
    capture_output=True, text=True
)

# Extract SHA-256 hex
for line in result.stdout.split('\n'):
    if 'SHA-256 digest:' in line:
        hex_checksum = line.split(':')[1].strip()
        cert_checksum = base64.urlsafe_b64encode(
            bytes.fromhex(hex_checksum)
        ).decode('utf-8').rstrip('=')
        break

# Print results
print("# Add to your .env file:")
print(f"APP_PACKAGE_CHECKSUM={apk_checksum}")
print(f"APP_SIGNATURE_CHECKSUM={cert_checksum}")
```

**Save as `generate_checksums.py` and run:**
```bash
python3 generate_checksums.py
```

---

## Update Your .env

```env
# APK file checksum (base64 URL-safe)
APP_PACKAGE_CHECKSUM=O_fIXndUY9qfaovFX16RI0VniJCrze8...

# Certificate checksum (base64 URL-safe)  
APP_SIGNATURE_CHECKSUM=sMd0yFGtRVJVS7LnV1upolo2f8FSl...
```

---

## Verification

Your QR payload should now have:
```json
{
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM": "O_fIXndUY...",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM": "sMd0yFGt..."
}
```

**Both are base64 URL-safe encoded, NOT hex!** This is the key difference!
