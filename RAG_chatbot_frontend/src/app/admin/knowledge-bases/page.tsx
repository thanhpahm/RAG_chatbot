"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Database,
  Plus,
  Search,
  Calendar,
  ArrowUpRight,
  Trash2,
  Edit3,
} from "lucide-react";
import {
  listKnowledgeBases,
  createKnowledgeBase,
  deleteKnowledgeBase,
} from "@/lib/api";
import type { KnowledgeBase } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function KnowledgeBasesPage() {
  const [search, setSearch] = useState("");
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);

  useEffect(() => {
    listKnowledgeBases().then(setKnowledgeBases).catch(() => {});
  }, []);

  const filtered = knowledgeBases.filter(
    (kb) =>
      kb.name.toLowerCase().includes(search.toLowerCase()) ||
      (kb.description || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Knowledge Bases
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Quản lý cơ sở tri thức cho hệ thống RAG
          </p>
        </div>
        <Button
          onClick={async () => {
            const name = window.prompt("Tên knowledge base:");
            if (!name) return;
            const description = window.prompt("Mô tả (tuỳ chọn):") || undefined;
            const kb = await createKnowledgeBase({ name, description });
            setKnowledgeBases((prev) => [kb, ...prev]);
          }}
        >
          <Plus className="size-4" /> Tạo mới
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Tìm knowledge base..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-2 py-12 text-center">
            <Database className="size-6 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Không tìm thấy knowledge base nào
            </p>
          </div>
        )}
        {filtered.map((kb) => (
          <Card key={kb.id} className="group">
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    <Database className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{kb.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {kb.doc_count} tài liệu · {Math.floor(kb.doc_count * 12.4)} chunks
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Chỉnh sửa"
                  >
                    <Edit3 />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Xoá"
                    onClick={async () => {
                      if (!confirm("Bạn có chắc muốn xoá knowledge base này?"))
                        return;
                      await deleteKnowledgeBase(kb.id);
                      setKnowledgeBases((prev) =>
                        prev.filter((k) => k.id !== kb.id),
                      );
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">
                {kb.description}
              </p>
            </CardContent>

            <CardFooter className="justify-between">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="size-3" /> {formatDate(kb.created_at)}
              </span>
              <Link
                href={`/admin/documents?kb=${kb.id}`}
                className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                Xem tài liệu <ArrowUpRight className="size-3" />
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
