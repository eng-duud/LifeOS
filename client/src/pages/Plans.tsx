import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Plus, Trash2, Edit2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const planFormSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب'),
  description: z.string().optional(),
  planType: z.enum(['daily', 'weekly', 'monthly']),
  startDate: z.date(),
  endDate: z.date().optional(),
  areaId: z.any().optional(),
});

type PlanFormData = z.infer<typeof planFormSchema>;

export default function Plans() {
  const [filter, setFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  
  const { data: plans, isLoading } = trpc.plans.list.useQuery();
  const { data: lifeAreas } = trpc.lifeAreas.list.useQuery();

  const createMutation = trpc.plans.create.useMutation({
    onSuccess: () => {
      utils.plans.list.invalidate();
      toast.success('تم إضافة الخطة بنجاح');
      setIsOpen(false);
      reset();
    },
  });

  const updateMutation = trpc.plans.update.useMutation({
    onSuccess: () => {
      utils.plans.list.invalidate();
      toast.success('تم تحديث الخطة بنجاح');
      setEditingId(null);
      setIsOpen(false);
      reset();
    },
  });

  const deleteMutation = trpc.plans.delete.useMutation({
    onSuccess: () => {
      utils.plans.list.invalidate();
      toast.success('تم حذف الخطة بنجاح');
    },
  });

  const { register, handleSubmit, reset, watch, setValue } = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      planType: 'daily',
    },
  });

  const filteredPlans = plans?.filter(plan => plan.planType === filter);

  const onSubmit = (data: PlanFormData) => {
    const payload = {
      ...data,
      areaId: data.areaId ? Number(data.areaId) : undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (plan: any) => {
    setEditingId(plan.id);
    setValue('title', plan.title);
    setValue('description', plan.description || '');
    setValue('planType', plan.planType);
    setValue('startDate', new Date(plan.startDate));
    setValue('endDate', plan.endDate ? new Date(plan.endDate) : undefined);
    setValue('areaId', plan.areaId || '');
    setIsOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">الخطط</h1>
          <p className="text-muted-foreground">خطط يومية وأسبوعية وشهرية</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingId(null); reset(); }}>
              <Plus className="w-4 h-4 ml-2" />
              خطة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'تعديل الخطة' : 'إضافة خطة جديدة'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium">العنوان</label>
                <Input {...register('title')} placeholder="أدخل عنوان الخطة" />
              </div>
              <div>
                <label className="text-sm font-medium">الوصف</label>
                <Textarea {...register('description')} placeholder="أدخل وصف الخطة" rows={3} />
              </div>
              <div>
                <label className="text-sm font-medium">نوع الخطة</label>
                <Select defaultValue={watch('planType') || 'daily'} onValueChange={(value) => setValue('planType', value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">يومية</SelectItem>
                    <SelectItem value="weekly">أسبوعية</SelectItem>
                    <SelectItem value="monthly">شهرية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">تاريخ البداية</label>
                <DatePicker
                  value={watch('startDate')}
                  onChange={(d) => setValue('startDate', d!)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">تاريخ النهاية (اختياري)</label>
                <DatePicker
                  value={watch('endDate')}
                  onChange={(d) => setValue('endDate', d)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">منطقة الحياة</label>
                <Select defaultValue={watch('areaId') || ''} onValueChange={(value) => setValue('areaId', value || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="بدون منطقة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">بدون منطقة</SelectItem>
                    {lifeAreas?.map((area: any) => (
                      <SelectItem key={area.id} value={String(area.id)}>{area.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? 'تحديث' : 'إضافة'}
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6 flex gap-2">
        <Button variant={filter === 'daily' ? 'default' : 'outline'} onClick={() => setFilter('daily')}>
          يومية
        </Button>
        <Button variant={filter === 'weekly' ? 'default' : 'outline'} onClick={() => setFilter('weekly')}>
          أسبوعية
        </Button>
        <Button variant={filter === 'monthly' ? 'default' : 'outline'} onClick={() => setFilter('monthly')}>
          شهرية
        </Button>
      </div>

      <div className="space-y-3">
        {filteredPlans && filteredPlans.length > 0 ? (
          filteredPlans.map((plan: any) => (
            <Card key={plan.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Calendar className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{plan.title}</h3>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(plan.startDate).toLocaleDateString('ar-SA')}
                      {plan.endDate && ` - ${new Date(plan.endDate).toLocaleDateString('ar-SA')}`}
                    </p>
                    <span className={`inline-block text-xs px-2 py-1 rounded-full mt-2 ${
                      plan.status === 'active' ? 'bg-green-100 text-green-700' :
                      plan.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                      plan.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {plan.status === 'active' ? 'نشطة' :
                       plan.status === 'draft' ? 'مسودة' :
                       plan.status === 'completed' ? 'مكتملة' : 'ملغاة'}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(plan)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => deleteMutation.mutate({ id: plan.id })}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">لا توجد خطط</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
