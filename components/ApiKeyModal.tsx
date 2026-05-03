/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { Shield, ExternalLink, CreditCard, Loader2, KeyRound, AlertTriangle } from 'lucide-react';

interface ApiKeyModalProps {
  onKeySelected: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onKeySelected }) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      if (window.aistudio && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
        // Assume success as per instructions, wait a tick for env to propagate
        setTimeout(() => {
            onKeySelected();
        }, 500);
      }
    } catch (e) {
      console.error("Failed to open key selector", e);
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4">
      <div className="w-full max-w-md relative overflow-hidden glass-panel rounded-3xl border border-red-500/30 shadow-[0_0_50px_rgba(220,38,38,0.2)] animate-in fade-in zoom-in-95 duration-300">
        
        {/* Decorative Background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="p-8 relative z-10 flex flex-col items-center text-center space-y-6">
          
          <div className="w-16 h-16 bg-slate-900/50 rounded-2xl flex items-center justify-center border border-red-500/30 shadow-xl">
             <KeyRound className="w-8 h-8 text-red-400" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white font-sans">Paid Access Required</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Link2Ink requires advanced Gemini models capable of <span className="text-slate-200 font-semibold">Image Generation</span>. These models are not available on the free tier.
            </p>
          </div>

          <div className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-left">
             <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
             <div className="space-y-1">
                 <p className="text-xs font-bold text-red-200 uppercase tracking-wider">No Free Tier Access</p>
                 <p className="text-xs text-red-200/70 leading-relaxed">
                    You must select an API key associated with a <strong>Google Cloud Billing Project</strong>. Standard keys will result in errors.
                 </p>
             </div>
          </div>

          <button 
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full py-4 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-red-900/80 hover:to-red-800/80 border border-white/10 hover:border-red-500/50 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 group disabled:opacity-70"
          >
            {isConnecting ? (
                <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Connecting...
                </>
            ) : (
                <>
                    <CreditCard className="w-5 h-5 group-hover:text-red-200" /> Select Paid API Key
                </>
            )}
          </button>

          <div className="pt-4 border-t border-white/5 w-full">
             <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors font-mono"
             >
                View Billing Documentation <ExternalLink className="w-3 h-3" />
             </a>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
