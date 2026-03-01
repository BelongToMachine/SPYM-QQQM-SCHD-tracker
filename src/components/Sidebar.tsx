"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    LayoutDashboard,
    TrendingUp,
    ArrowLeftRight,
    Wallet,
    ChevronLeft,
    ChevronRight,
    Zap,
} from "lucide-react";

const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/stocks", label: "Stocks", icon: TrendingUp },
    { href: "/currency", label: "Currency Exchange", icon: ArrowLeftRight },
    { href: "/portfolio", label: "Portfolio", icon: Wallet },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
            <div className="sidebar-logo">
                <div className="logo-icon">
                    <Zap size={20} color="white" />
                </div>
                <span className="logo-text">FinanceHub</span>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (item.href !== "/" && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-item ${isActive ? "active" : ""}`}
                        >
                            <item.icon size={20} />
                            <span className="nav-label">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <button
                className="sidebar-toggle"
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
        </aside>
    );
}
