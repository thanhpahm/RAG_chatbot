"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Shield, Trash2, Users as UsersIcon, Mail, Calendar, Key } from "lucide-react";
import { createUser, deleteUser, listUsers, resetUserPassword, updateUser, type User } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const roleBadgeClass: Record<string, string> = {
  admin: "border-amber-500/20 bg-amber-500/10 text-amber-500",
  user: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
};

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try {
      setError("");
      const data = await listUsers({
        search: search || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
      });
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách người dùng.");
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadUsers();
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter]);

  const filtered = useMemo(() => users, [users]);

  const handleAddUser = async () => {
    const username = prompt("Username:");
    if (!username) return;
    const email = prompt("Email:");
    if (!email) return;
    const password = prompt("Password:");
    if (!password) return;
    const role = (prompt("Role (admin/user):", "user") || "user") as "admin" | "user";
    await createUser({ username, email, password, role: role === "admin" ? "admin" : "user" });
    await loadUsers();
  };

  const handleEditUser = async (user: User) => {
    const username = prompt("Username:", user.username);
    if (!username) return;
    const email = prompt("Email:", user.email);
    if (!email) return;
    const role = (prompt("Role (admin/user):", user.role) || user.role) as "admin" | "user";
    await updateUser(user.id, { username, email, role: role === "admin" ? "admin" : "user" });
    await loadUsers();
  };

  const handleToggleActive = async (user: User) => {
    await updateUser(user.id, { is_active: !user.is_active });
    await loadUsers();
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Xóa user ${user.username}?`)) return;
    await deleteUser(user.id);
    await loadUsers();
  };

  const handleResetPassword = async (user: User) => {
    const newPassword = prompt(`Mật khẩu mới cho ${user.username}:`);
    if (!newPassword) return;
    await resetUserPassword(user.id, { new_password: newPassword });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Người Dùng</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{users.length} tài khoản</p>
        </div>
        <Button onClick={handleAddUser}>
          <Plus className="size-4" /> Thêm người dùng
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Tìm theo tên, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(["all", "admin", "user"] as const).map((r) => (
            <Button
              key={r}
              variant="outline"
              size="sm"
              onClick={() => setRoleFilter(r)}
              className={cn(roleFilter === r && "border-primary/30 bg-primary/10 text-primary")}
            >
              {r === "all" ? "Tất cả" : r}
            </Button>
          ))}
        </div>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="px-4">Người dùng</TableHead>
              <TableHead className="px-4">Email</TableHead>
              <TableHead className="px-4">Vai trò</TableHead>
              <TableHead className="px-4">Trạng thái</TableHead>
              <TableHead className="px-4">Ngày tạo</TableHead>
              <TableHead className="w-0 px-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <UsersIcon className="size-6 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Không tìm thấy người dùng nào</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {filtered.map((user) => (
              <TableRow key={user.id} className="group">
                <TableCell className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary font-bold text-primary-foreground">
                        {user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">{user.username}</span>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="size-3.5" />
                    {user.email}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <Badge variant="outline" className={cn(roleBadgeClass[user.role])}>
                    <Shield className="size-3" /> {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <button
                    onClick={() => handleToggleActive(user)}
                    aria-label={user.is_active ? "Vô hiệu hoá tài khoản" : "Kích hoạt tài khoản"}
                    className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        "transition-colors",
                        user.is_active
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                          : "border-rose-500/20 bg-rose-500/10 text-rose-500",
                      )}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </button>
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3" />
                    {formatDate(user.created_at)}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-primary"
                      aria-label="Chỉnh sửa"
                      onClick={() => handleEditUser(user)}
                    >
                      <Shield className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-amber-500"
                      aria-label="Đặt lại mật khẩu"
                      onClick={() => handleResetPassword(user)}
                    >
                      <Key className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Xoá"
                      onClick={() => handleDeleteUser(user)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <CardFooter>
          <span className="text-xs text-muted-foreground">Hiển thị {filtered.length} người dùng</span>
        </CardFooter>
      </Card>
    </div>
  );
}
