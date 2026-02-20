import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import useUser from "../src/useUser";

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

interface HourPeriod {
  id: string;
  open: string;
  close: string;
  closes_next_day: boolean;
}

interface DayHours {
  closed: boolean;
  open_24_hours: boolean;
  periods: HourPeriod[];
}

interface BusinessHours {
  always_open: boolean;
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

interface Location {
  id: string;
  location_name: string;
  cross_street_1: string;
  cross_street_2: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  location_privacy: "exact" | "intersection" | "grid";
  business_hours: BusinessHours;
}

interface BusinessFormData {
  name: string;
  category_id: string;
  description: string;
  website: string;
  email: string;
  keywords: string[];
  amenities: string[];
  is_chain: boolean;
  is_owner: boolean;
  locations: Location[];
  images: File[];
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

const DEFAULT_HOUR_PERIOD = (): HourPeriod => ({
  id: crypto.randomUUID(),
  open: "09:00",
  close: "17:00",
  closes_next_day: false,
});

const DEFAULT_DAY_HOURS = (): DayHours => ({
  closed: false,
  open_24_hours: false,
  periods: [DEFAULT_HOUR_PERIOD()],
});

const DEFAULT_HOURS = (): BusinessHours => ({
  always_open: false,
  monday: DEFAULT_DAY_HOURS(),
  tuesday: DEFAULT_DAY_HOURS(),
  wednesday: DEFAULT_DAY_HOURS(),
  thursday: DEFAULT_DAY_HOURS(),
  friday: DEFAULT_DAY_HOURS(),
  saturday: { closed: false, open_24_hours: false, periods: [{ id: crypto.randomUUID(), open: "10:00", close: "15:00", closes_next_day: false }] },
  sunday: { closed: true, open_24_hours: false, periods: [] },
});

const DEFAULT_LOCATION = (): Location => ({
  id: crypto.randomUUID(),
  location_name: "",
  cross_street_1: "",
  cross_street_2: "",
  city: "",
  state: "",
  latitude: null,
  longitude: null,
  phone: "",
  location_privacy: "intersection",
  business_hours: DEFAULT_HOURS(),
});

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV",
  "NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN",
  "TX","UT","VT","VA","WA","WV","WI","WY",
];

const COMMON_AMENITIES = [
  "Wheelchair Accessible", "DM To Order", "Text To Order", "Call To Order", "Order Online", "Walk-Up Orders",
  "Credit Cards", "Tap To Pay", "Cash Only", "Apple Cash", "Zelle", "Venmo", "PayPal", "Google Pay", "Samsung Pay",
  "Delivery", "Curbside Pickup", "Outdoor Seating", "Pet Friendly",
  "Family Friendly", "Restrooms", "Live Music", "Catering", "Private Events", "Pop Ups",
  "Street Parking", "Free Parking", "TV", "Live Sports", "Vegan Options", "Vegetarian Options", 
  "Gluten-Free Options", "Halal Options", "Kosher Options", "Locally Sourced Ingredients", "Organic Options", "Late Night"
];

export default function AddBusiness() {
  const [searchParams] = useSearchParams();
  const { user, isLoading } = useUser();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<BusinessFormData>({
    name: "",
    category_id: "",
    description: "",
    website: "",
    email: "",
    keywords: [],
    amenities: [],
    is_chain: false,
    is_owner: false,
    locations: [DEFAULT_LOCATION()],
    images: [],
  });
  const [keywordInput, setKeywordInput] = useState("");
  const [amenityInput, setAmenityInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geolocating, setGeolocating] = useState(false);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      setGeolocating(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch address information');
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      return null;
    } finally {
      setGeolocating(false);
    }
  };

