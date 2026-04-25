import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, X, Send, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

function extractSuggestions(content: string): { clean: string; suggestions: string[] } {
  const marker = '**Preguntas relacionadas:**';
  const idx = content.lastIndexOf(marker);
  if (idx === -1) return { clean: content, suggestions: [] };

  const clean = content.slice(0, idx).replace(/---\s*$/, '').trim();
  const suggestionsBlock = content.slice(idx + marker.length).trim();
  const suggestions = suggestionsBlock
    .split('\n')
    .map(l => l.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(l => l.length > 5);
  return { clean, suggestions: suggestions.slice(0, 3) };
}

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-ai-assistant', handler);
    return () => window.removeEventListener('open-ai-assistant', handler);
  }, []);

  useEffect(() => {
    if (open && textareaRef.current) textareaRef.current.focus();
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    let assistantSoFar = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Error de conexión' }));
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${err.error || 'Error del servidor'}` }]);
        setIsLoading(false);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, idx);
          textBuffer = textBuffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error de conexión. Inténtalo de nuevo.' }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  // Parse suggestions from last assistant message
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
  const { suggestions } = lastAssistant && !isLoading
    ? extractSuggestions(lastAssistant.content)
    : { suggestions: [] };

  return (
    <>
      {/* Floating button — bottom right */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200',
          open ? 'bg-muted text-foreground hover:bg-muted/80' : 'gradient-brand text-white hover:opacity-90'
        )}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente IA'}
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </button>

      {/* Chat panel — bottom right */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-[400px] max-w-[calc(100vw-2.5rem)] h-[540px] max-h-[calc(100vh-7rem)] bg-card border rounded-xl shadow-2xl flex flex-col animate-fade-in overflow-hidden">
          {/* Header */}
          <div className="gradient-brand px-4 py-3 flex items-center gap-2 shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white">Asistente Carove</h3>
              <p className="text-[10px] text-white/70">Consulta tus datos en tiempo real</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8 space-y-3">
                <Bot className="h-10 w-10 text-primary/30 mx-auto" />
                <p className="text-sm text-muted-foreground">¡Hola! Soy tu asistente de datos.</p>
                <p className="text-xs text-muted-foreground">Pregúntame sobre vehículos, ventas, márgenes, clientes, tesorería...</p>
                <div className="flex flex-wrap gap-1.5 justify-center pt-2">
                  {['¿Cuántos vehículos tengo en stock?', '¿Cuál es el margen medio?', 'Resumen de ventas recientes'].map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-[11px] px-2.5 py-1.5 rounded-full border bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => {
              const isLast = i === messages.length - 1 && msg.role === 'assistant' && !isLoading;
              const { clean } = isLast ? extractSuggestions(msg.content) : { clean: msg.content };

              return (
                <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown>{isLast ? clean : msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              );
            })}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              </div>
            )}

            {/* Contextual follow-up suggestions */}
            {suggestions.length > 0 && !isLoading && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    className="text-[11px] px-2.5 py-1.5 rounded-full border bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3 shrink-0">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta sobre tus datos..."
                className="min-h-[40px] max-h-[100px] text-sm resize-none flex-1"
                rows={1}
              />
              <Button
                size="icon"
                className="shrink-0 gradient-brand border-0 text-white hover:opacity-90 h-10 w-10"
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
