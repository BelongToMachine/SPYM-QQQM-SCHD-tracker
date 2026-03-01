"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    Plus,
    Trash2,
    Tag,
    CalendarDays,
    Hash,
    DollarSign,
    X,
    RefreshCw,
    BarChart3,
    Activity,
    Info,
    ArrowRightLeft,
} from "lucide-react";
import {
    TRACKED_CURRENCIES,
    fetchLatestRates,
    type TrackedCurrencyCode,
} from "@/lib/currency-api";

// ── Types ──
type TrackedCurrency = TrackedCurrencyCode;

type CalcMetric = "netInvested" | "gainLoss" | "return";

interface MoneyTransaction {
    id: string;
    currency: TrackedCurrency;
    type: "deposit" | "withdraw";
    date: string;
    amount: number;
    exchangeRate: number; // anchor per foreign at time of transaction
}

interface MoneyData {
    anchorCurrency: TrackedCurrency;
    transactions: MoneyTransaction[];
}

interface CalcDetail {
    currency: TrackedCurrency;
    metric: CalcMetric;
}

interface HoveredCalc {
    currency: TrackedCurrency;
    metric: CalcMetric;
    rect: DOMRect;
}

const CURRENCY_META: Record<TrackedCurrency, { name: string; color: string }> = {
    CNY: { name: "Chinese Yuan", color: "#ef4444" },
    USD: { name: "US Dollar", color: "#10b981" },
    HKD: { name: "Hong Kong Dollar", color: "#8b5cf6" },
    TRY: { name: "Turkish Lira", color: "#06b6d4" },
};


// ── Helpers ──
function formatAnchorCurrency(n: number, anchor: TrackedCurrency): string {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: anchor,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n);
}

function formatAmount(n: number): string {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatPercent(n: number): string {
    return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

function formatRate(n: number): string {
    return n.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

// ── API helpers ──
async function apiGetMoney(): Promise<MoneyData> {
    const res = await fetch("/api/money");
    if (!res.ok) throw new Error("Failed to load money data");
    return res.json();
}

async function apiAddTransaction(txn: Omit<MoneyTransaction, "id">): Promise<MoneyTransaction> {
    const res = await fetch("/api/money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(txn),
    });
    if (!res.ok) throw new Error("Failed to add transaction");
    return res.json();
}

async function apiDeleteTransaction(id: string): Promise<void> {
    const res = await fetch(`/api/money?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete transaction");
}

async function apiSetAnchor(anchorCurrency: TrackedCurrency): Promise<MoneyData> {
    const res = await fetch("/api/money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setAnchor", anchorCurrency }),
    });
    if (!res.ok) throw new Error("Failed to update anchor currency");
    return res.json();
}

// ── Component ──
export default function MoneyTracker() {
    const [transactions, setTransactions] = useState<MoneyTransaction[]>([]);
    const [txnLoading, setTxnLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filterCurrency, setFilterCurrency] = useState<string>("ALL");
    const [saving, setSaving] = useState(false);

    const [anchorCurrency, setAnchorCurrency] = useState<TrackedCurrency>("USD");
    const [anchorSaving, setAnchorSaving] = useState(false);

    // Real-time rates (base = anchor)
    const [rates, setRates] = useState<Record<string, number>>({});
    const [ratesLoading, setRatesLoading] = useState(true);
    const [ratesError, setRatesError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string>("");

    // calc detail modal
    const [calcDetail, setCalcDetail] = useState<CalcDetail | null>(null);

    // hover tooltip
    const [hoveredCalc, setHoveredCalc] = useState<HoveredCalc | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleCalcHover = useCallback((e: React.MouseEvent<HTMLTableCellElement>, currency: TrackedCurrency, metric: CalcMetric) => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        const rect = e.currentTarget.getBoundingClientRect();
        setHoveredCalc({ currency, metric, rect });
    }, []);

    const handleCalcLeave = useCallback(() => {
        hoverTimeoutRef.current = setTimeout(() => setHoveredCalc(null), 100);
    }, []);

    // form state
    const [formCurrency, setFormCurrency] = useState<TrackedCurrency>("USD");
    const [formType, setFormType] = useState<"deposit" | "withdraw">("deposit");
    const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [formAmount, setFormAmount] = useState("");
    const [formExchangeRate, setFormExchangeRate] = useState("");

    // load money data from server
    const loadMoney = useCallback(async () => {
        setTxnLoading(true);
        try {
            const data = await apiGetMoney();
            setTransactions(data.transactions);
            setAnchorCurrency(data.anchorCurrency);
        } catch (e) {
            console.error("Failed to load money data:", e);
        } finally {
            setTxnLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMoney();
    }, [loadMoney]);

    // fetch real-time rates
    const loadRates = useCallback(async (base: TrackedCurrency) => {
        setRatesLoading(true);
        setRatesError(null);
        try {
            const data = await fetchLatestRates(base);
            setRates(data.rates);
            setLastUpdated(new Date().toLocaleTimeString());
        } catch {
            setRatesError("Failed to load live exchange rates");
        } finally {
            setRatesLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRates(anchorCurrency);
        const timer = setInterval(() => loadRates(anchorCurrency), 60_000);
        return () => clearInterval(timer);
    }, [anchorCurrency, loadRates]);

    // set default exchange rate in form when currency or anchor changes
    useEffect(() => {
        if (formCurrency === anchorCurrency) {
            setFormExchangeRate("1");
            return;
        }
        const rate = rates[formCurrency];
        if (rate) {
            setFormExchangeRate((1 / rate).toFixed(6));
        }
    }, [formCurrency, anchorCurrency, rates]);

    const handleAnchorChange = async (currency: TrackedCurrency) => {
        if (currency === anchorCurrency) return;
        setAnchorSaving(true);
        setAnchorCurrency(currency);
        try {
            await apiSetAnchor(currency);
        } catch (e) {
            console.error("Failed to update anchor currency:", e);
        } finally {
            setAnchorSaving(false);
        }
    };

    const handleAdd = async () => {
        const amount = parseFloat(formAmount);
        const exchangeRate = parseFloat(formExchangeRate);
        if (!amount || amount <= 0 || !exchangeRate || exchangeRate <= 0) return;

        setSaving(true);
        try {
            await apiAddTransaction({
                currency: formCurrency,
                type: formType,
                date: formDate,
                amount,
                exchangeRate,
            });
            await loadMoney();

            setFormAmount("");
            setShowForm(false);
        } catch (e) {
            console.error("Failed to add transaction:", e);
            alert("Failed to save transaction. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await apiDeleteTransaction(id);
            setTransactions((prev) => prev.filter((t) => t.id !== id));
        } catch (e) {
            console.error("Failed to delete transaction:", e);
        }
    };

    const filteredTransactions = useMemo(
        () => (filterCurrency === "ALL" ? transactions : transactions.filter((t) => t.currency === filterCurrency)),
        [transactions, filterCurrency]
    );

    const getCurrentRate = useCallback(
        (currency: TrackedCurrency) => {
            if (currency === anchorCurrency) return 1;
            const rate = rates[currency];
            if (!rate) return 0;
            return 1 / rate;
        },
        [rates, anchorCurrency]
    );

    const summary = useMemo(() => {
        return TRACKED_CURRENCIES.map((c) => c.code).map((code) => {
            const currency = code as TrackedCurrency;
            const currTxns = transactions.filter((t) => t.currency === currency);
            let totalDepositAmount = 0;
            let totalDepositCost = 0;
            let totalWithdrawAmount = 0;
            let totalWithdrawRevenue = 0;

            currTxns.forEach((t) => {
                if (t.type === "deposit") {
                    totalDepositAmount += t.amount;
                    totalDepositCost += t.amount * t.exchangeRate;
                } else {
                    totalWithdrawAmount += t.amount;
                    totalWithdrawRevenue += t.amount * t.exchangeRate;
                }
            });

            const netAmount = totalDepositAmount - totalWithdrawAmount;
            const avgCost = totalDepositAmount > 0 ? totalDepositCost / totalDepositAmount : 0;
            const netInvested = totalDepositCost - totalWithdrawRevenue;

            const currentRate = getCurrentRate(currency);
            const marketValue = currentRate ? netAmount * currentRate : 0;
            const gainLoss = marketValue - netInvested;
            const gainLossPercent = netInvested !== 0 ? (gainLoss / netInvested) * 100 : 0;

            return {
                currency,
                name: CURRENCY_META[currency].name,
                color: CURRENCY_META[currency].color,
                totalDepositAmount,
                totalDepositCost,
                totalWithdrawAmount,
                totalWithdrawRevenue,
                netAmount,
                avgCost,
                netInvested,
                currentRate,
                marketValue,
                gainLoss,
                gainLossPercent,
                transactionCount: currTxns.length,
            };
        });
    }, [transactions, getCurrentRate]);

    const totals = useMemo(() => {
        const totalInvested = summary.reduce((s, item) => s + item.netInvested, 0);
        const totalMarketValue = summary.reduce((s, item) => s + item.marketValue, 0);
        const totalGainLoss = totalMarketValue - totalInvested;
        const totalGainLossPercent = totalInvested !== 0 ? (totalGainLoss / totalInvested) * 100 : 0;
        return { totalInvested, totalMarketValue, totalGainLoss, totalGainLossPercent };
    }, [summary]);

    const hasRates = Object.keys(rates).length > 0;

    return (
        <>
            {/* ── Anchor Currency Selector ── */}
            <div className="card animate-fade-in" style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Anchor Currency</div>
                        <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                            All values and performance are measured in the selected anchor.
                        </div>
                    </div>
                    <div className="chart-tabs" style={{ margin: 0 }}>
                        {TRACKED_CURRENCIES.map((c) => (
                            <button
                                key={c.code}
                                className={`chart-tab ${anchorCurrency === c.code ? "active" : ""}`}
                                onClick={() => handleAnchorChange(c.code as TrackedCurrency)}
                                disabled={anchorSaving}
                            >
                                {c.flag} {c.code}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Total Overview Cards ── */}
            <div className="metric-grid animate-fade-in">
                <div className="metric-card">
                    <div className="metric-icon emerald">
                        <DollarSign size={22} />
                    </div>
                    <div className="metric-info">
                        <div className="metric-label">Net Deposited</div>
                        <div className="metric-value">{formatAnchorCurrency(totals.totalInvested, anchorCurrency)}</div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon cyan">
                        <Activity size={22} />
                    </div>
                    <div className="metric-info">
                        <div className="metric-label">Current Value</div>
                        <div className="metric-value">
                            {hasRates ? formatAnchorCurrency(totals.totalMarketValue, anchorCurrency) : "--"}
                        </div>
                        {ratesLoading && (
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
                            {hasRates ? (
                                <span style={{ color: totals.totalGainLoss >= 0 ? "var(--accent-emerald)" : "var(--accent-red)" }}>
                                    {totals.totalGainLoss >= 0 ? "+" : ""}{formatAnchorCurrency(totals.totalGainLoss, anchorCurrency)}
                                </span>
                            ) : "--"}
                        </div>
                        {hasRates && totals.totalInvested !== 0 && (
                            <div className={`metric-change ${totals.totalGainLossPercent >= 0 ? "positive" : "negative"}`}>
                                {totals.totalGainLossPercent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {formatPercent(totals.totalGainLossPercent)}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Per-Currency Breakdown ── */}
            <div className="card animate-fade-in" style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div className="chart-title">
                        <BarChart3 size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />
                        Currency Holdings
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {lastUpdated && (
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                Updated {lastUpdated}
                            </span>
                        )}
                        <button
                            className="tracker-btn"
                            onClick={() => loadRates(anchorCurrency)}
                            disabled={ratesLoading}
                            style={{ padding: "6px 12px", fontSize: 12 }}
                        >
                            <RefreshCw size={14} className={ratesLoading ? "spinning" : ""} />
                            Refresh
                        </button>
                    </div>
                </div>

                {ratesError && (
                    <div style={{ padding: 12, background: "var(--accent-red-glow)", borderRadius: "var(--radius-sm)", color: "var(--accent-red)", fontSize: 13, marginBottom: 16 }}>
                        {ratesError}
                    </div>
                )}

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Currency</th>
                            <th>Amount</th>
                            <th>Avg Cost</th>
                            <th>Current Rate</th>
                            <th>Net Deposited</th>
                            <th>Current Value</th>
                            <th>Gain / Loss</th>
                            <th>Return</th>
                        </tr>
                    </thead>
                    <tbody>
                        {summary.map((s) => {
                            const isPositive = s.gainLoss >= 0;
                            const hasData = s.currency === anchorCurrency || s.currentRate > 0;
                            return (
                                <tr key={s.currency}>
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
                                                <div style={{ fontWeight: 700, color: s.color }}>
                                                    {s.currency} {s.currency === anchorCurrency ? "(Anchor)" : ""}
                                                </div>
                                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{formatAmount(s.netAmount)}</td>
                                    <td>{s.avgCost > 0 ? formatAnchorCurrency(s.avgCost, anchorCurrency) : "--"}</td>
                                    <td style={{ fontWeight: 600 }}>
                                        {hasData ? (
                                            <span>
                                                1 {s.currency} = {formatRate(s.currentRate)} {anchorCurrency}
                                            </span>
                                        ) : (
                                            <span style={{ color: "var(--text-muted)" }}>--</span>
                                        )}
                                    </td>
                                    <td
                                        className="calc-cell"
                                        onClick={() => setCalcDetail({ currency: s.currency, metric: "netInvested" })}
                                        onMouseEnter={(e) => handleCalcHover(e, s.currency, "netInvested")}
                                        onMouseLeave={handleCalcLeave}
                                    >
                                        {formatAnchorCurrency(s.netInvested, anchorCurrency)}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>
                                        {hasData ? formatAnchorCurrency(s.marketValue, anchorCurrency) : "--"}
                                    </td>
                                    <td
                                        className={`calc-cell ${isPositive ? "positive" : "negative"}`}
                                        onClick={() => setCalcDetail({ currency: s.currency, metric: "gainLoss" })}
                                        onMouseEnter={(e) => handleCalcHover(e, s.currency, "gainLoss")}
                                        onMouseLeave={handleCalcLeave}
                                    >
                                        {hasData && s.netInvested !== 0 ? (
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                {isPositive ? "+" : ""}{formatAnchorCurrency(s.gainLoss, anchorCurrency)}
                                            </span>
                                        ) : "--"}
                                    </td>
                                    <td
                                        className={`calc-cell ${isPositive ? "positive" : "negative"}`}
                                        onClick={() => setCalcDetail({ currency: s.currency, metric: "return" })}
                                        onMouseEnter={(e) => handleCalcHover(e, s.currency, "return")}
                                        onMouseLeave={handleCalcLeave}
                                    >
                                        {hasData && s.netInvested !== 0 ? (
                                            <span style={{ fontWeight: 700 }}>
                                                {formatPercent(s.gainLossPercent)}
                                            </span>
                                        ) : "--"}
                                    </td>
                                </tr>
                            );
                        })}

                        <tr style={{ borderTop: "2px solid var(--border-color)" }}>
                            <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>TOTAL</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td style={{ fontWeight: 700 }}>{formatAnchorCurrency(totals.totalInvested, anchorCurrency)}</td>
                            <td style={{ fontWeight: 700 }}>
                                {hasRates ? formatAnchorCurrency(totals.totalMarketValue, anchorCurrency) : "--"}
                            </td>
                            <td className={totals.totalGainLoss >= 0 ? "positive" : "negative"}>
                                {hasRates && totals.totalInvested !== 0 ? (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
                                        {totals.totalGainLoss >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {totals.totalGainLoss >= 0 ? "+" : ""}{formatAnchorCurrency(totals.totalGainLoss, anchorCurrency)}
                                    </span>
                                ) : "--"}
                            </td>
                            <td className={totals.totalGainLossPercent >= 0 ? "positive" : "negative"}>
                                {hasRates && totals.totalInvested !== 0 ? (
                                    <span style={{ fontWeight: 700, fontSize: 15 }}>
                                        {formatPercent(totals.totalGainLossPercent)}
                                    </span>
                                ) : "--"}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ── Manage Transactions ── */}
            <div className="card animate-fade-in" style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Manage Deposits</div>
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

            {/* ── Add Transaction Form ── */}
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
                            <div className="tracker-field">
                                <label>
                                    <Tag size={14} />
                                    Currency
                                </label>
                                <div className="tracker-symbol-group">
                                    {TRACKED_CURRENCIES.map((c) => (
                                        <button
                                            key={c.code}
                                            className={`tracker-symbol-btn ${formCurrency === c.code ? "active" : ""}`}
                                            style={formCurrency === c.code ? { background: `${CURRENCY_META[c.code].color}25`, borderColor: CURRENCY_META[c.code].color, color: CURRENCY_META[c.code].color } : {}}
                                            onClick={() => setFormCurrency(c.code as TrackedCurrency)}
                                        >
                                            {c.code}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="tracker-field">
                                <label>
                                    <ArrowRightLeft size={14} />
                                    Type
                                </label>
                                <div className="tracker-type-group">
                                    <button
                                        className={`tracker-type-btn ${formType === "deposit" ? "buy-active" : ""}`}
                                        onClick={() => setFormType("deposit")}
                                    >
                                        Deposit
                                    </button>
                                    <button
                                        className={`tracker-type-btn ${formType === "withdraw" ? "sell-active" : ""}`}
                                        onClick={() => setFormType("withdraw")}
                                    >
                                        Withdraw
                                    </button>
                                </div>
                            </div>

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

                            <div className="tracker-field">
                                <label>
                                    <Hash size={14} />
                                    Amount ({formCurrency})
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    placeholder="e.g. 10,000"
                                    value={formAmount}
                                    onChange={(e) => setFormAmount(e.target.value)}
                                />
                            </div>

                            <div className="tracker-field">
                                <label>
                                    <DollarSign size={14} />
                                    Exchange Rate ({anchorCurrency} per {formCurrency})
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    placeholder="e.g. 0.14"
                                    value={formExchangeRate}
                                    onChange={(e) => setFormExchangeRate(e.target.value)}
                                    disabled={formCurrency === anchorCurrency}
                                />
                            </div>

                            {parseFloat(formAmount) > 0 && parseFloat(formExchangeRate) > 0 && (
                                <div className="tracker-total-preview">
                                    <span>Anchor Value</span>
                                    <span style={{ fontWeight: 700, fontSize: 18 }}>
                                        {formatAnchorCurrency(parseFloat(formAmount) * parseFloat(formExchangeRate), anchorCurrency)}
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
                                    <><Plus size={18} /> Add {formType === "deposit" ? "Deposit" : "Withdrawal"}</>
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
                        {["ALL", ...TRACKED_CURRENCIES.map((c) => c.code)].map((code) => (
                            <button
                                key={code}
                                className={`chart-tab ${filterCurrency === code ? "active" : ""}`}
                                onClick={() => setFilterCurrency(code)}
                            >
                                {code}
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
                                Click &quot;Add Transaction&quot; to start tracking your cash holdings.
                            </div>
                        )}
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Currency</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Rate</th>
                                <th>Total ({anchorCurrency})</th>
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
                                                background: `${CURRENCY_META[t.currency].color}20`,
                                                color: CURRENCY_META[t.currency].color,
                                            }}
                                        >
                                            {t.currency}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${t.type === "deposit" ? "green" : "red"}`}>
                                            {t.type === "deposit" ? (
                                                <><TrendingUp size={12} /> Deposit</>
                                            ) : (
                                                <><TrendingDown size={12} /> Withdraw</>
                                            )}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{formatAmount(t.amount)} {t.currency}</td>
                                    <td>{formatRate(t.exchangeRate)}</td>
                                    <td style={{ fontWeight: 600 }}>{formatAnchorCurrency(t.amount * t.exchangeRate, anchorCurrency)}</td>
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
                const s = summary.find((item) => item.currency === calcDetail.currency);
                if (!s) return null;
                const isPositive = s.gainLoss >= 0;
                const metricLabels: Record<CalcMetric, string> = {
                    netInvested: "Net Deposited",
                    gainLoss: "Gain / Loss",
                    return: "Return %",
                };
                return (
                    <div className="calc-detail-overlay" onClick={() => setCalcDetail(null)}>
                        <div className="calc-detail-modal animate-fade-in" onClick={(e) => e.stopPropagation()}>
                            <div className="calc-detail-header">
                                <h2>
                                    <span className="symbol-dot" style={{ background: s.color }} />
                                    {s.currency} - {metricLabels[calcDetail.metric]}
                                </h2>
                                <button className="tracker-close-btn" onClick={() => setCalcDetail(null)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="calc-detail-body">
                                {(calcDetail.metric === "netInvested" || calcDetail.metric === "gainLoss" || calcDetail.metric === "return") && (
                                    <div className="calc-section">
                                        <div className="calc-section-title">
                                            <DollarSign size={14} />
                                            Step 1: Net Deposited
                                        </div>
                                        <div className="calc-formula-box">
                                            <span className="formula-label">Formula</span>
                                            Net Deposited = Total Deposit Cost − Total Withdraw Revenue
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">Total Deposited Amount</span>
                                            <span className="calc-step-value">{formatAmount(s.totalDepositAmount)} {s.currency}</span>
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">Total Deposit Cost (Σ amount × rate)</span>
                                            <span className="calc-step-value">{formatAnchorCurrency(s.totalDepositCost, anchorCurrency)}</span>
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">Total Withdraw Amount</span>
                                            <span className="calc-step-value">{formatAmount(s.totalWithdrawAmount)} {s.currency}</span>
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">Total Withdraw Revenue (Σ amount × rate)</span>
                                            <span className="calc-step-value">{formatAnchorCurrency(s.totalWithdrawRevenue, anchorCurrency)}</span>
                                        </div>
                                        <div className={`calc-step ${calcDetail.metric === "netInvested" ? "highlight" : ""}`}>
                                            <span className="calc-step-label">= Net Deposited</span>
                                            <span className="calc-step-value">
                                                {formatAnchorCurrency(s.totalDepositCost, anchorCurrency)} − {formatAnchorCurrency(s.totalWithdrawRevenue, anchorCurrency)} = {formatAnchorCurrency(s.netInvested, anchorCurrency)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {(calcDetail.metric === "gainLoss" || calcDetail.metric === "return") && (
                                    <div className="calc-section">
                                        <div className="calc-section-title">
                                            <Activity size={14} />
                                            Step 2: Current Value
                                        </div>
                                        <div className="calc-formula-box">
                                            <span className="formula-label">Formula</span>
                                            Current Value = Net Amount × Current Rate
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">Net Amount (deposited − withdrawn)</span>
                                            <span className="calc-step-value">{formatAmount(s.totalDepositAmount)} − {formatAmount(s.totalWithdrawAmount)} = {formatAmount(s.netAmount)} {s.currency}</span>
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">Current Rate</span>
                                            <span className="calc-step-value">1 {s.currency} = {formatRate(s.currentRate)} {anchorCurrency}</span>
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">= Current Value</span>
                                            <span className="calc-step-value">
                                                {formatAmount(s.netAmount)} × {formatRate(s.currentRate)} = {formatAnchorCurrency(s.marketValue, anchorCurrency)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {(calcDetail.metric === "gainLoss" || calcDetail.metric === "return") && (
                                    <div className="calc-section">
                                        <div className="calc-section-title">
                                            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                            Step 3: Gain / Loss
                                        </div>
                                        <div className="calc-formula-box">
                                            <span className="formula-label">Formula</span>
                                            Gain/Loss = Current Value − Net Deposited
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">Current Value</span>
                                            <span className="calc-step-value">{formatAnchorCurrency(s.marketValue, anchorCurrency)}</span>
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">− Net Deposited</span>
                                            <span className="calc-step-value">{formatAnchorCurrency(s.netInvested, anchorCurrency)}</span>
                                        </div>
                                        <div className={`calc-step ${calcDetail.metric === "gainLoss" ? "highlight" : ""}`}>
                                            <span className="calc-step-label">= Gain / Loss</span>
                                            <span className="calc-step-value" style={{ color: isPositive ? "var(--accent-emerald)" : "var(--accent-red)" }}>
                                                {isPositive ? "+" : ""}{formatAnchorCurrency(s.gainLoss, anchorCurrency)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {calcDetail.metric === "return" && (
                                    <div className="calc-section">
                                        <div className="calc-section-title">
                                            <Info size={14} />
                                            Step 4: Return Percentage
                                        </div>
                                        <div className="calc-formula-box">
                                            <span className="formula-label">Formula</span>
                                            Return % = (Gain/Loss ÷ Net Deposited) × 100
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">Gain / Loss</span>
                                            <span className="calc-step-value" style={{ color: isPositive ? "var(--accent-emerald)" : "var(--accent-red)" }}>
                                                {isPositive ? "+" : ""}{formatAnchorCurrency(s.gainLoss, anchorCurrency)}
                                            </span>
                                        </div>
                                        <div className="calc-step">
                                            <span className="calc-step-label">÷ Net Deposited</span>
                                            <span className="calc-step-value">{formatAnchorCurrency(s.netInvested, anchorCurrency)}</span>
                                        </div>
                                        <div className="calc-step highlight">
                                            <span className="calc-step-label">= Return %</span>
                                            <span className="calc-step-value" style={{ color: isPositive ? "var(--accent-emerald)" : "var(--accent-red)" }}>
                                                {formatPercent(s.gainLossPercent)}
                                            </span>
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
                const s = summary.find((item) => item.currency === hoveredCalc.currency);
                if (!s) return null;
                const isPositive = s.gainLoss >= 0;
                const { rect } = hoveredCalc;
                const tooltipWidth = 280;
                let left = rect.left + rect.width / 2 - tooltipWidth / 2;
                if (left < 8) left = 8;
                if (left + tooltipWidth > window.innerWidth - 8) left = window.innerWidth - tooltipWidth - 8;
                const top = rect.top - 8;

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
                                <div className="calc-tooltip-title">Net Deposited</div>
                                <div className="calc-tooltip-row">
                                    <span>Total Deposit Cost</span>
                                    <span>{formatAnchorCurrency(s.totalDepositCost, anchorCurrency)}</span>
                                </div>
                                <div className="calc-tooltip-row">
                                    <span>− Withdraw Revenue</span>
                                    <span>{formatAnchorCurrency(s.totalWithdrawRevenue, anchorCurrency)}</span>
                                </div>
                                <div className="calc-tooltip-row result">
                                    <span>= Net Deposited</span>
                                    <span>{formatAnchorCurrency(s.netInvested, anchorCurrency)}</span>
                                </div>
                            </>
                        )}
                        {hoveredCalc.metric === "gainLoss" && (
                            <>
                                <div className="calc-tooltip-title">Gain / Loss</div>
                                <div className="calc-tooltip-row">
                                    <span>Current Value</span>
                                    <span>{formatAnchorCurrency(s.marketValue, anchorCurrency)}</span>
                                </div>
                                <div className="calc-tooltip-row">
                                    <span>− Net Deposited</span>
                                    <span>{formatAnchorCurrency(s.netInvested, anchorCurrency)}</span>
                                </div>
                                <div className="calc-tooltip-row result">
                                    <span>= Gain/Loss</span>
                                    <span style={{ color: isPositive ? "var(--accent-emerald)" : "var(--accent-red)" }}>
                                        {isPositive ? "+" : ""}{formatAnchorCurrency(s.gainLoss, anchorCurrency)}
                                    </span>
                                </div>
                            </>
                        )}
                        {hoveredCalc.metric === "return" && (
                            <>
                                <div className="calc-tooltip-title">Return %</div>
                                <div className="calc-tooltip-row">
                                    <span>Gain/Loss</span>
                                    <span>{isPositive ? "+" : ""}{formatAnchorCurrency(s.gainLoss, anchorCurrency)}</span>
                                </div>
                                <div className="calc-tooltip-row">
                                    <span>÷ Net Deposited</span>
                                    <span>{formatAnchorCurrency(s.netInvested, anchorCurrency)}</span>
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