  const parseAddressData = (data: any) => {
    if (!data || !data.address) return null;

    const address = data.address;
    
    const street1 = address.road || address.street || address.highway || 
                   address.pedestrian || address.footway || '';
    
    let street2 = '';
    
    const displayName = data.display_name || '';
    const nameParts = displayName.split(',').map((part: string) => part.trim());
    
    const streetKeywords = ['Street', 'St', 'Avenue', 'Ave', 'Road', 'Rd', 'Boulevard', 'Blvd', 
                           'Drive', 'Dr', 'Lane', 'Ln', 'Way', 'Circle', 'Cir'];
    
    const potentialStreets = nameParts.filter((part: string) => 
      streetKeywords.some(keyword => part.includes(keyword)) && part !== street1
    );
    
    if (potentialStreets.length > 0) {
      street2 = potentialStreets[0];
    } else {
      street2 = address.neighbourhood || address.suburb || address.hamlet || 
               `Near ${street1}` || 'Cross Street';
    }
    
    const city = address.city || address.town || address.village || 
                address.municipality || address.county || '';
    
    const state = address.state || address.province || address.region || '';
    
    const convertStateToAbbreviation = (stateName: string): string => {
      const stateMap: { [key: string]: string } = {
        'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
        'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
        'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
        'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
        'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
        'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
        'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
        'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
        'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
        'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
        'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
        'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
        'Wisconsin': 'WI', 'Wyoming': 'WY'
      };
      
      return stateMap[stateName] || stateName;
    };

    return {
      cross_street_1: street1,
      cross_street_2: street2,
      city: city,
      state: convertStateToAbbreviation(state)
    };
  };

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(console.error);
  }, []);

    const selectedLocation = useMemo(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) return null;

    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) return null;

    return { lat: parsedLat, lng: parsedLng };
  }, [searchParams]);

  useEffect(() => {
    if (selectedLocation && form.locations.length > 0 && !form.locations[0].latitude) {
      const autoFillAddress = async () => {
        updateLocation(0, {
          ...form.locations[0],
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng,
        });

        const geocodeData = await reverseGeocode(selectedLocation.lat, selectedLocation.lng);
        if (geocodeData) {
          const addressInfo = parseAddressData(geocodeData);
          if (addressInfo) {
            updateLocation(0, {
              ...form.locations[0],
              latitude: selectedLocation.lat,
              longitude: selectedLocation.lng,
              cross_street_1: addressInfo.cross_street_1 || form.locations[0].cross_street_1,
              cross_street_2: addressInfo.cross_street_2 || form.locations[0].cross_street_2,
              city: addressInfo.city || form.locations[0].city,
              state: addressInfo.state || form.locations[0].state,
            });
          }
        }
      };

      autoFillAddress();
    }
  }, [selectedLocation]);

  const addKeyword = () => {
    const trimmed = keywordInput.trim().toLowerCase();
    if (trimmed && !form.keywords.includes(trimmed) && form.keywords.length < 10) {
      setForm({ ...form, keywords: [...form.keywords, trimmed] });
      setKeywordInput("");
    }
  };

  const removeKeyword = (kw: string) => {
    setForm({ ...form, keywords: form.keywords.filter((k) => k !== kw) });
  };

  const addAmenity = (amenity?: string) => {
    const toAdd = amenity || amenityInput.trim();
    if (toAdd && !form.amenities.includes(toAdd) && form.amenities.length < 20) {
      setForm({ ...form, amenities: [...form.amenities, toAdd] });
      setAmenityInput("");
    }
  };

  const removeAmenity = (amenity: string) => {
    setForm({ ...form, amenities: form.amenities.filter((a) => a !== amenity) });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files).slice(0, 3 - form.images.length);
      setForm({ ...form, images: [...form.images, ...newImages] });
    }
  };

  const removeImage = (index: number) => {
    setForm({ ...form, images: form.images.filter((_, i) => i !== index) });
  };

  const addLocation = () => {
    setForm({ ...form, locations: [...form.locations, DEFAULT_LOCATION()] });
  };

  const updateLocation = (index: number, loc: Location) => {
    const locations = [...form.locations];
    locations[index] = loc;
    setForm({ ...form, locations });
  };

  const removeLocation = (index: number) => {
    if (form.locations.length > 1) {
      const locations = form.locations.filter((_, i) => i !== index);
      setForm({ ...form, locations });
    }
  };

  const updateLocationHours = (locationIndex: number, hours: BusinessHours) => {
    const locations = [...form.locations];
    locations[locationIndex] = { ...locations[locationIndex], business_hours: hours };
    setForm({ ...form, locations });
  };

  const updateDayHours = (locationIndex: number, day: string, updates: Partial<DayHours>) => {
    const loc = form.locations[locationIndex];
    const updatedHours = {
      ...loc.business_hours,
      [day]: { ...loc.business_hours[day as keyof BusinessHours] as DayHours, ...updates },
    };
    updateLocationHours(locationIndex, updatedHours as BusinessHours);
  };

  const addHourPeriod = (locationIndex: number, day: string) => {
    const loc = form.locations[locationIndex];
    const dayHours = loc.business_hours[day as keyof BusinessHours] as DayHours;
    const newPeriod = DEFAULT_HOUR_PERIOD();
    updateDayHours(locationIndex, day, {
      periods: [...dayHours.periods, newPeriod],
    });
  };

  const updateHourPeriod = (locationIndex: number, day: string, periodId: string, updates: Partial<HourPeriod>) => {
    const loc = form.locations[locationIndex];
    const dayHours = loc.business_hours[day as keyof BusinessHours] as DayHours;
    const updatedPeriods = dayHours.periods.map(period =>
      period.id === periodId ? { ...period, ...updates } : period
    );
    updateDayHours(locationIndex, day, { periods: updatedPeriods });
  };

  const removeHourPeriod = (locationIndex: number, day: string, periodId: string) => {
    const loc = form.locations[locationIndex];
    const dayHours = loc.business_hours[day as keyof BusinessHours] as DayHours;
    if (dayHours.periods.length > 1) {
      const updatedPeriods = dayHours.periods.filter(period => period.id !== periodId);
      updateDayHours(locationIndex, day, { periods: updatedPeriods });
    }
  };

  const findAddressFromCoordinates = async (locationIndex: number) => {
    const location = form.locations[locationIndex];
    if (!location.latitude || !location.longitude) {
      setError("No coordinates available for this location. Please select a location on the map first.");
      return;
    }

    const geocodeData = await reverseGeocode(location.latitude, location.longitude);
    if (geocodeData) {
      const addressInfo = parseAddressData(geocodeData);
      if (addressInfo) {
        updateLocation(locationIndex, {
          ...location,
          cross_street_1: addressInfo.cross_street_1 || location.cross_street_1,
          cross_street_2: addressInfo.cross_street_2 || location.cross_street_2,
          city: addressInfo.city || location.city,
          state: addressInfo.state || location.state,
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!user) {
        throw new Error("You must be logged in to add a business");
      }

      const token = await user.getIdToken();

      const formData = new FormData();
      formData.append('business', JSON.stringify({
        ...form,
        images: undefined, 
      }));

      form.images.forEach((image, index) => {
        formData.append(`image${index}`, image);
      });

      const response = await fetch("/api/businesses", {
        method: "POST",
        headers: {
          'authtoken': token,
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Submission failed");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div>
        <h1>Business Submitted for Review!</h1>
        <p>
          Thank you for submitting <strong>{form.name}</strong>. Your business listing 
          is now pending approval from our team. You will be notified once it has been reviewed.
        </p>
        {!form.is_owner && (
          <p>
            <strong>Note:</strong> You indicated that you are not the business owner. 
            The actual owner can claim this business later once it's approved.
          </p>
        )}
        <button onClick={() => window.location.reload()}>Add Another Business</button>
      </div>
    );
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <div>
        <h1>Login Required</h1>
        <p>You must be logged in to add a business. Please log in and try again.</p>
      </div>
    ); 
  }

  return (
    <div>
      <h1>Add a Business</h1>
      <p>
        Submit a business to be added to the map. All submissions are reviewed before 
        being published. Business must be located in the United States.
      </p>
      
      <p>
        <strong>Tip:</strong> If you clicked a location on the map, we'll automatically 
        find the cross streets and city for you!
      </p>

      {selectedLocation && (
        <div>
          <strong>Selected map location:</strong> {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
          {geolocating && <span> (Looking up address...)</span>}
        </div>
      )}

      {error && (
        <div>
          <strong>Error:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        
        <fieldset>
          <legend>Business Information</legend>

          <label>
            Business Name *
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>

          <label>
            Category *
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              required
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              maxLength={1000}
              placeholder="Describe the business..."
            />
          </label>

          <label>
            Website
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://example.com"
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="contact@business.com"
            />
          </label>

          <label>
            Are you the business owner? *
            <select
              value={form.is_owner ? "yes" : "no"}
              onChange={(e) => setForm({ ...form, is_owner: e.target.value === "yes" })}
              required
            >
              <option value="">Please select</option>
              <option value="yes">Yes, I own this business</option>
              <option value="no">No, I'm adding it for the community</option>
            </select>
          </label>
          {!form.is_owner && (
            <p>
              <small>
                The business owner can claim this listing later once it's approved.
              </small>
            </p>
          )}

          <label>
            <input
              type="checkbox"
              checked={form.is_chain}
              onChange={(e) => setForm({ ...form, is_chain: e.target.checked })}
            />
            This business has multiple locations
          </label>
        </fieldset>

        <fieldset>
          <legend>Keywords (up to 10)</legend>
          <label>
            Add keyword
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKeyword();
                }
              }}
              placeholder="e.g. coffee, breakfast, wifi"
            />
            <button type="button" onClick={addKeyword} disabled={form.keywords.length >= 10}>
              Add Keyword
            </button>
          </label>

          <div>
            {form.keywords.map((kw) => (
              <span key={kw}>
                {kw} <button type="button" onClick={() => removeKeyword(kw)}>×</button>
              </span>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Amenities (up to 20)</legend>
          
          <label>
            Add custom amenity
            <input
              type="text"
              value={amenityInput}
              onChange={(e) => setAmenityInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAmenity();
                }
              }}
              placeholder="e.g. Free WiFi, Outdoor Seating"
            />
            <button type="button" onClick={() => addAmenity()} disabled={form.amenities.length >= 20}>
              Add Amenity
            </button>
          </label>

          <div>
            <strong>Common amenities:</strong>
            <h6>Select all that apply. The more you select, the higher chance of attracting customers.</h6>
            <div>
              {COMMON_AMENITIES.filter(amenity => !form.amenities.includes(amenity)).map((amenity) => (
                <button 
                  key={amenity} 
                  type="button" 
                  onClick={() => addAmenity(amenity)}
                  disabled={form.amenities.length >= 20}
                >
                  + {amenity}
                </button>
              ))}
            </div>
          </div>

          <div>
            <strong>Selected amenities:</strong>
            <div>
              {form.amenities.map((amenity) => (
                <span key={amenity}>
                  {amenity} <button type="button" onClick={() => removeAmenity(amenity)}>×</button>
                </span>
              ))}
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Images (up to 3)</legend>
          
          {form.images.length < 3 && (
            <label>
              Upload images
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
              />
            </label>
          )}

          <div>
            {form.images.map((image, index) => (
              <div key={index}>
                <span>{image.name}</span>
                <button type="button" onClick={() => removeImage(index)}>Remove</button>
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Locations</legend>

          {form.locations.map((loc, locationIndex) => (
            <div key={loc.id}>
              <h3>Location {locationIndex + 1}</h3>

              {form.locations.length > 1 && (
                <button type="button" onClick={() => removeLocation(locationIndex)}>
                  Remove This Location
                </button>
              )}

              <label>
                Location Name (optional)
                <input
                  type="text"
                  value={loc.location_name}
                  onChange={(e) => updateLocation(locationIndex, { ...loc, location_name: e.target.value })}
                  placeholder="e.g. Downtown, North Side"
                />
              </label>

              {loc.latitude && loc.longitude && (
                <div>
                  <strong>Coordinates:</strong> {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                  <button 
                    type="button" 
                    onClick={() => findAddressFromCoordinates(locationIndex)}
                    disabled={geolocating}
                  >
                    {geolocating ? 'Looking up address...' : 'Find cross streets & city'}
                  </button>
                </div>
              )}

              {!loc.latitude && !loc.longitude && (
                <div>
                  <em>No coordinates available. Click a location on the map to auto-fill address details.</em>
                </div>
              )}

              <label>
                Cross Street 1 *
                <input
                  type="text"
                  value={loc.cross_street_1}
                  onChange={(e) => updateLocation(locationIndex, { ...loc, cross_street_1: e.target.value })}
                  required
                  placeholder="e.g. Main St"
                />
              </label>

              <label>
                Cross Street 2 *
                <input
                  type="text"
                  value={loc.cross_street_2}
                  onChange={(e) => updateLocation(locationIndex, { ...loc, cross_street_2: e.target.value })}
                  required
                  placeholder="e.g. First Ave"
                />
              </label>

              <label>
                City *
                <input
                  type="text"
                  value={loc.city}
                  onChange={(e) => updateLocation(locationIndex, { ...loc, city: e.target.value })}
                  required
                  placeholder="e.g. Los Angeles"
                />
              </label>

              <label>
                State *
                <select
                  value={loc.state}
                  onChange={(e) => updateLocation(locationIndex, { ...loc, state: e.target.value })}
                  required
                >
                  <option value="">Select state</option>
                  {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              <label>
                Phone
                <input
                  type="tel"
                  value={loc.phone}
                  onChange={(e) => updateLocation(locationIndex, { ...loc, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </label>

              <label>
                Location Privacy
                <select
                  value={loc.location_privacy}
                  onChange={(e) => updateLocation(locationIndex, { ...loc, location_privacy: e.target.value as any })}
                >
                  <option value="exact">Show exact location</option>
                  <option value="intersection">Show nearest intersection (recommended)</option>
                  <option value="grid">Show general area only</option>
                </select>
              </label>

              <fieldset>
                <legend>Hours for {loc.location_name || `Location ${locationIndex + 1}`}</legend>

                <label>
                  <input
                    type="checkbox"
                    checked={loc.business_hours.always_open}
                    onChange={(e) =>
                      updateLocationHours(locationIndex, { ...loc.business_hours, always_open: e.target.checked })
                    }
                  />
                  Open 24/7
                </label>

                {!loc.business_hours.always_open && (
                  <div>
                    {DAYS.map((day) => {
                      const dayHours = loc.business_hours[day] as DayHours;
                      return (
                        <div key={day}>
                          <h4>{day.charAt(0).toUpperCase() + day.slice(1)}</h4>

                          <label>
                            <input
                              type="checkbox"
                              checked={dayHours.closed}
                              onChange={(e) => updateDayHours(locationIndex, day, { closed: e.target.checked, periods: e.target.checked ? [] : [DEFAULT_HOUR_PERIOD()] })}
                            />
                            Closed
                          </label>

                          {!dayHours.closed && (
                            <>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={dayHours.open_24_hours}
                                  onChange={(e) => updateDayHours(locationIndex, day, { open_24_hours: e.target.checked, periods: e.target.checked ? [] : [DEFAULT_HOUR_PERIOD()] })}
                                />
                                24 hours
                              </label>

                              {!dayHours.open_24_hours && (
                                <div>
                                  {dayHours.periods.map((period, periodIndex) => (
                                    <div key={period.id}>
                                      <strong>Hours {periodIndex + 1}:</strong>
                                      
                                      <label>
                                        Open:
                                        <input
                                          type="time"
                                          value={period.open}
                                          onChange={(e) => updateHourPeriod(locationIndex, day, period.id, { open: e.target.value })}
                                        />
                                      </label>

                                      <label>
                                        Close:
                                        <input
                                          type="time"
                                          value={period.close}
                                          onChange={(e) => updateHourPeriod(locationIndex, day, period.id, { close: e.target.value })}
                                        />
                                      </label>

                                      <label>
                                        <input
                                          type="checkbox"
                                          checked={period.closes_next_day}
                                          onChange={(e) => updateHourPeriod(locationIndex, day, period.id, { closes_next_day: e.target.checked })}
                                        />
                                        Closes next day (e.g. closes at 2 AM)
                                      </label>

                                      {dayHours.periods.length > 1 && (
                                        <button 
                                          type="button" 
                                          onClick={() => removeHourPeriod(locationIndex, day, period.id)}
                                        >
                                          Remove these hours
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  
                                  <button 
                                    type="button" 
                                    onClick={() => addHourPeriod(locationIndex, day)}
                                  >
                                    Add another set of hours for {day.charAt(0).toUpperCase() + day.slice(1)}
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </fieldset>
            </div>
          ))}

          {form.is_chain && (
            <button type="button" onClick={addLocation}>
              Add Another Location
            </button>
          )}
        </fieldset>

        <button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Business for Review"}
        </button>
      </form>
    </div>
  );
}

