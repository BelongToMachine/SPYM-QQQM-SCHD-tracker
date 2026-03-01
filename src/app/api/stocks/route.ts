import { NextRequest, NextResponse } from "next/server";

// Yahoo Finance v8 chart API — no API key required
const YF_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

const SYMBOLS = ["SPYM", "QQQM", "SCHD"] as const;

const ETF_NAMES: Record<string, string> = {
    SPYM: "SPDR Portfolio S&P 500 ETF",
    QQQM: "Invesco NASDAQ 100 ETF",
    SCHD: "Schwab US Dividend Equity ETF",
};

function formatVolume(v: number): string {
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return String(v);
}

function formatMarketCap(v: number | undefined): string {
    if (!v) return "N/A";
    if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
    return String(v);
}

// Range mapping to Yahoo Finance range & interval params
function getRangeParams(range: string): { range: string; interval: string } {
    switch (range) {
        case "1W":
            return { range: "5d", interval: "1d" };
        case "1M":
            return { range: "1mo", interval: "1d" };
        case "3M":
            return { range: "3mo", interval: "1d" };
        case "1Y":
            return { range: "1y", interval: "1wk" };
        case "5Y":
            return { range: "5y", interval: "1mo" };
        default:
            return { range: "1mo", interval: "1d" };
    }
}

async function fetchYahooChart(symbol: string, range: string, interval: string) {
    const url = `${YF_BASE}/${symbol}?range=${range}&interval=${interval}&includePrePost=false`;
    const res = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        next: { revalidate: 300 }, // cache 5 min
    });
    if (!res.ok) {
        throw new Error(`Yahoo Finance responded with ${res.status} for ${symbol}`);
    }
    return res.json();
}

async function getQuotes() {
    const quotes = await Promise.all(
        SYMBOLS.map(async (symbol) => {
            try {
                const data = await fetchYahooChart(symbol, "1d", "1d");
                const result = data.chart?.result?.[0];
                if (!result) throw new Error(`No data for ${symbol}`);

                const meta = result.meta;
                const quote = result.indicators?.quote?.[0] ?? {};
                const closes = quote.close ?? [];
                const highs = quote.high ?? [];
                const lows = quote.low ?? [];
                const opens = quote.open ?? [];
                const volumes = quote.volume ?? [];

                const currentPrice = meta.regularMarketPrice ?? closes[closes.length - 1] ?? 0;
                const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? currentPrice;
                const change = currentPrice - previousClose;
                const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

                return {
                    symbol,
                    name: ETF_NAMES[symbol] ?? symbol,
                    price: currentPrice,
                    change,
                    changePercent,
                    high: highs.filter(Boolean).length
                        ? Math.max(...highs.filter(Boolean))
                        : meta.regularMarketDayHigh ?? currentPrice,
                    low: lows.filter(Boolean).length
                        ? Math.min(...lows.filter(Boolean))
                        : meta.regularMarketDayLow ?? currentPrice,
                    open: opens.filter(Boolean).length
                        ? opens.find((o: number) => o != null) ?? currentPrice
                        : currentPrice,
                    volume: formatVolume(
                        volumes.filter(Boolean).reduce((a: number, b: number) => a + b, 0) ||
                        meta.regularMarketVolume || 0
                    ),
                    marketCap: formatMarketCap(meta.marketCap),
                    previousClose,
                    week52High: meta.fiftyTwoWeekHigh ?? currentPrice,
                    week52Low: meta.fiftyTwoWeekLow ?? currentPrice,
                };
            } catch (err) {
                console.error(`Error fetching ${symbol}:`, err);
                // Return a fallback quote so the UI doesn't break
                return {
                    symbol,
                    name: ETF_NAMES[symbol] ?? symbol,
                    price: 0,
                    change: 0,
                    changePercent: 0,
                    high: 0,
                    low: 0,
                    open: 0,
                    volume: "N/A",
                    marketCap: "N/A",
                    previousClose: 0,
                    week52High: 0,
                    week52Low: 0,
                };
            }
        })
    );
    return quotes;
}

async function getHistory(symbol: string, range: string) {
    const params = getRangeParams(range);
    const data = await fetchYahooChart(symbol, params.range, params.interval);
    const result = data.chart?.result?.[0];
    if (!result) throw new Error(`No chart data for ${symbol}`);

    const timestamps: number[] = result.timestamp ?? [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

    const points: { date: string; price: number }[] = [];
    for (let i = 0; i < timestamps.length; i++) {
        const close = closes[i];
        if (close == null) continue;
        const d = new Date(timestamps[i] * 1000);

        let dateLabel: string;
        if (range === "5Y") {
            // Include month + year for tooltip, e.g. "Jan 2021"
            dateLabel = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        } else if (range === "1Y") {
            // Show abbreviated month + short year, e.g. "Jan '24"
            const mon = d.toLocaleDateString("en-US", { month: "short" });
            const yr = String(d.getFullYear()).slice(-2);
            dateLabel = `${mon} '${yr}`;
        } else {
            dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }

        points.push({
            date: dateLabel,
            price: Math.round(close * 100) / 100,
        });
    }
    return points;
}

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const action = searchParams.get("action");

    try {
        if (action === "quotes") {
            const quotes = await getQuotes();
            return NextResponse.json(quotes);
        }

        if (action === "history") {
            const symbol = searchParams.get("symbol") ?? "SPYM";
            const range = searchParams.get("range") ?? "1M";
            if (!SYMBOLS.includes(symbol as typeof SYMBOLS[number])) {
                return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
            }
            const history = await getHistory(symbol, range);
            return NextResponse.json(history);
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (err) {
        console.error("Stock API error:", err);
        return NextResponse.json(
            { error: "Failed to fetch stock data. Please try again." },
            { status: 500 }
        );
    }
}
