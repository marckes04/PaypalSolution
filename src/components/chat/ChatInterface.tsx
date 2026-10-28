'use client';

import React, { useState } from 'react';
import { Send, Bot, User, Clock } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Markdown-Parser für fettgedruckten Text, Links, Code und Aufzählungslisten
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) return <div key={lineIdx} className="h-2" />;

        const formatInline = (text: string) => {
          const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g);

          return parts.map((part, partIdx) => {
            const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
              return (
                <a
                  key={partIdx}
                  href={linkMatch[2]}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:text-sky-300 underline font-medium break-all"
                >
                  {linkMatch[1]}
                </a>
              );
            }

            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={partIdx} className="font-semibold text-zinc-100">
                  {part.slice(2, -2)}
                </strong>
              );
            }

            if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <code
                  key={partIdx}
                  className="font-mono text-xs bg-zinc-900 border border-zinc-700/80 px-1.5 py-0.5 rounded text-sky-300"
                >
                  {part.slice(1, -1)}
                </code>
              );
            }

            return part;
          });
        };

        if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
          const itemText = line.trim().replace(/^[•\-]\s*/, '');
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-1 text-zinc-300">
              <span className="text-sky-400 text-xs mt-1">•</span>
              <span>{formatInline(itemText)}</span>
            </div>
          );
        }

        return <p key={lineIdx}>{formatInline(line)}</p>;
      })}
    </div>
  );
}

export function ChatInterface() {
  const [selectedDept, setSelectedDept] = useState('Engineering');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const formatCurrentTime = () => {
    return new Date().toLocaleString('en-US', {
      dateStyle: 'short',
      timeStyle: 'medium',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `[Dept: ${selectedDept}] ${query}`,
      timestamp: formatCurrentTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error('Failed to communicate with PayAgent');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      const assistantMessageId = (Date.now() + 1).toString();
      const assistantTimestamp = formatCurrentTime();

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: assistantTimestamp,
        },
      ]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          assistantText += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, content: assistantText } : msg
            )
          );
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: 'Sorry, an error occurred while processing your requisition.',
          timestamp: formatCurrentTime(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-sky-400" />
          <h2 className="font-semibold text-zinc-100">PayAgent Assistant</h2>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400">Dept:</span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 outline-none focus:border-sky-500"
          >
            <option value="Engineering">Engineering</option>
            <option value="Marketing">Marketing</option>
            <option value="Operations">Operations</option>
            <option value="Executive">Executive</option>
          </select>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-sm text-center px-4">
            <p>Welcome to PayAgent. Describe the supplies, services, or equipment you need to procure.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-sky-950 border border-sky-600/50 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-sky-400" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm flex flex-col justify-between ${
                    isUser
                      ? 'bg-sky-600 text-white rounded-tr-none'
                      : 'bg-zinc-800 border border-zinc-700/60 text-zinc-200 rounded-tl-none'
                  }`}
                >
                  <FormattedMessage content={m.content} />

                  <div
                    className={`mt-2.5 pt-1.5 border-t text-[10px] flex items-center gap-1 ${
                      isUser
                        ? 'border-sky-500/40 text-sky-100 justify-end'
                        : 'border-zinc-700/60 text-zinc-400 justify-start'
                    }`}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    <span>{m.timestamp}</span>
                  </div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-zinc-400" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Input Field */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800 bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Submit requisition for ${selectedDept}...`}
            className="flex-1 bg-zinc-800 border border-zinc-700/80 rounded-lg px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white p-2.5 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatInterface;