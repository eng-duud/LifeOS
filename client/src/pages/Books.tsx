import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const bookFormSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب'),
  author: z.string().optional(),
  totalPages: z.number().optional(),
  currentPage: z.number().optional(),
  status: z.enum(['to_read', 'reading', 'completed', 'abandoned']).optional(),
  rating: z.number().optional(),
  notes: z.string().optional(),
  areaId: z.any().optional(),
});

type BookFormData = z.infer<typeof bookFormSchema>;

export default function Books() {
  const [filter, setFilter] = useState<'all' | 'to_read' | 'reading' | 'completed'>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  
  const { data: books, isLoading } = trpc.books.list.useQuery();
  const { data: lifeAreas } = trpc.lifeAreas.list.useQuery();

  const createMutation = trpc.books.create.useMutation({
    onSuccess: () => {
      utils.books.list.invalidate();
      toast.success('تم إضافة الكتاب بنجاح');
      setIsOpen(false);
      reset();
    },
  });

  const updateMutation = trpc.books.update.useMutation({
    onSuccess: () => {
      utils.books.list.invalidate();
      toast.success('تم تحديث الكتاب بنجاح');
      setEditingId(null);
      setIsOpen(false);
      reset();
    },
  });

  const deleteMutation = trpc.books.delete.useMutation({
    onSuccess: () => {
      utils.books.list.invalidate();
      toast.success('تم حذف الكتاب بنجاح');
    },
  });

  const { register, handleSubmit, reset, watch, setValue } = useForm<BookFormData>({
    resolver: zodResolver(bookFormSchema),
  });

  const filteredBooks = books?.filter(book => {
    if (filter === 'all') return true;
    return book.status === filter;
  });

  const onSubmit = (data: BookFormData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (book: any) => {
    setEditingId(book.id);
    setValue('title', book.title);
    setValue('author', book.author || '');
    setValue('totalPages', book.totalPages);
    setValue('currentPage', book.currentPage);
    setValue('status', book.status);
    setValue('rating', book.rating);
    setValue('notes', book.notes || '');
    setValue('areaId', book.areaId || '');
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
          <h1 className="text-3xl font-bold text-foreground mb-2">الكتب</h1>
          <p className="text-muted-foreground">تتبع قراءتك وملاحظاتك</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingId(null); reset(); }}>
              <Plus className="w-4 h-4 ml-2" />
              كتاب جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'تعديل الكتاب' : 'إضافة كتاب جديد'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium">العنوان</label>
                <Input {...register('title')} placeholder="أدخل عنوان الكتاب" />
              </div>
              <div>
                <label className="text-sm font-medium">المؤلف</label>
                <Input {...register('author')} placeholder="أدخل اسم المؤلف" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">إجمالي الصفحات</label>
                  <Input {...register('totalPages', { valueAsNumber: true })} type="number" placeholder="0" />
                </div>
                <div>
                  <label className="text-sm font-medium">الصفحة الحالية</label>
                  <Input {...register('currentPage', { valueAsNumber: true })} type="number" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">الحالة</label>
                <Select defaultValue={watch('status') || 'to_read'} onValueChange={(value) => setValue('status', value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="to_read">قراءة لاحقاً</SelectItem>
                    <SelectItem value="reading">قيد القراءة</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                    <SelectItem value="abandoned">متوقف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">التقييم (1-5)</label>
                <Input {...register('rating', { valueAsNumber: true })} type="number" min="1" max="5" placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium">الملاحظات</label>
                <Textarea {...register('notes')} placeholder="أضف ملاحظاتك عن الكتاب" rows={3} />
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

      <div className="mb-6 flex gap-2 overflow-x-auto">
        <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
          الكل
        </Button>
        <Button variant={filter === 'to_read' ? 'default' : 'outline'} onClick={() => setFilter('to_read')}>
          قراءة لاحقاً
        </Button>
        <Button variant={filter === 'reading' ? 'default' : 'outline'} onClick={() => setFilter('reading')}>
          قيد القراءة
        </Button>
        <Button variant={filter === 'completed' ? 'default' : 'outline'} onClick={() => setFilter('completed')}>
          مكتملة
        </Button>
      </div>

      <div className="space-y-3">
        {filteredBooks && filteredBooks.length > 0 ? (
          filteredBooks.map((book: any) => (
            <Card key={book.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <BookOpen className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{book.title}</h3>
                    {book.author && (
                      <p className="text-sm text-muted-foreground">بقلم: {book.author}</p>
                    )}
                    {book.totalPages && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>التقدم</span>
                          <span>{book.currentPage || 0}/{book.totalPages}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${book.totalPages ? (book.currentPage / book.totalPages) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {book.rating && (
                      <p className="text-xs text-muted-foreground mt-2">⭐ {book.rating}/5</p>
                    )}
                    <span className={`inline-block text-xs px-2 py-1 rounded-full mt-2 ${
                      book.status === 'completed' ? 'bg-green-100 text-green-700' :
                      book.status === 'reading' ? 'bg-blue-100 text-blue-700' :
                      book.status === 'to_read' ? 'bg-gray-100 text-gray-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {book.status === 'completed' ? 'مكتمل' :
                       book.status === 'reading' ? 'قيد القراءة' :
                       book.status === 'to_read' ? 'قراءة لاحقاً' : 'متوقف'}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(book)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => deleteMutation.mutate({ id: book.id })}
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
              <p className="text-muted-foreground">لا توجد كتب</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
