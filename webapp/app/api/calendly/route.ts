import { NextResponse } from "next/server";

interface CalendlyAccount {
  name: string;
  token: string;
}

function getAccounts(): CalendlyAccount[] {
  const accounts: CalendlyAccount[] = [];
  if (process.env.CALENDLY_TOKEN_MARTIN) {
    accounts.push({ name: "Martin", token: process.env.CALENDLY_TOKEN_MARTIN });
  }
  if (process.env.CALENDLY_TOKEN_AGUS) {
    accounts.push({ name: "Agus", token: process.env.CALENDLY_TOKEN_AGUS });
  }
  if (process.env.CALENDLY_TOKEN_VALENTINO) {
    accounts.push({ name: "Valentino", token: process.env.CALENDLY_TOKEN_VALENTINO });
  }
  return accounts;
}

async function fetchEventTypes(account: CalendlyAccount) {
  try {
    // First get the user URI
    const userRes = await fetch("https://api.calendly.com/users/me", {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    if (!userRes.ok) return [];
    const userData = await userRes.json();
    const userUri = userData.resource?.uri;
    if (!userUri) return [];

    // Then get event types
    const eventsRes = await fetch(
      `https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}&active=true`,
      { headers: { Authorization: `Bearer ${account.token}` } }
    );
    if (!eventsRes.ok) return [];
    const eventsData = await eventsRes.json();

    return (eventsData.collection || []).map((et: any) => ({
      name: et.name,
      slug: et.slug,
      url: et.scheduling_url,
      duration: et.duration,
      owner: account.name,
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  const accounts = getAccounts();
  const results = await Promise.all(accounts.map(fetchEventTypes));
  const eventTypes = results.flat();

  return NextResponse.json({
    accounts: accounts.map((a) => a.name),
    eventTypes,
  });
}
