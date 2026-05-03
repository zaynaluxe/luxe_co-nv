import React, { useState, useRef, useEffect } from "react";
import { Send, X, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const N8N_WEBHOOK = "https://n8n-n867.onrender.com/webhook/039cf66c-8c9f-4134-bd5f-d1da2fdee73e/chat";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = { role: "user" as const, text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(N8N_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatInput: input }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "bot" as const, text: data.output || "Désolé, je n'ai pas pu traiter votre demande." }]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { role: "bot" as const, text: "Une erreur est survenue lors de la communication avec l'assistant." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-[72px] right-3 min-[480px]:bottom-[80px] min-[480px]:right-4 z-[999] w-[calc(100vw-24px)] min-[480px]:w-[calc(100vw-32px)] max-w-[380px] h-[450px] bg-[#0a0a0a] border border-[#C9A227]/30 rounded-xl flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 bg-[#111] border-b border-[#C9A227]/20 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-serif text-[#C9A227] font-medium uppercase tracking-wider">Luxe & Co</h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Assistant Virtuel</p>
              </div>
              <button 
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-white transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-black to-[#0a0a0a]"
            >
              {messages.length === 0 && (
                <div className="text-center py-8 space-y-2">
                  <div className="w-12 h-12 bg-[#C9A227]/10 rounded-full flex items-center justify-center mx-auto text-[#C9A227]">
                    <MessageSquare size={20} />
                  </div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-widest">Comment puis-je vous aider ?</p>
                  <p className="text-[9px] text-gray-600 px-4">Posez-moi vos questions sur nos produits, la livraison ou nos services.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div 
                    className={`max-w-[85%] p-3 rounded-2xl text-[13px] leading-relaxed ${
                      m.role === "user" 
                        ? "bg-[#C9A227] text-black rounded-tr-none" 
                        : "bg-[#1a1a1a] text-gray-200 border border-white/5 rounded-tl-none"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#1a1a1a] p-3 rounded-2xl rounded-tl-none border border-white/5 flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#C9A227] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#C9A227] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#C9A227] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 bg-[#111] border-t border-[#C9A227]/20 flex gap-2">
              <input 
                type="text"
                value={input} 
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Écrivez votre message..."
                className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-[#C9A227]/50 transition-colors" 
              />
              <button 
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="bg-[#C9A227] text-black w-10 h-10 rounded-lg flex items-center justify-center hover:bg-[#B89120] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-4 right-4 z-[1000] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          open ? "bg-white text-black rotate-90" : "bg-[#C9A227] text-black hover:scale-105"
        }`}
      >
        {open ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </>
  );
}
