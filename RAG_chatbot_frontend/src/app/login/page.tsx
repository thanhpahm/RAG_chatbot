"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Eye,
    EyeOff,
    User,
    Lock,
    ArrowRight,
    LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/auth";

function LoginPageContent() {
    const [show, setShow] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect") || "/chat";

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        if (!username.trim() || !password) {
            setLoading(false);
            setError("Vui lòng nhập tài khoản và mật khẩu.");
            return;
        }
        try {
            const user = await login(username.trim(), password);
            setLoading(false);
            router.push(user.role === "admin" ? "/admin" : redirect);
        } catch (e) {
            setLoading(false);
            setError(
                e instanceof Error
                    ? e.message
                    : "Không thể đăng nhập. Vui lòng thử lại.",
            );
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
            <div className="flex w-full max-w-sm flex-col gap-8">
                <Link href="/" className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold uppercase tracking-widest text-primary">
                        RAG ChatBot
                    </span>
                    <span className="text-xs text-muted-foreground">
                        Hệ thống chăm sóc khách hàng
                    </span>
                </Link>

                <Card>
                    <CardHeader>
                        <CardTitle>Đăng nhập</CardTitle>
                        <CardDescription>
                            Đăng nhập để sử dụng hệ thống.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form
                            onSubmit={handleLogin}
                            className="flex flex-col gap-4"
                            autoComplete="off"
                        >
                            <div className="flex flex-col gap-1.5">
                                <label
                                    htmlFor="login-username"
                                    className="text-sm font-medium text-foreground"
                                >
                                    Tên tài khoản
                                </label>
                                <div className="relative">
                                    <User
                                        size={16}
                                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    />
                                    <Input
                                        id="login-username"
                                        type="text"
                                        value={username}
                                        onChange={(e) =>
                                            setUsername(e.target.value)
                                        }
                                        className="h-10 pl-9"
                                        placeholder="Nhập tên tài khoản"
                                        autoComplete="off"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label
                                    htmlFor="login-password"
                                    className="text-sm font-medium text-foreground"
                                >
                                    Mật khẩu
                                </label>
                                <div className="relative">
                                    <Lock
                                        size={16}
                                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    />
                                    <Input
                                        id="login-password"
                                        type={show ? "text" : "password"}
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        className="h-10 pl-9 pr-10"
                                        placeholder="Nhập mật khẩu"
                                        autoComplete="off"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShow(!show)}
                                        aria-label={
                                            show
                                                ? "Ẩn mật khẩu"
                                                : "Hiện mật khẩu"
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        {show ? (
                                            <EyeOff size={16} />
                                        ) : (
                                            <Eye size={16} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                className="h-10 w-full"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <LoaderCircle
                                            className="animate-spin"
                                            data-icon="inline-start"
                                        />
                                        Đang đăng nhập...
                                    </>
                                ) : (
                                    <>
                                        Đăng nhập
                                        <ArrowRight data-icon="inline-end" />
                                    </>
                                )}
                            </Button>

                            {error && (
                                <p
                                    className="text-sm text-destructive"
                                    role="alert"
                                >
                                    {error}
                                </p>
                            )}
                        </form>
                    </CardContent>

                    <CardFooter className="justify-center">
                        <p className="text-sm text-muted-foreground">
                            Chưa có tài khoản?{" "}
                            <Link
                                href="/register"
                                className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
                            >
                                Đăng ký
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginPageContent />
        </Suspense>
    );
}
