"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import {
    FileText,
    Upload,
    Search,
    Trash2,
    Eye,
    CheckCircle,
    Clock,
    AlertCircle,
    Download,
    RefreshCw,
} from "lucide-react";
import {
    listDocuments,
    listKnowledgeBases,
    uploadDocument,
    deleteDocument,
    getDocument,
} from "@/lib/api";
import type { Document as ApiDocument, KnowledgeBase } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from "@/components/ui/table";

const statusConfig = {
    completed: {
        label: "Hoàn thành",
        icon: CheckCircle,
        className: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
    },
    processing: {
        label: "Đang xử lý",
        icon: Clock,
        className: "text-amber-500 bg-amber-500/10 border-amber-500/30",
    },
    failed: {
        label: "Thất bại",
        icon: AlertCircle,
        className: "text-rose-500 bg-rose-500/10 border-rose-500/30",
    },
};

const fileTypeConfig: Record<
    string,
    { icon: string; bg: string; badge: string }
> = {
    pdf: {
        icon: "text-rose-500",
        bg: "bg-rose-500/10",
        badge: "text-rose-500 border-rose-500/30",
    },
    docx: {
        icon: "text-blue-500",
        bg: "bg-blue-500/10",
        badge: "text-blue-500 border-blue-500/30",
    },
    txt: {
        icon: "text-emerald-500",
        bg: "bg-emerald-500/10",
        badge: "text-emerald-500 border-emerald-500/30",
    },
    xlsx: {
        icon: "text-emerald-500",
        bg: "bg-emerald-500/10",
        badge: "text-emerald-500 border-emerald-500/30",
    },
};

const defaultFileType = {
    icon: "text-muted-foreground",
    bg: "bg-muted",
    badge: "text-muted-foreground",
};

