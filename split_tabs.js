const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'src/app/portfolio/page.tsx');
let pageContent = fs.readFileSync(pagePath, 'utf8');

if (pageContent.includes('export default function PortfolioPage')) {
    // Create StocksTab.tsx
    let stocksContent = pageContent.replace('export default function PortfolioPage()', 'export default function StocksTab()');
    stocksContent = stocksContent.replace(/<div className="page-header animate-fade-in">[\s\S]*?<\/div>\n*/, '');

    fs.writeFileSync(path.join(__dirname, 'src/app/portfolio/StocksTab.tsx'), stocksContent);

    // Create empty page wrapper
    const newPageContent = `"use client";
    import { useState } from "react";
    import StocksTab from "./StocksTab";
    import MoneyTab from "./MoneyTab";
    import { Wallet, BarChart3 } from "lucide-react";

    export default function PortfolioPage() {
        const [activeTab, setActiveTab] = useState<"stocks" | "money">("money");

        return (
            <>
                <div className="page-header animate-fade-in" style={{ marginBottom: 24 }}>
                    <h1>Investment Tracker</h1>
                    <p>Track your portfolio performance across stocks and foreign currencies.</p>
                    
                    <div style={{ display: "flex", gap: 12, marginTop: 24, paddingBottom: 16 }}>
                        <button 
                            onClick={() => setActiveTab("stocks")}
                            className={\`tracker-btn \${activeTab === "stocks" ? "primary" : ""}\`}
                            style={{ flex: 1, justifyContent: "center", padding: "12px" }}
                        >
                            <BarChart3 size={18} />
                            Stocks Portfolio
                        </button>
                        <button 
                            onClick={() => setActiveTab("money")}
                            className={\`tracker-btn \${activeTab === "money" ? "primary" : ""}\`}
                            style={{ flex: 1, justifyContent: "center", padding: "12px" }}
                        >
                            <Wallet size={18} />
                            Bank Currencies
                        </button>
                    </div>
                </div>

                {activeTab === "stocks" ? <StocksTab /> : <MoneyTab />}
            </>
        );
    }
    `;
    fs.writeFileSync(pagePath, newPageContent);
    console.log('Split StocksTab and updated page.tsx');
} else {
    console.log('Already split or not found');
}
