import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Simple JSON file database for portfolio transactions
const DATA_FILE = path.join(process.cwd(), "data", "portfolio.json");

interface Transaction {
    id: string;
    symbol: "SPYM" | "QQQM" | "SCHD";
    type: "buy" | "sell";
    date: string;
    shares: number;
    price: number;
}

function ensureDataDir() {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function readTransactions(): Transaction[] {
    ensureDataDir();
    try {
        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(DATA_FILE, "[]", "utf-8");
            return [];
        }
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function writeTransactions(txns: Transaction[]) {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(txns, null, 2), "utf-8");
}

// GET — return all transactions
export async function GET() {
    const txns = readTransactions();
    return NextResponse.json(txns);
}

// POST — add a new transaction
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { symbol, type, date, shares, price } = body;

        // Validate
        if (!["SPYM", "QQQM", "SCHD"].includes(symbol)) {
            return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
        }
        if (!["buy", "sell"].includes(type)) {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }
        if (!date || !shares || shares <= 0 || !price || price <= 0) {
            return NextResponse.json({ error: "Invalid fields" }, { status: 400 });
        }

        const txn: Transaction = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            symbol,
            type,
            date,
            shares: Number(shares),
            price: Number(price),
        };

        const txns = readTransactions();
        txns.push(txn);
        // Sort by date descending
        txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        writeTransactions(txns);

        return NextResponse.json(txn, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
}

// DELETE — delete a transaction by id (passed as query param)
export async function DELETE(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const txns = readTransactions();
    const filtered = txns.filter((t) => t.id !== id);

    if (filtered.length === txns.length) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    writeTransactions(filtered);
    return NextResponse.json({ success: true });
}
