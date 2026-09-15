// Build a Google Flights search URL for an exact route + dates — the link
// shown in dashboard rows and email digests so a user can open real results
// and book manually. This app never books anything itself.

export function googleFlightsUrl(
  originIata: string,
  destIata: string,
  departDate: string,
  returnDate: string,
): string {
  const q = `Flights from ${originIata} to ${destIata} on ${departDate} through ${returnDate}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
}
