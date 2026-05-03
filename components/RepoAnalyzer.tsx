/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { fetchRepoFileTree } from '../services/githubService';
import { generateInfographic, generateRepoAnalysis, generateRepoGraph } from '../services/geminiService';
import { RepoFileTree, ViewMode, RepoHistoryItem, RepoAnalysis, DataFlowGraph } from '../types';
import { AlertCircle, Loader2, Layers, Box, Download, Sparkles, Command, Palette, Globe, Clock, Maximize, KeyRound, BrainCircuit, ShieldAlert, Milestone, BookOpen, ChevronRight, Activity, Cpu, Copy, Check } from 'lucide-react';
import { LoadingState } from './LoadingState';
import ImageViewer from './ImageViewer';
import D3FlowChart from './D3FlowChart';

interface RepoAnalyzerProps {
  onNavigate: (mode: ViewMode, data?: any) => void;
  history: RepoHistoryItem[];
  onAddToHistory: (item: RepoHistoryItem) => void;
}

const FLOW_STYLES = [
    "Modern Data Flow",
    "Hand-Drawn Blueprint",
    "Corporate Minimal",
    "Neon Cyberpunk",
    "Custom"
];

const LANGUAGES = [
  { label: "English (US)", value: "English" },
  { label: "Arabic (Egypt)", value: "Arabic" },
  { label: "German (Germany)", value: "German" },
  { label: "Spanish (Mexico)", value: "Spanish" },
  { label: "French (France)", value: "French" },
  { label: "Hindi (India)", value: "Hindi" },
  { label: "Indonesian (Indonesia)", value: "Indonesian" },
  { label: "Italian (Italy)", value: "Italian" },
  { label: "Japanese (Japan)", value: "Japanese" },
  { label: "Korean (South Korea)", value: "Korean" },
  { label: "Portuguese (Brazil)", value: "Portuguese" },
  { label: "Russian (Russia)", value: "Russian" },
  { label: "Ukrainian (Ukraine)", value: "Ukrainian" },
  { label: "Vietnamese (Vietnam)", value: "Vietnamese" },
  { label: "Chinese (China)", value: "Chinese" },
];

