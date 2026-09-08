import { AIRPORTS, listCountries } from "@/lib/airports";
import { getPreferences } from "@/lib/user";
import { DEFAULT_WEEKS_AHEAD } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import SettingsForm from "../settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const preferences = (await getPreferences(user.id)) ?? {
    email: user.email,
    name: "",
    phone: "",
    smsOptIn: false,
    budgetUsd: null,
    weeksAhead: DEFAULT_WEEKS_AHEAD,
    alertOnBudget: true,
    alertOnPriceDrop: true,
    scanEnabled: true,
    weekendPatterns: [],
    origins: [],
    destinations: [],
  };

  const airports = AIRPORTS.map((a) => ({
    iata: a.iata,
    city: a.city,
    name: a.name,
    country: a.countryName,
  }));

  return (
    <div className="wrap">
      <h1>Settings</h1>
      <p className="sub">
        Signed in as {user.email}. Changes take effect on the next scan.
      </p>
      <SettingsForm
        airports={airports}
        countries={listCountries()}
        initial={preferences}
        defaultWeeksAhead={DEFAULT_WEEKS_AHEAD}
      />
    </div>
  );
}
