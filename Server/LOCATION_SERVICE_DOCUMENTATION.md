# Location Service Documentation

## Overview

The Location Service provides real-time location tracking for users with intelligent distance-based filtering. It stores location data only when users move at least 100 meters from their last recorded position and provides functionality to find nearby users within a 500-meter radius.

## Features

- **Smart Location Storage**: Stores location only when user moves ≥100m from previous location
- **Distance Calculation**: Uses Haversine formula for accurate distance calculation between coordinates
- **Nearby Users**: Find all users within a specified radius (default: 500m)
- **Location History**: Track user movement over time
- **Real-time Updates**: Automatically syncs location when user moves

## Backend Architecture

### 1. Location Model (`Server/src/models/Location.ts`)

```typescript
interface ILocation {
  userId: ObjectId; // Reference to User
  latitude: number; // -90 to 90
  longitude: number; // -180 to 180
  accuracy?: number; // GPS accuracy in meters
  altitude?: number; // Elevation
  speed?: number; // Speed in m/s
  heading?: number; // Direction (0-360 degrees)
  timestamp: Date; // When location was recorded
  createdAt: Date; // Auto-generated
  updatedAt: Date; // Auto-generated
}
```

**Indexes:**

- `{ latitude: 1, longitude: 1 }` - For geospatial queries
- `{ userId: 1, timestamp: -1 }` - For user location history

### 2. Location Service (`Server/src/services/LocationService.ts`)

#### Key Methods:

**`calculateDistance(lat1, lon1, lat2, lon2): number`**

- Calculates distance between two coordinates using Haversine formula
- Returns distance in meters
- Algorithm:

  ```
  R = 6371000 (Earth's radius in meters)
  φ1, φ2 = latitudes in radians
  Δφ = difference in latitudes
  Δλ = difference in longitudes

  a = sin²(Δφ/2) + cos(φ1) * cos(φ2) * sin²(Δλ/2)
  c = 2 * atan2(√a, √(1-a))
  distance = R * c
  ```

**`storeLocation(userId, locationData): Promise<{saved, location, distance}>`**

- Retrieves last location for user
- Calculates distance from last location
- Only saves if distance ≥ 100 meters
- Returns whether location was saved and the distance

**`getNearbyUsers(lat, lon, radius, excludeUserId): Promise<Array>`**

- Aggregates latest location for all users
- Calculates distance to each user
- Filters users within radius
- Excludes current user
- Sorts by distance (nearest first)

**`getLastLocation(userId): Promise<ILocation | null>`**

- Returns most recent location for a user

**`getLocationHistory(userId, limit): Promise<ILocation[]>`**

- Returns location history sorted by timestamp
- Default limit: 50 records

**`deleteOldLocations(daysOld): Promise<number>`**

- Cleanup utility for old location records
- Default: 30 days

### 3. Location Controller (`Server/src/controllers/locationController.ts`)

Handles HTTP requests and responses for location operations.

### 4. Location Routes (`Server/src/routes/locationRoute.ts`)

All routes require authentication (`Bearer token`).

## API Endpoints

### POST `/api/location/update`

Update user's current location.

**Request Body:**

```json
{
  "latitude": 12.9716,
  "longitude": 77.5946,
  "accuracy": 10,
  "altitude": 920,
  "speed": 0,
  "heading": 180,
  "timestamp": "2025-12-19T10:30:00.000Z"
}
```

**Response (Location Saved):**

```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "location": {
      "_id": "...",
      "userId": "...",
      "latitude": 12.9716,
      "longitude": 77.5946,
      "timestamp": "2025-12-19T10:30:00.000Z"
    },
    "distanceFromPrevious": 150.5
  }
}
```

**Response (Not Saved - Distance < 100m):**

```json
{
  "success": true,
  "message": "Location not stored. Distance from previous location is less than 100 meters",
  "data": {
    "distanceFromPrevious": 45.3,
    "threshold": 100
  }
}
```

### POST `/api/location/nearby`

Get nearby users within specified radius.

**Request Body:**

```json
{
  "latitude": 12.9716,
  "longitude": 77.5946,
  "radius": 500
}
```

