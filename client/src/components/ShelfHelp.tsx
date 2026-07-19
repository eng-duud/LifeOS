import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, Sparkles, Sunrise, Moon, Target, Zap, ListChecks } from 'lucide-react';

interface Suggestion {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

const GUIDED_PROMPTS: Record<string, Suggestion[]> = {
  morning: [
    { icon: <Sunrise className="w-5 h-5 text-amber-500" />, title: 'صباح الخير!', description: 'خطط ليومك — حدد 3 مهام رئيسية لإنجازها اليوم.' },
    { icon: <Sparkles className="w-5 h-5 text-purple-500" />, title: 'راجع أهدافك الأسبوعية', description: 'خذ دقيقة لمراجعة ما خططت له هذا الأسبوع.' },
    { icon: <ListChecks className="w-5 h-5 text-blue-500" />, title: 'التزم بعاداتك الصباحية', description: 'سجل عاداتك اليومية لبداية منظمة.' },
  ],
  evening: [
    { icon: <Moon className="w-5 h-5 text-indigo-500" />, title: 'مساء الخير!', description: 'حان وقت المراجعة — ماذا أنجزت اليوم؟' },
    { icon: <Target className="w-5 h-5 text-green-500" />, title: 'جهز ليوم غد', description: 'حدد أولوياتك ليوم غد قبل النوم.' },
    { icon: <Zap className="w-5 h-5 text-orange-500" />, title: 'احتفل بإنجازاتك', description: 'حتى الخطوات الصغيرة تستحق التقدير.' },
  ],
};

export function getTimeBasedPrompt(hour: number): Suggestion[] {
  if (hour >= 5 && hour < 12) return GUIDED_PROMPTS.morning;
  return GUIDED_PROMPTS.evening;
}

const SHELF_HELP: Record<string, { icon: React.ReactNode; title: string; tips: string[] }> = {
  tasks: {
    icon: <Zap className="w-5 h-5 text-blue-500" />,
    title: 'نصائح لإدارة المهام',
    tips: [
      'اقسم المهام الكبيرة إلى خطوات أصغر',
      'حدد أولويتين كحد أقصى لليوم',
      'اربط المهام بأهدافك لزيادة الدافعية',
      'استخدم تقنية بومودورو (25 دقيقة عمل - 5 دقائق راحة)',
      'راجع مهامك المكتملة نهاية كل يوم',
    ],
  },
  goals: {
    icon: <Target className="w-5 h-5 text-green-500" />,
    title: 'نصائح لتحقيق الأهداف',
    tips: [
      'اجعل أهدافك محددة وقابلة للقياس',
      'قسّم الهدف الكبير إلى مشاريع صغيرة',
      'حدد موعداً نهائياً واقعياً',
      'تتبع تقدمك أسبوعياً',
      'احتفل بكل إنجاز مهما كان صغيراً',
    ],
  },
  habits: {
    icon: <Sparkles className="w-5 h-5 text-purple-500" />,
    title: 'نصائح لبناء العادات',
    tips: [
      'ابدأ بعادة صغيرة جداً (دقيقتان فقط)',
      'اربط العادة الجديدة بعادة موجودة',
      'سجل إنجازك فوراً',
      'لا تنقطع ليومين متتاليين',
      'كافئ نفسك عند تحقيق سلسلة',
    ],
  },
};

export function ShelfHelp({ context }: { context: 'tasks' | 'goals' | 'habits' }) {
  const help = SHELF_HELP[context];
  return (
    <Card className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-dashed">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {help.icon}
          <h3 className="text-sm font-semibold">{help.title}</h3>
        </div>
        <ul className="space-y-1">
          {help.tips.map((tip, idx) => (
            <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
              <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
              {tip}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function GuidedPrompts({ hour }: { hour?: number }) {
  const prompts = getTimeBasedPrompt(hour ?? new Date().getHours());
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
      {prompts.map((p, idx) => (
        <Card key={idx} className="hover:shadow-sm transition-shadow cursor-default">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted shrink-0">{p.icon}</div>
            <div>
              <h4 className="text-sm font-medium">{p.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
