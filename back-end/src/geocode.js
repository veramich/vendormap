const NOMINATIM_URL = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';

const SUFFIX_EXPANSIONS = {
  'st': 'Street', 'ave': 'Avenue', 'blvd': 'Boulevard', 'dr': 'Drive',
  'ln': 'Lane', 'ct': 'Court', 'rd': 'Road', 'pl': 'Place',
  'hwy': 'Highway', 'pkwy': 'Parkway', 'cir': 'Circle', 'ter': 'Terrace',
  'terr': 'Terrace', 'trl': 'Trail', 'fwy': 'Freeway', 'expy': 'Expressway',
  'xing': 'Crossing', 'aly': 'Alley', 'pt': 'Point', 'sq': 'Square',
  'way': 'Way',
};

const DIRECTIONAL_EXPANSIONS = {
  'n': 'North', 's': 'South', 'e': 'East', 'w': 'West',
  'ne': 'Northeast', 'nw': 'Northwest', 'se': 'Southeast', 'sw': 'Southwest',
};

function expandStreetName(name) {
  if (!name) return name;
  const words = name.trim().split(/\s+/);
  const firstLower = words[0].toLowerCase().replace(/\.$/, '');
  if (DIRECTIONAL_EXPANSIONS[firstLower]) words[0] = DIRECTIONAL_EXPANSIONS[firstLower];
  const lastLower = words[words.length - 1].toLowerCase().replace(/\.$/, '');
  if (SUFFIX_EXPANSIONS[lastLower]) words[words.length - 1] = SUFFIX_EXPANSIONS[lastLower];
  return words.join(' ');
}

async function nominatimSearch(q, countrycodes = 'us') {
  const params = new URLSearchParams({ q, format: 'json', limit: '1', countrycodes, addressdetails: '1' });
  const url = `${NOMINATIM_URL}/search?${params}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'VendorMap/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.length ? data[0] : null;
  } catch (err) {
    console.error('[nominatim] fetch error:', err.message);
    return null;
  }
}

// Build query strings to try, from most to least specific
function buildQueries(s1, s2, city, state) {
  const s1x = expandStreetName(s1);
  const s2x = expandStreetName(s2);

  const location = [city, state, 'USA'].filter(Boolean).join(', ');
  const locationNoCity = [state, 'USA'].filter(Boolean).join(', ');

  const queries = [];

  // Try expanded names first, then originals if different
  const s1variants = [...new Set([s1x, s1])];
  const s2variants = [...new Set([s2x, s2])];

  for (const a of s1variants) {
    for (const b of s2variants) {
      if (city) {
        queries.push(`${a} & ${b}, ${location}`);
        queries.push(`${a} and ${b}, ${location}`);
      }
      queries.push(`${a} & ${b}, ${locationNoCity}`);
      queries.push(`${a} and ${b}, ${locationNoCity}`);
    }
  }

  return queries;
}

async function geocodeIntersection(crossStreet1, crossStreet2, city, state) {
  const s1 = crossStreet1?.trim();
  const s2 = crossStreet2?.trim();
  const c = city?.trim() || null;
  const st = state?.trim();

  if (!s1 || !s2 || !st) return null;

  const queries = buildQueries(s1, s2, c, st);

  for (const q of queries) {
    const result = await nominatimSearch(q);
    if (result?.lat && result?.lon) {
      const addr = result.address ?? {};
      const city = addr.city || addr.town || addr.village || addr.hamlet || null;
      const zip = addr.postcode || null;
      return { lat: parseFloat(result.lat), lon: parseFloat(result.lon), city, zip };
    }
  }

  return null;
}

async function geocodeIntersectionWithCityLookup(crossStreet1, crossStreet2, state) {
  return geocodeIntersection(crossStreet1, crossStreet2, null, state);
}

export {
  geocodeIntersection,
  geocodeIntersectionWithCityLookup
};
