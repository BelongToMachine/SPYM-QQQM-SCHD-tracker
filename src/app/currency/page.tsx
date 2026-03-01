"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { ArrowUpDown, RefreshCw, TrendingUp, TrendingDown, Clock } from "lucide-react";
import {
    TRACKED_CURRENCIES,
    fetchLatestRates,
    fetchHistoricalRates,
    convertWithRates,
    type TrackedCurrencyCode,
} from "@/lib/currency-api";

interface RateRow {
    from: string;
    to: string;
    rate: number;
    fromFlag: string;
    toFlag: string;
}

export default function CurrencyPage() {
    const [amount, setAmount] = useState<number>(1000);
    const [fromCurrency, setFromCurrency] = useState<TrackedCurrencyCode>("USD");
    const [toCurrency, setToCurrency] = useState<TrackedCurrencyCode>("CNY");
    const [period, setPeriod] = useState("1M");

    const [rates, setRates] = useState<Record<string, number> | null>(null);
    const [rateDate, setRateDate] = useState<string>("");
    const [history, setHistory] = useState<{ date: string; rate: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    // Fetch latest rates
    const loadRates = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchLatestRates("USD");
            // Build a full rate map with USD=1
            const fullRates: Record<string, number> = { USD: 1, ...data.rates };
            setRates(fullRates);
            setRateDate(data.date);
            setLastRefresh(new Date());
        } catch (err) {
            setError("Failed to fetch exchange rates. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch historical rates
    const loadHistory = useCallback(async () => {
        try {
            setHistoryLoading(true);
            const days =
                period === "1W" ? 7 : period === "1M" ? 30 : period === "3M" ? 90 : 365;
            const data = await fetchHistoricalRates(fromCurrency, toCurrency, days);
            setHistory(data);
        } catch (err) {
            console.error("Failed to load history:", err);
        } finally {
            setHistoryLoading(false);
        }
    }, [fromCurrency, toCurrency, period]);

    useEffect(() => {
        loadRates();
    }, [loadRates]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const converted = useMemo(() => {
        if (!rates) return 0;
        return convertWithRates(amount, fromCurrency, toCurrency, rates, "USD");
    }, [amount, fromCurrency, toCurrency, rates]);

    const currentRate = useMemo(() => {
        if (!rates) return 0;
        return convertWithRates(1, fromCurrency, toCurrency, rates, "USD");
    }, [fromCurrency, toCurrency, rates]);

    const handleSwap = () => {
        setFromCurrency(toCurrency);
        setToCurrency(fromCurrency);
    };

    const toCurrencyData = TRACKED_CURRENCIES.find((c) => c.code === toCurrency);

    // Build all cross-rate pairs
    const crossRates: RateRow[] = useMemo(() => {
        if (!rates) return [];
        const pairs: RateRow[] = [];
        const codes = TRACKED_CURRENCIES.map((c) => c.code);
        for (let i = 0; i < codes.length; i++) {
            for (let j = 0; j < codes.length; j++) {
                if (i === j) continue;
                const from = codes[i];
                const to = codes[j];
                const rate = convertWithRates(1, from as TrackedCurrencyCode, to as TrackedCurrencyCode, rates, "USD");
                pairs.push({
                    from,
                    to,
                    rate,
                    fromFlag: TRACKED_CURRENCIES.find((c) => c.code === from)!.flag,
                    toFlag: TRACKED_CURRENCIES.find((c) => c.code === to)!.flag,
                });
            }
        }
        return pairs;
    }, [rates]);

    // Format the history dates nicely
    const chartData = useMemo(
        () =>
            history.map((h) => ({
                date: new Date(h.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                }),
                rate: h.rate,
            })),
        [history]
    );

    if (error) {
        return (
            <>
                <div className="page-header">
                    <h1>Currency Exchange</h1>
                    <p>Track USD, CNY, HKD &amp; TRY exchange rates in real time.</p>
                </div>
                <div className="card" style={{ textAlign: "center", padding: 48 }}>
                    <p style={{ color: "var(--accent-red)", marginBottom: 16 }}>{error}</p>
                    <button
                        onClick={loadRates}
                        style={{
                            padding: "10px 24px",
                            background: "var(--accent-emerald)",
                            color: "white",
                            border: "none",
                            borderRadius: "var(--radius-md)",
                            cursor: "pointer",
                            fontFamily: "var(--font-sans)",
                            fontWeight: 600,
                        }}
                    >
                        Retry
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="page-header animate-fade-in">
                <h1>Currency Exchange</h1>
                <p style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    Live rates for USD, CNY, HKD &amp; TRY from ECB
                    {rateDate && (
                        <span className="badge green" style={{ fontSize: 11 }}>
                            <Clock size={12} /> Updated: {rateDate}
                        </span>
                    )}
                    <button
                        onClick={loadRates}
                        disabled={loading}
                        style={{
                            background: "transparent",
                            border: "1px solid var(--border-color)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                            padding: "4px 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 12,
                            fontFamily: "var(--font-sans)",
                            transition: "all 0.2s",
                        }}
                        aria-label="Refresh rates"
                    >
                        <RefreshCw size={13} className={loading ? "spinning" : ""} />
                        Refresh
                    </button>
                </p>
            </div>

            {/* Quick Rate Cards */}
            <div className="metric-grid animate-fade-in">
                {rates &&
                    [
                        { from: "USD", to: "CNY", icon: "🇺🇸→🇨🇳" },
                        { from: "USD", to: "HKD", icon: "🇺🇸→🇭🇰" },
                        { from: "USD", to: "TRY", icon: "🇺🇸→🇹🇷" },
                        { from: "CNY", to: "HKD", icon: "🇨🇳→🇭🇰" },
                    ].map((pair) => {
                        const r = convertWithRates(
                            1,
                            pair.from as TrackedCurrencyCode,
                            pair.to as TrackedCurrencyCode,
                            rates,
                            "USD"
                        );
                        return (
                            <div key={`${pair.from}-${pair.to}`} className="metric-card">
                                <div className="metric-icon cyan">
                                    <span style={{ fontSize: 18 }}>{pair.icon}</span>
                                </div>
                                <div className="metric-info">
                                    <div className="metric-label">
                                        {pair.from} → {pair.to}
                                    </div>
                                    <div className="metric-value" style={{ fontSize: 20 }}>
                                        {r.toFixed(4)}
                                    </div>
                                    <div className="metric-change positive" style={{ fontSize: 11 }}>
                                        Live ECB Rate
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </div>

            <div className="grid-2 animate-fade-in">
                {/* Converter */}
                <div className="card converter-card">
                    <div className="chart-title" style={{ marginBottom: 24 }}>
                        Currency Converter
                    </div>
                    <div className="converter-row">
                        <div className="converter-input-group">
                            <label>Amount</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                                id="currency-amount"
                            />
                        </div>
                        <div className="converter-input-group">
                            <label>From</label>
                            <select
                                value={fromCurrency}
                                onChange={(e) => setFromCurrency(e.target.value as TrackedCurrencyCode)}
                                id="currency-from"
                            >
                                {TRACKED_CURRENCIES.map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.flag} {c.code} — {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            className="converter-swap"
                            onClick={handleSwap}
                            aria-label="Swap currencies"
                        >
                            <ArrowUpDown size={18} />
                        </button>
                        <div className="converter-input-group">
                            <label>To</label>
                            <select
                                value={toCurrency}
                                onChange={(e) => setToCurrency(e.target.value as TrackedCurrencyCode)}
                                id="currency-to"
                            >
                                {TRACKED_CURRENCIES.map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.flag} {c.code} — {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="converter-result">
                        {loading ? (
                            <div className="result-value" style={{ fontSize: 24, opacity: 0.5 }}>
                                Loading...
                            </div>
                        ) : (
                            <>
                                <div className="result-value">
                                    {toCurrencyData?.symbol}
                                    {converted.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </div>
                                <div className="result-rate">
                                    1 {fromCurrency} = {currentRate.toFixed(4)} {toCurrency}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Rate Chart */}
                <div className="card">
                    <div className="chart-header">
                        <span className="chart-title">
                            {fromCurrency}/{toCurrency}
                        </span>
                        <div className="chart-tabs">
                            {["1W", "1M", "3M", "1Y"].map((p) => (
                                <button
                                    key={p}
                                    className={`chart-tab ${period === p ? "active" : ""}`}
                                    onClick={() => setPeriod(p)}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="chart-container">
                        {historyLoading ? (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "100%",
                                    color: "var(--text-muted)",
                                    fontSize: 14,
                                }}
                            >
                                Loading chart data...
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="gradCurrency" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 11, fill: "#64748b" }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: "#64748b" }}
                                        axisLine={false}
                                        tickLine={false}
                                        domain={["auto", "auto"]}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: "#1a1f2e",
                                            border: "1px solid rgba(255,255,255,0.08)",
                                            borderRadius: 10,
                                            fontSize: 13,
                                            color: "#f1f5f9",
                                        }}
                                        formatter={(value: number | undefined) => [value?.toFixed(4) ?? "—", "Rate"]}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="rate"
                                        stroke="#06b6d4"
                                        strokeWidth={2}
                                        fill="url(#gradCurrency)"
                                        name="Rate"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Cross-Rate Matrix */}
            <div className="card animate-fade-in">
                <div className="chart-title" style={{ marginBottom: 16 }}>
                    Cross-Rate Table
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>Pair</th>
                            <th>Rate</th>
                            <th>Inverse</th>
                        </tr>
                    </thead>
                    <tbody>
                        {crossRates
                            .filter((_, i) => i % 2 === 0) // show unique pairs only
                            .map((row, idx) => {
                                const inverse = crossRates.find(
                                    (r) => r.from === row.to && r.to === row.from
                                );
                                return (
                                    <tr key={idx}>
                                        <td style={{ fontSize: 18 }}>
                                            {row.fromFlag} → {row.toFlag}
                                        </td>
                                        <td style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>
                                            {row.from}/{row.to}
                                        </td>
                                        <td
                                            style={{
                                                fontFamily: "var(--font-mono)",
                                                fontWeight: 600,
                                                fontSize: 15,
                                            }}
                                        >
                                            {row.rate.toFixed(4)}
                                        </td>
                                        <td
                                            style={{
                                                fontFamily: "var(--font-mono)",
                                                color: "var(--text-secondary)",
                                            }}
                                        >
                                            {inverse ? inverse.rate.toFixed(4) : "—"}
                                        </td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
                {lastRefresh && (
                    <div
                        style={{
                            marginTop: 12,
                            fontSize: 12,
                            color: "var(--text-muted)",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <Clock size={12} />
                        Last refreshed: {lastRefresh.toLocaleTimeString()} · Source: European
                        Central Bank via Frankfurter API
                    </div>
                )}
            </div>
        </>
    );
}
