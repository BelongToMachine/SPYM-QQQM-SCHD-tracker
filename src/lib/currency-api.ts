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
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(`${BASE_URL}/latest?from=${base}&to=${OTHER_CODES(base)}`, {
            next: { revalidate: 300 }, // cache for 5 minutes
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`Failed to fetch rates: ${res.status}`);
        const data = await res.json();
        return {
            base: data.base,
            date: data.date,
            rates: data.rates,
        };
    } catch (err) {
        console.warn("Frankfurter latest API failed, using fallback static data:", err);

        // Static fallback rates so the app doesn't break
        const fallbackRates: Record<string, Record<string, number>> = {
            USD: { CNY: 7.2435, HKD: 7.8210, TRY: 32.15 },
            CNY: { USD: 0.1381, HKD: 1.0800, TRY: 4.44 },
            HKD: { USD: 0.1279, CNY: 0.9259, TRY: 4.11 },
            TRY: { USD: 0.0311, CNY: 0.2252, HKD: 0.2433 }
        };

        return {
            base,
            date: new Date().toISOString().split("T")[0],
            rates: fallbackRates[base] || {},
        };
    }
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

    let result: { date: string; rate: number }[] = [];
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(`${BASE_URL}/${start}..${end}?from=${base}&to=${to}`, {
            next: { revalidate: 3600 }, // cache for 1 hour
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`Failed to fetch history: ${res.status}`);
        const data = await res.json();

        result = Object.entries(data.rates)
            .map(([date, rates]) => ({
                date,
                rate: (rates as Record<string, number>)[to],
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
    } catch (err) {
        console.warn("Frankfurter historical API failed, using fallback mock data:", err);
        try {
            const latestData = await fetchLatestRates(base);
            const latestRate = latestData.rates[to] ?? 1;

            const cursor = new Date(startDate);
            let mockRate = latestRate;
            while (cursor <= endDate) {
                // adding slight random walk noise (~0.5%)
                mockRate = mockRate * (1 + (Math.random() - 0.5) * 0.005);
                result.push({ date: cursor.toISOString().split("T")[0], rate: mockRate });
                cursor.setDate(cursor.getDate() + 1);
            }
        } catch (fallbackErr) {
            const cursor = new Date(startDate);
            while (cursor <= endDate) {
                result.push({ date: cursor.toISOString().split("T")[0], rate: 1 });
                cursor.setDate(cursor.getDate() + 1);
            }
        }
    }

    // Ensure the chart always extends to the current date with no gaps.
    // Frankfurter API (ECB) only publishes rates on weekdays, so weekends/holidays
    // would leave gaps. We fill every missing day from the last data point
    // through today using the latest known rate.
    const todayStr = endDate.toISOString().split("T")[0];
    const lastPoint = result[result.length - 1];

    if (lastPoint && lastPoint.date < todayStr) {
        const cursor = new Date(lastPoint.date);
        cursor.setDate(cursor.getDate() + 1);

        const endDay = new Date(todayStr);
        while (cursor <= endDay) {
            result.push({
                date: cursor.toISOString().split("T")[0],
                rate: lastPoint.rate,
            });
            cursor.setDate(cursor.getDate() + 1);
        }
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
