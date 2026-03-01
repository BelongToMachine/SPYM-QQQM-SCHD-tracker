"use client";

import { useMemo, useState } from "react";
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
} from "lucide-react";
import {
  stocks,
  indices,
  getStockHistory,
} from "@/lib/data";

function formatCurrency(n: number): string {
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + n.toFixed(2);
}

export default function DashboardPage() {
  const [indexPeriod, setIndexPeriod] = useState("1M");

  const topGainer = useMemo(() => [...stocks].sort((a, b) => b.changePercent - a.changePercent)[0], []);
  const topLoser = useMemo(() => [...stocks].sort((a, b) => a.changePercent - b.changePercent)[0], []);
  const spHistory = useMemo(() => getStockHistory("AAPL", indexPeriod), [indexPeriod]);

  const totalMarketCap = useMemo(() => {
    return stocks.reduce((sum, s) => {
      const capStr = s.marketCap;
      let val = parseFloat(capStr);
      if (capStr.endsWith("T")) val *= 1e12;
      else if (capStr.endsWith("B")) val *= 1e9;
      return sum + val;
    }, 0);
  }, []);

  return (
    <>
      <div className="page-header animate-fade-in">
        <h1>Dashboard</h1>
        <p>Welcome back. Here&apos;s your market overview.</p>
      </div>

      {/* ── Metric Cards ── */}
      <div className="metric-grid">
        <div className="metric-card animate-fade-in animate-fade-in-delay-1">
          <div className="metric-icon emerald">
            <DollarSign size={22} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Total Market Cap</div>
            <div className="metric-value">{formatCurrency(totalMarketCap)}</div>
            <div className="metric-change positive">
              Tracked Stocks
            </div>
          </div>
        </div>

        <div className="metric-card animate-fade-in animate-fade-in-delay-2">
          <div className="metric-icon cyan">
            <BarChart3 size={22} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Stocks Tracked</div>
            <div className="metric-value">{stocks.length}</div>
            <div className="metric-change positive">
              Active
            </div>
          </div>
        </div>

        <div className="metric-card animate-fade-in animate-fade-in-delay-3">
          <div className="metric-icon emerald">
            <TrendingUp size={22} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Top Gainer</div>
            <div className="metric-value">{topGainer.symbol}</div>
            <div className="metric-change positive">
              <TrendingUp size={14} />+{topGainer.changePercent.toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="metric-card animate-fade-in animate-fade-in-delay-4">
          <div className="metric-icon red">
            <TrendingDown size={22} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Top Loser</div>
            <div className="metric-value">{topLoser.symbol}</div>
            <div className="metric-change negative">
              <TrendingDown size={14} />
              {topLoser.changePercent.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="card animate-fade-in" style={{ marginBottom: 24 }}>
        <div className="chart-header">
          <span className="chart-title">Market Overview</span>
          <div className="chart-tabs">
            {["1W", "1M", "3M", "1Y"].map((p) => (
              <button
                key={p}
                className={`chart-tab ${indexPeriod === p ? "active" : ""}`}
                onClick={() => setIndexPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spHistory}>
              <defs>
                <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
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
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gradGreen)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Market Indices ── */}
      <div className="card animate-fade-in" style={{ marginBottom: 24 }}>
        <div className="chart-title" style={{ marginBottom: 16 }}>
          <Activity size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />
          Market Indices
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Index</th>
              <th>Value</th>
              <th>Change</th>
              <th>% Change</th>
            </tr>
          </thead>
          <tbody>
            {indices.map((idx) => (
              <tr key={idx.name}>
                <td style={{ fontWeight: 600 }}>{idx.name}</td>
                <td>{idx.value.toLocaleString()}</td>
                <td className={idx.change >= 0 ? "positive" : "negative"}>
                  {idx.change >= 0 ? "+" : ""}
                  {idx.change.toFixed(2)}
                </td>
                <td className={idx.changePercent >= 0 ? "positive" : "negative"}>
                  {idx.changePercent >= 0 ? "+" : ""}
                  {idx.changePercent.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Top Movers ── */}
      <div className="card animate-fade-in">
        <div className="chart-title" style={{ marginBottom: 16 }}>
          <BarChart3 size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />
          Top Movers
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Name</th>
              <th>Price</th>
              <th>Change</th>
              <th>% Change</th>
              <th>Volume</th>
            </tr>
          </thead>
          <tbody>
            {[...stocks]
              .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
              .slice(0, 6)
              .map((s) => (
                <tr key={s.symbol}>
                  <td style={{ fontWeight: 700, color: "#10b981" }}>{s.symbol}</td>
                  <td style={{ color: "#94a3b8" }}>{s.name}</td>
                  <td>${s.price.toFixed(2)}</td>
                  <td className={s.change >= 0 ? "positive" : "negative"}>
                    {s.change >= 0 ? "+" : ""}
                    {s.change.toFixed(2)}
                  </td>
                  <td className={s.changePercent >= 0 ? "positive" : "negative"}>
                    {s.changePercent >= 0 ? "+" : ""}
                    {s.changePercent.toFixed(2)}%
                  </td>
                  <td style={{ color: "#94a3b8" }}>{s.volume}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
