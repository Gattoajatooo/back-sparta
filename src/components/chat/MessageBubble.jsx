import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const TypewriterText = ({ text, onComplete, onProgress }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        // Reset apenas se o texto mudou significativamente (não apenas cresceu)
        if (text && !text.startsWith(displayedText)) {
            setDisplayedText('');
            setIsComplete(false);
        }
    }, [text, displayedText]);

    useEffect(() => {
        if (!text || isComplete) return;

        if (displayedText.length < text.length) {
            const timer = setTimeout(() => {
                setDisplayedText(text.substring(0, displayedText.length + 1));
                // Chamar onProgress para atualizar scroll
                if (onProgress) {
                    onProgress();
                }
            }, 10); // Mudado de 25ms para 10ms

            return () => clearTimeout(timer);
        } else if (displayedText.length === text.length && displayedText.length > 0) {
            setIsComplete(true);
            if (onComplete) {
                onComplete();
            }
        }
    }, [displayedText, text, isComplete, onComplete, onProgress]);

    return (
        <ReactMarkdown 
            className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
                p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
            }}
        >
            {displayedText}
        </ReactMarkdown>
    );
};

export default function MessageBubble({ message, isTyping = false, onTypingComplete, onTypingProgress }) {
    const isUser = message.role === 'user';

    // Não renderizar mensagens de ferramentas (tool calls)
    if (message.role === 'tool') {
        return null;
    }

    return (
        <div className={cn("flex gap-3 my-4", isUser ? "justify-end" : "justify-start")}>
            {!isUser && (
                 <Avatar className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <AvatarFallback className="bg-transparent">
                        <Bot className="w-5 h-5" />
                    </AvatarFallback>
                </Avatar>
            )}
            <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
                {message.content && (
                    <div className={cn(
                        "rounded-2xl px-4 py-2.5",
                        isUser ? "bg-blue-600 text-white rounded-br-lg" : "bg-white border border-slate-200 rounded-bl-lg"
                    )}>
                        {isUser ? (
                            <p className="text-sm leading-relaxed">{message.content}</p>
                        ) : isTyping ? (
                            <TypewriterText 
                                text={message.content} 
                                onComplete={onTypingComplete}
                                onProgress={onTypingProgress}
                            />
                        ) : (
                            <ReactMarkdown 
                                className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                                components={{
                                    p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                                    ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                                    ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}