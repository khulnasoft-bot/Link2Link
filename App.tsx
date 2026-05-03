/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import RepoAnalyzer from './components/RepoAnalyzer';
import ArticleToInfographic from './components/ArticleToInfographic';
import DevStudio from './components/DevStudio';
import Home from './components/Home';
import IntroAnimation from './components/IntroAnimation';
import ApiKeyModal from './components/ApiKeyModal';
import { ViewMode, RepoHistoryItem, ArticleHistoryItem } from './types';
import { Github, PenTool, GitBranch, FileText, Home as HomeIcon, CreditCard } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.HOME);
  const [showIntro, setShowIntro] = useState(true);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [checkingKey, setCheckingKey] = useState<boolean>(true);
  
  // Lifted History State for Persistence
  const [repoHistory, setRepoHistory] = useState<RepoHistoryItem[]>([]);
  const [articleHistory, setArticleHistory] = useState<ArticleHistoryItem[]>([]);
  const [devStudioData, setDevStudioData] = useState<any>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(has);
      } else {
        // In environments without the AI Studio bridge, strictly checking might block dev.
        // However, per instructions to "Require a paid key", we default false if we can't verify.
        // In a real deploy, window.aistudio is guaranteed.
        setHasApiKey(false);
      }
      setCheckingKey(false);
    };
    checkKey();
  }, []);

  const handleIntroComplete = () => {
    setShowIntro(false);
    // sessionStorage.setItem('hasSeenIntro', 'true'); // Disabled for dev/demo purposes
  };

  const handleNavigate = (mode: ViewMode, data?: any) => {
    if (data) setDevStudioData(data);
    setCurrentView(mode);
  };

  const handleAddRepoHistory = (item: RepoHistoryItem) => {
    setRepoHistory(prev => [item, ...prev]);
  };

  const handleAddArticleHistory = (item: ArticleHistoryItem) => {
    setArticleHistory(prev => [item, ...prev]);
  };

  const onReauthRequested = () => {
    setHasApiKey(false); // This will trigger the modal to reappear
  };

  if (checkingKey) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Enforce API Key Modal */}
      {!hasApiKey && <ApiKeyModal onKeySelected={() => setHasApiKey(true)} />}

      {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}

      <header className="sticky top-4 z-50 mx-auto w-[calc(100%-1rem)] md:w-[calc(100%-2rem)] max-w-[1400px]">
        <div className="glass-panel rounded-2xl px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <button 
            onClick={() => setCurrentView(ViewMode.HOME)}
            className="flex items-center gap-3 md:gap-4 group transition-opacity hover:opacity-80"
          >
            <div className="relative flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-xl bg-slate-900/50 border border-white/10 shadow-inner group-hover:border-violet-500/50 transition-colors">
               <PenTool className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-lg md:text-xl font-extrabold text-white tracking-tight font-sans flex items-center gap-2">
                Link2Ink <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-mono text-slate-400 border border-white/5 hidden sm:inline-block">Studio</span>
              </h1>
              <p className="text-xs font-mono text-slate-400 tracking-wider uppercase hidden sm:block">Visual Intelligence Platform</p>
            </div>
          </button>
          <div className="flex items-center gap-4">
            {hasApiKey && (
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-full text-[10px] font-bold text-emerald-400 font-mono uppercase tracking-widest cursor-help" title="API Key Active">
                    <CreditCard className="w-3 h-3" /> Paid Tier
                </div>
            )}
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer" 
              className="p-2 md:p-2.5 rounded-xl bg-slate-900/50 border border-white/10 text-slate-400 hover:text-white hover:border-violet-500/50 transition-all hover:shadow-neon-violet"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        {/* Navigation Tabs (Hidden on Home, visible on tools) */}
        {currentView !== ViewMode.HOME && (
            <div className="flex justify-center mb-8 md:mb-10 animate-in fade-in slide-in-from-top-4 sticky top-24 z-40">
            <div className="glass-panel p-1 md:p-1.5 rounded-full flex relative shadow-2xl">
                <button
                onClick={() => setCurrentView(ViewMode.HOME)}
                className="relative flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-full font-medium text-sm transition-all duration-300 font-mono text-slate-500 hover:text-slate-300 hover:bg-white/5"
                title="Home"
                >
                <HomeIcon className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-white/10 my-auto mx-1"></div>
                <button
                onClick={() => setCurrentView(ViewMode.REPO_ANALYZER)}
                className={`relative flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-full font-medium text-sm transition-all duration-300 font-mono ${
                    currentView === ViewMode.REPO_ANALYZER
                    ? 'text-white bg-white/10 shadow-glass-inset border border-white/10'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                >
                <GitBranch className="w-4 h-4" />
                <span className="hidden sm:inline">GitFlow</span>
                </button>
                <button
                onClick={() => setCurrentView(ViewMode.ARTICLE_INFOGRAPHIC)}
                className={`relative flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-full font-medium text-sm transition-all duration-300 font-mono ${
                    currentView === ViewMode.ARTICLE_INFOGRAPHIC
                    ? 'text-emerald-100 bg-emerald-500/10 shadow-glass-inset border border-emerald-500/20'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">SiteSketch</span>
                </button>
            </div>
            </div>
        )}

        <div className="flex-1">
            {currentView === ViewMode.HOME && (
                <Home onNavigate={handleNavigate} />
            )}
            {currentView === ViewMode.REPO_ANALYZER && (
                <div className="animate-in fade-in-30 slide-in-from-bottom-4 duration-500 ease-out">
                    <RepoAnalyzer 
                        onNavigate={handleNavigate} 
                        history={repoHistory} 
                        onAddToHistory={handleAddRepoHistory}
                    />
                </div>
            )}
            {currentView === ViewMode.ARTICLE_INFOGRAPHIC && (
                <div className="animate-in fade-in-30 slide-in-from-bottom-4 duration-500 ease-out">
                    <ArticleToInfographic 
                        history={articleHistory} 
                        onAddToHistory={handleAddArticleHistory}
                    />
                </div>
            )}
            {currentView === ViewMode.DEV_STUDIO && (
                 <div className="animate-in fade-in-30 slide-in-from-bottom-4 duration-500 ease-out flex-1">
                    <DevStudio 
                        initialState={devStudioData} 
                        onNavigate={handleNavigate}
                    />
                </div>
            )}
        </div>
      </main>

      <footer className="py-6 mt-auto border-t border-white/5">
        <div className="max-w-7xl mx-auto text-center px-4">
          <p className="text-xs font-mono text-slate-600">
            <span className="text-violet-500/70">link</span>:<span className="text-emerald-500/70">ink</span>$ Powered by Nano Banana Pro
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
