"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Bot,
    Send,
    Plus,
    Star,
    Database,
    ThumbsUp,
    ThumbsDown,
    Search,
    Menu,
    X,
    Settings,
    ChevronRight,
    Copy,
    LogOut,
    Trash2,
} from "lucide-react";
import {
    listConversations,
    createConversation,
    deleteConversation,
    listMessages,
    getCitations,
    submitFeedback,
    sendMessageSSE,
    type Conversation as ApiConversation,
    type Message as ApiMessage,
    type Citation as ApiCitation,
} from "@/lib/api";
import { formatRelativeTime, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { logout } from "@/lib/auth";
import { refreshAccessToken, syncCurrentUser } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

type Message = Omit<ApiMessage, "sender_type"> & {
    sender_type: "user" | "bot";
    citations?: ApiCitation[];
};

function formatContent(content: string) {
    return content
        .replace(/no context/gi, "")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br/>");
}

export default function ChatPage() {
    const [conversations, setConversations] = useState<ApiConversation[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [citationOpen, setCitationOpen] = useState<string | null>(null);
    const [ratings, setRatings] = useState<Record<string, number>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { user: authUser, authenticated, admin: userIsAdmin } = useAuth();
    const username = authUser?.username ?? null;
    const [authReady, setAuthReady] = useState(false);

    useEffect(() => {
        setAuthReady(true);
    }, []);

    useEffect(() => {
        if (!authReady) {
            return;
        }

        const bootstrap = async () => {
            if (!authenticated) {
                try {
                    const refreshed = await refreshAccessToken();
                    if (refreshed) {
                        await syncCurrentUser();
                        return;
                    }
                } catch {
                    // Fall through to login redirect.
                }
                router.replace("/login?redirect=/chat");
                return;
            }

            const convs = await listConversations();
            if (convs.length > 0) {
                setConversations(convs);
                setActiveConvId(convs[0].id);
            } else {
                const c = await createConversation();
                setConversations([c]);
                setActiveConvId(c.id);
            }
        };

        void bootstrap();
    }, [authenticated, authReady, router]);

    const handleLogout = () => {
        logout();
        router.replace("/");
    };

    const handleNewConversation = useCallback(async () => {
        if (activeConvId) {
            const activeConv = conversations.find((c) => c.id === activeConvId);
            if (activeConv && activeConv.message_count === 0) {
                return;
            }
        }
        const conv = await createConversation();
        setConversations((prev) => [conv, ...prev]);
        setActiveConvId(conv.id);
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    }, [activeConvId, conversations]);

    const activeMessages = useMemo(
        () => messages.filter((m) => m.conversation_id === activeConvId),
        [messages, activeConvId],
    );

    const activeTitle = useMemo(
        () =>
            conversations.find((c) => c.id === activeConvId)?.title ||
            "Hội thoại",
        [conversations, activeConvId],
    );

    useEffect(() => {
        if (!activeConvId) return;
        listMessages(activeConvId).then(async (msgs) => {
            const messagesWithCitations = await Promise.all(
                msgs.map(async (m) => {
                    if (m.sender_type === "BOT") {
                        const citations = await getCitations(m.id);
                        return {
                            ...m,
                            sender_type: m.sender_type.toLowerCase() as
                                | "user"
                                | "bot",
                            citations,
                        };
                    }
                    return {
                        ...m,
                        sender_type: m.sender_type.toLowerCase() as
                            | "user"
                            | "bot",
                        citations: [] as ApiCitation[],
                    };
                }),
            );
            setMessages(messagesWithCitations);
        });
    }, [activeConvId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    const sendMessage = useCallback(
        async (text: string) => {
            if (!text.trim() || !activeConvId) return;
            const userMsg: Message = {
                id: `temp-${Date.now()}`,
                conversation_id: activeConvId,
                sender_type: "user",
                content: text,
                rating: null,
                feedback_text: null,
                created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, userMsg]);
            setInput("");
            setIsTyping(true);

            const botMsgId = `temp-bot-${Date.now()}`;
            const botMsg: Message = {
                id: botMsgId,
                conversation_id: activeConvId,
                sender_type: "bot",
                content: "",
                rating: null,
                feedback_text: null,
                created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, botMsg]);

            try {
                await sendMessageSSE(
                    activeConvId,
                    { content: text },
                    {
                        onToken: (token) => {
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === botMsgId
                                        ? { ...m, content: m.content + token }
                                        : m,
                                ),
                            );
                        },
                        onDone: async () => {
                            setIsTyping(false);
                            const msgs = await listMessages(activeConvId);
                            const messagesWithCitations = await Promise.all(
                                msgs.map(async (m) => {
                                    if (m.sender_type === "BOT") {
                                        const citations = await getCitations(
                                            m.id,
                                        );
                                        return {
                                            ...m,
                                            sender_type:
                                                m.sender_type.toLowerCase() as
                                                    | "user"
                                                    | "bot",
                                            citations,
                                        };
                                    }
                                    return {
                                        ...m,
                                        sender_type:
                                            m.sender_type.toLowerCase() as
                                                | "user"
                                                | "bot",
                                        citations: [] as ApiCitation[],
                                    };
                                }),
                            );
                            setMessages(messagesWithCitations);
                            listConversations().then(setConversations);
                        },
                        onError: (error) => {
                            setIsTyping(false);
                            console.error("Stream error:", error);
                        },
                    },
                );
            } catch (e) {
                setIsTyping(false);
                console.error(e);
            }
        },
        [activeConvId],
    );
    const handleDeleteConversation = useCallback(
        async (conversationId: string) => {
            await deleteConversation(conversationId);
            const nextConversations = conversations.filter(
                (conv) => conv.id !== conversationId,
            );
            setConversations(nextConversations);
            if (activeConvId === conversationId) {
                if (nextConversations.length > 0) {
                    setActiveConvId(nextConversations[0].id);
                    return;
                }
                const created = await createConversation();
                setConversations([created]);
                setActiveConvId(created.id);
            }
        },
        [activeConvId, conversations],
    );

    const handleSend = useCallback(
        () => sendMessage(input),
        [sendMessage, input],
    );

    const handleRating = useCallback(async (msgId: string, rating: number) => {
        setRatings((prev) => ({ ...prev, [msgId]: rating }));
        await submitFeedback(msgId, { rating });
    }, []);

    const sidebarContent = (
        <div className="flex h-full w-[280px] flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
                <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-foreground">
                        RAG ChatBot
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Conversations
                    </span>
                </div>
            </div>

            <div className="px-3 py-3">
                <Button
                    className="w-full justify-center"
                    onClick={handleNewConversation}
                >
                    <Plus data-icon="inline-start" /> Hội thoại mới
                </Button>
            </div>

            <div className="px-3 pb-3">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-8" placeholder="Tìm hội thoại..." />
                </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
                <div className="flex flex-col gap-0.5 px-3">
                    <span className="px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Gần đây
                    </span>
                    {conversations.map((conv) => (
                        <div
                            key={conv.id}
                            className={cn(
                                "group relative w-full rounded-lg transition-colors",
                                activeConvId === conv.id
                                    ? "bg-primary/10 text-primary"
                                    : "text-foreground hover:bg-muted",
                            )}
                        >
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                    handleDeleteConversation(conv.id)
                                }
                                aria-label="Xóa hội thoại"
                            >
                                <Trash2 className="size-3.5" />
                            </Button>
                            <button
                                onClick={() => {
                                    setActiveConvId(conv.id);
                                    setSidebarOpen(false);
                                }}
                                className="w-full p-2.5 pl-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <div className="truncate text-sm font-medium">
                                    {conv.title}
                                </div>
                                <div className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>
                                        {formatRelativeTime(
                                            conv.updated_at ?? conv.created_at,
                                        )}
                                    </span>
                                    <span>{conv.message_count} tin</span>
                                </div>
                            </button>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            <Separator />
            <div className="flex flex-col gap-2 px-3 py-3">
                {userIsAdmin && (
                    <Button
                        variant="ghost"
                        className="justify-start"
                        nativeButton={false}
                        render={<Link href="/admin" />}
                    >
                        <Settings data-icon="inline-start" /> Admin Dashboard
                    </Button>
                )}
                <div className="flex items-center justify-between px-2 py-2 w-full rounded-md hover:bg-muted transition-colors">
                    <div className="flex items-center gap-2">
                        <Avatar className="size-8">
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                {username?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground truncate max-w-[130px]">
                            {username || "Người dùng"}
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={handleLogout}
                        aria-label="Đăng xuất"
                    >
                        <LogOut className="size-4" />
                    </Button>
                </div>
            </div>
        </div>
    );

    if (!authenticated) return null;

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex shrink-0 border-r border-border bg-card">
                {sidebarContent}
            </div>

            {/* Mobile Sidebar */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetContent
                    side="left"
                    className="w-[280px] bg-card p-0 md:hidden"
                    showCloseButton={false}
                >
                    <SheetTitle className="sr-only">
                        Danh sách hội thoại
                    </SheetTitle>
                    {sidebarContent}
                </SheetContent>
            </Sheet>

            <div className="flex min-w-0 flex-1 flex-col min-h-0">
                <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Mở menu"
                    >
                        <Menu />
                    </Button>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">
                            {activeTitle}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Online · RAG enabled
                        </div>
                    </div>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
                        <div className="mb-4 flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-6 text-center">
                            <h3 className="text-sm font-bold text-foreground">
                                Bot Hỗ Trợ Khách Hàng
                            </h3>
                            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                                Tôi sử dụng AI RAG để trả lời dựa trên knowledge
                                base của công ty. Hỏi bất kỳ điều gì!
                            </p>
                        </div>

                        {activeMessages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex gap-3",
                                    msg.sender_type === "user"
                                        ? "flex-row-reverse"
                                        : "flex-row",
                                )}
                            >
                                <div className="mt-1 shrink-0">
                                    {msg.sender_type === "bot" ? (
                                        <div className="flex size-8 items-center justify-center rounded-full bg-primary">
                                            <Bot className="size-3.5 text-primary-foreground" />
                                        </div>
                                    ) : (
                                        <Avatar>
                                            <AvatarFallback className="bg-primary/15 text-primary">
                                                U
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>

                                <div
                                    className={cn(
                                        "flex max-w-[75%] flex-col gap-1.5",
                                        msg.sender_type === "user"
                                            ? "items-end"
                                            : "items-start",
                                    )}
                                >
                                    {msg.sender_type === "bot" &&
                                    isTyping &&
                                    !msg.content ? (
                                        <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3.5">
                                            <div className="size-2 rounded-full bg-primary/60 typing-dot" />
                                            <div className="size-2 rounded-full bg-primary/60 typing-dot" />
                                            <div className="size-2 rounded-full bg-primary/60 typing-dot" />
                                        </div>
                                    ) : (
                                        <div
                                            className={cn(
                                                "px-4 py-2.5 text-sm leading-relaxed",
                                                msg.sender_type === "user"
                                                    ? "rounded-2xl rounded-br-sm bg-primary text-primary-foreground"
                                                    : "rounded-2xl rounded-tl-sm border border-border bg-card text-foreground",
                                            )}
                                            dangerouslySetInnerHTML={{
                                                __html: formatContent(
                                                    msg.content,
                                                ),
                                            }}
                                        />
                                    )}

                                    {msg.sender_type === "bot" && (
                                        <div className="flex w-full flex-col gap-2">
                                            {msg.citations &&
                                                msg.citations.length > 0 &&
                                                !msg.content.includes(
                                                    "no context",
                                                ) && (
                                                    <Collapsible
                                                        open={
                                                            citationOpen ===
                                                            msg.id
                                                        }
                                                        onOpenChange={(open) =>
                                                            setCitationOpen(
                                                                open
                                                                    ? msg.id
                                                                    : null,
                                                            )
                                                        }
                                                    >
                                                        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary/80">
                                                            <Database className="size-3" />
                                                            {
                                                                msg.citations
                                                                    .length
                                                            }{" "}
                                                            nguồn trích dẫn
                                                            <ChevronRight
                                                                className={cn(
                                                                    "size-3 transition-transform",
                                                                    citationOpen ===
                                                                        msg.id &&
                                                                        "rotate-90",
                                                                )}
                                                            />
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent>
                                                            <div className="mt-2 flex flex-col gap-2">
                                                                {msg.citations.map(
                                                                    (c) => (
                                                                        <div
                                                                            key={
                                                                                c.id
                                                                            }
                                                                            className="rounded-lg border border-border bg-muted/50 p-3 text-xs"
                                                                        >
                                                                            <div className="mb-1.5 flex items-center justify-between">
                                                                                <span className="font-semibold text-foreground">
                                                                                    {
                                                                                        c.document_name
                                                                                    }
                                                                                </span>
                                                                                <Badge variant="secondary">
                                                                                    {Math.round(
                                                                                        (c.relevance_score ??
                                                                                            0) *
                                                                                            100,
                                                                                    )}

                                                                                    %
                                                                                    phù
                                                                                    hợp
                                                                                </Badge>
                                                                            </div>
                                                                            <p className="leading-relaxed text-muted-foreground">
                                                                                &ldquo;
                                                                                {
                                                                                    c.chunk_content
                                                                                }
                                                                                &rdquo;
                                                                            </p>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        </CollapsibleContent>
                                                    </Collapsible>
                                                )}

                                            <div className="flex items-center gap-3">
                                                <Button
                                                    variant="ghost"
                                                    size="xs"
                                                    className="text-muted-foreground"
                                                    aria-label="Sao chép nội dung"
                                                >
                                                    <Copy data-icon="inline-start" />{" "}
                                                    Copy
                                                </Button>
                                                <div
                                                    className="flex items-center gap-0.5"
                                                    role="group"
                                                    aria-label="Đánh giá"
                                                >
                                                    {[1, 2, 3, 4, 5].map(
                                                        (s) => (
                                                            <button
                                                                key={s}
                                                                onClick={() =>
                                                                    handleRating(
                                                                        msg.id,
                                                                        s,
                                                                    )
                                                                }
                                                                aria-label={`${s} sao`}
                                                                className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                            >
                                                                <Star
                                                                    className={cn(
                                                                        "size-3 transition-colors",
                                                                        (ratings[
                                                                            msg
                                                                                .id
                                                                        ] ??
                                                                            msg.rating ??
                                                                            0) >=
                                                                            s
                                                                            ? "fill-amber-500 text-amber-500"
                                                                            : "text-muted-foreground/50 hover:text-amber-500",
                                                                    )}
                                                                />
                                                            </button>
                                                        ),
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    className="text-muted-foreground hover:text-primary"
                                                    aria-label="Hữu ích"
                                                >
                                                    <ThumbsUp />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    className="text-muted-foreground hover:text-destructive"
                                                    aria-label="Không hữu ích"
                                                >
                                                    <ThumbsDown />
                                                </Button>
                                                <span className="ml-auto text-xs text-muted-foreground/70">
                                                    {formatRelativeTime(
                                                        msg.created_at,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {msg.sender_type === "user" && (
                                        <span className="text-xs text-muted-foreground/70">
                                            {formatRelativeTime(msg.created_at)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}

                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                <div className="shrink-0 border-t border-border bg-card px-4 py-4">
                    <div className="mx-auto max-w-2xl">
                        <div className="mb-3 flex flex-wrap gap-2">
                            {[
                                "Chính sách đổi trả?",
                                "Thời gian giao hàng?",
                                "Hỗ trợ bảo hành?",
                            ].map((s) => (
                                <Badge
                                    key={s}
                                    variant="outline"
                                    className="cursor-pointer transition-colors hover:bg-muted"
                                    render={<button type="button" />}
                                    onClick={() => sendMessage(s)}
                                >
                                    {s}
                                </Badge>
                            ))}
                        </div>

                        <div className="flex items-end gap-3">
                            <Textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                rows={1}
                                className="min-h-[44px] max-h-[120px] resize-none overflow-y-auto"
                                placeholder="Nhập câu hỏi của bạn... (Enter để gửi)"
                            />
                            <Button
                                onClick={handleSend}
                                disabled={
                                    !input.trim() || isTyping || !activeConvId
                                }
                                size="icon"
                                className="shrink-0"
                                aria-label="Gửi tin nhắn"
                            >
                                <Send />
                            </Button>
                        </div>

                        <p className="mt-2 text-center text-xs text-muted-foreground/70">
                            Bot có thể mắc lỗi. Hãy kiểm tra thông tin quan
                            trọng.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
