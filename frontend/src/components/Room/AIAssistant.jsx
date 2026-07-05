import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, HelpCircle, Code, List } from 'lucide-react';
import { ai as aiApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export const AIAssistant = ({ roomId }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your Gemini AI assistant. I can explain concepts, quiz you, or summarize your notes. How can I help you study today?" }
  ]);
  const [input, setInput] = useState('');
  const [activeMode, setActiveMode] = useState('doubt'); // 'doubt' | 'summary' | 'quiz' | 'explain'
  const [isLoading, setIsLoading] = useState(false);
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

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await aiApi.chat(input.trim(), activeMode);
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

  return (
    <div className="ai-panel">
      {/* Header */}
      <div className="panel-gradient-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>
          <Bot size={16} /> Gemini AI
        </div>
        <div className="badge badge-purple" style={{ border: 'none', background: 'rgba(255,255,255,0.2)' }}>
          Powered by Google
        </div>
      </div>

      {/* Mode Selector Tab Pills */}
      <div style={{ display: 'flex', gap: '0.25rem', padding: '0.5rem', background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid var(--border-color)' }}>
        {['doubt', 'explain', 'summary', 'quiz'].map((m) => (
          <button 
            key={m} 
            type="button"
            className="tab-pill" 
            style={{ 
              flex: 1, 
              padding: '0.25rem 0.5rem', 
              fontSize: '0.72rem', 
              borderRadius: '4px',
              textTransform: 'capitalize',
              background: activeMode === m ? 'rgba(129, 140, 248, 0.2)' : 'transparent',
              border: 'none',
              color: activeMode === m ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: activeMode === m ? 600 : 400
            }}
            onClick={() => setActiveMode(m)}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Suggestion Chips */}
      <div className="ai-chips-bar">
        {SUGGESTIONS.map((sug, i) => (
          <button key={i} className="ai-chip" onClick={() => handleSuggestion(sug.prompt, sug.mode)}>
            <sug.icon size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            {sug.label}
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <div className="ai-messages">
        {messages.map((msg, idx) => {
          if (msg.role === 'system') {
            return (
              <div key={idx} style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                <span className="chat-bubble-system" style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' }}>
                  {msg.content}
                </span>
              </div>
            );
          }

          const isUser = msg.role === 'user';
          
          return (
            <div key={idx} className={isUser ? 'ai-msg-user' : 'ai-msg-ai'}>
              {!isUser && (
                <div className="ai-bot-avatar">
                  <Bot size={14} color="white" />
                </div>
              )}
              
              <div className={isUser ? 'ai-bubble-user' : 'ai-bubble-ai'}>
                {msg.content}
              </div>

              {isUser && (
                <div className="ai-user-avatar">
                  {(user?.username?.[0] || 'U').toUpperCase()}
                </div>
              )}
            </div>
          );
        })}
        
        {isLoading && (
          <div className="ai-msg-ai">
            <div className="ai-bot-avatar">
              <Bot size={14} color="white" />
            </div>
            <div className="ai-bubble-ai">
              <div className="ai-typing">
                <div className="typing-dot" style={{ animation: 'bounce-dot 1.4s infinite ease-in-out both', animationDelay: '-0.32s' }} />
                <div className="typing-dot" style={{ animation: 'bounce-dot 1.4s infinite ease-in-out both', animationDelay: '-0.16s' }} />
                <div className="typing-dot" style={{ animation: 'bounce-dot 1.4s infinite ease-in-out both' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="ai-input-bar">
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
          <input
            id="ai-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Gemini anything..."
            className="ai-input"
            disabled={isLoading}
            autoComplete="off"
          />
          <button
            type="submit"
            className="ai-send-btn"
            disabled={isLoading || !input.trim()}
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};
