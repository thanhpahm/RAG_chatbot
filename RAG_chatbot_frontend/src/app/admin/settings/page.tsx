"use client";

import { useEffect, useState } from "react";
import { User, Shield, Bell, Globe, Save, Eye, EyeOff, CheckCircle, AlertTriangle } from "lucide-react";
import { apiChangePassword, apiGetMe, updateUser, type User as ApiUser } from "@/lib/api";
import { syncCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const defaultNotifications = [
  { label: "Hội thoại mới", desc: "Khi có hội thoại mới được tạo", enabled: true },
  { label: "Bot không trả lời được", desc: "Khi RAG không tìm thấy context phù hợp", enabled: true },
  { label: "Đánh giá thấp", desc: "Khi user đánh giá 1-2 sao", enabled: true },
  { label: "Upload thất bại", desc: "Khi tài liệu không thể xử lý", enabled: false },
  { label: "Tài khoản mới", desc: "Khi user mới đăng ký", enabled: false },
];

export default function SettingsPage() {
  const [showPass, setShowPass] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiGetMe()
      .then((user) => {
        setProfile(user);
        setUsername(user.username);
        setEmail(user.email);
      })
      .catch(() => {});
  }, []);

  const showSavedBanner = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setError("");
    try {
      const updated = await updateUser(profile.id, { username, email });
      setProfile(updated);
      await syncCurrentUser();
      showSavedBanner();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được hồ sơ.");
    }
  };

  const handleChangePassword = async () => {
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    try {
      await apiChangePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showSavedBanner();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đổi được mật khẩu.");
    }
  };

  const toggleNotification = (index: number) => {
    setNotifications((prev) => prev.map((n, i) => (i === index ? { ...n, enabled: !n.enabled } : n)));
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cài Đặt</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Quản lý tài khoản và tuỳ chỉnh hệ thống</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 text-center">
              <Avatar className="size-20">
                <AvatarFallback className="bg-primary text-2xl font-bold text-primary-foreground">
                  {profile?.username?.charAt(0).toUpperCase() || "A"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-foreground">{profile?.username || "Admin"}</span>
                <span className="text-xs text-muted-foreground">{profile?.email || "admin@company.com"}</span>
              </div>
              <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-500">
                <Shield className="size-3" /> {profile?.role || "admin"}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">
                <User className="size-4" /> Hồ sơ
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="size-4" /> Bảo mật
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="size-4" /> Thông báo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin cá nhân</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="settings-username" className="text-sm font-medium text-foreground">
                        Tên đăng nhập
                      </label>
                      <Input id="settings-username" value={username} onChange={(e) => setUsername(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="settings-email" className="text-sm font-medium text-foreground">
                        Email
                      </label>
                      <Input id="settings-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="settings-role" className="text-sm font-medium text-foreground">
                      Vai trò
                    </label>
                    <div id="settings-role" className="flex h-8 cursor-not-allowed items-center gap-2 rounded-lg border border-input px-2.5 opacity-60">
                      <Shield className="size-3.5 text-amber-500" />
                      <span className="text-sm text-amber-500">{profile?.role || "admin"}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="settings-lang" className="text-sm font-medium text-foreground">
                      Ngôn ngữ
                    </label>
                    <Select defaultValue="vi">
                      <SelectTrigger id="settings-lang" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vi">
                          <Globe className="size-4" /> Tiếng Việt
                        </SelectItem>
                        <SelectItem value="en">
                          <Globe className="size-4" /> English
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {saved && (
                    <Alert className="border-emerald-500/30 bg-emerald-500/5">
                      <CheckCircle className="size-4 text-emerald-500" />
                      <AlertTitle className="text-emerald-500">Thành công</AlertTitle>
                      <AlertDescription className="text-emerald-600/80">Thay đổi đã được lưu.</AlertDescription>
                    </Alert>
                  )}

                  <Button onClick={handleSaveProfile} className="w-fit">
                    <Save className="size-4" /> Lưu thay đổi
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <div className="flex flex-col gap-5">
                <Card>
                  <CardHeader>
                    <CardTitle>Đổi mật khẩu</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="pw-current" className="text-sm font-medium text-foreground">
                        Mật khẩu hiện tại
                      </label>
                      <Input
                        id="pw-current"
                        type={showPass ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="pw-new" className="text-sm font-medium text-foreground">
                        Mật khẩu mới
                      </label>
                      <Input
                        id="pw-new"
                        type={showPass ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="pw-confirm" className="text-sm font-medium text-foreground">
                        Xác nhận mật khẩu mới
                      </label>
                      <Input
                        id="pw-confirm"
                        type={showPass ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                    <Button variant="ghost" size="sm" className="w-fit" onClick={() => setShowPass((v) => !v)}>
                      {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      {showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    </Button>
                    <Button className="w-fit" onClick={handleChangePassword}>
                      <Shield className="size-4" /> Đổi mật khẩu
                    </Button>
                  </CardContent>
                </Card>

                <Alert variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>Vùng nguy hiểm</AlertTitle>
                  <AlertDescription>Xóa tài khoản sẽ xóa vĩnh viễn toàn bộ dữ liệu.</AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Cài đặt thông báo</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-0">
                  {notifications.map((item, i) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-foreground">{item.label}</span>
                          <span className="text-xs text-muted-foreground">{item.desc}</span>
                        </div>
                        <Switch checked={item.enabled} onCheckedChange={() => toggleNotification(i)} />
                      </div>
                      {i < notifications.length - 1 && <Separator />}
                    </div>
                  ))}
                  <div className="pt-4">
                    <Button onClick={showSavedBanner} className="w-fit">
                      <Save className="size-4" /> Lưu cài đặt
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