**Response:**

```json
{
  "success": true,
  "message": "Found 3 users within 500 meters",
  "data": {
    "count": 3,
    "radius": 500,
    "users": [
      {
        "userId": "...",
        "latitude": 12.972,
        "longitude": 77.595,
        "distance": 52.3,
        "timestamp": "2025-12-19T10:28:00.000Z",
        "accuracy": 15
      }
    ]
  }
}
```

### GET `/api/location/current`

Get current user's last recorded location.

**Response:**

```json
{
  "success": true,
  "message": "Last location retrieved successfully",
  "data": {
    "_id": "...",
    "userId": "...",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "accuracy": 10,
    "timestamp": "2025-12-19T10:30:00.000Z"
  }
}
```

### GET `/api/location/history?limit=50`

Get location history for current user.

**Query Parameters:**

- `limit` (optional): Number of records to return (default: 50)

**Response:**

```json
{
  "success": true,
  "message": "Location history retrieved successfully",
  "data": {
    "count": 25,
    "locations": [...]
  }
}
```

## Frontend Integration

### Location API (`client/api/locationApi.ts`)

Provides methods to interact with the location API:

- `updateLocationOnServer(locationData)`
- `getNearbyUsers(lat, lon, radius)`
- `getCurrentLocation()`
- `getLocationHistory(limit)`

### LocationProvider (`client/providers/LocationProvider.tsx`)

Automatically:

1. Requests location permissions
2. Watches for location changes
3. Updates local state
4. Sends location to server (if authenticated and user moved ≥100m)

### Usage Example

```tsx
import { getNearbyUsers } from "../api/locationApi";
import { useLocationStore } from "../store/useLocationStore";

function NearestUsersScreen() {
  const location = useLocationStore((s) => s.location);

  const findNearby = async () => {
    if (!location) return;

    const nearby = await getNearbyUsers(
      location.lat,
      location.lon,
      500 // radius in meters
    );

    console.log(`Found ${nearby.length} users nearby`);
  };
}
```

## Distance Threshold Logic

**Why 100 meters?**

- Filters out minor GPS drift and jitter
- Captures meaningful movement
- Reduces database writes
- Balances tracking accuracy with performance

**How it works:**

1. User's location changes on device
2. LocationProvider detects change
3. Sends location to server
4. Server retrieves last stored location
5. Calculates distance using Haversine formula
6. If distance ≥ 100m → saves new location
7. If distance < 100m → ignores update

## Haversine Formula Explanation

The Haversine formula calculates the great-circle distance between two points on a sphere given their longitudes and latitudes.

**Why Haversine?**

- Accounts for Earth's curvature
- Accurate for short distances
- Industry standard for GPS calculations

**Accuracy:**

- ±0.5% error for distances up to 500km
- Perfect for proximity detection

## Security

- All routes require JWT authentication
- Users can only update their own location
- User IDs are automatically extracted from JWT token
- Current user is excluded from nearby users list

## Performance Considerations

1. **Indexes**: Compound indexes on coordinates and userId for fast queries
2. **Aggregation**: Uses MongoDB aggregation for efficient nearby user queries
3. **Distance Filtering**: Server-side filtering reduces data transfer
4. **Cleanup**: Optional cleanup function for old location data

## Future Enhancements

- [ ] Add geofencing capabilities
- [ ] Implement location sharing permissions
- [ ] Add background location tracking
- [ ] Support for location-based notifications
- [ ] Add location accuracy filtering
- [ ] Implement location clustering for dense areas

## Testing

Test the location update flow:

```bash
# Update location
curl -X POST http://localhost:3000/api/location/update \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 12.9716,
    "longitude": 77.5946,
    "accuracy": 10
  }'

# Get nearby users
curl -X POST http://localhost:3000/api/location/nearby \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 12.9716,
    "longitude": 77.5946,
    "radius": 500
  }'
```

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

Common HTTP status codes:

- `200`: Success (location not saved due to distance)
- `201`: Success (location saved)
- `400`: Invalid request (bad coordinates)
- `401`: Unauthorized (missing/invalid token)
- `404`: Not found (no location data)
- `500`: Server error
