// A curated list of major international airports — enough for a personal
// weekend-trip watcher. Used for the onboarding autocomplete and for expanding
// a "whole country" wishlist entry into a concrete set of airports to search.
//
// `major: true` means "include this when someone picks the whole country".

export interface Airport {
  iata: string;
  name: string;
  city: string;
  /** ISO-3166 alpha-2 */
  country: string;
  countryName: string;
  major?: boolean;
}

export const AIRPORTS: Airport[] = [
  // --- United States ---
  { iata: "JFK", name: "John F. Kennedy Intl", city: "New York", country: "US", countryName: "United States", major: true },
  { iata: "EWR", name: "Newark Liberty Intl", city: "New York", country: "US", countryName: "United States", major: true },
  { iata: "LGA", name: "LaGuardia", city: "New York", country: "US", countryName: "United States" },
  { iata: "BOS", name: "Logan Intl", city: "Boston", country: "US", countryName: "United States", major: true },
  { iata: "IAD", name: "Washington Dulles Intl", city: "Washington", country: "US", countryName: "United States", major: true },
  { iata: "DCA", name: "Reagan National", city: "Washington", country: "US", countryName: "United States" },
  { iata: "ORD", name: "O'Hare Intl", city: "Chicago", country: "US", countryName: "United States", major: true },
  { iata: "MIA", name: "Miami Intl", city: "Miami", country: "US", countryName: "United States", major: true },
  { iata: "ATL", name: "Hartsfield-Jackson", city: "Atlanta", country: "US", countryName: "United States", major: true },
  { iata: "DFW", name: "Dallas/Fort Worth Intl", city: "Dallas", country: "US", countryName: "United States", major: true },
  { iata: "IAH", name: "George Bush Intercontinental", city: "Houston", country: "US", countryName: "United States", major: true },
  { iata: "DEN", name: "Denver Intl", city: "Denver", country: "US", countryName: "United States", major: true },
  { iata: "SFO", name: "San Francisco Intl", city: "San Francisco", country: "US", countryName: "United States", major: true },
  { iata: "LAX", name: "Los Angeles Intl", city: "Los Angeles", country: "US", countryName: "United States", major: true },
  { iata: "SEA", name: "Seattle-Tacoma Intl", city: "Seattle", country: "US", countryName: "United States", major: true },
  { iata: "LAS", name: "Harry Reid Intl", city: "Las Vegas", country: "US", countryName: "United States" },
  { iata: "PHX", name: "Phoenix Sky Harbor Intl", city: "Phoenix", country: "US", countryName: "United States" },
  { iata: "MCO", name: "Orlando Intl", city: "Orlando", country: "US", countryName: "United States" },
  { iata: "PHL", name: "Philadelphia Intl", city: "Philadelphia", country: "US", countryName: "United States" },
  { iata: "SAN", name: "San Diego Intl", city: "San Diego", country: "US", countryName: "United States" },
  { iata: "AUS", name: "Austin-Bergstrom Intl", city: "Austin", country: "US", countryName: "United States" },

  // --- Canada ---
  { iata: "YYZ", name: "Toronto Pearson Intl", city: "Toronto", country: "CA", countryName: "Canada", major: true },
  { iata: "YVR", name: "Vancouver Intl", city: "Vancouver", country: "CA", countryName: "Canada", major: true },
  { iata: "YUL", name: "Montreal-Trudeau Intl", city: "Montreal", country: "CA", countryName: "Canada", major: true },
  { iata: "YYC", name: "Calgary Intl", city: "Calgary", country: "CA", countryName: "Canada" },

  // --- Mexico / Central America / Caribbean ---
  { iata: "MEX", name: "Mexico City Intl", city: "Mexico City", country: "MX", countryName: "Mexico", major: true },
  { iata: "CUN", name: "Cancún Intl", city: "Cancún", country: "MX", countryName: "Mexico", major: true },
  { iata: "GDL", name: "Guadalajara Intl", city: "Guadalajara", country: "MX", countryName: "Mexico" },
  { iata: "SJD", name: "Los Cabos Intl", city: "San José del Cabo", country: "MX", countryName: "Mexico" },
  { iata: "SJO", name: "Juan Santamaría Intl", city: "San José", country: "CR", countryName: "Costa Rica", major: true },
  { iata: "LIR", name: "Guanacaste (Liberia) Intl", city: "Liberia", country: "CR", countryName: "Costa Rica" },
  { iata: "PTY", name: "Tocumen Intl", city: "Panama City", country: "PA", countryName: "Panama", major: true },
  { iata: "SJU", name: "Luis Muñoz Marín Intl", city: "San Juan", country: "PR", countryName: "Puerto Rico", major: true },
  { iata: "PUJ", name: "Punta Cana Intl", city: "Punta Cana", country: "DO", countryName: "Dominican Republic", major: true },
  { iata: "SDQ", name: "Las Américas Intl", city: "Santo Domingo", country: "DO", countryName: "Dominican Republic" },
  { iata: "MBJ", name: "Sangster Intl", city: "Montego Bay", country: "JM", countryName: "Jamaica", major: true },
  { iata: "NAS", name: "Lynden Pindling Intl", city: "Nassau", country: "BS", countryName: "Bahamas", major: true },
  { iata: "HAV", name: "José Martí Intl", city: "Havana", country: "CU", countryName: "Cuba", major: true },
  { iata: "AUA", name: "Queen Beatrix Intl", city: "Oranjestad", country: "AW", countryName: "Aruba", major: true },

  // --- South America ---
  { iata: "BOG", name: "El Dorado Intl", city: "Bogotá", country: "CO", countryName: "Colombia", major: true },
  { iata: "MDE", name: "José María Córdova Intl", city: "Medellín", country: "CO", countryName: "Colombia", major: true },
  { iata: "CTG", name: "Rafael Núñez Intl", city: "Cartagena", country: "CO", countryName: "Colombia" },
  { iata: "LIM", name: "Jorge Chávez Intl", city: "Lima", country: "PE", countryName: "Peru", major: true },
  { iata: "CUZ", name: "Alejandro Velasco Astete Intl", city: "Cusco", country: "PE", countryName: "Peru" },
  { iata: "GRU", name: "São Paulo/Guarulhos Intl", city: "São Paulo", country: "BR", countryName: "Brazil", major: true },
  { iata: "GIG", name: "Rio de Janeiro/Galeão Intl", city: "Rio de Janeiro", country: "BR", countryName: "Brazil", major: true },
  { iata: "EZE", name: "Ministro Pistarini Intl", city: "Buenos Aires", country: "AR", countryName: "Argentina", major: true },
  { iata: "SCL", name: "Arturo Merino Benítez Intl", city: "Santiago", country: "CL", countryName: "Chile", major: true },
  { iata: "UIO", name: "Mariscal Sucre Intl", city: "Quito", country: "EC", countryName: "Ecuador", major: true },
  { iata: "GYE", name: "José Joaquín de Olmedo Intl", city: "Guayaquil", country: "EC", countryName: "Ecuador" },

  // --- United Kingdom / Ireland ---
  { iata: "LHR", name: "Heathrow", city: "London", country: "GB", countryName: "United Kingdom", major: true },
  { iata: "LGW", name: "Gatwick", city: "London", country: "GB", countryName: "United Kingdom", major: true },
  { iata: "STN", name: "Stansted", city: "London", country: "GB", countryName: "United Kingdom" },
  { iata: "MAN", name: "Manchester", city: "Manchester", country: "GB", countryName: "United Kingdom", major: true },
  { iata: "EDI", name: "Edinburgh", city: "Edinburgh", country: "GB", countryName: "United Kingdom" },
  { iata: "DUB", name: "Dublin", city: "Dublin", country: "IE", countryName: "Ireland", major: true },

  // --- Western Europe ---
  { iata: "CDG", name: "Charles de Gaulle", city: "Paris", country: "FR", countryName: "France", major: true },
  { iata: "ORY", name: "Orly", city: "Paris", country: "FR", countryName: "France" },
  { iata: "NCE", name: "Côte d'Azur", city: "Nice", country: "FR", countryName: "France", major: true },
  { iata: "AMS", name: "Schiphol", city: "Amsterdam", country: "NL", countryName: "Netherlands", major: true },
  { iata: "BRU", name: "Brussels", city: "Brussels", country: "BE", countryName: "Belgium", major: true },
  { iata: "FRA", name: "Frankfurt", city: "Frankfurt", country: "DE", countryName: "Germany", major: true },
  { iata: "MUC", name: "Munich", city: "Munich", country: "DE", countryName: "Germany", major: true },
  { iata: "BER", name: "Brandenburg", city: "Berlin", country: "DE", countryName: "Germany", major: true },
  { iata: "ZRH", name: "Zürich", city: "Zürich", country: "CH", countryName: "Switzerland", major: true },
  { iata: "GVA", name: "Geneva", city: "Geneva", country: "CH", countryName: "Switzerland" },
  { iata: "VIE", name: "Vienna Intl", city: "Vienna", country: "AT", countryName: "Austria", major: true },
  { iata: "LIS", name: "Humberto Delgado", city: "Lisbon", country: "PT", countryName: "Portugal", major: true },
  { iata: "OPO", name: "Francisco Sá Carneiro", city: "Porto", country: "PT", countryName: "Portugal", major: true },
  { iata: "MAD", name: "Adolfo Suárez Madrid-Barajas", city: "Madrid", country: "ES", countryName: "Spain", major: true },
  { iata: "BCN", name: "Barcelona-El Prat", city: "Barcelona", country: "ES", countryName: "Spain", major: true },
  { iata: "AGP", name: "Málaga-Costa del Sol", city: "Málaga", country: "ES", countryName: "Spain" },
  { iata: "PMI", name: "Palma de Mallorca", city: "Palma", country: "ES", countryName: "Spain" },

  // --- Italy / Greece / Southern Europe ---
  { iata: "FCO", name: "Leonardo da Vinci-Fiumicino", city: "Rome", country: "IT", countryName: "Italy", major: true },
  { iata: "MXP", name: "Milan Malpensa", city: "Milan", country: "IT", countryName: "Italy", major: true },
  { iata: "VCE", name: "Venice Marco Polo", city: "Venice", country: "IT", countryName: "Italy", major: true },
  { iata: "NAP", name: "Naples Intl", city: "Naples", country: "IT", countryName: "Italy" },
  { iata: "ATH", name: "Eleftherios Venizelos", city: "Athens", country: "GR", countryName: "Greece", major: true },
  { iata: "JTR", name: "Santorini (Thira)", city: "Santorini", country: "GR", countryName: "Greece" },
  { iata: "HER", name: "Heraklion Intl", city: "Heraklion", country: "GR", countryName: "Greece" },

  // --- Nordics ---
  { iata: "CPH", name: "Copenhagen", city: "Copenhagen", country: "DK", countryName: "Denmark", major: true },
  { iata: "ARN", name: "Stockholm Arlanda", city: "Stockholm", country: "SE", countryName: "Sweden", major: true },
  { iata: "OSL", name: "Oslo Gardermoen", city: "Oslo", country: "NO", countryName: "Norway", major: true },
  { iata: "HEL", name: "Helsinki-Vantaa", city: "Helsinki", country: "FI", countryName: "Finland", major: true },
  { iata: "KEF", name: "Keflavík Intl", city: "Reykjavík", country: "IS", countryName: "Iceland", major: true },

  // --- Central & Eastern Europe ---
  { iata: "PRG", name: "Václav Havel", city: "Prague", country: "CZ", countryName: "Czechia", major: true },
  { iata: "WAW", name: "Warsaw Chopin", city: "Warsaw", country: "PL", countryName: "Poland", major: true },
  { iata: "KRK", name: "John Paul II Kraków-Balice", city: "Kraków", country: "PL", countryName: "Poland" },
  { iata: "BUD", name: "Budapest Ferenc Liszt", city: "Budapest", country: "HU", countryName: "Hungary", major: true },
  { iata: "OTP", name: "Henri Coandă Intl", city: "Bucharest", country: "RO", countryName: "Romania", major: true },
  { iata: "ZAG", name: "Franjo Tuđman", city: "Zagreb", country: "HR", countryName: "Croatia", major: true },
  { iata: "SPU", name: "Split", city: "Split", country: "HR", countryName: "Croatia" },

  // --- Middle East ---
  { iata: "DXB", name: "Dubai Intl", city: "Dubai", country: "AE", countryName: "United Arab Emirates", major: true },
  { iata: "AUH", name: "Zayed Intl", city: "Abu Dhabi", country: "AE", countryName: "United Arab Emirates" },
  { iata: "DOH", name: "Hamad Intl", city: "Doha", country: "QA", countryName: "Qatar", major: true },
  { iata: "TLV", name: "Ben Gurion", city: "Tel Aviv", country: "IL", countryName: "Israel", major: true },
  { iata: "AMM", name: "Queen Alia Intl", city: "Amman", country: "JO", countryName: "Jordan", major: true },
  { iata: "IST", name: "Istanbul", city: "Istanbul", country: "TR", countryName: "Türkiye", major: true },
  { iata: "AYT", name: "Antalya", city: "Antalya", country: "TR", countryName: "Türkiye" },

  // --- Africa ---
  { iata: "CMN", name: "Mohammed V Intl", city: "Casablanca", country: "MA", countryName: "Morocco", major: true },
  { iata: "RAK", name: "Marrakesh Menara", city: "Marrakesh", country: "MA", countryName: "Morocco", major: true },
  { iata: "CAI", name: "Cairo Intl", city: "Cairo", country: "EG", countryName: "Egypt", major: true },
  { iata: "JNB", name: "O. R. Tambo Intl", city: "Johannesburg", country: "ZA", countryName: "South Africa", major: true },
  { iata: "CPT", name: "Cape Town Intl", city: "Cape Town", country: "ZA", countryName: "South Africa", major: true },
  { iata: "NBO", name: "Jomo Kenyatta Intl", city: "Nairobi", country: "KE", countryName: "Kenya", major: true },
  { iata: "ADD", name: "Bole Intl", city: "Addis Ababa", country: "ET", countryName: "Ethiopia", major: true },

  // --- South & East Asia ---
  { iata: "DEL", name: "Indira Gandhi Intl", city: "Delhi", country: "IN", countryName: "India", major: true },
  { iata: "BOM", name: "Chhatrapati Shivaji Maharaj Intl", city: "Mumbai", country: "IN", countryName: "India", major: true },
  { iata: "BLR", name: "Kempegowda Intl", city: "Bengaluru", country: "IN", countryName: "India" },
  { iata: "HND", name: "Haneda", city: "Tokyo", country: "JP", countryName: "Japan", major: true },
  { iata: "NRT", name: "Narita Intl", city: "Tokyo", country: "JP", countryName: "Japan", major: true },
  { iata: "KIX", name: "Kansai Intl", city: "Osaka", country: "JP", countryName: "Japan", major: true },
  { iata: "ICN", name: "Incheon Intl", city: "Seoul", country: "KR", countryName: "South Korea", major: true },
  { iata: "PEK", name: "Beijing Capital Intl", city: "Beijing", country: "CN", countryName: "China", major: true },
  { iata: "PVG", name: "Shanghai Pudong Intl", city: "Shanghai", country: "CN", countryName: "China", major: true },
  { iata: "HKG", name: "Hong Kong Intl", city: "Hong Kong", country: "HK", countryName: "Hong Kong", major: true },
  { iata: "TPE", name: "Taiwan Taoyuan Intl", city: "Taipei", country: "TW", countryName: "Taiwan", major: true },
  { iata: "BKK", name: "Suvarnabhumi", city: "Bangkok", country: "TH", countryName: "Thailand", major: true },
  { iata: "HKT", name: "Phuket Intl", city: "Phuket", country: "TH", countryName: "Thailand", major: true },
  { iata: "SIN", name: "Changi", city: "Singapore", country: "SG", countryName: "Singapore", major: true },
  { iata: "KUL", name: "Kuala Lumpur Intl", city: "Kuala Lumpur", country: "MY", countryName: "Malaysia", major: true },
  { iata: "CGK", name: "Soekarno-Hatta Intl", city: "Jakarta", country: "ID", countryName: "Indonesia", major: true },
  { iata: "DPS", name: "Ngurah Rai (Bali) Intl", city: "Denpasar", country: "ID", countryName: "Indonesia", major: true },
  { iata: "MNL", name: "Ninoy Aquino Intl", city: "Manila", country: "PH", countryName: "Philippines", major: true },
  { iata: "SGN", name: "Tan Son Nhat Intl", city: "Ho Chi Minh City", country: "VN", countryName: "Vietnam", major: true },
  { iata: "HAN", name: "Noi Bai Intl", city: "Hanoi", country: "VN", countryName: "Vietnam", major: true },

  // --- Oceania ---
  { iata: "SYD", name: "Kingsford Smith", city: "Sydney", country: "AU", countryName: "Australia", major: true },
  { iata: "MEL", name: "Tullamarine", city: "Melbourne", country: "AU", countryName: "Australia", major: true },
  { iata: "BNE", name: "Brisbane", city: "Brisbane", country: "AU", countryName: "Australia" },
  { iata: "AKL", name: "Auckland", city: "Auckland", country: "NZ", countryName: "New Zealand", major: true },
  { iata: "NAN", name: "Nadi Intl", city: "Nadi", country: "FJ", countryName: "Fiji", major: true },
];

