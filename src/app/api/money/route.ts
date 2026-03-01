import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Simple JSON file database for money (currency) transactions
const DATA_FILE = path.join(process.cwd(), "data", "money.json");

type TrackedCurrency = "CNY" | "USD" | "HKD" | "TRY";

interface MoneyTransaction {
    id: string;
    currency: TrackedCurrency;
    type: "deposit" | "withdraw";
    date: string;
    amount: number;        // amount in the foreign currency
    exchangeRate: number;  // exchange rate to anchor currency at time of transaction
}

interface MoneyData {
    anchorCurrency: TrackedCurrency;
    transactions: MoneyTransaction[];
}

const VALID_CURRENCIES: TrackedCurrency[] = ["CNY", "USD", "HKD", "TRY"];

function ensureDataDir() {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function readData(): MoneyData {
    ensureDataDir();
    try {
        if (!fs.existsSync(DATA_FILE)) {
            const defaultData: MoneyData = { anchorCurrency: "USD", transactions: [] };
            fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
            return defaultData;
        }
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        return JSON.parse(raw);
    } catch {
        return { anchorCurrency: "USD", transactions: [] };
    }
}

function writeData(data: MoneyData) {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// GET — return all money data (anchor + transactions)
export async function GET() {
    const data = readData();
    return NextResponse.json(data);
}

// POST — add a new transaction OR update anchor currency
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // If updating anchor currency
        if (body.action === "setAnchor") {
            if (!VALID_CURRENCIES.includes(body.anchorCurrency)) {
                return NextResponse.json({ error: "Invalid anchor currency" }, { status: 400 });
            }
            const data = readData();
            data.anchorCurrency = body.anchorCurrency;
            writeData(data);
            return NextResponse.json(data);
        }

        // Otherwise, add a transaction
        const { currency, type, date, amount, exchangeRate } = body;

        if (!VALID_CURRENCIES.includes(currency)) {
            return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
        }
        if (!["deposit", "withdraw"].includes(type)) {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }
        if (!date || !amount || amount <= 0 || !exchangeRate || exchangeRate <= 0) {
            return NextResponse.json({ error: "Invalid fields" }, { status: 400 });
        }

        const txn: MoneyTransaction = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            currency,
            type,
            date,
            amount: Number(amount),
            exchangeRate: Number(exchangeRate),
        };

        const data = readData();
        data.transactions.push(txn);
        // Sort by date descending
        data.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        writeData(data);

        return NextResponse.json(txn, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
}

// DELETE — delete a transaction by id
export async function DELETE(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const data = readData();
    const originalLength = data.transactions.length;
    data.transactions = data.transactions.filter((t) => t.id !== id);

    if (data.transactions.length === originalLength) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    writeData(data);
    return NextResponse.json({ success: true });
}
