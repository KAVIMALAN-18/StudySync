import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, HelpCircle, Code, List, Copy, RotateCcw, Check, Sparkle } from 'lucide-react';
import { ai as aiApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export const AIAssistant = ({ roomId }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your Gemini AI assistant. I can explain concepts, quiz you, or summarize your notes. How can I help you study today?" }
  ]);
  const [input, setInput] = useState('');
  const [activeMode, setActiveMode] = useState('doubt');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  const SUGGESTIONS = [
    { label: 'Explain Concept', icon: HelpCircle, prompt: 'Explain the concept of [insert topic] as if I were 10 years old.', mode: 'explain' },
    { label: 'Quiz Me', icon: Sparkles, prompt: 'Generate 3 multiple-choice questions about [insert topic].', mode: 'quiz' },
    { label: 'Summarize', icon: List, prompt: 'Summarize the following text for me: ', mode: 'summary' },
    { label: 'Ask Doubt', icon: Code, prompt: 'Clear my doubt about...', mode: 'doubt' }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e, customPrompt = null) => {
    e?.preventDefault();
    const promptToSend = customPrompt || input.trim();
    if (!promptToSend || isLoading) return;

    if (!customPrompt) {
      const userMessage = { role: 'user', content: promptToSend };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
    }
    
    setIsLoading(true);

    try {
      const response = await aiApi.chat(promptToSend, activeMode);
      const reply = response.reply || response.data?.reply || 'No reply received.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      console.error('AI Chat Error:', error);
      setMessages(prev => [...prev, { role: 'system', content: error.message || 'Failed to get a response from AI. Please try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestion = (prompt, mode) => {
    setInput(prompt);
    setActiveMode(mode);
    document.getElementById('ai-input')?.focus();
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success('Response copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const regenerateResponse = () => {
    // Find last user message
    const userMsgs = messages.filter(m => m.role === 'user');
    if (userMsgs.length === 0) {
      toast.error('No prompt to regenerate');
      return;
    }
    const lastPrompt = userMsgs[userMsgs.length - 1].content;
    handleSend(null, lastPrompt);
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const code = match ? match[2].trim() : part.replace(/```/g, '').trim();
        return (
          <pre key={index} className="bg-slate-950 border border-border p-3 rounded-lg overflow-x-auto text-[11px] font-mono text-indigo-300 my-2.5 max-w-full">
            <code>{code}</code>
          </pre>
        );
      }
      
      const lines = part.split('\n');
      return lines.map((line, lIdx) => {
        const cleanLine = line.trim();
        if (cleanLine.startsWith('###')) {
          return <h4 key={lIdx} className="text-xs font-bold text-white mt-3 mb-1.5">{cleanLine.replace('###', '').trim()}</h4>;
        }
        if (cleanLine.startsWith('##')) {
          return <h3 key={lIdx} className="text-sm font-bold text-white mt-4 mb-2">{cleanLine.replace('##', '').trim()}</h3>;
        }
        if (cleanLine.startsWith('#')) {
          return <h2 key={lIdx} className="text-base font-bold text-white mt-4 mb-2">{cleanLine.replace('#', '').trim()}</h2>;
        }
        if (cleanLine.startsWith('*') || cleanLine.startsWith('-')) {
          return (
            <ul key={lIdx} className="list-disc list-inside ml-2 text-xs text-slate-300 space-y-0.5 my-1">
              <li>{cleanLine.substring(1).trim()}</li>
            </ul>
          );
        }
        if (cleanLine === '') return <div key={lIdx} className="h-2" />;
        
        let formattedText = cleanLine;
        const boldRegex = /\*\*(.*?)\*\*/g;
        const matches = [...formattedText.matchAll(boldRegex)];
        
        if (matches.length > 0) {
          const segments = [];
          let lastIndex = 0;
          matches.forEach((match, mIdx) => {
            segments.push(formattedText.substring(lastIndex, match.index));
            segments.push(<strong key={mIdx} className="font-bold text-white">{match[1]}</strong>);
            lastIndex = match.index + match[0].length;
          });
          segments.push(formattedText.substring(lastIndex));
          return <p key={lIdx} className="text-xs text-slate-300 leading-relaxed my-1.5">{segments}</p>;
        }
        
        return <p key={lIdx} className="text-xs text-slate-300 leading-relaxed my-1.5">{cleanLine}</p>;
      });
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden select-text">
      {/* Header */}
      <div className="p-5 border-b border-border flex items-center justify-between shrink-0 bg-slate-950/40">
        <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
          <Bot size={16} className="text-indigo-400" /> AI Study Assistant
        </h3>
        <span className="text-[10px] text-indigo-400 font-bold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
          Google Gemini
        </span>
      </div>

      {/* Mode selectors */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 border-b border-border shrink-0">
        {['doubt', 'explain', 'summary', 'quiz'].map((m) => (
          <button 
            key={m} 
            type="button"
            className={cn(
              "py-1 rounded text-[10px] font-bold text-center tracking-wider text-slate-400 transition-all cursor-pointer focus:outline-none",
              activeMode === m ? "bg-indigo-600/10 text-indigo-400 font-semibold" : "hover:text-white"
            )}
            onClick={() => setActiveMode(m)}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Suggestions scroll area */}
      <div className="flex gap-1.5 p-3 overflow-x-auto whitespace-nowrap bg-slate-950/20 border-b border-border shrink-0 viewport-scroll">
        {SUGGESTIONS.map((sug, i) => (
          <button 
            key={i} 
            onClick={() => handleSuggestion(sug.prompt, sug.mode)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.02] hover:bg-white/[0.05] border border-border text-[10px] font-bold text-slate-300 transition-all cursor-pointer shrink-0"
          >
            <sug.icon size={11} className="text-indigo-400" />
            {sug.label}
          </button>
        ))}
      </div>

      {/* Messages scrolling list */}
      <ScrollArea className="flex-1 p-5">
        <div className="space-y-6">
          {messages.map((msg, idx) => {
            if (msg.role === 'system') {
              return (
                <div key={idx} className="flex justify-center my-2 select-none animate-scale-up">
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded bg-red-500/5 border border-red-500/20 text-red-400">
                    {msg.content}
                  </span>
                </div>
              );
            }

            const isUser = msg.role === 'user';
            
            return (
              <div 
                key={idx} 
                className={cn(
                  "flex gap-4 items-start animate-scale-up max-w-[85%]",
                  isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none",
                  isUser 
                    ? "bg-slate-900 text-slate-300 border border-border" 
                    : "bg-indigo-600/20 text-indigo-400 border border-indigo-500/10"
                )}>
                  {isUser ? (user?.username?.[0] || 'U').toUpperCase() : <Sparkle size={13} className="animate-pulse" />}
                </div>
                
                <div className="space-y-2 flex-1">
                  <div className={cn(
                    "bg-slate-900 border border-border rounded-xl p-4 shadow-sm",
                    isUser ? "rounded-tr-none bg-indigo-900/10 border-indigo-500/20" : "rounded-tl-none bg-slate-900/60"
                  )}>
                    {isUser ? (
                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="space-y-1.5">{renderMarkdown(msg.content)}</div>
                    )}
                  </div>

                  {/* AI controls: copy response, regenerate */}
                  {!isUser && (
                    <div className="flex gap-2 text-slate-500 items-center pl-2 select-none">
                      <button 
                        onClick={() => copyToClipboard(msg.content, idx)}
                        className="inline-flex items-center gap-1.5 text-[9px] font-bold hover:text-slate-300 transition-colors cursor-pointer"
                        title="Copy Response"
                      >
                        {copiedIndex === idx ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        {copiedIndex === idx ? 'Copied' : 'Copy'}
                      </button>
                      <button 
                        onClick={regenerateResponse}
                        className="inline-flex items-center gap-1.5 text-[9px] font-bold hover:text-slate-300 transition-colors cursor-pointer"
                        title="Regenerate Prompt"
                      >
                        <RotateCcw size={11} />
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Loading Animation */}
          {isLoading && (
            <div className="flex gap-4 items-start animate-scale-up mr-auto max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 select-none border border-indigo-500/10">
                <Bot size={13} className="animate-spin" />
              </div>
              <div className="bg-slate-900 border border-border rounded-xl rounded-tl-none p-4 w-28 shrink-0 flex items-center justify-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message input */}
      <div className="p-4 border-t border-border bg-slate-950/40 shrink-0">
        <form onSubmit={(e) => handleSend(e)} className="flex gap-2">
          <input
            id="ai-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI anything..."
            className="flex-1 h-10 bg-slate-900 border border-border rounded-lg px-3.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
            disabled={isLoading}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="inline-flex items-center justify-center rounded-lg text-xs font-semibold h-10 w-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-900 text-white disabled:text-slate-600 transition-all cursor-pointer shrink-0"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
};