const BY_IATA = new Map(AIRPORTS.map((a) => [a.iata, a]));

export function getAirport(iata: string): Airport | undefined {
  return BY_IATA.get(iata.toUpperCase());
}

/** Country name if we know it, else the raw code. */
export function countryNameFor(code: string): string {
  const hit = AIRPORTS.find((a) => a.country === code.toUpperCase());
  return hit?.countryName ?? code.toUpperCase();
}

/** Distinct list of countries we have airports for, for the wishlist dropdown. */
export function listCountries(): { code: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const a of AIRPORTS) if (!seen.has(a.country)) seen.set(a.country, a.countryName);
  return [...seen.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Expand an ISO-2 country code into the airports we'll actually search.
 * Prefers `major` airports; falls back to every airport we have for that country.
 */
export function airportsForCountry(code: string): string[] {
  const cc = code.toUpperCase();
  const inCountry = AIRPORTS.filter((a) => a.country === cc);
  const majors = inCountry.filter((a) => a.major).map((a) => a.iata);
  return majors.length ? majors : inCountry.map((a) => a.iata);
}

/** Simple substring search over IATA / city / airport name for autocomplete. */
export function searchAirports(query: string, limit = 8): Airport[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { a: Airport; score: number }[] = [];
  for (const a of AIRPORTS) {
    const iata = a.iata.toLowerCase();
    const city = a.city.toLowerCase();
    const name = a.name.toLowerCase();
    let score = -1;
    if (iata === q) score = 0;
    else if (city.startsWith(q)) score = 1;
    else if (iata.startsWith(q)) score = 2;
    else if (city.includes(q) || name.includes(q)) score = 3;
    if (score >= 0) scored.push({ a, score });
  }
  return scored
    .sort((x, y) => x.score - y.score || x.a.city.localeCompare(y.a.city))
    .slice(0, limit)
    .map((s) => s.a);
}
