import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import {
    MessageCircle, X, Send, Bot, User,
    Trash2, Sparkles, Loader2, Minimize2
} from 'lucide-react';

const AIChatPopup = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    // Load chat history
    const messages = useLiveQuery(() => db.chatHistory.orderBy('timestamp').toArray()) || [];
    const messagesEndRef = useRef(null);

    // Scroll to bottom on new message
    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, isTyping]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input.trim();
        setInput('');

        // Save User Message
        await db.chatHistory.add({
            role: 'user',
            content: userMsg,
            timestamp: new Date()
        });

        setIsTyping(true);

        // Simulate AI Processing (or call API in future)
        setTimeout(async () => {
            const aiResponse = await generateResponse(userMsg);

            await db.chatHistory.add({
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date()
            });
            setIsTyping(false);
        }, 1500);
    };

    const generateResponse = async (query) => {
        const q = query.toLowerCase();

        // Greeting
        if (q.includes('xin chào') || q.includes('hi') || q.includes('chào')) {
            return "Xin chào! Tôi là Trợ lý AI của hệ thống. Tôi có thể giúp anh tra cứu nhanh danh sách xe, lịch bảo dưỡng hoặc thông tin mã lỗi. Anh cần kiểm tra gì không ạ?";
        }

        // Query: Total Vehicles -> Breakdown
        if (q.includes('bao nhiêu xe') || (q.includes('tổng') && q.includes('xe'))) {
            const allVehicles = await db.vehicles.toArray();
            const total = allVehicles.length;
            const active = allVehicles.filter(v => v.status === 'active' || v.status === 'operating').length;
            const maintenance = allVehicles.filter(v => v.status === 'maintenance' || v.status === 'repairing').length;
            const standby = total - active - maintenance;

            return `Hệ thống hiện đang quản lý tổng số **${total} phương tiện**:
• 🟢 Đang hoạt động: ${active} xe
• 🟠 Đang bảo dưỡng/sửa chữa: ${maintenance} xe
• ⚪ Trạng thái khác: ${standby} xe

Anh có muốn xem danh sách các xe đang bảo dưỡng không?`;
        }

        // Query: Maintenance List (Sắp bảo dưỡng OR Đang bảo dưỡng)
        if (q.includes('bảo dưỡng') || q.includes('sửa chữa') || q.includes('đến hạn')) {
            const allVehicles = await db.vehicles.toArray();

            // 1. In Maintenance (Status = maintenance)
            const inWorkshop = allVehicles.filter(v => v.status === 'maintenance' || v.status === 'repairing');

            // 2. Overdue (Next Maintenance < Current)
            const overdue = allVehicles.filter(v =>
                v.nextMaintenanceHours && (Number(v.currentHours || 0) > Number(v.nextMaintenanceHours))
            );

            // 3. Upcoming (Within 50h)
            const upcoming = allVehicles.filter(v =>
                v.nextMaintenanceHours &&
                (Number(v.nextMaintenanceHours) - Number(v.currentHours || 0) <= 50) &&
                (Number(v.nextMaintenanceHours) - Number(v.currentHours || 0) >= 0)
            );

            let response = "";

            if (inWorkshop.length > 0) {
                response += `🟧 **ĐANG TRONG XƯỞNG (${inWorkshop.length} xe):**\n`;
                inWorkshop.forEach(v => {
                    response += `- **${v.plateNumber}** (${v.model}): ${v.department || 'Chưa rõ bộ phận'}\n`;
                });
                response += "\n";
            }

            if (overdue.length > 0) {
                response += `🟥 **QUÁ HẠN BẢO DƯỠNG (${overdue.length} xe):**\n`;
                overdue.forEach(v => {
                    const hoursOver = Number(v.currentHours || 0) - Number(v.nextMaintenanceHours);
                    response += `- **${v.plateNumber}**: Quá ${hoursOver} giờ\n`;
                });
                response += "\n";
            }

            if (upcoming.length > 0) {
                response += `🟨 **SẮP ĐẾN HẠN (${upcoming.length} xe):**\n`;
                upcoming.forEach(v => {
                    const remaining = Number(v.nextMaintenanceHours) - Number(v.currentHours || 0);
                    response += `- **${v.plateNumber}**: Còn ${remaining} giờ nữa\n`;
                });
            }

            if (!response) {
                return "Tuyệt vời! Hiện tại đội xe đang hoạt động ổn định, không có xe nào cần bảo dưỡng gấp.";
            }

            return response;
        }

        // Query: Error Codes
        if (q.includes('mã lỗi') || q.includes('lỗi')) {
            // Check specific code like "Lỗi E001"
            const words = q.split(' ');
            const potentialCode = words.find(w => /^[A-Z][0-9]+/.test(w.toUpperCase())); // Basic regex for E001, P123...

            if (potentialCode) {
                const code = potentialCode.toUpperCase();
                const err = await db.errorCodes.where('code').equals(code).first();
                if (err) {
                    return `🔍 **Thông tin lỗi ${code}:**
**Mô tả:** ${err.description}
**Khắc phục:**
${err.fixSteps}`;
                }
            }

            return "Anh vui lòng nhập chính xác mã lỗi (ví dụ: 'Lỗi E001' hoặc 'P0300') để em tra cứu chi tiết nhé.";
        }

        // Default
        return "Em chưa hiểu rõ ý anh lắm. Anh có thể hỏi về:\n- Danh sách xe bảo dưỡng\n- Tổng số xe\n- Tra cứu mã lỗi cụ thể";
    };

    const clearHistory = async () => {
        if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử trò chuyện?')) {
            await db.chatHistory.clear();
        }
    };

    return (
        <>
            {/* Toggle Button (Floating) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center
                    ${isOpen ? 'bg-slate-200 text-slate-600 rotate-90' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'}
                `}
                title="Trò chuyện với AI"
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7" />}
            </button>

            {/* Chat Window */}
            <div className={`
                fixed bottom-24 right-6 z-50 w-[90vw] md:w-[400px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 origin-bottom-right
                ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-10 pointer-events-none'}
            `} style={{ height: '600px', maxHeight: '80vh' }}>

                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between text-white shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Trợ lý Kỹ thuật AI</h3>
                            <p className="text-[10px] text-blue-100 opacity-90 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                                Sẵn sàng hỗ trợ
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={clearHistory} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Xóa lịch sử">
                            <Trash2 className="w-4 h-4 text-blue-100" />
                        </button>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors md:hidden">
                            <Minimize2 className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scrollbar-thin scrollbar-thumb-slate-300">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center px-6">
                            <Bot className="w-12 h-12 mb-3 text-slate-300" />
                            <p className="text-sm">Xin chào! Tôi có thể giúp gì cho bạn hôm nay?</p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                <span
                                    onClick={() => setInput('Tổng số xe là bao nhiêu?')}
                                    className="text-xs bg-white text-blue-600 px-3 py-1.5 rounded-full border border-blue-100 cursor-pointer hover:bg-blue-50 transition-colors shadow-sm"
                                >
                                    Tổng số xe?
                                </span>
                                <span
                                    onClick={() => setInput('Có xe nào sắp đến hạn bảo dưỡng không?')}
                                    className="text-xs bg-white text-blue-600 px-3 py-1.5 rounded-full border border-blue-100 cursor-pointer hover:bg-blue-50 transition-colors shadow-sm"
                                >
                                    Xe sắp bảo dưỡng?
                                </span>
                                <span
                                    onClick={() => setInput('Lỗi E001 là gì?')}
                                    className="text-xs bg-white text-blue-600 px-3 py-1.5 rounded-full border border-blue-100 cursor-pointer hover:bg-blue-50 transition-colors shadow-sm"
                                >
                                    Tra lỗi E001
                                </span>
                            </div>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`
                                max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm
                                ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}
                            `}>
                                <div className="leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                                <div className={`text-[10px] mt-1 text-right ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                                    {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Footer Input */}
                <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Nhập câu hỏi..."
                        className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </form>
            </div>
        </>
    );
};

export default AIChatPopup;
