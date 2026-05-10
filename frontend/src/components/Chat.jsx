import { useState, useRef, useEffect } from 'react';
import { Image, Send, Bot, User, Sparkles } from 'lucide-react';

const formatText = (text) => {
  if (!text) return "";
  let formatted = text
    .replace(/\*\*\*(.*?)\*\*\*/g, '<b><i>$1</i></b>')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>');
  formatted = formatted
    .split(/\n{2,}/)
    .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br />')}</p>`)
    .join('');
  return formatted;
};

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const sendMessage = async () => {
    if (!input.trim() && !file) return;
    const userMessage = { sender: 'user', text: input, file: file?.name || null, time: formatTime() };
    setMessages((prev) => [...prev, userMessage]);

    const formData = new FormData();
    formData.append('message', input);
    if (file) formData.append('file', file);

    setInput('');
    setFile(null);
    setIsTyping(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_URL || 'http://localhost:3000'}/chat`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
      const data = await response.json();
      setMessages((prev) => [...prev, {
        sender: 'bot',
        text: formatText(data.reply),
        time: formatTime(),
        isFormatted: true,
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [...prev, {
        sender: 'bot',
        text: formatText('Sorry, I couldn\'t process that. Please try again later or check your connection.'),
        time: formatTime(),
        isFormatted: true,
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen pt-4 pb-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 animate-fadeInUp">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-4">
            <Bot className="w-3.5 h-3.5" />
            Powered by AI Nutrition Assistant
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <span className="text-blue-400">Nutrition</span>{' '}
            <span className="text-emerald-400">Assistant</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base">Ask anything about food, diet, or nutrition</p>
        </div>

        {/* Chat Container */}
        <div className="rounded-2xl overflow-hidden border border-white/5 bg-white/3 backdrop-blur-sm animate-fadeInUp" style={{animationDelay: '0.1s', opacity: 0}}>
          {/* Messages */}
          <div className="h-[55vh] md:h-[60vh] overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-slate-400 text-sm mb-1">No messages yet</p>
                <p className="text-slate-500 text-xs max-w-xs">Ask me about nutrition facts, meal plans, healthy alternatives, or upload a food image!</p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''} animate-fadeInUp`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
                  msg.sender === 'user'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.sender === 'user'
                    ? 'bg-emerald-500 text-white rounded-tr-md'
                    : 'bg-white/5 border border-white/5 text-slate-200 rounded-tl-md'
                }`}>
                  {msg.isFormatted ? (
                    <div className="text-sm leading-relaxed [&_b]:font-semibold [&_p]:mb-1.5 [&_p:last-child]:mb-0" dangerouslySetInnerHTML={{ __html: msg.text }} />
                  ) : (
                    <div className="text-sm">{msg.text}</div>
                  )}
                  {msg.file && (
                    <div className="text-xs opacity-70 mt-1.5 flex items-center gap-1">📎 {msg.file}</div>
                  )}
                  <div className={`text-[10px] mt-1.5 ${msg.sender === 'user' ? 'text-emerald-200' : 'text-slate-500'} text-right`}>
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-blue-400" />
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex gap-1.5 items-center h-5">
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/5 p-4 bg-white/2">
            {file && (
              <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs">
                📎 {file.name}
                <button onClick={() => setFile(null)} className="text-blue-300 hover:text-white ml-1 text-sm">✕</button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about nutrition..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/5 focus:border-emerald-500/50 focus:ring-0 outline-none text-white placeholder-slate-500 text-sm transition-colors"
              />
              <label className="p-2.5 rounded-xl bg-white/5 hover:bg-blue-500/15 text-slate-400 hover:text-blue-400 cursor-pointer transition-colors border border-white/5">
                <Image className="w-5 h-5" />
                <input type="file" onChange={(e) => setFile(e.target.files[0])} className="hidden" accept="image/*" />
              </label>
              <button
                onClick={sendMessage}
                className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white transition-all shadow-lg shadow-emerald-500/20"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Suggestions */}
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {['What are high-protein foods?', 'Healthy breakfast ideas', 'Benefits of vitamin D', 'Low calorie snacks'].map(suggestion => (
            <button
              key={suggestion}
              onClick={() => { setInput(suggestion); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 bg-white/3 border border-white/5 hover:border-emerald-500/30 hover:text-emerald-400 transition-all"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Chat;
