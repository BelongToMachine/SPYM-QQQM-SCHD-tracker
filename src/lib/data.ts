// Mock data services for the finance dashboard

// ========== STOCK DATA ==========

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
    pe: number;
    week52High: number;
    week52Low: number;
    sector: string;
}

export interface PricePoint {
    date: string;
    price: number;
    volume: number;
}

export const stocks: StockQuote[] = [
    { symbol: "AAPL", name: "Apple Inc.", price: 189.84, change: 3.42, changePercent: 1.84, high: 191.20, low: 187.15, open: 187.50, volume: "58.2M", marketCap: "2.95T", pe: 31.2, week52High: 199.62, week52Low: 143.90, sector: "Technology" },
    { symbol: "GOOGL", name: "Alphabet Inc.", price: 174.13, change: -1.25, changePercent: -0.71, high: 176.40, low: 173.50, open: 175.80, volume: "21.5M", marketCap: "2.15T", pe: 25.8, week52High: 193.31, week52Low: 130.67, sector: "Technology" },
    { symbol: "TSLA", name: "Tesla, Inc.", price: 248.42, change: 12.56, changePercent: 5.33, high: 252.30, low: 236.80, open: 238.10, volume: "112.8M", marketCap: "789.5B", pe: 62.4, week52High: 278.98, week52Low: 138.80, sector: "Automotive" },
    { symbol: "AMZN", name: "Amazon.com Inc.", price: 201.25, change: 2.83, changePercent: 1.43, high: 203.10, low: 198.50, open: 199.20, volume: "45.3M", marketCap: "2.08T", pe: 60.1, week52High: 201.25, week52Low: 118.35, sector: "Consumer" },
    { symbol: "MSFT", name: "Microsoft Corp.", price: 415.56, change: -2.14, changePercent: -0.51, high: 419.30, low: 413.80, open: 418.00, volume: "18.7M", marketCap: "3.09T", pe: 36.5, week52High: 420.82, week52Low: 309.49, sector: "Technology" },
    { symbol: "NVDA", name: "NVIDIA Corp.", price: 875.38, change: 28.45, changePercent: 3.36, high: 882.50, low: 849.20, open: 852.00, volume: "42.1M", marketCap: "2.16T", pe: 65.3, week52High: 974.00, week52Low: 373.56, sector: "Technology" },
    { symbol: "META", name: "Meta Platforms", price: 505.18, change: 8.72, changePercent: 1.76, high: 508.40, low: 497.30, open: 498.50, volume: "14.9M", marketCap: "1.30T", pe: 33.8, week52High: 542.81, week52Low: 279.40, sector: "Technology" },
    { symbol: "JPM", name: "JPMorgan Chase", price: 198.42, change: -0.85, changePercent: -0.43, high: 200.10, low: 197.50, open: 199.80, volume: "8.5M", marketCap: "572.1B", pe: 11.5, week52High: 205.88, week52Low: 143.64, sector: "Financial" },
    { symbol: "V", name: "Visa Inc.", price: 282.35, change: 1.92, changePercent: 0.69, high: 284.00, low: 280.10, open: 281.00, volume: "5.8M", marketCap: "577.3B", pe: 31.4, week52High: 290.96, week52Low: 227.78, sector: "Financial" },
    { symbol: "BRK.B", name: "Berkshire Hathaway", price: 408.25, change: 0.45, changePercent: 0.11, high: 410.50, low: 406.20, open: 407.90, volume: "3.2M", marketCap: "884.6B", pe: 9.2, week52High: 414.00, week52Low: 326.82, sector: "Financial" },
];

function generatePriceHistory(basePrice: number, days: number): PricePoint[] {
    const data: PricePoint[] = [];
    let price = basePrice * 0.85;
    const now = new Date();

    for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const change = (Math.random() - 0.48) * basePrice * 0.03;
        price = Math.max(price + change, basePrice * 0.6);
        data.push({
            date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            price: Math.round(price * 100) / 100,
            volume: Math.floor(Math.random() * 50000000 + 10000000),
        });
    }
    return data;
}

export function getStockHistory(symbol: string, period: string): PricePoint[] {
    const stock = stocks.find((s) => s.symbol === symbol);
    if (!stock) return [];
    const days = period === "1W" ? 7 : period === "1M" ? 30 : period === "3M" ? 90 : period === "1Y" ? 365 : 30;
    return generatePriceHistory(stock.price, days);
}

// ========== CURRENCY DATA ==========

export interface CurrencyRate {
    code: string;
    name: string;
    symbol: string;
    rate: number; // rate vs USD
    change: number;
    flag: string;
}