function DocumentsPageContent() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const kbParam = searchParams.get("kb");

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [documents, setDocuments] = useState<ApiDocument[]>([]);
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
    const [selectedKb, setSelectedKb] = useState<string>(kbParam || "");
    const [isUploading, setIsUploading] = useState(false);

    const loadDocuments = useCallback(async () => {
        if (!selectedKb) return;
        const docs = await listDocuments(selectedKb);
        setDocuments(docs);
    }, [selectedKb]);

    useEffect(() => {
        listKnowledgeBases()
            .then((kbs) => {
                setKnowledgeBases(kbs);
                if (!selectedKb && kbs.length > 0) {
                    setSelectedKb(kbParam || kbs[0].id);
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!selectedKb) return;
        loadDocuments().catch(() => {});
    }, [selectedKb, pathname, loadDocuments]);

    useEffect(() => {
        if (!selectedKb) return;

        const hasProcessing = documents.some((doc) => {
            const status = (doc.upload_status ?? "processing").toLowerCase();
            return status === "processing";
        });

        if (!hasProcessing) return;

        const timer = window.setInterval(() => {
            void loadDocuments().catch(() => {});
        }, 3000);

        return () => {
            window.clearInterval(timer);
        };
    }, [documents, selectedKb, loadDocuments]);

    const docs = documents
        .filter((d) => d.filename.toLowerCase().includes(search.toLowerCase()))
        .filter(
            (d) =>
                statusFilter === "all" ||
                d.upload_status?.toLowerCase() === statusFilter,
        );

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Tài Liệu
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Quản lý tài liệu trong các knowledge base
                    </p>
                </div>
                <Button
                    disabled={!selectedKb || isUploading}
                    onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement)
                                .files?.[0];
                            if (!file || !selectedKb) return;
                            setIsUploading(true);
                            try {
                                const doc = await uploadDocument(
                                    selectedKb,
                                    file,
                                );
                                setDocuments((prev) => [
                                    {
                                        ...doc,
                                        upload_status:
                                            doc.upload_status ?? "PROCESSING",
                                    },
                                    ...prev,
                                ]);
                                await loadDocuments();
                            } finally {
                                setIsUploading(false);
                            }
                        };
                        input.click();
                    }}
                >
                    <Upload className="size-4" />
                    {isUploading ? "Đang tải lên..." : "Upload tài liệu"}
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {knowledgeBases.length > 0 && (
                    <Select
                        value={selectedKb}
                        onValueChange={(v) =>
                            v != null && setSelectedKb(String(v))
                        }
                    >
                        <SelectTrigger className="w-[220px]" size="sm">
                            <SelectValue>
                                {knowledgeBases.find(
                                    (kb) => kb.id === selectedKb,
                                )?.name || "Chọn Knowledge Base"}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {knowledgeBases.map((kb) => (
                                <SelectItem key={kb.id} value={kb.id}>
                                    {kb.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                <div className="relative min-w-[200px] max-w-xs flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        placeholder="Tìm tài liệu..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {(
                        ["all", "completed", "processing", "failed"] as const
                    ).map((s) => (
                        <Button
                            key={s}
                            variant="outline"
                            size="sm"
                            onClick={() => setStatusFilter(s)}
                            className={cn(
                                statusFilter === s &&
                                    "border-primary/30 bg-primary/15 text-primary",
                            )}
                        >
                            {s === "all" ? "Tất cả" : statusConfig[s].label}
                        </Button>
                    ))}
                </div>
            </div>

            <Card className="gap-0 py-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Tên tệp
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Loại
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Knowledge Base
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Trạng thái
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Ngày tải lên
                            </TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {docs.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="py-12 text-center"
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <FileText className="size-6 text-muted-foreground/30" />
                                        <p className="text-sm text-muted-foreground">
                                            Không tìm thấy tài liệu nào
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        {docs.map((doc) => {
                            const statusValue = (
                                doc.upload_status ?? "processing"
                            ).toLowerCase();
                            const st =
                                statusConfig[
                                    statusValue as keyof typeof statusConfig
                                ] ?? statusConfig.processing;
                            const ft =
                                fileTypeConfig[
                                    doc.file_type?.toLowerCase() ?? ""
                                ] ?? defaultFileType;
                            const kb = knowledgeBases.find(
                                (k) => k.id === doc.knowledge_base_id,
                            );
                            const StIcon = st?.icon;
                            return (
                                <TableRow key={doc.id} className="group">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={cn(
                                                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                                                    ft.bg,
                                                )}
                                            >
                                                <FileText
                                                    className={cn(
                                                        "size-3.5",
                                                        ft.icon,
                                                    )}
                                                />
                                            </div>
                                            <span className="text-sm font-medium text-foreground">
                                                {doc.filename}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "uppercase",
                                                ft.badge,
                                            )}
                                        >
                                            {doc.file_type ?? "—"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-muted-foreground">
                                            {kb?.name ?? "—"}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {st && (
                                            <Badge
                                                variant="outline"
                                                className={st.className}
                                            >
                                                <StIcon /> {st.label}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDate(doc.created_at)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
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
                                                className="text-muted-foreground hover:text-emerald-600"
                                                aria-label="Tải xuống"
                                            >
                                                <Download />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="text-muted-foreground hover:text-amber-600"
                                                aria-label="Xử lý lại"
                                            >
                                                <RefreshCw />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="text-muted-foreground hover:text-destructive"
                                                aria-label="Xoá"
                                                onClick={async () => {
                                                    if (
                                                        !confirm(
                                                            "Bạn có chắc muốn xoá tài liệu này?",
                                                        )
                                                    )
                                                        return;
                                                    await deleteDocument(
                                                        doc.id,
                                                    );
                                                    setDocuments((prev) =>
                                                        prev.filter(
                                                            (d) =>
                                                                d.id !== doc.id,
                                                        ),
                                                    );
                                                }}
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
                <Separator />
                <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-muted-foreground">
                        Hiển thị {docs.length} / {documents.length} tài liệu
                    </span>
                </div>
            </Card>
        </div>
    );
}

export default function DocumentsPage() {
    return (
        <Suspense
            fallback={
                <div className="flex flex-col gap-6 p-6">
                    <p className="text-sm text-muted-foreground">Đang tải…</p>
                </div>
            }
        >
            <DocumentsPageContent />
        </Suspense>
    );
}
