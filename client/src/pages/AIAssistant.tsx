import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Bot, User, Sparkles, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'مرحباً! 👋 أنا مساعدك الذكي في Life OS. يمكنني مساعدتك في إدارة مهامك وأهدافك وعاداتك. اسألني عن أي شيء!',
  timestamp: new Date(),
};

const suggestions = [
  '📋 ما هي مهامي المعلقة اليوم؟',
  '🎯 كيف حال تقدمي في أهدافي؟',
  '💡 اقترح لي خطة عمل لهذا الأسبوع',
  '⏰ كيف أحسن إدارة وقتي؟',
  '📊 أعطني ملخص عن إنتاجيتي',
  '✨ ما هي أفضل العادات للنجاح؟',
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatMutation = trpc.assistant.chat.useMutation({
    onError: () => {
      toast.error('حدث خطأ في الاتصال بالمساعد الذكي');
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || chatMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');

    // Prepare message history for LLM (exclude welcome + limit context)
    const historyForLLM = updatedMessages
      .filter(m => m.id !== 'welcome')
      .slice(-10) // Keep last 10 messages for context
      .map(m => ({ role: m.role, content: m.content }));

    const result = await chatMutation.mutateAsync({ messages: historyForLLM });

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: result.response,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
  };

  const handleReset = () => {
    setMessages([WELCOME_MESSAGE]);
    setInput('');
  };

  const showSuggestions = messages.length <= 1;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1 flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-primary" />
              المساعد الذكي
            </h1>
            <p className="text-muted-foreground">مساعدك الشخصي لإدارة إنتاجيتك</p>
          </div>
          {messages.length > 1 && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 ml-1" />
              محادثة جديدة
            </Button>
          )}
        </div>

        <Card className="flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
          {/* Messages Area */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted text-foreground rounded-tl-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p className={`text-xs mt-1.5 ${
                    message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {message.timestamp.toLocaleTimeString('ar-SA', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Suggestions */}
            {showSuggestions && (
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-3">💬 اقتراحات للبدء:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start text-right h-auto py-2.5 px-3 text-sm hover:bg-primary/5 hover:border-primary/30 transition-colors"
                      onClick={() => handleSendMessage(suggestion)}
                      disabled={chatMutation.isPending}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {chatMutation.isPending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">جاري التفكير...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </CardContent>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                placeholder="اكتب رسالتك هنا..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !chatMutation.isPending) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={chatMutation.isPending}
                className="text-sm"
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={chatMutation.isPending || !input.trim()}
                size="icon"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
