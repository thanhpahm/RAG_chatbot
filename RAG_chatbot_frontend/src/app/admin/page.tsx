"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Users,
    MessageSquare,
    FileText,
    Star,
    ArrowUpRight,
    RefreshCw,
} from "lucide-react";
import { getStats, listAllConversations } from "@/lib/api";
import type { Stats, Conversation } from "@/lib/api";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const DashboardCharts = dynamic(() => import("@/app/admin/dashboard-charts"), {
    ssr: false,
    loading: () => (
        <>
            <div className="grid gap-6 lg:grid-cols-3">
                <Skeleton className="h-72 rounded-xl lg:col-span-2" />
                <Skeleton className="h-72 rounded-xl" />
            </div>
            <Skeleton className="h-56 rounded-xl" />
        </>
    ),
});

export default function AdminDashboard() {
    const [period, setPeriod] = useState("7d");
    const [stats, setStats] = useState<Stats | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        setError(null);
        try {
            const [nextStats, nextConversations] = await Promise.all([
                getStats(),
                listAllConversations(),
            ]);
            setStats(nextStats);
            setConversations(nextConversations);
        } catch {
            setError("Không thể kết nối đến server. Hãy kiểm tra backend đang chạy.");
        }
    };

    useEffect(() => {
        void Promise.resolve().then(loadData);
    }, []);

    const statCards = [
        {
            label: "Người dùng",
            value: stats?.total_users ?? "—",
            icon: Users,
            change: "",
        },
        {
            label: "Hội thoại",
            value: stats?.total_conversations?.toLocaleString() ?? "—",
            icon: MessageSquare,
            change: "",
        },
        {
            label: "Tin nhắn",
            value: stats?.total_messages?.toLocaleString() ?? "—",
            icon: Star,
            change: "",
        },
        {
            label: "Tài liệu",
            value: stats?.total_documents ?? "—",
            icon: FileText,
            change: "",
        },
    ];

    return (
        <div className="flex flex-col gap-6 p-6">
            {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            )}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Dashboard
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Tổng quan hệ thống RAG ChatBot
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {["24h", "7d", "30d"].map((p) => (
                        <Button
                            key={p}
                            variant="ghost"
                            size="xs"
                            onClick={() => setPeriod(p)}
                            className={cn(
                                "font-medium",
                                period === p
                                    ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                                    : "text-muted-foreground",
                            )}
                        >
                            {p}
                        </Button>
                    ))}
                    <Button
                        variant="outline"
                        size="icon"
                        className="ml-1 text-muted-foreground"
                        aria-label="Làm mới dữ liệu"
                        onClick={loadData}
                    >
                        <RefreshCw className="size-3.5" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Card size="sm" key={card.label}>
                            <CardContent className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-2xl font-bold tabular-nums text-foreground">
                                        {card.value}
                                    </div>
                                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <span>{card.label}</span>
                                        {card.change && (
                                            <span className="font-medium text-emerald-600">
                                                {card.change}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                    <Icon className="size-[18px] text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <DashboardCharts />

            <Card className="gap-0 pb-0">
                <CardHeader className="border-b">
                    <CardTitle>Hội thoại gần đây</CardTitle>
                    <CardAction>
                        <Link
                            href="/admin/conversations"
                            className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
                        >
                            Xem tất cả <ArrowUpRight className="size-3" />
                        </Link>
                    </CardAction>
                </CardHeader>
                <div className="flex flex-col">
                    {conversations.slice(0, 4).map((conv, i, arr) => (
                        <div key={conv.id}>
                            <div className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                    <MessageSquare className="size-4 text-muted-foreground" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium text-foreground">
                                        {conv.title}
                                    </div>
                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                        {conv.message_count} tin nhắn ·{" "}
                                        {formatRelativeTime(conv.updated_at ?? conv.created_at)}
                                    </div>
                                </div>
                                <Link
                                    href="/admin/conversations"
                                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    Xem
                                </Link>
                            </div>
                            {i < arr.length - 1 && <Separator />}
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
