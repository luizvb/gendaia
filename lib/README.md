# API Middleware and Utilities

## Business ID Middleware

The application includes a middleware that automatically attaches the `business_id` to authenticated API requests. This eliminates the need to fetch the business ID in each API route.

### How it works

1. The middleware intercepts all API requests
2. For authenticated requests, it fetches the user's profile from the database
3. If the profile has a `business_id`, it attaches it to the request headers as `x-business-id`
4. API routes can then access this header instead of querying the database

## Business ID Utility

The `getBusinessId` utility function provides a simple way to access the business ID in API routes:

```typescript
import { getBusinessId } from "@/lib/business-id";

export async function GET(request: NextRequest) {
  // Get the business_id
  const businessId = await getBusinessId(request);

  if (!businessId) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Use the businessId in your database queries
  // ...
}
```

### Features

- First tries to get the business ID from the request headers (set by middleware)
- Falls back to fetching from the database if not found in headers
- Returns `null` if no business ID is found
- Handles errors gracefully

## Benefits

- Reduces database queries by caching the business ID in request headers
- Simplifies API route code by centralizing business ID retrieval
- Ensures consistent error handling for missing business IDs
- Makes it easier to maintain and update business ID retrieval logic

## Updated API Routes

The following API routes have been updated to use the `getBusinessId` utility function:

1. `/api/clients` - All methods (GET, POST, PUT, DELETE)
2. `/api/professionals` - All methods (GET, POST, PUT, DELETE)
3. `/api/services` - All methods (GET, POST, PUT, DELETE)
4. `/api/appointments` - All methods (GET, POST)
5. `/api/settings` - All methods (GET, POST)
6. `/api/subscriptions` - All methods (GET, POST)

Note: The `/api/businesses` route was not updated as it's used for creating a new business, not for accessing an existing one.
