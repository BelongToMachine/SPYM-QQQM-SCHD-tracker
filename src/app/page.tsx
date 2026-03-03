"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Activity,
  ArrowRightLeft,
  RefreshCw,
  Clock,
  Zap,
} from "lucide-react";
import {
  fetchStockQuotes,
  fetchStockHistory,
  type StockQuote,
  type PricePoint,
} from "@/lib/stock-api";
import {
  TRACKED_CURRENCIES,
  fetchLatestRates,
  convertWithRates,
  type TrackedCurrencyCode,
} from "@/lib/currency-api";

export default function DashboardPage() {
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [chartSymbol, setChartSymbol] = useState("SPYM");
  const [chartPeriod, setChartPeriod] = useState("1M");
  const [history, setHistory] = useState<PricePoint[]>([]);

  const [currencyRates, setCurrencyRates] = useState<Record<string, number> | null>(null);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // ── Fetch live ETF quotes + currency rates ──
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [stockData, rateData] = await Promise.all([
        fetchStockQuotes(),
        fetchLatestRates("USD"),
      ]);
      setQuotes(stockData);
      setCurrencyRates({ USD: 1, ...rateData.rates });
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch chart history ──
  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await fetchStockHistory(
        chartSymbol as "SPYM" | "QQQM" | "SCHD",
        chartPeriod
      );
      setHistory(data);
    } catch (err) {
      console.error("History load error:", err);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [chartSymbol, chartPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ── Derived data ──
  const topGainer = useMemo(
    () =>
      [...quotes].sort((a, b) => b.changePercent - a.changePercent)[0] ?? null,
    [quotes]
  );
  const topLoser = useMemo(
    () =>
      [...quotes].sort((a, b) => a.changePercent - b.changePercent)[0] ?? null,
    [quotes]
  );

  const totalValue = useMemo(
    () => quotes.reduce((sum, q) => sum + q.price, 0),
    [quotes]
  );

  const avgChange = useMemo(() => {
    if (quotes.length === 0) return 0;
    return quotes.reduce((s, q) => s + q.changePercent, 0) / quotes.length;
  }, [quotes]);

  const selectedQuote = useMemo(
    () => quotes.find((q) => q.symbol === chartSymbol),
    [quotes, chartSymbol]
  );

  const isUp = (selectedQuote?.change ?? 0) >= 0;

  const chartData = useMemo(
    () => history.map((h) => ({ date: h.date, price: h.price })),
    [history]
  );

  // Currency pairs for the quick grid
  const currencyPairs = useMemo(() => {
    if (!currencyRates) return [];
    return [
      { from: "USD" as TrackedCurrencyCode, to: "CNY" as TrackedCurrencyCode, icon: "🇺🇸→🇨🇳" },
      { from: "USD" as TrackedCurrencyCode, to: "HKD" as TrackedCurrencyCode, icon: "🇺🇸→🇭🇰" },
      { from: "USD" as TrackedCurrencyCode, to: "TRY" as TrackedCurrencyCode, icon: "🇺🇸→🇹🇷" },
      { from: "CNY" as TrackedCurrencyCode, to: "HKD" as TrackedCurrencyCode, icon: "🇨🇳→🇭🇰" },
    ].map((p) => ({
      ...p,
      rate: convertWithRates(1, p.from, p.to, currencyRates, "USD"),
    }));
  }, [currencyRates]);

  return (
    <>
      <div className="page-header animate-fade-in">
        <h1>Dashboard</h1>
        <p style={{ display: "flex", alignItems: "center", gap: 12 }}>
          Welcome back. Here&apos;s your live market overview.
          {lastRefresh && (
            <span className="badge green" style={{ fontSize: 11 }}>
              <Clock size={12} /> {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => {
              loadData();
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
            <RefreshCw size={13} className={loading ? "spinning" : ""} />
            Refresh
          </button>
        </p>
      </div>

      {/* ── Metric Cards ── */}
      <div className="metric-grid">
        {/* Portfolio Pulse */}
        <div className="metric-card animate-fade-in animate-fade-in-delay-1">
          <div className="metric-icon emerald">
            <Zap size={22} />
          </div>
          <div className="metric-info">
            <div className="metric-label">ETF Avg Performance</div>
            <div className="metric-value">
              {loading ? "—" : `${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(2)}%`}
            </div>
            <div className={`metric-change ${avgChange >= 0 ? "positive" : "negative"}`}>
              {avgChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              Today
            </div>
          </div>
        </div>

        {/* ETFs Tracked */}
        <div className="metric-card animate-fade-in animate-fade-in-delay-2">
          <div className="metric-icon cyan">
            <BarChart3 size={22} />
          </div>
          <div className="metric-info">
            <div className="metric-label">ETFs Tracked</div>
            <div className="metric-value">{quotes.length || 3}</div>
            <div className="metric-change positive">
              <Activity size={14} /> Live
            </div>
          </div>
        </div>

        {/* Top Gainer */}
        <div className="metric-card animate-fade-in animate-fade-in-delay-3">
          <div className="metric-icon emerald">
            <TrendingUp size={22} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Top Gainer</div>
            <div className="metric-value">
              {loading ? "—" : topGainer?.symbol ?? "—"}
            </div>
            {topGainer && !loading && (
              <div className="metric-change positive">
                <TrendingUp size={14} />+{topGainer.changePercent.toFixed(2)}%
              </div>
            )}
          </div>
        </div>

        {/* Top Loser */}
        <div className="metric-card animate-fade-in animate-fade-in-delay-4">
          <div className="metric-icon red">
            <TrendingDown size={22} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Top Loser</div>
            <div className="metric-value">
              {loading ? "—" : topLoser?.symbol ?? "—"}
            </div>
            {topLoser && !loading && (
              <div className="metric-change negative">
                <TrendingDown size={14} />
                {topLoser.changePercent.toFixed(2)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ETF Price Chart ── */}
      <div className="card animate-fade-in" style={{ marginBottom: 24 }}>
        <div className="chart-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="chart-tabs" style={{ marginRight: 12 }}>
              {(["SPYM", "QQQM", "SCHD"] as const).map((sym) => (
                <button
                  key={sym}
                  className={`chart-tab ${chartSymbol === sym ? "active" : ""}`}
                  onClick={() => setChartSymbol(sym)}
                >
                  {sym}
                </button>
              ))}
            </div>
            {selectedQuote && (
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                ${selectedQuote.price.toFixed(2)}{" "}
                <span
                  style={{
                    color: isUp ? "var(--accent-emerald)" : "var(--accent-red)",
                    fontSize: 13,
                  }}
                >
                  {isUp ? "+" : ""}
                  {selectedQuote.changePercent.toFixed(2)}%
                </span>
              </span>
            )}
          </div>
          <div className="chart-tabs">
            {["1W", "1M", "3M", "1Y"].map((p) => (
              <button
                key={p}
                className={`chart-tab ${chartPeriod === p ? "active" : ""}`}
                onClick={() => setChartPeriod(p)}
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
                  <linearGradient id="gradDash" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={isUp ? "#10b981" : "#ef4444"}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={isUp ? "#10b981" : "#ef4444"}
                      stopOpacity={0}
                    />
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
                  fill="url(#gradDash)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid-2 animate-fade-in">
        {/* ── ETF Summary ── */}
        <div className="card">
          <div className="chart-title" style={{ marginBottom: 16 }}>
            <BarChart3
              size={18}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: 8,
              }}
            />
            ETF Overview
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Name</th>
                <th>Price</th>
                <th>Change</th>
                <th>Volume</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? [1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td style={{ opacity: 0.4 }}>Loading...</td>
                    <td />
                    <td />
                    <td />
                    <td />
                  </tr>
                ))
                : quotes.map((q) => (
                  <tr key={q.symbol}>
                    <td style={{ fontWeight: 700, color: "var(--accent-emerald)" }}>
                      {q.symbol}
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>{q.name}</td>
                    <td>${q.price.toFixed(2)}</td>
                    <td className={q.change >= 0 ? "positive" : "negative"}>
                      {q.change >= 0 ? "+" : ""}
                      {q.changePercent.toFixed(2)}%
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>{q.volume}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* ── Live Currency Rates ── */}
        <div className="card">
          <div className="chart-title" style={{ marginBottom: 16 }}>
            <ArrowRightLeft
              size={18}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: 8,
              }}
            />
            Live Exchange Rates
          </div>
          {currencyRates ? (
            <div style={{ display: "grid", gap: 12 }}>
              {currencyPairs.map((pair) => (
                <div
                  key={`${pair.from}-${pair.to}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    background: "var(--bg-input)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{pair.icon}</span>
                    <span
                      style={{
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        fontSize: 14,
                      }}
                    >
                      {pair.from}/{pair.to}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: 16,
                      color: "var(--accent-cyan)",
                    }}
                  >
                    {pair.rate.toFixed(4)}
                  </span>
                </div>
              ))}
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 4,
                }}
              >
                <Clock size={11} /> Source: European Central Bank via Frankfurter
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>
              Loading rates...
            </div>
          )}
        </div>
      </div>
    </>
  );
}
