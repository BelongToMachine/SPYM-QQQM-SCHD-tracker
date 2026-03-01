// Currency Exchange API service
// Uses Frankfurter API (free, no API key) for real ECB exchange rates

const BASE_URL = "https://api.frankfurter.app";

export interface LiveRates {
    base: string;
    date: string;
    rates: Record<string, number>;
}

export interface HistoricalRates {
    base: string;
    startDate: string;
    endDate: string;
    rates: Record<string, Record<string, number>>;
}

export const TRACKED_CURRENCIES = [
    { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
    { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳" },
    { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", flag: "🇭🇰" },
    { code: "TRY", name: "Turkish Lira", symbol: "₺", flag: "🇹🇷" },
] as const;

export type TrackedCurrencyCode = (typeof TRACKED_CURRENCIES)[number]["code"];

const OTHER_CODES = (base: string) =>
    TRACKED_CURRENCIES.map((c) => c.code)
        .filter((c) => c !== base)
        .join(",");

/**
 * Fetch latest exchange rates from Frankfurter API
 */
export async function fetchLatestRates(base: TrackedCurrencyCode = "USD"): Promise<LiveRates> {
    const res = await fetch(`${BASE_URL}/latest?from=${base}&to=${OTHER_CODES(base)}`, {
        next: { revalidate: 300 }, // cache for 5 minutes
    });
    if (!res.ok) throw new Error(`Failed to fetch rates: ${res.status}`);
    const data = await res.json();
    return {
        base: data.base,
        date: data.date,
        rates: data.rates,
    };
}

/**
 * Fetch historical rates for a date range
 */
export async function fetchHistoricalRates(
    base: TrackedCurrencyCode,
    to: TrackedCurrencyCode,
    days: number
): Promise<{ date: string; rate: number }[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const start = startDate.toISOString().split("T")[0];
    const end = endDate.toISOString().split("T")[0];

    // Same currency → return flat 1.0 rate without calling the API
    // (Frankfurter API errors when from === to)
    if (base === to) {
        const result: { date: string; rate: number }[] = [];
        const cursor = new Date(startDate);
        while (cursor <= endDate) {
            result.push({ date: cursor.toISOString().split("T")[0], rate: 1 });
            cursor.setDate(cursor.getDate() + 1);
        }
        return result;
    }

    const res = await fetch(`${BASE_URL}/${start}..${end}?from=${base}&to=${to}`, {
        next: { revalidate: 3600 }, // cache for 1 hour
    });
    if (!res.ok) throw new Error(`Failed to fetch history: ${res.status}`);
    const data = await res.json();

    const result = Object.entries(data.rates)
        .map(([date, rates]) => ({
            date,
            rate: (rates as Record<string, number>)[to],
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // Ensure the chart always extends to the current date.
    // Frankfurter API (ECB) only publishes rates on weekdays, so weekends/holidays
    // would leave the chart ending on the last published day (e.g. Friday).
    // We append a point for today using the latest known rate.
    const todayLabel = endDate.toISOString().split("T")[0];
    const lastPoint = result[result.length - 1];

    if (lastPoint && lastPoint.date !== todayLabel) {
        result.push({
            date: todayLabel,
            rate: lastPoint.rate,
        });
    }

    return result;
}

/**
 * Convert amount between currencies using provided rates
 */
export function convertWithRates(
    amount: number,
    from: TrackedCurrencyCode,
    to: TrackedCurrencyCode,
    rates: Record<string, number>,
    base: TrackedCurrencyCode
): number {
    if (from === to) return amount;
    if (from === base) return amount * (rates[to] ?? 1);
    if (to === base) return amount / (rates[from] ?? 1);
    // Cross-rate: from -> base -> to
    const amountInBase = amount / (rates[from] ?? 1);
    return amountInBase * (rates[to] ?? 1);
}
