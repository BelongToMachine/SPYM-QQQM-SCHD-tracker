"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    Plus,
    Trash2,
    ShoppingCart,
    Tag,
    CalendarDays,
    Hash,
    DollarSign,
    X,
    RefreshCw,
    BarChart3,
    Activity,
    Info,
} from "lucide-react";
import { fetchStockQuotes, type StockQuote } from "@/lib/stock-api";

// ── Types ──
type TrackedSymbol = "SPYM" | "QQQM" | "SCHD";
type CalcMetric = "netInvested" | "gainLoss" | "return";

interface Transaction {
    id: string;
    symbol: TrackedSymbol;
    type: "buy" | "sell";
    date: string;
    shares: number;
    price: number;
}

interface CalcDetail {
    symbol: TrackedSymbol;
    metric: CalcMetric;
}

interface HoveredCalc {
    symbol: TrackedSymbol;
    metric: CalcMetric;
    rect: DOMRect;
}

const TRACKED_SYMBOLS: TrackedSymbol[] = ["SPYM", "QQQM", "SCHD"];

const SYMBOL_META: Record<TrackedSymbol, { name: string; color: string }> = {
    SPYM: { name: "SPDR Portfolio S&P 500 ETF", color: "#10b981" },
    QQQM: { name: "Invesco NASDAQ 100 ETF", color: "#8b5cf6" },
    SCHD: { name: "Schwab US Dividend Equity", color: "#06b6d4" },
};

// ── Helpers ──
function formatCurrency(n: number): string {
    return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatPercent(n: number): string {
    return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

// ── API helpers ──
async function apiGetTransactions(): Promise<Transaction[]> {
    const res = await fetch("/api/portfolio");
    if (!res.ok) throw new Error("Failed to load transactions");
    return res.json();
}

async function apiAddTransaction(txn: Omit<Transaction, "id">): Promise<Transaction> {
    const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(txn),
    });
    if (!res.ok) throw new Error("Failed to add transaction");
    return res.json();
}

