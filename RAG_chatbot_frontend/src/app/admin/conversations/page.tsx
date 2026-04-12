"use client";

import { useState, useEffect } from "react";
import {
    MessageSquare,
    Search,
    Eye,
    Trash2,
    Bot,
    ChevronRight,
} from "lucide-react";
import {
    listAllConversations,
    listMessages,
    getCitations,
    deleteConversation,
} from "@/lib/api";
import type { Conversation, Message as ApiMessage } from "@/lib/api";
import { formatDate, formatRelativeTime, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function ConversationsPage() {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<string | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedMessages, setSelectedMessages] = useState<
        (ApiMessage & { citationCount?: number })[]
    >([]);

    useEffect(() => {
        listAllConversations()
            .then(setConversations)
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!selected) {
            return;
        }
        listMessages(selected)
            .then(async (msgs) => {
                const enriched = await Promise.all(
                    msgs.map(async (m) => {
                        const normalized = {
                            ...m,
                            sender_type: m.sender_type.toLowerCase(),
                        };
                        if (normalized.sender_type === "bot") {
                            const citations = await getCitations(m.id).catch(
                                () => [],
                            );
                            return {
                                ...normalized,
                                citationCount: citations.length,
                            };
                        }
                        return { ...normalized, citationCount: 0 };
                    }),
                );
                setSelectedMessages(enriched);
            })
            .catch(() => {});
    }, [selected]);

    const filtered = conversations.filter((c) =>
        (c.title || "").toLowerCase().includes(search.toLowerCase()),
    );

    const selectedConv = conversations.find((c) => c.id === selected);

    const handleDeleteConversation = async (conversationId: string) => {
        await deleteConversation(conversationId);
        setConversations((prev) =>
            prev.filter((conv) => conv.id !== conversationId),
        );
        if (selected === conversationId) {
            setSelected(null);
            setSelectedMessages([]);
        }
    };

    const formatContent = (content: string) =>
        content
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\n/g, "<br/>");

    return (
        <div className="flex flex-col gap-6 p-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">
                    Lịch Sử Hội Thoại
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Xem và phân tích toàn bộ lịch sử hội thoại
                </p>
            </div>

            <div className="grid min-h-[600px] gap-6 lg:grid-cols-5">
                {/* Left: conversation list */}
                <Card className="flex flex-col gap-0 py-0 lg:col-span-2">
                    <div className="border-b px-4 py-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                className="pl-9 text-sm"
                                placeholder="Tìm hội thoại..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="divide-y divide-border">
                            {filtered.length === 0 && (
                                <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                                    <Search className="size-6 text-muted-foreground/30" />
                                    <p className="text-sm text-muted-foreground">
                                        Không tìm thấy hội thoại nào
                                    </p>
                                </div>
                            )}
                            {filtered.map((conv) => {
                                const isSelected = selected === conv.id;
                                return (
                                    <button
                                        key={conv.id}
                                        onClick={() =>
                                            setSelected(
                                                conv.id === selected
                                                    ? null
                                                    : conv.id,
                                            )
                                        }
                                        className={cn(
                                            "w-full text-left px-4 py-3.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                                            isSelected && "bg-primary/10",
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={cn(
                                                    "flex size-9 shrink-0 items-center justify-center rounded-xl",
                                                    isSelected
                                                        ? "bg-primary/20"
                                                        : "bg-primary/10",
                                                )}
                                            >
                                                <MessageSquare className="size-4 text-primary" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-medium text-foreground">
                                                    {conv.title}
                                                </div>
                                                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <span>User</span>
                                                    <span>·</span>
                                                    <Badge
                                                        variant="secondary"
                                                        className="h-4 px-1.5 text-[10px]"
                                                    >
                                                        {conv.message_count} tin
                                                    </Badge>
                                                    <span>·</span>
                                                    <span>
                                                        {formatRelativeTime(
                                                            conv.updated_at ??
                                                                conv.created_at,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                            <ChevronRight
                                                className={cn(
                                                    "size-3.5 shrink-0 text-muted-foreground transition-transform",
                                                    isSelected &&
                                                        "rotate-90 text-primary",
                                                )}
                                            />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </ScrollArea>

                    <Separator />
                    <div className="px-4 py-3 text-xs text-muted-foreground">
                        {filtered.length} hội thoại
                    </div>
                </Card>

                {/* Right: detail */}
                <Card className="flex flex-col gap-0 py-0 lg:col-span-3">
                    {selected && selectedConv ? (
                        <>
                            <div className="flex items-center justify-between border-b px-5 py-4">
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">
                                        {selectedConv.title}
                                    </h3>
                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                        Tạo:{" "}
                                        {formatDate(selectedConv.created_at)}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="text-muted-foreground hover:text-primary"
                                        aria-label="Xem chi tiết"
                                    >
                                        <Eye />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="text-muted-foreground hover:text-destructive"
                                        aria-label="Xoá hội thoại"
                                        onClick={() => {
                                            void handleDeleteConversation(
                                                selectedConv.id,
                                            );
                                        }}
                                    >
                                        <Trash2 />
                                    </Button>
                                </div>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="flex flex-col gap-4 p-5">
                                    {selectedMessages.map((msg) => {
                                        const citationCount =
                                            msg.citationCount ?? 0;

                                        return (
                                            <div
                                                key={msg.id}
                                                className={cn(
                                                    "flex gap-3",
                                                    msg.sender_type ===
                                                        "user" &&
                                                        "flex-row-reverse",
                                                )}
                                            >
                                                <Avatar className="shrink-0">
                                                    <AvatarFallback
                                                        className={cn(
                                                            msg.sender_type ===
                                                                "bot"
                                                                ? "bg-primary text-primary-foreground"
                                                                : "bg-primary/15 text-primary",
                                                        )}
                                                    >
                                                        {msg.sender_type ===
                                                        "bot" ? (
                                                            <Bot className="size-3.5" />
                                                        ) : (
                                                            "U"
                                                        )}
                                                    </AvatarFallback>
                                                </Avatar>

                                                <div
                                                    className={cn(
                                                        "flex max-w-[75%] flex-col gap-1",
                                                        msg.sender_type ===
                                                            "user"
                                                            ? "items-end"
                                                            : "items-start",
                                                    )}
                                                >
                                                    <div
                                                        className={cn(
                                                            "px-4 py-2.5 text-[0.82rem] leading-relaxed",
                                                            msg.sender_type ===
                                                                "user"
                                                                ? "rounded-2xl rounded-br-sm bg-primary text-primary-foreground"
                                                                : "rounded-2xl rounded-tl-sm bg-muted text-foreground",
                                                        )}
                                                        dangerouslySetInnerHTML={{
                                                            __html: formatContent(
                                                                msg.content,
                                                            ),
                                                        }}
                                                    />
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>
                                                            {formatRelativeTime(
                                                                msg.created_at,
                                                            )}
                                                        </span>
                                                        {msg.sender_type ===
                                                            "bot" &&
                                                            msg.rating && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-amber-500/30 bg-amber-500/10 text-amber-500"
                                                                >
                                                                    ⭐{" "}
                                                                    {msg.rating}
                                                                    /5
                                                                </Badge>
                                                            )}
                                                        {msg.sender_type ===
                                                            "bot" &&
                                                            citationCount >
                                                                0 && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-primary/30 bg-primary/10 text-primary"
                                                                >
                                                                    {
                                                                        citationCount
                                                                    }{" "}
                                                                    citations
                                                                </Badge>
                                                            )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                            <MessageSquare className="size-8 text-muted-foreground/30" />
                            <h3 className="font-bold text-foreground">
                                Chọn hội thoại
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Chọn một hội thoại từ danh sách bên trái để xem
                                chi tiết
                            </p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
