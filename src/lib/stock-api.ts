// Stock API service — client-side helpers for the three tracked ETFs
// Data fetched via our own /api/stocks route (which proxies Yahoo Finance)

export interface StockQuote {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    open: number;
    volume: string;
    marketCap: string;
    previousClose: number;
    week52High: number;
    week52Low: number;
}

export interface PricePoint {
    date: string;
    price: number;
}

export const TRACKED_ETFS = [
    { symbol: "SPYM", name: "SPDR Portfolio S&P 500 ETF" },
    { symbol: "QQQM", name: "Invesco NASDAQ 100 ETF" },
    { symbol: "SCHD", name: "Schwab US Dividend Equity ETF" },
] as const;

export type TrackedSymbol = (typeof TRACKED_ETFS)[number]["symbol"];

/**
 * Fetch real-time quotes for the three tracked ETFs
 */
export async function fetchStockQuotes(): Promise<StockQuote[]> {
    const res = await fetch("/api/stocks?action=quotes");
    if (!res.ok) throw new Error(`Failed to fetch quotes: ${res.status}`);
    return res.json();
}

/**
 * Fetch price history for a given symbol and range
 */
export async function fetchStockHistory(
    symbol: TrackedSymbol,
    range: string
): Promise<PricePoint[]> {
    const res = await fetch(`/api/stocks?action=history&symbol=${symbol}&range=${range}`);
    if (!res.ok) throw new Error(`Failed to fetch history: ${res.status}`);
    return res.json();
}
