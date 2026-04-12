"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Bot,
    LayoutDashboard,
    Database,
    FileText,
    MessageSquare,
    Users,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Bell,
    Search,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logout } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";

const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
    {
        href: "/admin/knowledge-bases",
        icon: Database,
        label: "Knowledge Bases",
    },
    { href: "/admin/documents", icon: FileText, label: "Tài liệu" },
    { href: "/admin/conversations", icon: MessageSquare, label: "Hội thoại" },
    { href: "/admin/users", icon: Users, label: "Người dùng" },
    { href: "/admin/settings", icon: Settings, label: "Cài đặt" },
];

const bottomItems = [{ href: "/chat", icon: MessageSquare, label: "Mở Chat" }];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { user: currentUser, authenticated, admin } = useAuth();

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href;
        return pathname.startsWith(href);
    };

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    useEffect(() => {
        if (authenticated && !admin) {
            router.replace("/login");
        }
    }, [authenticated, admin, router]);

    if (!currentUser) {
        return null;
    }

    return (
        <TooltipProvider>
            <div className="flex h-screen overflow-hidden bg-background">
                <aside
                    className={cn(
                        "flex shrink-0 flex-col border-r border-border bg-card transition-[width] duration-300 ease-out",
                        collapsed ? "w-16" : "w-60",
                    )}
                >
                    <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary">
                            <Bot className="size-3.5 text-primary-foreground" />
                        </div>
                        {!collapsed && (
                            <div className="overflow-hidden">
                                <div className="truncate text-sm font-bold text-foreground">
                                    RAG ChatBot
                                </div>
                            </div>
                        )}
                    </div>

                    <ScrollArea className="flex-1">
                        <nav className="flex flex-col gap-0.5 px-2 py-3">
                            {navItems.map((item) => {
                                const active = isActive(item.href, item.exact);
                                const linkContent = (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                            collapsed && "justify-center px-0",
                                            active
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                        )}
                                    >
                                        <item.icon className="size-[17px] shrink-0" />
                                        {!collapsed && (
                                            <span className="truncate">
                                                {item.label}
                                            </span>
                                        )}
                                    </Link>
                                );

                                if (collapsed) {
                                    return (
                                        <Tooltip key={item.href}>
                                            <TooltipTrigger
                                                render={linkContent}
                                            />
                                            <TooltipContent side="right">
                                                {item.label}
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                }

                                return linkContent;
                            })}
                        </nav>
                    </ScrollArea>

                    <Separator />
                    <div className="flex flex-col gap-0.5 px-2 py-3">
                        {bottomItems.map((item) => {
                            const linkContent = (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                                        collapsed && "justify-center px-0",
                                    )}
                                >
                                    <item.icon className="size-[17px] shrink-0" />
                                    {!collapsed && (
                                        <span className="truncate">
                                            {item.label}
                                        </span>
                                    )}
                                </Link>
                            );

                            if (collapsed) {
                                return (
                                    <Tooltip key={item.href}>
                                        <TooltipTrigger render={linkContent} />
                                        <TooltipContent side="right">
                                            {item.label}
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            }

                            return linkContent;
                        })}

                        <button
                            type="button"
                            onClick={handleLogout}
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                                collapsed && "justify-center px-0",
                            )}
                        >
                            <LogOut className="size-[17px] shrink-0" />
                            {!collapsed && (
                                <span className="truncate">Đăng xuất</span>
                            )}
                        </button>
                    </div>

                    <Separator />
                    <div className="flex items-center justify-center py-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCollapsed(!collapsed)}
                            className="text-muted-foreground"
                            aria-label={
                                collapsed ? "Mở rộng menu" : "Thu gọn menu"
                            }
                        >
                            {collapsed ? (
                                <ChevronRight className="size-4" />
                            ) : (
                                <ChevronLeft className="size-4" />
                            )}
                        </Button>
                    </div>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-6">
                        <div className="relative max-w-sm flex-1">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm..."
                                className="pl-9"
                                aria-label="Tìm kiếm"
                            />
                        </div>

                        <div className="ml-auto flex items-center gap-3">
                            <Tooltip>
                                <TooltipTrigger
                                    render={
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="relative text-muted-foreground"
                                            aria-label="Thông báo"
                                        >
                                            <Bell className="size-[18px]" />
                                            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
                                        </Button>
                                    }
                                />
                                <TooltipContent>Thông báo</TooltipContent>
                            </Tooltip>

                            <Separator orientation="vertical" className="h-8" />

                            <div className="flex items-center gap-2.5">
                                <Avatar>
                                    <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                                        {currentUser.username.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="hidden md:block">
                                    <div className="text-sm font-medium text-foreground">
                                        {currentUser.username}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {currentUser.email}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto">{children}</main>
                </div>
            </div>
        </TooltipProvider>
    );
}
