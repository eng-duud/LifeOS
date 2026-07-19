import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Bell, Moon, Globe, Download, LogOut } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useTheme } from '@/contexts/ThemeContext';

export default function Settings() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isExporting, setIsExporting] = useState(false);

  // Data queries for export
  const { data: tasks } = trpc.tasks.list.useQuery();
  const { data: goals } = trpc.goals.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const { data: habits } = trpc.habits.list.useQuery();
  const { data: books } = trpc.books.list.useQuery();
  const { data: plans } = trpc.plans.list.useQuery();

  const handleExportData = () => {
    setIsExporting(true);
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        tasks: tasks || [],
        goals: goals || [],
        projects: projects || [],
        habits: habits || [],
        books: books || [],
        plans: plans || [],
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `life-os-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('تم تصدير البيانات بنجاح!');
    } catch {
      toast.error('فشل في تصدير البيانات');
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('lifeos_auth');
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">الإعدادات</h1>
        <p className="text-muted-foreground">تخصيص تفضيلات التطبيق</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="w-5 h-5" />
                إعدادات العرض
              </CardTitle>
              <CardDescription>تخصيص مظهر التطبيق</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">المظهر الداكن</p>
                  <p className="text-sm text-muted-foreground">استخدم المظهر الداكن للعيون</p>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={toggleTheme}
                />
              </div>

              <div>
                <label className="text-sm font-medium">اللغة</label>
                <Select defaultValue="ar">
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                إشعارات
              </CardTitle>
              <CardDescription>إدارة تنبيهات التطبيق</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">تنبيهات المهام</p>
                  <p className="text-sm text-muted-foreground">إخطارات عند اقتراب موعد المهام</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">تنبيهات العادات</p>
                  <p className="text-sm text-muted-foreground">تذكيرات يومية للعادات</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">تنبيهات الأهداف</p>
                  <p className="text-sm text-muted-foreground">تحديثات تقدم الأهداف</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">الإشعارات الأسبوعية</p>
                  <p className="text-sm text-muted-foreground">ملخص أسبوعي للإنتاجية</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Data Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                تصدير البيانات
              </CardTitle>
              <CardDescription>تحميل نسخة احتياطية من جميع بياناتك بصيغة JSON</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                سيتم تصدير جميع المهام والأهداف والمشاريع والعادات والكتب والخطط في ملف واحد.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleExportData}
                disabled={isExporting}
              >
                <Download className="w-4 h-4 ml-2" />
                {isExporting ? 'جاري التصدير...' : 'تصدير جميع البيانات (JSON)'}
              </Button>
            </CardContent>
          </Card>

          {/* Logout */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">تسجيل الخروج</CardTitle>
              <CardDescription>تسجيل الخروج من التطبيق</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full" onClick={handleLogout}>
                <LogOut className="w-4 h-4 ml-2" />
                تسجيل الخروج
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">الإصدار</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Life OS v1.0.0</p>
              <p className="text-xs text-muted-foreground mt-2">
                © 2026 Life OS. جميع الحقوق محفوظة.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