export const currencies: CurrencyRate[] = [
    { code: "USD", name: "US Dollar", symbol: "$", rate: 1.0, change: 0, flag: "🇺🇸" },
    { code: "EUR", name: "Euro", symbol: "€", rate: 0.9215, change: -0.12, flag: "🇪🇺" },
    { code: "GBP", name: "British Pound", symbol: "£", rate: 0.7896, change: 0.08, flag: "🇬🇧" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥", rate: 149.52, change: -0.34, flag: "🇯🇵" },
    { code: "CNY", name: "Chinese Yuan", symbol: "¥", rate: 7.2435, change: 0.05, flag: "🇨🇳" },
    { code: "KRW", name: "Korean Won", symbol: "₩", rate: 1325.40, change: -0.55, flag: "🇰🇷" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$", rate: 1.5342, change: 0.22, flag: "🇦🇺" },
    { code: "CAD", name: "Canadian Dollar", symbol: "C$", rate: 1.3558, change: -0.09, flag: "🇨🇦" },
    { code: "CHF", name: "Swiss Franc", symbol: "CHF", rate: 0.8765, change: 0.15, flag: "🇨🇭" },
    { code: "SGD", name: "Singapore Dollar", symbol: "S$", rate: 1.3412, change: 0.03, flag: "🇸🇬" },
    { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", rate: 7.8210, change: -0.02, flag: "🇭🇰" },
    { code: "INR", name: "Indian Rupee", symbol: "₹", rate: 83.12, change: -0.18, flag: "🇮🇳" },
];

export function convertCurrency(amount: number, from: string, to: string): number {
    const fromRate = currencies.find((c) => c.code === from)?.rate ?? 1;
    const toRate = currencies.find((c) => c.code === to)?.rate ?? 1;
    return (amount / fromRate) * toRate;
}

function generateRateHistory(baseRate: number, days: number): PricePoint[] {
    const data: PricePoint[] = [];
    let rate = baseRate;
    const now = new Date();

    for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const change = (Math.random() - 0.5) * baseRate * 0.005;
        rate = Math.max(rate + change, baseRate * 0.9);
        data.push({
            date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            price: Math.round(rate * 10000) / 10000,
            volume: 0,
        });
    }
    return data;
}

export function getCurrencyHistory(fromCode: string, toCode: string, period: string): PricePoint[] {
    const fromRate = currencies.find((c) => c.code === fromCode)?.rate ?? 1;
    const toRate = currencies.find((c) => c.code === toCode)?.rate ?? 1;
    const baseRate = toRate / fromRate;
    const days = period === "1W" ? 7 : period === "1M" ? 30 : period === "3M" ? 90 : period === "1Y" ? 365 : 30;
    return generateRateHistory(baseRate, days);
}

// ========== PORTFOLIO DATA ==========

export interface Holding {
    symbol: string;
    name: string;
    quantity: number;
    avgCost: number;
    currentPrice: number;
    allocation: number;
}

export const holdings: Holding[] = [
    { symbol: "AAPL", name: "Apple Inc.", quantity: 50, avgCost: 155.20, currentPrice: 189.84, allocation: 22 },
    { symbol: "NVDA", name: "NVIDIA Corp.", quantity: 15, avgCost: 450.80, currentPrice: 875.38, allocation: 30 },
    { symbol: "MSFT", name: "Microsoft Corp.", quantity: 25, avgCost: 340.50, currentPrice: 415.56, allocation: 24 },
    { symbol: "GOOGL", name: "Alphabet Inc.", quantity: 30, avgCost: 130.40, currentPrice: 174.13, allocation: 12 },
    { symbol: "AMZN", name: "Amazon.com", quantity: 20, avgCost: 145.90, currentPrice: 201.25, allocation: 9 },
    { symbol: "V", name: "Visa Inc.", quantity: 10, avgCost: 245.60, currentPrice: 282.35, allocation: 3 },
];

export function getPortfolioValue(): number {
    return holdings.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0);
}

export function getPortfolioCost(): number {
    return holdings.reduce((sum, h) => sum + h.quantity * h.avgCost, 0);
}

export function getPortfolioPL(): { value: number; percent: number } {
    const value = getPortfolioValue();
    const cost = getPortfolioCost();
    return {
        value: value - cost,
        percent: ((value - cost) / cost) * 100,
    };
}

function generatePortfolioHistory(days: number): PricePoint[] {
    const data: PricePoint[] = [];
    const totalValue = getPortfolioValue();
    let value = totalValue * 0.75;
    const now = new Date();

    for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const change = (Math.random() - 0.45) * totalValue * 0.01;
        value = Math.max(value + change, totalValue * 0.5);
        data.push({
            date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            price: Math.round(value * 100) / 100,
            volume: 0,
        });
    }
    return data;
}

export function getPortfolioHistory(period: string): PricePoint[] {
    const days = period === "1W" ? 7 : period === "1M" ? 30 : period === "3M" ? 90 : period === "1Y" ? 365 : 30;
    return generatePortfolioHistory(days);
}

// ========== MARKET INDICES ==========

export interface MarketIndex {
    name: string;
    value: number;
    change: number;
    changePercent: number;
}

export const indices: MarketIndex[] = [
    { name: "S&P 500", value: 5137.08, change: 25.42, changePercent: 0.50 },
    { name: "NASDAQ", value: 16274.94, change: 145.83, changePercent: 0.90 },
    { name: "DOW", value: 39069.11, change: -48.12, changePercent: -0.12 },
    { name: "RUSSELL", value: 2078.54, change: 18.35, changePercent: 0.89 },
];
