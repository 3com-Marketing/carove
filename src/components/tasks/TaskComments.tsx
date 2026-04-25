import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Send, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadComments();
  }, [taskId]);

  const loadComments = async () => {
    const { data } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    setComments(data || []);
  };

  const handleSend = async () => {
    if (!content.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from('task_comments').insert({
      task_id: taskId,
      user_id: user.id,
      user_name: profile?.full_name || '',
      content: content.trim(),
    } as any);
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setContent('');
    loadComments();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('task_comments').delete().eq('id', id);
    loadComments();
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Comentarios ({comments.length})</h4>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {comments.map(c => (
          <div key={c.id} className="bg-muted/50 rounded-md p-2.5 text-sm group">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-foreground">{c.user_name || 'Usuario'}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(c.created_at), "dd MMM HH:mm", { locale: es })}
                </span>
                {c.user_id === user?.id && (
                  <button onClick={() => handleDelete(c.id)} className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-foreground/80 whitespace-pre-wrap">{c.content}</p>
          </div>
        ))}
        {comments.length === 0 && <p className="text-xs text-muted-foreground">Sin comentarios aún.</p>}
      </div>
      <div className="flex gap-2">
        <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Añadir comentario..." rows={2} className="text-sm" onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSend(); }} />
        <Button size="icon" onClick={handleSend} disabled={!content.trim() || sending} className="shrink-0 self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
