'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Sparkles, Map as MapIcon, AlertTriangle, Droplets } from 'lucide-react';
import { ArcGISQueryService } from '@/utils/ArcGISQueryService';
import L from 'leaflet';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    isToolOutput?: boolean;
}

interface ChatWidgetProps {
    map: L.Map | null;
    highlightedFeature: any;
    planningData: any;
    onLayerAction?: (layerName: string, visible: boolean) => void;
}

const ChatWidget = ({ map, highlightedFeature, planningData, onLayerAction }: ChatWidgetProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Hi! I\'m your Geo-AI Assistant. I can help you find information about zoning, overlays, easements, and infrastructure on this property. What would you like to know?'
        }
    ]);
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);

        try {
            // 1. Send message to API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMsg],
                    context: {
                        feature: highlightedFeature,
                        planning: planningData
                    }
                })
            });

            const data = await response.json();

            // 2. Handle Tool Calls (Client-Side Execution)
            if (data.toolCall) {
                let toolResult = '';

                if (data.toolCall === 'check_easements') {
                    const result = await ArcGISQueryService.checkEasements(highlightedFeature.geometry, map!);
                    toolResult = result.message;
                } else if (data.toolCall === 'check_stormwater') {
                    const result = await ArcGISQueryService.checkStormwater(highlightedFeature.geometry, map!);
                    toolResult = result.message;
                } else if (data.toolCall === 'set_layer_visibility') {
                    if (onLayerAction && data.args && data.args.layer) {
                        const visible = data.args.visible !== false; // Default to true
                        onLayerAction(data.args.layer, visible);
                        toolResult = `${visible ? 'Activated' : 'Deactivated'} ${data.args.layer} layer.`;
                    } else {
                        toolResult = 'Could not toggle layer (function not available).';
                    }
                }

                // 3. Send Tool Result back to API for final answer
                const toolMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'user',
                    content: `[Tool Result]: ${toolResult}`,
                    isToolOutput: true
                };

                // Optional: Show tool progress
                // setMessages(prev => [...prev, { id: 'tool', role: 'assistant', content: 'Checking map layers...' }]);

                const finalResponse = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [...messages, userMsg, toolMsg],
                        context: {
                            feature: highlightedFeature,
                            planning: planningData
                        }
                    })
                });

                const finalData = await finalResponse.json();
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: finalData.content }]);

            } else {
                // Simple text response
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.content }]);
            }

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Sorry, I encountered an error processing your request.' }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[2000] flex flex-col items-end pointer-events-none">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white rounded-lg shadow-2xl w-[350px] h-[500px] mb-4 flex flex-col overflow-hidden border border-gray-200 animate-in slide-in-from-bottom-10 fade-in duration-200 pointer-events-auto">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            <h3 className="font-bold">Geo-AI Assistant</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((msg) => (
                            !msg.isToolOutput && (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-lg p-3 text-sm ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            )
                        ))}
                        {isThinking && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-200 rounded-lg p-3 rounded-bl-none shadow-sm flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-white border-t border-gray-100">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask about overlays, pipes..."
                                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                disabled={isThinking}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isThinking}
                                className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center pointer-events-auto ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
            >
                <MessageCircle className="w-6 h-6" />
            </button>
        </div>
    );
};

export default ChatWidget;
