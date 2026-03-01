const fs = require('fs');
let code = fs.readFileSync('src/components/portfolio/StocksTracker.tsx', 'utf-8');

// Replace constants
code = code.replace(/StocksTracker/g, 'MoneyTracker');
code = code.replace(/api\/portfolio/g, 'api/money');
code = code.replace(/"SPYM" \| "QQQM" \| "SCHD"/g, '"CNY" | "USD" | "HKD" | "TRY"');
code = code.replace(/\["SPYM", "QQQM", "SCHD"\]/g, '["CNY", "USD", "HKD", "TRY"]');
code = code.replace(/TrackedSymbol/g, 'TrackedCurrency');
code = code.replace(/TRACKED_SYMBOLS/g, 'TRACKED_CURRENCIES');
code = code.replace(/SYMBOL_META/g, 'CURRENCY_META');
code = code.replace(/formSymbol/g, 'formCurrency');
code = code.replace(/setFormSymbol/g, 'setFormCurrency');
code = code.replace(/filterSymbol/g, 'filterCurrency');
code = code.replace(/setFilterSymbol/g, 'setFilterCurrency');

// Update Meta
code = code.replace(/SPYM: \{ name: "SPDR Portfolio S&P 500 ETF", color: "#10b981" \},/g,
    `CNY: { name: "Chinese Yuan", color: "#ef4444" },\n    USD: { name: "US Dollar", color: "#10b981" },\n    HKD: { name: "Hong Kong Dollar", color: "#8b5cf6" },\n    TRY: { name: "Turkish Lira", color: "#06b6d4" }`);
code = code.replace(/QQQM: .*\n/g, '');
code = code.replace(/SCHD: .*\n/g, '');

// Data structure
code = code.replace(/symbol:/g, 'currency:');
code = code.replace(/\.symbol/g, '.currency');
code = code.replace(/shares:/g, 'amount:');
code = code.replace(/\.shares/g, '.amount');
code = code.replace(/formShares/g, 'formAmount');
code = code.replace(/setFormShares/g, 'setFormAmount');
code = code.replace(/totalBoughtShares/g, 'totalDepositAmount');
code = code.replace(/totalSoldShares/g, 'totalWithdrawAmount');
code = code.replace(/netShares/g, 'netAmount');

code = code.replace(/price:/g, 'exchangeRate:');
code = code.replace(/\.price/g, '.exchangeRate');
code = code.replace(/formPrice/g, 'formExchangeRate');
code = code.replace(/setFormPrice/g, 'setFormExchangeRate');

code = code.replace(/"buy" \| "sell"/g, '"deposit" | "withdraw"');
code = code.replace(/"buy"/g, '"deposit"');
code = code.replace(/"sell"/g, '"withdraw"');
code = code.replace(/buy-active/g, 'deposit-active');
code = code.replace(/sell-active/g, 'withdraw-active');
code = code.replace(/Buy/g, 'Deposit');
code = code.replace(/Sell/g, 'Withdraw');
code = code.replace(/totalCost/g, 'totalDepositCost');
code = code.replace(/totalSoldRevenue/g, 'totalWithdrawRevenue');

// Labels
code = code.replace(/>Symbol</g, '>Currency<');
code = code.replace(/>Shares</g, '>Amount<');
code = code.replace(/>Number of Shares</g, '>Amount (Foreign)<');
code = code.replace(/>Price Per Share</g, '>Exchange Rate (Anchor per Foreign)<');
code = code.replace(/>Price</g, '>Exchange Rate<');

// Remove Quotes logic
code = code.replace(/import \{ fetchStockQuotes, type StockQuote \} from "@\/lib\/stock-api";/g,
    `import { fetchLatestRates } from "@/lib/currency-api";`);

// Quotes fetching => Rate fetching
code = code.replace(/const \[quotes, setQuotes\] = useState<StockQuote\[\]>\(\[\]\);/g,
    `const [rates, setRates] = useState<Record<string, number>>({});\n    const [anchorCurrency, setAnchorCurrency] = useState<TrackedCurrency>("USD");`);
code = code.replace(/const \[quotesLoading, setQuotesLoading\] = useState\(true\);/g, 'const [ratesLoading, setRatesLoading] = useState(true);');
code = code.replace(/const \[quotesError, setQuotesError\] = useState<string \| null>\(null\);/g, 'const [ratesError, setRatesError] = useState<string | null>(null);');

code = code.replace(/fetchStockQuotes\(\)/g, `fetchLatestRates(anchorCurrency)`);

// We use `rates` instead of `priceMap`
code = code.replace(/priceMap\[sym\]/g, 'rates[sym]');

// Replace hasQuotes
code = code.replace(/hasQuotes/g, 'hasRates');
code = code.replace(/quotes\.length > 0/g, 'Object.keys(rates).length > 0');

fs.writeFileSync('src/components/portfolio/MoneyTracker.tsx', code);
