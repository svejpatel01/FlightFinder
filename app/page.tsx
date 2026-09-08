import { AIRPORTS, listCountries } from "@/lib/airports";
import { getPreferences } from "@/lib/user";
import { DEFAULT_WEEKS_AHEAD } from "@/lib/constants";
import OnboardingForm from "./onboarding-form";

export const dynamic = "force-dynamic";

export default async function Page() {
  const preferences = await getPreferences();

  const airports = AIRPORTS.map((a) => ({
    iata: a.iata,
    city: a.city,
    name: a.name,
    country: a.countryName,
  }));

  return (
    <div className="wrap">
      <h1>FlightFinder</h1>
      <p className="sub">
        Watch cheap round-trip weekend flights and get an email when a fare drops
        below your budget — or 30%+ below its own recent average.
      </p>
      <OnboardingForm
        airports={airports}
        countries={listCountries()}
        initial={preferences}
        defaultWeeksAhead={DEFAULT_WEEKS_AHEAD}
      />
    </div>
  );
}
