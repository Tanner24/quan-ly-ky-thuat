import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const InstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI notify the user they can install the PWA
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-50 animate-fade-in-up">
            <div className="bg-white rounded-xl shadow-2xl p-4 border border-blue-100 flex items-center gap-4 max-w-sm ml-auto">
                <div className="bg-blue-100 p-3 rounded-full">
                    <Download className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-slate-900">Cài đặt Ứng dụng</h3>
                    <p className="text-xs text-slate-500">Thêm Vincons Tech vào màn hình chính để truy cập nhanh hơn.</p>
                </div>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={handleInstallClick}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-sm transition-colors"
                    >
                        Cài đặt
                    </button>
                    <button
                        onClick={() => setShowPrompt(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                        Để sau
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPrompt;
