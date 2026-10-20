'use client';

import React, { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';

export default function ChatInterface() {
  const { messages, append, isLoading } = useChat({
    api: '/api/agent/chat',
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [department, setDepartment] = useState('Engineering');

  const onFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = inputPrompt.trim();
    if (!trimmed || isLoading) return;

    setInputPrompt('');
    await append({
      role: 'user',
      content: `[Dept: ${department}] ${trimmed}`,
    });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="text-sky-400" size={18} />
          <h2 className="text-lg font-semibold text-zinc-100">PayAgent Assistant</h2>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400">Dept:</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="text-xs bg-zinc-800 text-zinc-200 border border-zinc-700 rounded px-2 py-1 outline-none"
          >
            <option value="Engineering">Engineering</option>
            <option value="Marketing">Marketing</option>
            <option value="Design">Design</option>
            <option value="Operations">Operations</option>
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 p-6">
            <Bot size={40} className="mb-3 text-zinc-600" />
            <p className="text-sm font-medium">No procurement requisitions submitted yet.</p>
            <p className="text-xs mt-1 text-zinc-600">
              Try: &ldquo;Procure 3 mechanical keyboards at $120 each for onboarding&rdquo;
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 text-sm ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role !== 'user' && (
              <div className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
                <Bot size={15} />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                m.role === 'user'
                  ? 'bg-sky-600 text-white rounded-br-none'
                  : 'bg-zinc-800/80 text-zinc-200 border border-zinc-700/60 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>

              {/* Render Tool Invocations */}
              {m.toolInvocations?.map((toolInvocation) => {
                const isCompleted = 'result' in toolInvocation;
                return (
                  <div
                    key={toolInvocation.toolCallId}
                    className="mt-2.5 p-2.5 rounded bg-zinc-950/70 border border-zinc-700/50 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between text-zinc-400 mb-1">
                      <span>Tool: {toolInvocation.toolName}</span>
                      <span>{isCompleted ? '✓ Done' : 'Calling...'}</span>
                    </div>
                    {isCompleted && (
                      <div className="text-emerald-400 mt-1">
                        Order ID: {toolInvocation.result.paypalOrderId} | Total: ${toolInvocation.result.totalAmount}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-zinc-700 text-zinc-300 flex items-center justify-center shrink-0">
                <User size={15} />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 items-center text-xs text-zinc-500 italic">
            <Loader2 size={13} className="animate-spin text-sky-400" />
            PayAgent is evaluating requisitions and calling tools...
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={onFormSubmit} className="p-3 border-t border-zinc-800 bg-zinc-900/60 flex gap-2">
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder={`Submit requisition for ${department}...`}
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 transition"
        />
        <button
          type="submit"
          disabled={isLoading || !inputPrompt.trim()}
          className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white p-2.5 rounded-lg transition"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}