async function apiDeleteTransaction(id: string): Promise<void> {
    const res = await fetch(`/api/portfolio?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete transaction");
}

// ── Component ──
export default function StocksTracker() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [txnLoading, setTxnLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filterSymbol, setFilterSymbol] = useState<string>("ALL");
    const [saving, setSaving] = useState(false);

    // Real-time quotes
    const [quotes, setQuotes] = useState<StockQuote[]>([]);
    const [quotesLoading, setQuotesLoading] = useState(true);
    const [quotesError, setQuotesError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string>("");

    // calc detail modal
    const [calcDetail, setCalcDetail] = useState<CalcDetail | null>(null);

    // hover tooltip (fixed position, rendered at root)
    const [hoveredCalc, setHoveredCalc] = useState<HoveredCalc | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleCalcHover = useCallback((e: React.MouseEvent<HTMLTableCellElement>, symbol: TrackedSymbol, metric: CalcMetric) => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        const rect = e.currentTarget.getBoundingClientRect();
        setHoveredCalc({ symbol, metric, rect });
    }, []);

    const handleCalcLeave = useCallback(() => {
        hoverTimeoutRef.current = setTimeout(() => setHoveredCalc(null), 100);
    }, []);

    // form state
    const [formSymbol, setFormSymbol] = useState<TrackedSymbol>("SPYM");
    const [formType, setFormType] = useState<"buy" | "sell">("buy");
    const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [formShares, setFormShares] = useState("");
    const [formPrice, setFormPrice] = useState("");

    // load transactions from server
    const loadTransactions = useCallback(async () => {
        setTxnLoading(true);
        try {
            const data = await apiGetTransactions();
            setTransactions(data);
        } catch (e) {
            console.error("Failed to load transactions:", e);
        } finally {
            setTxnLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTransactions();
    }, [loadTransactions]);

    // fetch real-time quotes
    const loadQuotes = useCallback(async () => {
        setQuotesLoading(true);
        setQuotesError(null);
        try {
            const data = await fetchStockQuotes();
            setQuotes(data);
            setLastUpdated(new Date().toLocaleTimeString());
        } catch {
            setQuotesError("Failed to load real-time prices");
        } finally {
            setQuotesLoading(false);
        }
    }, []);

    useEffect(() => {
        loadQuotes();
        const timer = setInterval(loadQuotes, 60_000);
        return () => clearInterval(timer);
    }, [loadQuotes]);

    // add transaction
    const handleAdd = async () => {
        const shares = parseFloat(formShares);
        const price = parseFloat(formPrice);
        if (!shares || shares <= 0 || !price || price <= 0) return;

        setSaving(true);
        try {
            await apiAddTransaction({
                symbol: formSymbol,
                type: formType,
                date: formDate,
                shares,
                price,
            });
            await loadTransactions();

            // reset form
            setFormShares("");
            setFormPrice("");
            setShowForm(false);
        } catch (e) {
            console.error("Failed to add transaction:", e);
            alert("Failed to save transaction. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // delete transaction
    const handleDelete = async (id: string) => {
        try {
            await apiDeleteTransaction(id);
            setTransactions((prev) => prev.filter((t) => t.id !== id));
        } catch (e) {
            console.error("Failed to delete transaction:", e);
        }
    };

    // build price lookup from quotes
    const priceMap = useMemo(() => {
        const map: Record<string, number> = {};
        quotes.forEach((q) => {
            map[q.symbol] = q.price;
        });
        return map;
    }, [quotes]);

    // filtered
    const filteredTransactions = useMemo(
        () => (filterSymbol === "ALL" ? transactions : transactions.filter((t) => t.symbol === filterSymbol)),
        [transactions, filterSymbol]
    );

    // summary per symbol — with real-time market value
    const summary = useMemo(() => {
        return TRACKED_SYMBOLS.map((sym) => {
            const symTxns = transactions.filter((t) => t.symbol === sym);
            let totalBoughtShares = 0;
            let totalCost = 0;
            let totalSoldShares = 0;
            let totalSoldRevenue = 0;

            symTxns.forEach((t) => {
                if (t.type === "buy") {
                    totalBoughtShares += t.shares;
                    totalCost += t.shares * t.price;
                } else {
                    totalSoldShares += t.shares;
                    totalSoldRevenue += t.shares * t.price;
                }
            });

            const netShares = totalBoughtShares - totalSoldShares;
            const avgCost = totalBoughtShares > 0 ? totalCost / totalBoughtShares : 0;
            const netInvested = totalCost - totalSoldRevenue;

            const currentPrice = priceMap[sym] ?? 0;
            const marketValue = netShares * currentPrice;
            const gainLoss = marketValue - netInvested;
            const gainLossPercent = netInvested !== 0 ? (gainLoss / netInvested) * 100 : 0;

            return {
                symbol: sym,
                name: SYMBOL_META[sym].name,
                color: SYMBOL_META[sym].color,
                totalBoughtShares,
                totalCost,
                totalSoldShares,
                totalSoldRevenue,
                netShares,
                avgCost,
                netInvested,
                currentPrice,
                marketValue,
                gainLoss,
                gainLossPercent,
                transactionCount: symTxns.length,
            };
        });
    }, [transactions, priceMap]);

    // totals
    const totals = useMemo(() => {
        const totalInvested = summary.reduce((s, item) => s + item.netInvested, 0);
        const totalMarketValue = summary.reduce((s, item) => s + item.marketValue, 0);
        const totalGainLoss = totalMarketValue - totalInvested;
        const totalGainLossPercent = totalInvested !== 0 ? (totalGainLoss / totalInvested) * 100 : 0;
        return { totalInvested, totalMarketValue, totalGainLoss, totalGainLossPercent };
    }, [summary]);

    const hasQuotes = quotes.length > 0;

    return (
        <>
            {/* ── Total Overview Cards ── */}
            <div className="metric-grid animate-fade-in">
                <div className="metric-card">
                    <div className="metric-icon emerald">
                        <DollarSign size={22} />
                    </div>
                    <div className="metric-info">
                        <div className="metric-label">Net Invested</div>
                        <div className="metric-value">{formatCurrency(totals.totalInvested)}</div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon cyan">
                        <Activity size={22} />
                    </div>
                    <div className="metric-info">
                        <div className="metric-label">Market Value</div>
                        <div className="metric-value">
                            {hasQuotes ? formatCurrency(totals.totalMarketValue) : "—"}
                        </div>
                        {quotesLoading && (
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                                <RefreshCw size={11} className="spinning" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                                Loading...
                            </div>
                        )}
                    </div>
                </div>

                <div className="metric-card">
                    <div className={`metric-icon ${totals.totalGainLoss >= 0 ? "emerald" : "red"}`}>
                        {totals.totalGainLoss >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                    </div>
                    <div className="metric-info">
                        <div className="metric-label">Total Gain / Loss</div>
                        <div className="metric-value">
                            {hasQuotes ? (
                                <span style={{ color: totals.totalGainLoss >= 0 ? "var(--accent-emerald)" : "var(--accent-red)" }}>
                                    {totals.totalGainLoss >= 0 ? "+" : ""}{formatCurrency(totals.totalGainLoss)}
                                </span>
                            ) : "—"}
                        </div>
                        {hasQuotes && totals.totalInvested !== 0 && (
                            <div className={`metric-change ${totals.totalGainLossPercent >= 0 ? "positive" : "negative"}`}>
                                {totals.totalGainLossPercent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {formatPercent(totals.totalGainLossPercent)}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Per-Stock Breakdown ── */}
            <div className="card animate-fade-in" style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div className="chart-title">
                        <BarChart3 size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />
                        Individual Performance
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {lastUpdated && (
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                Updated {lastUpdated}
                            </span>
                        )}
                        <button
                            className="tracker-btn"
                            onClick={loadQuotes}
                            disabled={quotesLoading}
                            style={{ padding: "6px 12px", fontSize: 12 }}
                        >
                            <RefreshCw size={14} className={quotesLoading ? "spinning" : ""} />
                            Refresh
                        </button>
                    </div>
                </div>

                {quotesError && (
                    <div style={{ padding: 12, background: "var(--accent-red-glow)", borderRadius: "var(--radius-sm)", color: "var(--accent-red)", fontSize: 13, marginBottom: 16 }}>
                        {quotesError}
                    </div>
                )}

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Symbol</th>
                            <th>Shares</th>
                            <th>Avg Cost</th>
                            <th>Current Price</th>
                            <th>Net Invested</th>
                            <th>Market Value</th>
                            <th>Gain / Loss</th>
                            <th>Return</th>
                        </tr>
                    </thead>
                    <tbody>
                        {summary.map((s) => {
                            const isPositive = s.gainLoss >= 0;
                            const hasData = s.currentPrice > 0;
                            return (
                                <tr key={s.symbol}>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <span
                                                style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: "50%",
                                                    background: s.color,
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <div>
                                                <div style={{ fontWeight: 700, color: s.color }}>{s.symbol}</div>
                                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{s.netShares}</td>
                                    <td>{s.avgCost > 0 ? formatCurrency(s.avgCost) : "—"}</td>
                                    <td style={{ fontWeight: 600 }}>
                                        {hasData ? formatCurrency(s.currentPrice) : (
                                            <span style={{ color: "var(--text-muted)" }}>—</span>
                                        )}
                                    </td>
                                    <td
                                        className="calc-cell"
                                        onClick={() => setCalcDetail({ symbol: s.symbol, metric: "netInvested" })}
                                        onMouseEnter={(e) => handleCalcHover(e, s.symbol, "netInvested")}
                                        onMouseLeave={handleCalcLeave}
                                    >
                                        {formatCurrency(s.netInvested)}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>
                                        {hasData ? formatCurrency(s.marketValue) : "—"}
                                    </td>
                                    <td
                                        className={`calc-cell ${isPositive ? "positive" : "negative"}`}
                                        onClick={() => setCalcDetail({ symbol: s.symbol, metric: "gainLoss" })}
                                        onMouseEnter={(e) => handleCalcHover(e, s.symbol, "gainLoss")}
                                        onMouseLeave={handleCalcLeave}
                                    >
                                        {hasData && s.netInvested !== 0 ? (
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                {isPositive ? "+" : ""}{formatCurrency(s.gainLoss)}
                                            </span>
                                        ) : "—"}
                                    </td>
                                    <td
                                        className={`calc-cell ${isPositive ? "positive" : "negative"}`}
                                        onClick={() => setCalcDetail({ symbol: s.symbol, metric: "return" })}
                                        onMouseEnter={(e) => handleCalcHover(e, s.symbol, "return")}
                                        onMouseLeave={handleCalcLeave}
                                    >
                                        {hasData && s.netInvested !== 0 ? (
                                            <span style={{ fontWeight: 700 }}>
                                                {formatPercent(s.gainLossPercent)}
                                            </span>
                                        ) : "—"}
                                    </td>
                                </tr>
                            );
                        })}

                        {/* Total row */}
                        <tr style={{ borderTop: "2px solid var(--border-color)" }}>
                            <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>TOTAL</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td style={{ fontWeight: 700 }}>{formatCurrency(totals.totalInvested)}</td>
                            <td style={{ fontWeight: 700 }}>
                                {hasQuotes ? formatCurrency(totals.totalMarketValue) : "—"}
                            </td>
                            <td className={totals.totalGainLoss >= 0 ? "positive" : "negative"}>
                                {hasQuotes && totals.totalInvested !== 0 ? (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
                                        {totals.totalGainLoss >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {totals.totalGainLoss >= 0 ? "+" : ""}{formatCurrency(totals.totalGainLoss)}
                                    </span>
                                ) : "—"}
                            </td>
                            <td className={totals.totalGainLossPercent >= 0 ? "positive" : "negative"}>
                                {hasQuotes && totals.totalInvested !== 0 ? (
                                    <span style={{ fontWeight: 700, fontSize: 15 }}>
                                        {formatPercent(totals.totalGainLossPercent)}
                                    </span>
                                ) : "—"}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ── Add Transaction Button ── */}
            <div className="card animate-fade-in" style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Manage Transactions</div>
                        <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                            {txnLoading ? "Loading..." : `${transactions.length} transaction${transactions.length !== 1 ? "s" : ""} recorded`}
                        </div>
                    </div>
                    <button className="tracker-btn primary" onClick={() => setShowForm(true)}>
                        <Plus size={18} />
                        Add Transaction
                    </button>
                </div>
            </div>

            {/* ── Add Transaction Form (Modal overlay) ── */}
            {showForm && (
                <div className="tracker-modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="tracker-modal animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="tracker-modal-header">
                            <h2>New Transaction</h2>
                            <button className="tracker-close-btn" onClick={() => setShowForm(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="tracker-form">
                            {/* Symbol */}
                            <div className="tracker-field">
                                <label>
                                    <Tag size={14} />
                                    Symbol
                                </label>
                                <div className="tracker-symbol-group">
                                    {TRACKED_SYMBOLS.map((sym) => (
                                        <button
                                            key={sym}
                                            className={`tracker-symbol-btn ${formSymbol === sym ? "active" : ""}`}
                                            style={formSymbol === sym ? { background: `${SYMBOL_META[sym].color}25`, borderColor: SYMBOL_META[sym].color, color: SYMBOL_META[sym].color } : {}}
                                            onClick={() => setFormSymbol(sym)}
                                        >
                                            {sym}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Buy / Sell */}
                            <div className="tracker-field">
                                <label>
                                    <ShoppingCart size={14} />
                                    Type
                                </label>
                                <div className="tracker-type-group">
                                    <button
                                        className={`tracker-type-btn ${formType === "buy" ? "buy-active" : ""}`}
                                        onClick={() => setFormType("buy")}
                                    >
                                        Buy
                                    </button>
                                    <button
                                        className={`tracker-type-btn ${formType === "sell" ? "sell-active" : ""}`}
                                        onClick={() => setFormType("sell")}
                                    >
                                        Sell
                                    </button>
                                </div>
                            </div>

                            {/* Date */}
                            <div className="tracker-field">
                                <label>
                                    <CalendarDays size={14} />
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={formDate}
                                    onChange={(e) => setFormDate(e.target.value)}
                                />
                            </div>

                            {/* Shares */}
                            <div className="tracker-field">
                                <label>
                                    <Hash size={14} />
                                    Number of Shares
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    placeholder="e.g. 10"
                                    value={formShares}
                                    onChange={(e) => setFormShares(e.target.value)}
                                />
                            </div>

                            {/* Price */}
                            <div className="tracker-field">
                                <label>
                                    <DollarSign size={14} />
                                    Price Per Share
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    placeholder="e.g. 52.50"
                                    value={formPrice}
                                    onChange={(e) => setFormPrice(e.target.value)}
                                />
                            </div>

                            {/* Total preview */}
                            {parseFloat(formShares) > 0 && parseFloat(formPrice) > 0 && (
                                <div className="tracker-total-preview">
                                    <span>Total</span>
                                    <span style={{ fontWeight: 700, fontSize: 18 }}>
                                        {formatCurrency(parseFloat(formShares) * parseFloat(formPrice))}
                                    </span>
                                </div>
                            )}

                            <button
                                className="tracker-btn primary full-width"
                                onClick={handleAdd}
                                disabled={saving}
                            >
                                {saving ? (
                                    <><RefreshCw size={18} className="spinning" /> Saving...</>
                                ) : (
                                    <><Plus size={18} /> Add {formType === "buy" ? "Buy" : "Sell"} Transaction</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Transaction History ── */}
            <div className="card animate-fade-in">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div className="chart-title">Transaction History</div>
                    <div className="chart-tabs">
                        {["ALL", ...TRACKED_SYMBOLS].map((sym) => (
                            <button
                                key={sym}
                                className={`chart-tab ${filterSymbol === sym ? "active" : ""}`}
                                onClick={() => setFilterSymbol(sym)}
                            >
                                {sym}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredTransactions.length === 0 ? (
                    <div className="tracker-empty">
                        <Wallet size={48} style={{ color: "var(--text-muted)", marginBottom: 16 }} />
                        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
                            {txnLoading ? "Loading transactions..." : "No transactions yet"}
                        </div>
                        {!txnLoading && (
                            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                                Click &quot;Add Transaction&quot; to start tracking your investments.
                            </div>
                        )}
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Symbol</th>
                                <th>Type</th>
                                <th>Shares</th>
                                <th>Price</th>
                                <th>Total</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map((t) => (
                                <tr key={t.id}>
                                    <td style={{ color: "var(--text-secondary)" }}>{formatDate(t.date)}</td>
                                    <td>
                                        <span
                                            className="badge"
                                            style={{
                                                background: `${SYMBOL_META[t.symbol].color}20`,
                                                color: SYMBOL_META[t.symbol].color,
                                            }}
                                        >
                                            {t.symbol}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${t.type === "buy" ? "green" : "red"}`}>
                                            {t.type === "buy" ? (
                                                <><TrendingUp size={12} /> Buy</>
                                            ) : (
                                                <><TrendingDown size={12} /> Sell</>
                                            )}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{t.shares}</td>
                                    <td>{formatCurrency(t.price)}</td>
                                    <td style={{ fontWeight: 600 }}>{formatCurrency(t.shares * t.price)}</td>
                                    <td>
                                        <button
                                            className="tracker-delete-btn"
                                            onClick={() => handleDelete(t.id)}
                                            title="Delete transaction"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Calculation Detail Modal ── */}
            {calcDetail && (() => {
                const s = summary.find((item) => item.symbol === calcDetail.symbol);
                if (!s) return null;
                const isPositive = s.gainLoss >= 0;
                const metricLabels: Record<CalcMetric, string> = {
                    netInvested: "Net Invested",
                    gainLoss: "Gain / Loss",
                    return: "Return %",
                };
                return (
                    <div className="calc-detail-overlay" onClick={() => setCalcDetail(null)}>
                        <div className="calc-detail-modal animate-fade-in" onClick={(e) => e.stopPropagation()}>
                            <div className="calc-detail-header">
                                <h2>
                                    <span className="symbol-dot" style={{ background: s.color }} />
                                    {s.symbol} — {metricLabels[calcDetail.metric]}
                                </h2>
                                <button className="tracker-close-btn" onClick={() => setCalcDetail(null)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="calc-detail-body">
                                {/* ── Net Invested Detail ── */}
                                {(calcDetail.metric === "netInvested" || calcDetail.metric === "gainLoss" || calcDetail.metric === "return") && (
                                    <div className="calc-section">
                                        <div className="calc-section-title">
                                            <DollarSign size={14} />
                                            Step 1: Net Invested
                                        </div>
                                        <div className="calc-formula-box">
                                            <span className="formula-label">Formula</span>
                                            Net Invested = Total Buy Cost − Total Sell Revenue
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">Total Bought Shares</span>
                                            <span className="calc-step-value">{s.totalBoughtShares}</span>
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">Total Buy Cost (Σ shares × price)</span>
                                            <span className="calc-step-value">{formatCurrency(s.totalCost)}</span>
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">Total Sold Shares</span>
                                            <span className="calc-step-value">{s.totalSoldShares}</span>
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">Total Sell Revenue (Σ shares × price)</span>
                                            <span className="calc-step-value">{formatCurrency(s.totalSoldRevenue)}</span>
                                        </div>
                                        <div className={`calc-step ${calcDetail.metric === "netInvested" ? "highlight" : ""}`}>
                                            <span className="calc-step-label">= Net Invested</span>
                                            <span className="calc-step-value">
                                                {formatCurrency(s.totalCost)} − {formatCurrency(s.totalSoldRevenue)} = {formatCurrency(s.netInvested)}
                                            </span>
                                        </div>
                                        {calcDetail.metric === "netInvested" && (
                                            <div className="calc-explanation" style={{ marginTop: 12 }}>
                                                <strong>What this means:</strong> Net Invested represents your actual out-of-pocket money still at work. When you sell shares, the revenue reduces your net investment. If Net Invested goes negative, you&apos;ve already pulled out more cash than you put in!
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── Market Value (for gain/loss and return) ── */}
                                {(calcDetail.metric === "gainLoss" || calcDetail.metric === "return") && (
                                    <div className="calc-section">
                                        <div className="calc-section-title">
                                            <Activity size={14} />
                                            Step 2: Market Value
                                        </div>
                                        <div className="calc-formula-box">
                                            <span className="formula-label">Formula</span>
                                            Market Value = Net Shares × Current Price
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">Net Shares (bought − sold)</span>
                                            <span className="calc-step-value">{s.totalBoughtShares} − {s.totalSoldShares} = {s.netShares}</span>
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">Current Market Price</span>
                                            <span className="calc-step-value">{formatCurrency(s.currentPrice)}</span>
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">= Market Value</span>
                                            <span className="calc-step-value">
                                                {s.netShares} × {formatCurrency(s.currentPrice)} = {formatCurrency(s.marketValue)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* ── Gain/Loss Detail ── */}
                                {(calcDetail.metric === "gainLoss" || calcDetail.metric === "return") && (
                                    <div className="calc-section">
                                        <div className="calc-section-title">
                                            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                            Step 3: Gain / Loss
                                        </div>
                                        <div className="calc-formula-box">
                                            <span className="formula-label">Formula</span>
                                            Gain/Loss = Market Value − Net Invested
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">Market Value</span>
                                            <span className="calc-step-value">{formatCurrency(s.marketValue)}</span>
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">− Net Invested</span>
                                            <span className="calc-step-value">{formatCurrency(s.netInvested)}</span>
                                        </div>
                                        <div className={`calc-step ${calcDetail.metric === "gainLoss" ? "highlight" : ""}`}>
                                            <span className="calc-step-label">= Gain / Loss</span>
                                            <span className="calc-step-value" style={{ color: isPositive ? "var(--accent-emerald)" : "var(--accent-red)" }}>
                                                {isPositive ? "+" : ""}{formatCurrency(s.gainLoss)}
                                            </span>
                                        </div>
                                        {calcDetail.metric === "gainLoss" && (
                                            <div className="calc-explanation" style={{ marginTop: 12 }}>
                                                <strong>What this means:</strong> This combines both your <em>realized gains</em> (profit locked in from sells) and <em>unrealized gains</em> (profit on shares you still hold at the current price). A positive value means your investment is profitable overall.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── Return % Detail ── */}
                                {calcDetail.metric === "return" && (
                                    <div className="calc-section">
                                        <div className="calc-section-title">
                                            <Info size={14} />
                                            Step 4: Return Percentage
                                        </div>
                                        <div className="calc-formula-box">
                                            <span className="formula-label">Formula</span>
                                            Return % = (Gain/Loss ÷ Net Invested) × 100
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">Gain / Loss</span>
                                            <span className="calc-step-value" style={{ color: isPositive ? "var(--accent-emerald)" : "var(--accent-red)" }}>
                                                {isPositive ? "+" : ""}{formatCurrency(s.gainLoss)}
                                            </span>
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">÷ Net Invested</span>
                                            <span className="calc-step-value">{formatCurrency(s.netInvested)}</span>
                                        </div>
                                        <div className="calc-step highlight">
                                            <span className="calc-step-label">= Return %</span>
                                            <span className="calc-step-value" style={{ color: isPositive ? "var(--accent-emerald)" : "var(--accent-red)" }}>
                                                {formatPercent(s.gainLossPercent)}
                                            </span>
                                        </div>
                                        <div className="calc-explanation" style={{ marginTop: 12 }}>
                                            <strong>What this means:</strong> Return % tells you the percentage return on your net out-of-pocket investment. For example, +50% means that for every $1 of net money you have invested, you&apos;ve gained $0.50 in value. This metric accounts for both realized and unrealized gains relative to your actual cash deployed.
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── Fixed-position Hover Tooltip ── */}
            {hoveredCalc && (() => {
                const s = summary.find((item) => item.symbol === hoveredCalc.symbol);
                if (!s) return null;
                const isPositive = s.gainLoss >= 0;
                const { rect } = hoveredCalc;
                // Position above the cell, centered horizontally
                const tooltipWidth = 280;
                let left = rect.left + rect.width / 2 - tooltipWidth / 2;
                // Keep tooltip within viewport
                if (left < 8) left = 8;
                if (left + tooltipWidth > window.innerWidth - 8) left = window.innerWidth - tooltipWidth - 8;
                const top = rect.top - 8; // small gap above

                return (
                    <div
                        className="calc-tooltip-fixed"
                        style={{
                            position: "fixed",
                            left,
                            top,
                            transform: "translateY(-100%)",
                            width: tooltipWidth,
                            zIndex: 9999,
                        }}
                        onMouseEnter={() => {
                            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                        }}
                        onMouseLeave={handleCalcLeave}
                    >
                        {hoveredCalc.metric === "netInvested" && (
                            <>
                                <div className="calc-tooltip-title">Net Invested</div>
                                <div className="calc-tooltip-row">
                                    <span>Total Buy Cost</span>
                                    <span>{formatCurrency(s.totalCost)}</span>
                                </div>
                                <div className="calc-tooltip-row">
                                    <span>− Sell Revenue</span>
                                    <span>{formatCurrency(s.totalSoldRevenue)}</span>
                                </div>
                                <div className="calc-tooltip-row result">
                                    <span>= Net Invested</span>
                                    <span>{formatCurrency(s.netInvested)}</span>
                                </div>
                            </>
                        )}
                        {hoveredCalc.metric === "gainLoss" && (
                            <>
                                <div className="calc-tooltip-title">Gain / Loss</div>
                                <div className="calc-tooltip-row">
                                    <span>Market Value</span>
                                    <span>{formatCurrency(s.marketValue)}</span>
                                </div>
                                <div className="calc-tooltip-row">
                                    <span>− Net Invested</span>
                                    <span>{formatCurrency(s.netInvested)}</span>
                                </div>
                                <div className="calc-tooltip-row result">
                                    <span>= Gain/Loss</span>
                                    <span style={{ color: isPositive ? "var(--accent-emerald)" : "var(--accent-red)" }}>
                                        {isPositive ? "+" : ""}{formatCurrency(s.gainLoss)}
                                    </span>
                                </div>
                            </>
                        )}
                        {hoveredCalc.metric === "return" && (
                            <>
                                <div className="calc-tooltip-title">Return %</div>
                                <div className="calc-tooltip-row">
                                    <span>Gain/Loss</span>
                                    <span>{isPositive ? "+" : ""}{formatCurrency(s.gainLoss)}</span>
                                </div>
                                <div className="calc-tooltip-row">
                                    <span>÷ Net Invested</span>
                                    <span>{formatCurrency(s.netInvested)}</span>
                                </div>
                                <div className="calc-tooltip-row result">
                                    <span>= Return</span>
                                    <span style={{ color: isPositive ? "var(--accent-emerald)" : "var(--accent-red)" }}>
                                        {formatPercent(s.gainLossPercent)}
                                    </span>
                                </div>
                            </>
                        )}
                        <div className="calc-tooltip-hint">Click for full breakdown</div>
                    </div>
                );
            })()}
        </>
    );
}
