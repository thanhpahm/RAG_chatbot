"use client";

import Link from "next/link";
import { MessageSquare, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";

export default function LandingPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
            <div className="flex w-full max-w-md flex-col gap-10">
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                        RAG-Powered
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        ChatBot Chăm Sóc
                        <br />
                        Khách Hàng
                    </h1>
                    <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                        Trả lời chính xác dựa trên tài liệu nội bộ, kèm nguồn
                        trích dẫn minh bạch cho mọi câu trả lời.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <Dialog>
                        <DialogTrigger
                            render={
                                <button
                                    className={buttonVariants({
                                        size: "lg",
                                        className: "w-full justify-between",
                                    })}
                                />
                            }
                        >
                            <span className="flex items-center gap-2">
                                <MessageSquare className="size-4" />
                                Bắt đầu Chat
                            </span>
                            <ArrowRight className="size-4" />
                        </DialogTrigger>

                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Cần đăng nhập để chat</DialogTitle>
                                <DialogDescription>
                                    Bạn cần đăng nhập trước khi bắt đầu cuộc trò
                                    chuyện với chatbot.
                                </DialogDescription>
                            </DialogHeader>

                            <DialogFooter>
                                <DialogClose
                                    render={<button className={buttonVariants({ variant: "outline" })} />}
                                >
                                    Để sau
                                </DialogClose>
                                <DialogClose
                                    nativeButton={false}
                                    render={
                                        <Link
                                            href="/login?redirect=/chat"
                                            className={buttonVariants({ variant: "default" })}
                                        />
                                    }
                                >
                                    Đăng nhập
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <p className="text-xs text-muted-foreground">
                    Đã có tài khoản?{" "}
                    <Link
                        href="/login"
                        className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
                    >
                        Đăng nhập
                    </Link>
                </p>
            </div>

            <footer className="absolute bottom-6 text-xs text-muted-foreground/70">
                © 2026 · Chatbot RAG trong chăm sóc khách hàng
            </footer>
        </div>
    );
}
