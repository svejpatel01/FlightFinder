// Build a Google Flights search URL for an exact route + dates. We deliberately
// don't deep-link into Duffel (that flow is for booking, which this app never does).

export function googleFlightsUrl(
  originIata: string,
  destIata: string,
  departDate: string,
  returnDate: string,
): string {
  const q = `Flights from ${originIata} to ${destIata} on ${departDate} through ${returnDate}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
}
