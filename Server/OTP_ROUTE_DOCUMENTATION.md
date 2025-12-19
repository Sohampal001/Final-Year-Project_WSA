# OTP Route Documentation

## Overview

The OTP system provides a unified, type-based approach for sending and verifying One-Time Passwords (OTPs) across different use cases in the Suraksha application. Instead of creating custom OTP logic for each feature (onboarding, login, signup, etc.), the system uses a single, generic OTP route with different types.

## Base URL

```
/api/otp
```

## OTP Types

The system supports the following OTP types:

- `AADHAAR` - For Aadhaar verification during onboarding
- `SIGNUP` - For user signup verification
- `EMAIL_VERIFICATION` - For verifying user email addresses
- `MOBILE_VERIFICATION` - For verifying mobile numbers
- `PASSWORD_RESET` - For password reset requests

## Authentication

All OTP endpoints require authentication via JWT Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Send OTP

**POST** `/api/otp/send`

Generates and sends a 6-digit OTP to the user's email or mobile.

**Request Body:**

```json
{
  "type": "EMAIL_VERIFICATION",
  "purpose": "Email Verification",
  "email": "user@example.com",
  "mobile": "9876543210"
}
```

**Parameters:**

- `type` (required): One of the OTP types listed above
- `purpose` (required): A descriptive purpose for the OTP (e.g., "Email Verification", "Password Reset")
- `email` (optional): Email address to send OTP to
- `mobile` (optional): Mobile number to send OTP to
- **Note:** At least one of `email` or `mobile` must be provided

**Response:**

```json
{
  "success": true,
  "message": "OTP sent successfully. Valid for 5 minutes."
}
```

**Error Responses:**

- 400: Missing or invalid parameters
- 401: Authentication required
- 500: Server error

---

### 2. Verify OTP

**POST** `/api/otp/verify`

Verifies the OTP entered by the user.

**Request Body:**

```json
{
  "type": "EMAIL_VERIFICATION",
  "otp": "123456"
}
```

**Parameters:**

- `type` (required): The OTP type that was used when sending
- `otp` (required): The 6-digit OTP received by the user

**Response:**

```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

**Error Responses:**

- 400: Invalid OTP format or missing parameters
- 401: Authentication required
- 404: No OTP found for this type
- 500: OTP expired or verification failed

---

### 3. Get OTP Status

**GET** `/api/otp/status?type=<type>`

Checks if there's an active OTP for the given type.

**Query Parameters:**

- `type` (required): The OTP type to check

**Example:**

```
GET /api/otp/status?type=EMAIL_VERIFICATION
```

**Response:**

```json
{
  "success": true,
  "data": {
    "type": "EMAIL_VERIFICATION",
    "purpose": "Email Verification",
    "expiresIn": "4 minute(s)",
    "sentTo": "Email: user@example.com"
  }
}
```

**Error Responses:**

- 400: Missing or invalid type parameter
- 401: Authentication required
- 404: No active OTP found
- 500: Server error

---

### 4. Delete OTP

**DELETE** `/api/otp`

Deletes/cancels an active OTP for the given type.

**Request Body:**

```json
{
  "type": "EMAIL_VERIFICATION"
}
```

**Parameters:**

- `type` (required): The OTP type to delete

**Response:**

```json
{
  "success": true,
  "message": "OTP deleted successfully"
}
```

**Error Responses:**

- 400: Missing or invalid type parameter
- 401: Authentication required
- 404: No OTP found to delete
- 500: Server error

---

## Usage Examples

### Example 1: Email Verification Flow

```javascript
// Step 1: Send OTP
const sendResponse = await fetch("/api/otp/send", {
  method: "POST",
  headers: {
    Authorization: "Bearer <token>",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    type: "EMAIL_VERIFICATION",
    purpose: "Verify your email address",
    email: "user@example.com",
  }),
});

// Step 2: User enters OTP, then verify
const verifyResponse = await fetch("/api/otp/verify", {
  method: "POST",
  headers: {
    Authorization: "Bearer <token>",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    type: "EMAIL_VERIFICATION",
    otp: "123456",
  }),
});
```

### Example 2: Aadhaar Verification (Used in Onboarding)

```javascript
// The onboarding controller uses the OTP service internally
// When user submits Aadhaar number:
POST /api/onboarding/aadhaar/send-otp
{
  "aadhaarNumber": "123456789012"
}

