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
import { RefreshCw, TrendingUp, TrendingDown, Clock } from "lucide-react";
import {
    TRACKED_ETFS,
    fetchStockQuotes,
    fetchStockHistory,
    type StockQuote,
    type PricePoint,
    type TrackedSymbol,
} from "@/lib/stock-api";

export default function StocksPage() {
    const [quotes, setQuotes] = useState<StockQuote[]>([]);
    const [selected, setSelected] = useState<TrackedSymbol>("SPYM");
    const [period, setPeriod] = useState("1M");
    const [history, setHistory] = useState<PricePoint[]>([]);

    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    // Fetch all quotes
    const loadQuotes = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchStockQuotes();
            setQuotes(data);
            setLastRefresh(new Date());
        } catch (err) {
            setError("Failed to fetch stock data. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch history for selected stock
    const loadHistory = useCallback(async () => {
        try {
            setHistoryLoading(true);
            const data = await fetchStockHistory(selected, period);
            setHistory(data);
        } catch (err) {
            console.error("Failed to load history:", err);
            setHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    }, [selected, period]);

    useEffect(() => {
        loadQuotes();
    }, [loadQuotes]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const selectedQuote = useMemo(
        () => quotes.find((q) => q.symbol === selected),
        [quotes, selected]
    );

    const isUp = (selectedQuote?.change ?? 0) >= 0;

    // Format the chart data
    const chartData = useMemo(
        () =>
            history.map((h) => ({
                date: h.date,
                price: h.price,
            })),
        [history]
    );

    if (error && quotes.length === 0) {
        return (
            <>
                <div className="page-header">
                    <h1>Stocks</h1>
                    <p>Track your ETFs: SPYM, QQQM, SCHD</p>
                </div>
                <div className="card" style={{ textAlign: "center", padding: 48 }}>
                    <p style={{ color: "var(--accent-red)", marginBottom: 16 }}>{error}</p>
                    <button
                        onClick={loadQuotes}
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
                <h1>Stocks</h1>
                <p style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    Live ETF prices — SPYM, QQQM &amp; SCHD
                    {lastRefresh && (
                        <span className="badge green" style={{ fontSize: 11 }}>
                            <Clock size={12} /> Updated:{" "}
                            {lastRefresh.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={() => {
                            loadQuotes();
                            loadHistory();
                        }}
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
                        aria-label="Refresh data"
                    >
                        <RefreshCw
                            size={13}
                            className={loading ? "spinning" : ""}
                        />
                        Refresh
                    </button>
                </p>
            </div>

            {/* Quick Quote Cards */}
            <div className="metric-grid animate-fade-in">
                {loading
                    ? TRACKED_ETFS.map((etf) => (
                        <div key={etf.symbol} className="metric-card">
                            <div className="metric-info">
                                <div className="metric-label">{etf.symbol}</div>
                                <div
                                    className="metric-value"
                                    style={{ fontSize: 20, opacity: 0.4 }}
                                >
                                    Loading...
                                </div>
                            </div>
                        </div>
                    ))
                    : quotes.map((q) => {
                        const up = q.change >= 0;
                        return (
                            <button
                                key={q.symbol}
                                className="metric-card"
                                onClick={() => setSelected(q.symbol as TrackedSymbol)}
                                style={{
                                    cursor: "pointer",
                                    border:
                                        selected === q.symbol
                                            ? "1.5px solid var(--accent-emerald)"
                                            : "1px solid var(--border-color)",
                                    textAlign: "left",
                                    background:
                                        selected === q.symbol
                                            ? "rgba(16,185,129,0.04)"
                                            : undefined,
                                    transition: "all 0.2s",
                                }}
                            >
                                <div
                                    className="metric-icon"
                                    style={{
                                        background: up
                                            ? "rgba(16,185,129,0.12)"
                                            : "rgba(239,68,68,0.12)",
                                    }}
                                >
                                    {up ? (
                                        <TrendingUp
                                            size={20}
                                            color="var(--accent-emerald)"
                                        />
                                    ) : (
                                        <TrendingDown
                                            size={20}
                                            color="var(--accent-red)"
                                        />
                                    )}
                                </div>
                                <div className="metric-info">
                                    <div className="metric-label">{q.symbol}</div>
                                    <div
                                        className="metric-value"
                                        style={{ fontSize: 20 }}
                                    >
                                        ${q.price.toFixed(2)}
                                    </div>
                                    <div
                                        className={`metric-change ${up ? "positive" : "negative"}`}
                                        style={{ fontSize: 12 }}
                                    >
                                        {up ? "+" : ""}
                                        {q.change.toFixed(2)} ({up ? "+" : ""}
                                        {q.changePercent.toFixed(2)}%)
                                    </div>
                                </div>
                            </button>
                        );
                    })}
            </div>

            <div className="grid-3 animate-fade-in">
                {/* Chart */}
                <div className="card">
                    <div className="chart-header">
                        <div>
                            <span className="chart-title">
                                {selected}
                            </span>
                            {selectedQuote && (
                                <>
                                    <span
                                        style={{
                                            marginLeft: 12,
                                            fontSize: 22,
                                            fontWeight: 700,
                                            color: "var(--text-primary)",
                                        }}
                                    >
                                        ${selectedQuote.price.toFixed(2)}
                                    </span>
                                    <span
                                        style={{
                                            marginLeft: 8,
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: isUp
                                                ? "var(--accent-emerald)"
                                                : "var(--accent-red)",
                                        }}
                                    >
                                        {isUp ? "+" : ""}
                                        {selectedQuote.change.toFixed(2)} (
                                        {isUp ? "+" : ""}
                                        {selectedQuote.changePercent.toFixed(2)}
                                        %)
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="chart-tabs">
                            {["1W", "1M", "3M", "1Y", "5Y"].map((p) => (
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
                        ) : chartData.length === 0 ? (
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
                                No chart data available
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient
                                            id="gradStock"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="0%"
                                                stopColor={
                                                    isUp ? "#10b981" : "#ef4444"
                                                }
                                                stopOpacity={0.3}
                                            />
                                            <stop
                                                offset="100%"
                                                stopColor={
                                                    isUp ? "#10b981" : "#ef4444"
                                                }
                                                stopOpacity={0}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="date"
                                        tick={{
                                            fontSize: 11,
                                            fill: "#64748b",
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(value: string) => {
                                            if (period === "5Y") {
                                                // Extract year from "Jan 2021" format
                                                const year = value.split(" ").pop() ?? value;
                                                return year;
                                            }
                                            return value;
                                        }}
                                        // For 5Y, show fewer ticks to avoid cluttered repeated years
                                        {...(period === "5Y"
                                            ? { interval: Math.max(Math.floor(chartData.length / 6), 1) }
                                            : {})}
                                    />
                                    <YAxis
                                        tick={{
                                            fontSize: 11,
                                            fill: "#64748b",
                                        }}
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
                                        formatter={(value: number | undefined) => [
                                            `$${value?.toFixed(2) ?? "—"}`,
                                            "Price",
                                        ]}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="price"
                                        stroke={isUp ? "#10b981" : "#ef4444"}
                                        strokeWidth={2}
                                        fill="url(#gradStock)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Key Stats */}
                    {selectedQuote && (
                        <div className="stock-detail-grid">
                            {[
                                {
                                    label: "Open",
                                    value: `$${selectedQuote.open.toFixed(2)}`,
                                },
                                {
                                    label: "High",
                                    value: `$${selectedQuote.high.toFixed(2)}`,
                                },
                                {
                                    label: "Low",
                                    value: `$${selectedQuote.low.toFixed(2)}`,
                                },
                                { label: "Volume", value: selectedQuote.volume },
                                {
                                    label: "Prev Close",
                                    value: `$${selectedQuote.previousClose.toFixed(2)}`,
                                },
                                {
                                    label: "Market Cap",
                                    value: selectedQuote.marketCap,
                                },
                                {
                                    label: "52W High",
                                    value: `$${selectedQuote.week52High.toFixed(2)}`,
                                },
                                {
                                    label: "52W Low",
                                    value: `$${selectedQuote.week52Low.toFixed(2)}`,
                                },
                            ].map((stat) => (
                                <div key={stat.label} className="stock-stat">
                                    <div className="stock-stat-label">
                                        {stat.label}
                                    </div>
                                    <div className="stock-stat-value">
                                        {stat.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Watchlist */}
                <div
                    className="card"
                    style={{ padding: 0, overflow: "hidden" }}
                >
                    <div
                        style={{
                            padding: "20px 20px 12px",
                            fontSize: 16,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                        }}
                    >
                        Tracked ETFs
                    </div>
                    <div style={{ overflowY: "auto", maxHeight: 540 }}>
                        {loading
                            ? TRACKED_ETFS.map((etf) => (
                                <div
                                    key={etf.symbol}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        width: "100%",
                                        padding: "14px 20px",
                                        borderBottom:
                                            "1px solid rgba(255,255,255,0.03)",
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                fontWeight: 700,
                                                fontSize: 14,
                                                color: "var(--text-primary)",
                                            }}
                                        >
                                            {etf.symbol}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: "var(--text-muted)",
                                                marginTop: 2,
                                            }}
                                        >
                                            {etf.name}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 13,
                                            color: "var(--text-muted)",
                                            opacity: 0.5,
                                        }}
                                    >
                                        Loading...
                                    </div>
                                </div>
                            ))
                            : quotes.map((s) => (
                                <button
                                    key={s.symbol}
                                    onClick={() =>
                                        setSelected(
                                            s.symbol as TrackedSymbol
                                        )
                                    }
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        width: "100%",
                                        padding: "14px 20px",
                                        border: "none",
                                        borderBottom:
                                            "1px solid rgba(255,255,255,0.03)",
                                        background:
                                            selected === s.symbol
                                                ? "rgba(16,185,129,0.06)"
                                                : "transparent",
                                        cursor: "pointer",
                                        transition: "background 0.15s",
                                        fontFamily: "var(--font-sans)",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (selected !== s.symbol)
                                            (
                                                e.currentTarget as HTMLButtonElement
                                            ).style.background =
                                                "rgba(255,255,255,0.02)";
                                    }}
                                    onMouseLeave={(e) => {
                                        if (selected !== s.symbol)
                                            (
                                                e.currentTarget as HTMLButtonElement
                                            ).style.background =
                                                "transparent";
                                    }}
                                >
                                    <div style={{ textAlign: "left" }}>
                                        <div
                                            style={{
                                                fontWeight: 700,
                                                fontSize: 14,
                                                color: "var(--text-primary)",
                                            }}
                                        >
                                            {s.symbol}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: "var(--text-muted)",
                                                marginTop: 2,
                                            }}
                                        >
                                            {s.name}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div
                                            style={{
                                                fontWeight: 600,
                                                fontSize: 14,
                                                color: "var(--text-primary)",
                                            }}
                                        >
                                            ${s.price.toFixed(2)}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color:
                                                    s.change >= 0
                                                        ? "var(--accent-emerald)"
                                                        : "var(--accent-red)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "flex-end",
                                                gap: 3,
                                                marginTop: 2,
                                            }}
                                        >
                                            {s.change >= 0 ? (
                                                <TrendingUp size={12} />
                                            ) : (
                                                <TrendingDown size={12} />
                                            )}
                                            {s.change >= 0 ? "+" : ""}
                                            {s.changePercent.toFixed(2)}%
                                        </div>
                                    </div>
                                </button>
                            ))}
                    </div>
                    {lastRefresh && (
                        <div
                            style={{
                                padding: "10px 20px",
                                fontSize: 12,
                                color: "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                borderTop: "1px solid rgba(255,255,255,0.03)",
                            }}
                        >
                            <Clock size={12} />
                            Source: Yahoo Finance · Updated:{" "}
                            {lastRefresh.toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