const CodeBlock = ({ children, className, ...props }: any) => {
    const [copied, setCopied] = useState(false);
    const code = String(children).replace(/\n$/, '');

    const onCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isInline = !className?.includes('language-');

    if (isInline) {
        return <code className="bg-white/10 px-1.5 py-0.5 rounded text-violet-300 font-mono text-xs" {...props}>{children}</code>;
    }

    return (
        <div className="relative group/code my-4">
            <div className="absolute right-3 top-3 z-10 opacity-0 group-hover/code:opacity-100 transition-opacity">
                <button
                    onClick={onCopy}
                    className="p-1.5 rounded-md bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-white backdrop-blur-md transition-all flex items-center gap-1.5 shadow-xl"
                    title="Copy Code"
                >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${copied ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {copied ? 'COPIED' : 'COPY'}
                    </span>
                </button>
            </div>
            <pre className="bg-black/40 border border-white/5 rounded-xl p-4 overflow-x-auto no-scrollbar font-mono text-sm leading-relaxed text-slate-300">
                <code className={className} {...props}>
                    {children}
                </code>
            </pre>
        </div>
    );
};

const RepoAnalyzer: React.FC<RepoAnalyzerProps> = ({ onNavigate, history, onAddToHistory }) => {
  const [repoInput, setRepoInput] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(FLOW_STYLES[0]);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0].value);
  const [customStyle, setCustomStyle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<string>('');
  
  // Infographic State
  const [infographicData, setInfographicData] = useState<string | null>(null);
  const [infographic3DData, setInfographic3DData] = useState<string | null>(null);
  const [generating3D, setGenerating3D] = useState(false);
  const [currentFileTree, setCurrentFileTree] = useState<RepoFileTree[] | null>(null);
  const [currentRepoName, setCurrentRepoName] = useState<string>('');
  
  // Analysis State
  const [analysis, setAnalysis] = useState<RepoAnalysis | null>(null);
  const [graphData, setGraphData] = useState<DataFlowGraph | null>(null);
  const [activeTab, setActiveTab] = useState<'blueprint' | 'intelligence'>('blueprint');
  const [blueprintSubTab, setBlueprintSubTab] = useState<'renders' | 'interactive'>('renders');
  const [activeAnalysisSection, setActiveAnalysisSection] = useState<'features' | 'gaps' | 'roadmap' | 'guide'>('features');
  
  // Viewer State
  const [fullScreenImage, setFullScreenImage] = useState<{src: string, alt: string} | null>(null);

  const parseRepoInput = (input: string): { owner: string, repo: string } | null => {
    const cleanInput = input.trim().replace(/\/$/, '');
    try {
      const url = new URL(cleanInput);
      if (url.hostname === 'github.com') {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
      }
    } catch (e) { }
    const parts = cleanInput.split('/');
    if (parts.length === 2 && parts[0] && parts[1]) return { owner: parts[0], repo: parts[1] };
    return null;
  };

  const addToHistory = (repoName: string, imageData: string, is3D: boolean, style: string) => {
     const newItem: RepoHistoryItem = {
         id: Date.now().toString(),
         repoName,
         imageData,
         is3D,
         style,
         date: new Date()
     };
     onAddToHistory(newItem);
  };

  const handleApiError = (err: any) => {
      if (err.message && err.message.includes("Requested entity was not found")) {
          // This specific error often implies a Free Tier key is trying to access a Paid Model.
          // We trigger the window reload to re-open the key selection.
          const confirmSwitch = window.confirm(
              "BILLING REQUIRED: The current API key does not have access to these models.\n\n" +
              "This feature requires a paid Google Cloud Project. Please switch to a valid paid API Key."
          );
          if (confirmSwitch) {
              window.location.reload();
          }
      }
      setError(err.message || 'An unexpected error occurred during analysis.');
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfographicData(null);
    setInfographic3DData(null);
    setCurrentFileTree(null);

    const repoDetails = parseRepoInput(repoInput);
    if (!repoDetails) {
      setError('Invalid format. Use "owner/repo" or a full GitHub URL.');
      return;
    }

    setLoading(true);
    setCurrentRepoName(repoDetails.repo);
    setAnalysis(null);
    setActiveTab('blueprint');

    try {
      setLoadingStage('CONNECTING TO GITHUB');
      const fileTree = await fetchRepoFileTree(repoDetails.owner, repoDetails.repo);

      if (fileTree.length === 0) throw new Error('No relevant code files found in this repository.');
      setCurrentFileTree(fileTree);

      setLoadingStage('ARCHITECTING BLUEPRINT & ANALYSIS');
      
      const styleToUse = selectedStyle === 'Custom' ? customStyle : selectedStyle;

      // Run both in parallel for speed
      const [infographicBase64, repoAnalysis, graph] = await Promise.all([
          generateInfographic(repoDetails.owner + '/' + repoDetails.repo, fileTree, styleToUse, false, selectedLanguage),
          generateRepoAnalysis(repoDetails.repo, fileTree),
          generateRepoGraph(repoDetails.repo, fileTree)
      ]);
      
      if (infographicBase64) {
        setInfographicData(infographicBase64);
        addToHistory(repoDetails.repo, infographicBase64, false, styleToUse);
      } else {
          throw new Error("Failed to generate visual.");
      }

      if (repoAnalysis) {
          setAnalysis(repoAnalysis);
      }

      if (graph) {
          setGraphData(graph);
      }

    } catch (err: any) {
      handleApiError(err);
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const handleGenerate3D = async () => {
    if (!currentFileTree || !currentRepoName) return;
    setGenerating3D(true);
    try {
      // Pass the same selected style to the 3D generator
      const styleToUse = selectedStyle === 'Custom' ? customStyle : selectedStyle;
      const data = await generateInfographic(currentRepoName, currentFileTree, styleToUse, true, selectedLanguage);
      if (data) {
          setInfographic3DData(data);
          addToHistory(currentRepoName, data, true, styleToUse);
      }
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setGenerating3D(false);
    }
  };

  const loadFromHistory = (item: RepoHistoryItem) => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentRepoName(item.repoName);
      // Since history items don't store the full file tree (too large), we just show the image.
      // If user wants to generate 3D from history of a 2D, they'd need to re-fetch.
      // For simplicity, we display the historical image in the appropriate slot.
      if (item.is3D) {
          setInfographic3DData(item.imageData);
      } else {
          setInfographicData(item.imageData);
          setInfographic3DData(null); // Clear 3D if loading a 2D history item to avoid confusion
      }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 mb-20">
      
      {fullScreenImage && (
          <ImageViewer 
            src={fullScreenImage.src} 
            alt={fullScreenImage.alt} 
            onClose={() => setFullScreenImage(null)} 
          />
      )}

      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 font-sans leading-tight">
          Codebase <span className="text-violet-400">Intelligence</span>.
        </h2>
        <p className="text-slate-400 text-lg md:text-xl font-light tracking-wide">
          Turn any repository into a fully analyzed, interactive architectural blueprint.
        </p>
      </div>

      {/* Input Section */}
      <div className="max-w-xl mx-auto relative z-10">
        <form onSubmit={handleAnalyze} className="glass-panel rounded-2xl p-2 transition-all focus-within:ring-1 focus-within:ring-violet-500/50 focus-within:border-violet-500/50">
          <div className="flex items-center">
             <div className="pl-3 text-slate-500">
                <Command className="w-5 h-5" />
             </div>
             <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="owner/repository"
                className="w-full bg-transparent border-none text-white placeholder:text-slate-600 focus:ring-0 text-lg px-4 py-2 font-mono"
              />
              <div className="pr-2">
                <button
                type="submit"
                disabled={loading || !repoInput.trim()}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-white/10 font-mono text-sm"
                >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "RUN_ANALYSIS"}
                </button>
             </div>
          </div>

          {/* Controls: Style and Language */}
          <div className="mt-2 pt-2 border-t border-white/5 px-3 pb-1 space-y-3">
             {/* Style Selector */}
             <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                 <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px] uppercase tracking-wider shrink-0">
                     <Palette className="w-3 h-3" /> Style:
                 </div>
                 <div className="flex gap-2">
                     {FLOW_STYLES.map(style => (
                         <button
                            key={style}
                            type="button"
                            onClick={() => setSelectedStyle(style)}
                            className={`text-[11px] px-2.5 py-1 rounded-md font-mono transition-all whitespace-nowrap ${
                                selectedStyle === style 
                                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
                                : 'bg-white/5 text-slate-500 hover:text-slate-300 border border-transparent hover:border-white/10'
                            }`}
                         >
                             {style}
                         </button>
                     ))}
                 </div>
             </div>
             
             {/* Language Selector & Custom Style Input */}
             <div className="flex flex-wrap gap-3">
               <div className="flex items-center gap-2 bg-slate-950/50 border border-white/10 rounded-lg px-2 py-1 shrink-0 min-w-0 max-w-full">
                  <Globe className="w-3 h-3 text-slate-500 shrink-0" />
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-transparent border-none text-xs text-slate-300 focus:ring-0 p-0 font-mono cursor-pointer min-w-0 flex-1 truncate"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value} className="bg-slate-900 text-slate-300">
                        {lang.label}
                      </option>
                    ))}
                  </select>
               </div>

               {selectedStyle === 'Custom' && (
                   <input 
                      type="text" 
                      value={customStyle}
                      onChange={(e) => setCustomStyle(e.target.value)}
                      placeholder="Custom style..."
                      className="flex-1 min-w-[120px] bg-slate-950/50 border border-white/10 rounded-lg px-3 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 font-mono transition-all"
                   />
               )}
             </div>
          </div>
        </form>
      </div>

      {error && (
        <div className="max-w-2xl mx-auto p-4 glass-panel border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-2 font-mono text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <p className="flex-1">{error}</p>
          {error.includes("Required") && (
              <button 
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-xs font-bold transition-colors flex items-center gap-1"
              >
                 <KeyRound className="w-3 h-3" /> SWITCH KEY
              </button>
          )}
        </div>
      )}

      {loading && (
        <LoadingState message={loadingStage} type="repo" />
      )}

      {/* Results Section */}
      {infographicData && !loading && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          {/* Tab Switcher */}
          <div className="flex justify-center mb-10">
            <div className="glass-panel p-1 rounded-2xl flex gap-1 relative overflow-hidden">
                <button 
                  onClick={() => setActiveTab('blueprint')}
                  className={`flex items-center gap-3 px-8 py-3 rounded-xl text-sm font-bold transition-all font-mono tracking-widest relative z-10 ${
                    activeTab === 'blueprint' 
                    ? 'text-white' 
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Layers className={`w-4 h-4 transition-transform duration-500 ${activeTab === 'blueprint' ? 'scale-110' : ''}`} /> VISUAL_BLUEPRINT
                  {activeTab === 'blueprint' && (
                      <div className="absolute inset-0 bg-white/10 rounded-xl border border-white/20 -z-10 shadow-glass-inset animate-in fade-in zoom-in-95 duration-300" />
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab('intelligence')}
                  className={`flex items-center gap-3 px-8 py-3 rounded-xl text-sm font-bold transition-all font-mono tracking-widest relative z-10 ${
                    activeTab === 'intelligence' 
                    ? 'text-white' 
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <BrainCircuit className={`w-4 h-4 transition-transform duration-500 ${activeTab === 'intelligence' ? 'scale-110' : ''}`} /> CODE_INTELLIGENCE
                  {activeTab === 'intelligence' && (
                      <div className="absolute inset-0 bg-emerald-500/10 rounded-xl border border-emerald-500/20 -z-10 shadow-glass-inset animate-in fade-in zoom-in-95 duration-300" />
                  )}
                </button>
            </div>
          </div>

          {activeTab === 'blueprint' ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                {/* Internal Sub-navigation for Blueprint */}
                <div className="flex justify-center md:justify-start gap-4 px-2">
                    <button 
                        onClick={() => setBlueprintSubTab('renders')}
                        className={`text-[10px] uppercase font-bold tracking-widest px-4 py-1.5 rounded-full transition-all border font-mono flex items-center gap-2 ${
                            blueprintSubTab === 'renders' 
                            ? 'bg-white/10 text-white border-white/20' 
                            : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300'
                        }`}
                    >
                        <Sparkles className="w-3 h-3" /> Static Architectural Renders
                    </button>
                    <button 
                        onClick={() => setBlueprintSubTab('interactive')}
                        className={`text-[10px] uppercase font-bold tracking-widest px-4 py-1.5 rounded-full transition-all border font-mono flex items-center gap-2 ${
                            blueprintSubTab === 'interactive' 
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
                            : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300'
                        }`}
                    >
                        <Activity className="w-3 h-3" /> Live Data Flow Graph (D3)
                    </button>
                </div>

                {blueprintSubTab === 'renders' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-left-4 duration-500">
                        {/* 2D Infographic Card */}
                        <div className="glass-panel rounded-3xl p-1.5">
                            <div className="px-4 py-3 flex flex-wrap items-center justify-between border-b border-white/5 mb-1.5 gap-2">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                                <Layers className="w-4 h-4 text-violet-400" /> System_Architecture
                                </h3>
                                <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setFullScreenImage({src: `data:image/png;base64,${infographicData}`, alt: `${currentRepoName} 2D`})}
                                    className="text-xs flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-mono p-1.5 rounded-lg hover:bg-white/10"
                                    title="Full Screen"
                                >
                                    <Maximize className="w-4 h-4" />
                                </button>
                                <a href={`data:image/png;base64,${infographicData}`} download={`${currentRepoName}-infographic-2d.png`} className="text-xs flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-mono bg-white/5 px-3 py-1.5 rounded-lg hover:bg-white/10 border border-white/10 font-semibold">
                                    <Download className="w-3 h-3" /> Save PNG
                                </a>
                                </div>
                            </div>
                            <div className="rounded-2xl overflow-hidden bg-[#050c1a] relative group border border-white/5 min-h-[300px] flex items-center justify-center">
                                <img src={`data:image/png;base64,${infographicData}`} alt="Repository Flow Diagram" className="w-full h-auto object-cover transition-opacity relative z-10" />
                            </div>
                        </div>

                        {/* 3D Infographic Card */}
                        <div className="glass-panel rounded-3xl p-1.5 flex flex-col">
                            <div className="px-4 py-3 flex flex-wrap items-center justify-between border-b border-white/5 mb-1.5 shrink-0 gap-2">
                                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 font-mono uppercase tracking-wider">
                                <Box className="w-4 h-4 text-fuchsia-400" /> Volumetric_Model_3D
                                </h3>
                                {infographic3DData && (
                                <div className="flex items-center gap-2 animate-in fade-in">
                                    <button 
                                        onClick={() => setFullScreenImage({src: `data:image/png;base64,${infographic3DData}`, alt: `${currentRepoName} 3D`})}
                                        className="text-xs flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-mono p-1.5 rounded-lg hover:bg-white/10"
                                        title="Full Screen"
                                    >
                                        <Maximize className="w-4 h-4" />
                                    </button>
                                    <a href={`data:image/png;base64,${infographic3DData}`} download={`${currentRepoName}-infographic-3d.png`} className="text-xs flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-mono bg-white/5 px-3 py-1.5 rounded-lg hover:bg-white/10 border border-white/10 font-semibold">
                                    <Download className="w-3 h-3" /> Save PNG
                                    </a>
                                </div>
                                )}
                            </div>
                            
                            <div className="flex-1 rounded-2xl overflow-hidden bg-slate-950/30 relative flex items-center justify-center min-h-[400px] group">
                            {infographic3DData ? (
                                <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                                    <img src={`data:image/png;base64,${infographic3DData}`} alt="Repository 3D Flow Diagram" className="w-full h-full object-cover animate-in fade-in transition-opacity relative z-20" />
                                </div>
                            ) : generating3D ? (
                                <div className="flex flex-col items-center justify-center gap-4 p-6 text-center animate-in fade-in">
                                    <Loader2 className="w-8 h-8 animate-spin text-fuchsia-500/50" />
                                    <p className="text-fuchsia-300/50 font-mono text-xs animate-pulse uppercase tracking-[0.2em]">INITIALIZING HOLOGRAPHIC PIPELINE...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
                                    <div className="w-16 h-16 rounded-full bg-fuchsia-500/5 border border-fuchsia-500/10 flex items-center justify-center mb-2">
                                        <Box className="w-8 h-8 text-fuchsia-500/20" />
                                    </div>
                                    <p className="text-slate-500 font-mono text-xs max-w-[200px]">Generate a volumetric diorama for Tabletop perspective?</p>
                                    <button 
                                    onClick={handleGenerate3D}
                                    className="px-6 py-2.5 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 rounded-xl font-bold transition-all flex items-center gap-2 font-mono text-sm tracking-wider"
                                    >
                                    <Sparkles className="w-4 h-4" />
                                    RENDER_3D_MINIATURE
                                    </button>
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="glass-panel rounded-3xl p-1.5 h-[650px] animate-in slide-in-from-right-4 duration-500 relative overflow-hidden">
                        <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
                            <div className="bg-slate-900/90 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3 shadow-2xl backdrop-blur-xl">
                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                <span className="text-[10px] font-mono text-slate-300 font-bold uppercase tracking-widest">REALTIME_FLOW_ENGINE_V3</span>
                            </div>
                            <button 
                                onClick={() => {
                                    if (graphData && currentFileTree && currentRepoName) {
                                        onNavigate(ViewMode.DEV_STUDIO, {
                                            repoName: currentRepoName,
                                            fileTree: currentFileTree,
                                            graphData: graphData,
                                            analysis: analysis
                                        });
                                    }
                                }}
                                className="bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 rounded-xl px-4 py-2 flex items-center gap-3 shadow-2xl backdrop-blur-xl transition-all font-mono text-[10px] font-bold uppercase tracking-widest group"
                            >
                                <Maximize className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> OPEN_IN_DEV_STUDIO
                            </button>
                        </div>
                        
                        {/* Legend for D3 Graph */}
                        <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-1.5 bg-slate-900/60 p-3 rounded-xl border border-white/5 backdrop-blur-md">
                            <div className="text-[9px] font-mono text-slate-500 mb-1 border-b border-white/5 pb-1 uppercase tracking-tighter">Architecture Legend</div>
                            {[
                                { color: '#60a5fa', label: 'Users/Client' },
                                { color: '#f472b6', label: 'Frontend UI' },
                                { color: '#8b5cf6', label: 'API/Services' },
                                { color: '#fb923c', label: 'Storage/DB' }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-[10px] font-mono text-slate-400">{item.label}</span>
                                </div>
                            ))}
                        </div>

                        {graphData && <D3FlowChart data={graphData} />}
                    </div>
                )}
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-6 min-h-[500px] animate-in fade-in zoom-in-95 duration-500 flex flex-col md:flex-row gap-8">
                {/* Side Navigation for Intelligence */}
                <div className="w-full md:w-64 space-y-2 shrink-0">
                    <button 
                        onClick={() => setActiveAnalysisSection('features')}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border font-mono text-sm ${
                            activeAnalysisSection === 'features'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-neon-emerald'
                            : 'bg-white/5 text-slate-500 border-transparent hover:border-white/10 hover:text-slate-300'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <Activity className="w-4 h-4" />
                            <span>Features</span>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform ${activeAnalysisSection === 'features' ? 'rotate-90 md:rotate-0' : ''}`} />
                    </button>
                    <button 
                        onClick={() => setActiveAnalysisSection('gaps')}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border font-mono text-sm ${
                            activeAnalysisSection === 'gaps'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/10 shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)]'
                            : 'bg-white/5 text-slate-500 border-transparent hover:border-white/10 hover:text-slate-300'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <ShieldAlert className="w-4 h-4" />
                            <span>Gap_Audit</span>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform ${activeAnalysisSection === 'gaps' ? 'rotate-90 md:rotate-0' : ''}`} />
                    </button>
                    <button 
                        onClick={() => setActiveAnalysisSection('roadmap')}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border font-mono text-sm ${
                            activeAnalysisSection === 'roadmap'
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/10 shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]'
                            : 'bg-white/5 text-slate-500 border-transparent hover:border-white/10 hover:text-slate-300'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <Milestone className="w-4 h-4" />
                            <span>Roadmap</span>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform ${activeAnalysisSection === 'roadmap' ? 'rotate-90 md:rotate-0' : ''}`} />
                    </button>
                    <button 
                        onClick={() => setActiveAnalysisSection('guide')}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border font-mono text-sm ${
                            activeAnalysisSection === 'guide'
                            ? 'bg-violet-500/10 text-violet-300 border-violet-500/10 shadow-neon-violet'
                            : 'bg-white/5 text-slate-500 border-transparent hover:border-white/10 hover:text-slate-300'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <BookOpen className="w-4 h-4" />
                            <span>Eng_Guide</span>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform ${activeAnalysisSection === 'guide' ? 'rotate-90 md:rotate-0' : ''}`} />
                    </button>
                </div>

                {/* Content Area for Intelligence */}
                <div className="flex-1 min-w-0">
                    {analysis ? (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full">
                            {activeAnalysisSection === 'features' && (
                                <div className="space-y-6">
                                    <h4 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-emerald-400" /> Feature Recommendations
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {analysis.features.map((f, i) => (
                                            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 hover:bg-white/10 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <h5 className="font-bold text-emerald-100">{f.title}</h5>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                                                        f.priority === 'High' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        f.priority === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-slate-500/20 text-slate-400'
                                                    }`}>{f.priority}</span>
                                                </div>
                                                <p className="text-sm text-slate-400 leading-relaxed font-light">{f.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeAnalysisSection === 'gaps' && (
                                <div className="space-y-6">
                                    <h4 className="text-xl font-bold text-white flex items-center gap-2">
                                        <ShieldAlert className="w-5 h-5 text-amber-400" /> Architectural Gaps
                                    </h4>
                                    <div className="space-y-4">
                                        {analysis.gaps.map((g, i) => (
                                            <div key={i} className="flex gap-4 p-5 rounded-2xl bg-white/5 border border-white/10">
                                                <div className="w-1 bg-amber-500/50 rounded-full shrink-0" />
                                                <div className="space-y-1">
                                                    <h5 className="font-bold text-amber-100">{g.title}</h5>
                                                    <p className="text-sm text-slate-400 font-light">{g.description}</p>
                                                    <div className="pt-2 flex items-center gap-2 text-[10px] font-mono text-amber-500/70 uppercase">
                                                       <span>Impact:</span>
                                                       <span className="text-slate-300">{g.impact}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeAnalysisSection === 'roadmap' && (
                                <div className="space-y-6">
                                    <h4 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Milestone className="w-5 h-5 text-blue-400" /> Execution Roadmap
                                    </h4>
                                    <div className="relative pl-8 space-y-10 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-blue-500 before:via-blue-500/20 before:to-transparent">
                                        {analysis.roadmap.map((phase, i) => (
                                            <div key={i} className="relative">
                                                <div className="absolute -left-8 top-1.5 w-6 h-6 rounded-full bg-slate-950 border-2 border-blue-500 flex items-center justify-center text-[10px] font-bold text-blue-400 z-10 shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                                                    0{i+1}
                                                </div>
                                                <div className="space-y-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl p-5">
                                                    <h5 className="font-bold text-blue-100 text-lg">{phase.phase}</h5>
                                                    <ul className="space-y-2">
                                                        {phase.tasks.map((task, j) => (
                                                            <li key={j} className="text-sm text-slate-400 flex items-start gap-3">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40 mt-1.5 shrink-0" />
                                                                <span>{task}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeAnalysisSection === 'guide' && (
                                <div className="space-y-6">
                                    <h4 className="text-xl font-bold text-white flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 text-violet-400" /> Engineering Guide
                                    </h4>
                                    <div className="grid grid-cols-1 gap-6">
                                        {analysis.guide.map((section, i) => (
                                            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                                <h5 className="text-xs font-mono font-bold text-violet-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <div className="w-8 h-px bg-violet-400/30" /> {section.title}
                                                </h5>
                                                <div className="text-slate-300 leading-relaxed font-light">
                                                    <ReactMarkdown 
                                                        components={{ 
                                                            code: CodeBlock,
                                                            p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                                                            ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>,
                                                            ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>,
                                                            li: ({ children }) => <li className="text-slate-400 font-light">{children}</li>,
                                                            h1: ({ children }) => <h1 className="text-xl font-bold mb-4 text-white">{children}</h1>,
                                                            h2: ({ children }) => <h2 className="text-lg font-bold mb-3 text-white">{children}</h2>,
                                                            h3: ({ children }) => <h3 className="text-md font-bold mb-2 text-white">{children}</h3>,
                                                            strong: ({ children }) => <strong className="font-bold text-slate-200">{children}</strong>,
                                                            blockquote: ({ children }) => <blockquote className="border-l-2 border-violet-500/50 pl-4 italic my-4 text-slate-400">{children}</blockquote>,
                                                        }}
                                                    >
                                                        {section.content}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                            <BrainCircuit className="w-12 h-12 opacity-20" />
                            <p className="font-mono text-sm italic">Synthesizing intelligence from patterns...</p>
                        </div>
                    )}
                </div>
            </div>
          )}
        </div>
      )}

      {/* History Section */}
      {history.length > 0 && (
          <div className="pt-12 border-t border-white/5 animate-in fade-in">
              <div className="flex items-center gap-2 mb-6 text-slate-400">
                  <Clock className="w-4 h-4" />
                  <h3 className="text-sm font-mono uppercase tracking-wider">Recent Blueprints</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {history.map((item) => (
                      <button 
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        className="group bg-slate-900/50 border border-white/5 hover:border-violet-500/50 rounded-xl overflow-hidden text-left transition-all hover:shadow-neon-violet"
                      >
                          <div className="aspect-video relative overflow-hidden bg-slate-950">
                              <img src={`data:image/png;base64,${item.imageData}`} alt={item.repoName} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                              {item.is3D && (
                                  <div className="absolute top-2 right-2 bg-fuchsia-500/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/10">3D</div>
                              )}
                          </div>
                          <div className="p-3">
                              <p className="text-xs font-bold text-white truncate font-mono">{item.repoName}</p>
                              <p className="text-[10px] text-slate-500 mt-1">{item.style}</p>
                          </div>
                      </button>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

export default RepoAnalyzer;