// This internally calls:
// otpService.createOTP(userId, "AADHAAR", "Aadhaar Verification", { email: user.email })

// When user enters OTP:
POST /api/onboarding/aadhaar/verify-otp
{
  "otp": "123456"
}

// This internally calls:
// otpService.verifyOTP(userId, "AADHAAR", otp)
```

### Example 3: Password Reset Flow

```javascript
// Step 1: User requests password reset
await fetch("/api/otp/send", {
  method: "POST",
  headers: {
    Authorization: "Bearer <token>",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    type: "PASSWORD_RESET",
    purpose: "Reset your password",
    email: "user@example.com",
  }),
});

// Step 2: Verify OTP before allowing password change
await fetch("/api/otp/verify", {
  method: "POST",
  headers: {
    Authorization: "Bearer <token>",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    type: "PASSWORD_RESET",
    otp: "123456",
  }),
});

// Step 3: If verification succeeds, proceed with password update
await fetch("/api/users/:id/password", {
  method: "PUT",
  headers: {
    Authorization: "Bearer <token>",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    newPassword: "newSecurePassword123",
  }),
});
```

---

## Important Notes

1. **OTP Expiry**: All OTPs are valid for 5 minutes only
2. **Auto-cleanup**: MongoDB automatically deletes expired OTPs using TTL index
3. **One Active OTP**: Only one active OTP per type per user at a time
4. **Resend Logic**: If an unexpired OTP exists, the system resends the same OTP instead of generating a new one
5. **Single Use**: OTPs are deleted after successful verification
6. **Security**: OTPs are 6-digit random numbers generated using Math.random()

## Database Schema

The OTP model stores the following information:

```typescript
{
  userId: ObjectId,          // Reference to User
  otp: string,               // The 6-digit OTP
  type: enum,                // One of the 5 types
  purpose: string,           // Human-readable purpose
  email?: string,            // Email where OTP was sent (optional)
  mobile?: string,           // Mobile where OTP was sent (optional)
  isVerified: boolean,       // Whether OTP has been verified
  expiresAt: Date,          // Expiry timestamp (5 minutes from creation)
  createdAt: Date,          // Auto-generated
  updatedAt: Date           // Auto-generated
}
```

## Error Handling

The OTP system includes comprehensive error handling:

- Invalid OTP format (must be 6 digits)
- Expired OTPs (older than 5 minutes)
- Missing required fields
- Invalid email format
- Invalid mobile format (must be 10 digits)
- User not found
- No active OTP found

## Integration Guide

### For New Features

When adding a new feature that requires OTP verification:

1. **Don't create a new OTP type unless absolutely necessary**
2. Use existing types when possible (e.g., use `EMAIL_VERIFICATION` for all email verifications)
3. If you need a new type, add it to the enum in:
   - `/Server/src/models/OTP.ts`
   - `/Server/src/services/OTPService.ts`
   - `/Server/src/controllers/otpController.ts`

### Example Integration in a New Controller

```typescript
import otpService from "../services/OTPService";

export const myNewFeature = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  // Send OTP
  await otpService.createOTP(
    userId,
    "EMAIL_VERIFICATION", // Use appropriate type
    "My Feature Verification",
    { email: userEmail }
  );

  // Later, verify OTP
  await otpService.verifyOTP(userId, "EMAIL_VERIFICATION", otpFromUser);
};
```

---

## Testing

You can test the OTP endpoints using tools like Postman or curl:

```bash
# 1. Send OTP
curl -X POST http://localhost:3000/api/otp/send \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "EMAIL_VERIFICATION",
    "purpose": "Test OTP",
    "email": "test@example.com"
  }'

# 2. Check console logs for the generated OTP (in development)

# 3. Verify OTP
curl -X POST http://localhost:3000/api/otp/verify \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "EMAIL_VERIFICATION",
    "otp": "123456"
  }'
```

---

## Future Enhancements

- [ ] SMS integration for mobile OTP delivery (Twilio/AWS SNS)
- [ ] Rate limiting to prevent OTP spam
- [ ] Configurable OTP length and expiry
- [ ] OTP attempt tracking and account lockout after multiple failed attempts
- [ ] Two-factor authentication (2FA) support
- [ ] Audit logging for OTP operations
