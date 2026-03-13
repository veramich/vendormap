// Days for filter dropdowns (Monday-first, for UI display)
export const DAY_OPTIONS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
] as const;

// Days indexed Sunday=0 (matches JS Date and DayIndex type used in business hours)
export const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

export const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export const RADIUS_OPTIONS = [1, 5, 10, 25] as const;

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

export const COMMON_AMENITIES: Record<string, string[]> = {
  "Business Types": [
    "Home Based", "Sidewalk Based", "Food Truck", "Farmer's Market Based" , "Farmer's Market", "Pop Up"
  ],
  "Ordering Methods": [
    "DM To Order", "Text To Order", "Call To Order", "Order Online", "Walk-Up Orders",
    "Order Ahead", "Pre-Order Required", "No Walk-Ins", "Time-Slot Reservations",
  ],
  "Payment Options": [
    "Cash Only", "Cash Preferred", "Tap To Pay", "Credit Cards", "Cash App", "Zelle", "Venmo",
  ],
  "Dietary Options": [
    "Vegan Options", "Vegetarian Options", "Gluten-Free Options", "Halal Options",
    "Kosher Options", "Locally Sourced Ingredients", "Organic Options",
  ],
  "Accessibility": [
    "Curbside Pickup", "Delivery", "US Shipping", "International Shipping",
    "Street Parking", "Parking Lot", "Wheelchair Accessible", "Outdoor Seating", "Restrooms",
  ],
};

export const ALL_COMMON_AMENITIES: string[] = Object.values(COMMON_AMENITIES).flat();
