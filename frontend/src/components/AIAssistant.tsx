import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, X, Bot, User, Maximize2, Minimize2 } from 'lucide-react';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface AIAssistantProps {
    strategyCode: string;
    symbol: string;
    pnl: number | null;
    lastCandle: any | null;
    isOpen: boolean;
    onClose: () => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ strategyCode, symbol, pnl, lastCandle, isOpen, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading]);

    if (!isOpen) return null;

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('http://127.0.0.1:8000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_message: input,
                    chat_history: messages,
                    context: {
                        strategyCode,
                        symbol,
                        pnl,
                        lastCandle
                    }
                })
            });

            const data = await response.json();

            if (data.error) {
                setMessages(prev => [...prev, { role: 'assistant', content: `**Error:** ${data.error}` }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: '**Error:** Failed to connect to AI server.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`ai-chat-window ${isExpanded ? 'expanded' : ''}`}>
            <div className="ai-chat-header">
                <div className="ai-chat-title">
                    <Bot size={16} />
                    <span>AI Trading Assistant</span>
                </div>
                <div className="ai-chat-actions">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="icon-btn" title="Toggle Size">
                        {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                    <button onClick={onClose} className="icon-btn" title="Close">
                        <X size={14} />
                    </button>
                </div>
            </div>

            <div className="ai-chat-messages">
                {messages.length === 0 ? (
                    <div className="ai-welcome">
                        <Bot size={32} opacity={0.5} style={{ marginBottom: '8px', color: 'var(--accent, #8b5cf6)' }} />
                        <p style={{ fontWeight: 600 }}>I am your AI Trading Assistant.</p>
                        <p className="micro-text">I can read your code, current data, and performance. Ask me anything!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div key={idx} className={`chat-message ${msg.role}`}>
                            <div className="msg-icon">
                                {msg.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
                            </div>
                            <div className="msg-content markdown-body">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className="chat-message assistant">
                        <div className="msg-icon"><Bot size={14} /></div>
                        <div className="msg-content loading-dots">Thinking<span>.</span><span>.</span><span>.</span></div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="ai-chat-input-area">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about strategy or data..."
                    disabled={isLoading}
                    autoFocus
                />
                <button onClick={handleSend} disabled={isLoading || !input.trim()} className="send-btn">
                    <Send size={16} />
                </button>
            </div>
        </div>
    );
};
