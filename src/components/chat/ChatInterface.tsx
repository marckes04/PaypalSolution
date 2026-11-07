'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

interface ChatInterfaceProps {
  onOrderCreated?: (order?: any) => void;
}

export default function ChatInterface({ onOrderCreated }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg_welcome',
      sender: 'bot',
      text: "Please provide a valid procurement request. Example: 'Procure 2 ergonomic keyboards at $60 each for Engineering'.",
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }),
    },
  ]);
  const [input, setInput] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || loading) return;

    const userTimestamp = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const userMessage: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: `[Dept: ${department}] ${trimmedInput}`,
      timestamp: userTimestamp,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedInput,
          department: department,
        }),
      });

      const data = await res.json();
      const botTimestamp = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      const botMessage: Message = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: data.reply || 'Request received and evaluated.',
        timestamp: botTimestamp,
      };

      setMessages((prev) => [...prev, botMessage]);

      // INYECCIÓN INMEDIATA A AG GRID Y KPIS
      if (data.order) {
        if (onOrderCreated) {
          onOrderCreated(data.order);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('order-created', {
              detail: data.order,
            })
          );
        }
      }
    } catch (err) {
      console.error('[CHAT_SUBMIT_ERROR]:', err);
      const errorMessage: Message = {
        id: `bot_err_${Date.now()}`,
        sender: 'bot',
        text: 'Error processing requisition. Please verify connection and retry.',
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[600px] w-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
        <div className="flex items-center gap-2">
          <Bot className="text-sky-400" size={18} />
          <h2 className="text-sm font-semibold text-zinc-100">PayAgent Assistant</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Dept:</span>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-sky-500"
          >
            <option value="Engineering">Engineering</option>
            <option value="Marketing">Marketing</option>
            <option value="Sales">Sales</option>
            <option value="Operations">Operations</option>
          </select>
        </div>
      </div>

      {/* Messages Viewport */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                  isUser ? 'bg-zinc-800 text-zinc-300' : 'bg-sky-950/60 text-sky-400 border border-sky-800/40'
                }`}
              >
                {isUser ? <User size={14} /> : <Bot size={14} />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-sky-600 text-white rounded-tr-none'
                    : 'bg-zinc-800/90 text-zinc-200 rounded-tl-none border border-zinc-700/40'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <div
                  className={`mt-1.5 flex items-center gap-1 text-[10px] ${
                    isUser ? 'text-sky-200 justify-end' : 'text-zinc-500'
                  }`}
                >
                  <span>🕒 {msg.timestamp}</span>
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-sky-950/60 text-sky-400 border border-sky-800/40 flex items-center justify-center shrink-0">
              <Bot size={14} />
            </div>
            <div className="bg-zinc-800/90 rounded-2xl rounded-tl-none px-4 py-2.5 border border-zinc-700/40 flex items-center gap-2 text-xs text-zinc-400">
              <Loader2 className="animate-spin text-sky-400" size={14} />
              Evaluating requisition policies &amp; limits...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-800 bg-zinc-900/60">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Submit requisition for ${department}...`}
            disabled={loading}
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-4 pr-11 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white flex items-center justify-center transition-colors shadow-md shadow-sky-600/20"
          >
            <Send size={13} />
          </button>
        </div>
      </form>
    </div>
  );
}