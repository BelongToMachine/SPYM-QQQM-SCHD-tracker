"use client";

import { useState } from "react";
import StocksTracker from "@/components/portfolio/StocksTracker";
import MoneyTracker from "@/components/portfolio/MoneyTracker";
import { Wallet, TrendingUp } from "lucide-react";

export default function PortfolioPage() {
    const [activeTab, setActiveTab] = useState<"money" | "stocks">("money");

    return (
        <>
            <div className="page-header animate-fade-in" style={{ paddingBottom: 0, borderBottom: "none" }}>
                <h1>Portfolio Tracker</h1>
                <p>Track your money deposits and stock investments.</p>
                <div className="chart-tabs" style={{ width: "fit-content", margin: "24px auto" }}>
                    <button
                        className={`chart-tab ${activeTab === "money" ? "active" : ""}`}
                        onClick={() => setActiveTab("money")}
                    >
                        <Wallet size={16} style={{ display: "inline-block", marginRight: 6, verticalAlign: "middle" }} />
                        Money
                    </button>
                    <button
                        className={`chart-tab ${activeTab === "stocks" ? "active" : ""}`}
                        onClick={() => setActiveTab("stocks")}
                    >
                        <TrendingUp size={16} style={{ display: "inline-block", marginRight: 6, verticalAlign: "middle" }} />
                        Stocks
                    </button>
                </div>
            </div>

            {activeTab === "money" ? <MoneyTracker /> : <StocksTracker />}
        </>
    );
}
