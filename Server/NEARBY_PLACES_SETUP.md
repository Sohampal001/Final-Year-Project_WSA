# Google Places API Setup Guide

## Overview

This feature allows users to find nearby police stations, hospitals, pharmacies, and bus stops using Google Places API. Users can view details, get directions, and call places directly from the app.

## Backend Setup

### 1. Get Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Places API
   - Places API (New) - optional but recommended
4. Go to **APIs & Services** > **Credentials**
5. Click **Create Credentials** > **API Key**
6. Copy your API key
7. (Recommended) Restrict the API key:
   - Set application restrictions (HTTP referrers or IP addresses)
   - Set API restrictions to only allow Places API

### 2. Configure Environment Variable

Add your Google Places API key to the `.env` file in the Server directory:

```env
GOOGLE_PLACES_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

Replace `YOUR_ACTUAL_API_KEY_HERE` with your actual API key.

### 3. Install Dependencies (Already Done)

The required dependency `axios` is already installed. If you need to reinstall:

```bash
cd Server
npm install axios
```

### 4. Start the Server

```bash
cd Server
npm run dev
```

## Frontend Setup

### 1. Environment Variable

Make sure your `.env` file in the client directory has:

```env
EXPO_PUBLIC_API_URL=https://your-server-url/api
```

### 2. Test the Feature

1. Start the client:

   ```bash
   cd client
   npm start
   ```

2. Navigate to the Home screen
3. Click on any of the location cards (Police Station, Hospital, Pharmacy, Bus Stop)
4. A modal will appear showing nearby places with:
   - Name and address
   - Distance from your location
   - Rating (if available)
   - Open/Closed status
   - Call button (if phone number available)
   - Directions button

## API Endpoints

### Get Nearby Places by Category

```
GET /api/nearby-places/categories
Query Parameters:
  - latitude (required): User's latitude
  - longitude (required): User's longitude
  - radius (optional, default: 5000): Search radius in meters
  - limitPerCategory (optional, default: 5): Number of results per category
```

### Get Nearby Places by Type

```
GET /api/nearby-places
Query Parameters:
  - latitude (required): User's latitude
  - longitude (required): User's longitude
  - type (optional): police, hospital, pharmacy, bus_station
  - radius (optional, default: 5000): Search radius in meters
  - limit (optional, default: 10): Number of results
```

## Features

### Backend

- **Modular Architecture**: Separated into Service, Controller, and Route layers
- **Google Places Integration**: Real-time data from Google Maps
- **Distance Calculation**: Haversine formula for accurate distance
- **Detailed Information**: Phone numbers, ratings, opening hours, website
- **Error Handling**: Comprehensive error handling and validation

### Frontend

- **Interactive Modal**: Swipeable bottom sheet modal
- **Location Cards**: Color-coded cards for different place types
- **Call Functionality**: Direct calling from the app
- **Directions**: Opens Google Maps for navigation
- **Loading States**: Spinner while fetching data
- **Empty States**: User-friendly message when no places found
- **Responsive Design**: Works on all device sizes

## Files Created/Modified

### Backend

- `Server/src/services/GooglePlacesService.ts` - Service for Google Places API
- `Server/src/controllers/nearbyPlacesController.ts` - Controller for nearby places
- `Server/src/routes/nearbyPlacesRoute.ts` - Route definitions
- `Server/index.ts` - Registered the new route
- `Server/.env` - Added GOOGLE_PLACES_API_KEY

### Frontend

- `client/api/nearbyPlacesApi.ts` - API client for nearby places
- `client/app/(tabs)/home.tsx` - Updated with modal and integration

## Testing

### Test with cURL

```bash
# Get nearby places by category
curl -X GET "http://localhost:3000/api/nearby-places/categories?latitude=28.6139&longitude=77.2090&radius=5000&limitPerCategory=5" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get nearby hospitals only
curl -X GET "http://localhost:3000/api/nearby-places?latitude=28.6139&longitude=77.2090&type=hospital&radius=5000&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### API Key Issues

- Ensure the API key is correctly set in `.env`
- Check that Places API is enabled in Google Cloud Console
- Verify API key restrictions don't block your requests

### No Results Found

- Increase the search radius
- Check if location coordinates are valid
- Ensure Google Places API has data for your area

### Rate Limiting

- Google Places API has usage limits
- Consider implementing caching for frequently requested locations
- Monitor your API usage in Google Cloud Console

## Cost Information

Google Places API pricing (as of 2024):

- Nearby Search: $32 per 1000 requests
- Place Details: $17 per 1000 requests
- Monthly free credit: $200

**Note**: Monitor your usage to avoid unexpected charges.

## Future Enhancements

1. **Caching**: Implement Redis caching for frequently searched locations
2. **Favorites**: Allow users to save favorite places
3. **Reviews**: Display Google reviews
4. **Photos**: Show place photos from Google
5. **Opening Hours**: Display detailed opening hours
6. **Filters**: Add filters for rating, distance, open now
