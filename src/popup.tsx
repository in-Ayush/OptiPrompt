import React, { useState, useEffect, useCallback } from "react";
import { useSettings } from "./hooks/useSettings";
import { optimizePrompt } from "./optimizer";
import { MetricCard } from "./components/MetricCard";
import { ScoreGauge } from "./components/ScoreGauge";
import { SettingsPanel } from "./components/SettingsPanel";
import logoUrl from "data-base64:~assets/optipromptlogo.png";
import "./style.css";

import {
  Sparkles,
  Copy,
  RotateCcw,
  Settings as SettingsIcon,
  Check,
  Code,
  PenTool,
  Mail,
  Search,
  FileText,
  Languages,
  Lightbulb,
  Compass,
  ArrowRight,
  Bug,
  BookOpen,
  Rss,
  Briefcase,
  TrendingUp,
  Megaphone,
  Globe,
  GraduationCap
} from "lucide-react";
import type { PromptStats, PromptType } from "./types";

const ICON_SIZE = 15;

/** Maps each prompt type to its corresponding Lucide icon. */
function getPromptTypeIcon(type: PromptType): React.ReactNode {
  switch (type) {
    case "Coding":
      return <Code size={ICON_SIZE} className="text-blue-400" />;
    case "Debugging":
      return <Bug size={ICON_SIZE} className="text-rose-400" />;
    case "Math":
      return <GraduationCap size={ICON_SIZE} className="text-indigo-400" />;
    case "Documentation":
      return <FileText size={ICON_SIZE} className="text-emerald-400" />;
    case "Writing":
      return <PenTool size={ICON_SIZE} className="text-purple-400" />;
    case "Essay":
      return <BookOpen size={ICON_SIZE} className="text-amber-400" />;
    case "Blog":
      return <Rss size={ICON_SIZE} className="text-orange-400" />;
    case "Resume":
      return <FileText size={ICON_SIZE} className="text-teal-400" />;
    case "Cover Letter":
      return <Briefcase size={ICON_SIZE} className="text-slate-400" />;
    case "Email":
      return <Mail size={ICON_SIZE} className="text-pink-400" />;
    case "Translation":
      return <Languages size={ICON_SIZE} className="text-cyan-400" />;
    case "Summarization":
      return <FileText size={ICON_SIZE} className="text-amber-500" />;
    case "Research":
      return <Search size={ICON_SIZE} className="text-yellow-400" />;
    case "Brainstorming":
      return <Lightbulb size={ICON_SIZE} className="text-amber-400" />;
    case "Marketing":
      return <Megaphone size={ICON_SIZE} className="text-rose-500" />;
    case "Business":
      return <TrendingUp size={ICON_SIZE} className="text-emerald-400" />;
    case "SEO":
      return <Globe size={ICON_SIZE} className="text-violet-400" />;
    default:
      return <Compass size={ICON_SIZE} className="text-slate-400" />;
  }
}

export default function Popup() {
  const { settings, updateSettings } = useSettings();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [optimizedPrompt, setOptimizedPrompt] = useState("");
  const [promptType, setPromptType] = useState<PromptType>("General");
  const [qualityScore, setQualityScore] = useState(0);
  const [stats, setStats] = useState<PromptStats>({
    originalTokens: 0,
    optimizedTokens: 0,
    savedTokens: 0,
    savedPercentage: 0
  });
  const [changesMade, setChangesMade] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeSite, setActiveSite] = useState("Standalone Mode");
  const [hasActiveConnection, setHasActiveConnection] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  // Load latest result from storage on mount (or fall back to active tab prompt if none exists)
  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;

    chrome.storage.local.get("latestResult", (res) => {
      if (chrome.runtime.lastError || !res.latestResult) {
        // Fallback: If no latest result, pre-populate from the active tab's chat box
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTab = tabs[0];
          if (!activeTab?.id || !activeTab.url) return;

          chrome.tabs.sendMessage(activeTab.id, { action: "getCurrentPrompt" }, (resVal) => {
            if (chrome.runtime.lastError) return;
            if (resVal?.text) {
              setOriginalPrompt(resVal.text);
            }
          });
        });
        return;
      }

      const data = res.latestResult;
      setOriginalPrompt(data.originalPrompt || "");
      setOptimizedPrompt(data.optimizedPrompt || "");
      setPromptType(data.promptType || "General");
      setQualityScore(data.qualityScore || 0);
      setStats(data.stats || {
        originalTokens: 0,
        optimizedTokens: 0,
        savedTokens: 0,
        savedPercentage: 0
      });
      setChangesMade(data.changesMade || []);
    });
  }, []);

  // Detect active tab and connection info
  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.tabs) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab?.id || !activeTab.url) return;

      chrome.tabs.sendMessage(activeTab.id, { action: "getSiteInfo" }, (response) => {
        if (chrome.runtime.lastError || !response?.siteName) {
          setActiveSite("Standalone Mode");
          setHasActiveConnection(false);
          return;
        }

        setActiveSite(response.siteName);
        setHasActiveConnection(true);
      });
    });
  }, []);

  // Listen for real-time optimization updates from background/injector
  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.runtime?.onMessage) return;

    const handleMessage = (message: any) => {
      if (!message || typeof message !== "object") return;
      if (message.action === "latestResultUpdated" && message.result) {
        const data = message.result;
        setOriginalPrompt(data.originalPrompt || "");
        setOptimizedPrompt(data.optimizedPrompt || "");
        setPromptType(data.promptType || "General");
        setQualityScore(data.qualityScore || 0);
        setStats(data.stats || {
          originalTokens: 0,
          optimizedTokens: 0,
          savedTokens: 0,
          savedPercentage: 0
        });
        setChangesMade(data.changesMade || []);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Manual optimization handler
  const handleOptimize = useCallback(async () => {
    if (!settings) return;
    if (!originalPrompt.trim()) return;

    if (!settings.openRouterKey || !settings.openRouterKey.trim()) {
      setErrorMessage("OpenRouter API Key not set. Click the gear icon in the top right to configure it.");
      return;
    }

    setIsOptimizing(true);
    setErrorMessage(null);
    setNoticeMessage(null);
    try {
      const result = await optimizePrompt(originalPrompt, settings);
      setOptimizedPrompt(result.optimizedPrompt);
      setPromptType(result.promptType);
      setQualityScore(result.qualityScore);
      setStats(result.stats);
      setChangesMade(result.changesMade);

      if (result.wasRetried) {
        setNoticeMessage("The selected model is temporarily unavailable for free. Automatically fell back to 'Auto (OpenRouter Free)'. We suggest switching your model selection to 'Auto (OpenRouter Free)' in Settings.");
      }
    } catch (err: any) {
      const errorMsg = err.message || "An error occurred during prompt compression.";
      const errorLower = errorMsg.toLowerCase();
      
      if (errorLower.includes("unavailable for free") || errorLower.includes("paid version")) {
        setErrorMessage("The selected model is no longer available for free. Please click the gear icon (top right) and switch your model selection to 'Auto (OpenRouter Free)'.");
      } else {
        setErrorMessage(errorMsg);
      }
    } finally {
      setIsOptimizing(false);
    }
  }, [originalPrompt, settings]);

  const showStatusMessage = useCallback((msg: string) => {
    setActionStatus(msg);
    setTimeout(() => setActionStatus(null), 3000);
  }, []);

  // Inject optimized prompt into tab
  const handleOptimizeTabInput = useCallback(() => {
    if (typeof chrome === "undefined" || !chrome.tabs || !hasActiveConnection) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab?.id) return;

      chrome.tabs.sendMessage(
        activeTab.id,
        { action: "setPrompt", text: optimizedPrompt },
        (response) => {
          if (chrome.runtime.lastError) return;
          if (response?.success) showStatusMessage("Prompt injected into tab!");
        }
      );
    });
  }, [hasActiveConnection, optimizedPrompt, showStatusMessage]);

  // Restore original prompt in tab
  const handleRestoreTabInput = useCallback(() => {
    if (typeof chrome === "undefined" || !chrome.tabs || !hasActiveConnection) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab?.id) return;

      chrome.tabs.sendMessage(activeTab.id, { action: "restoreOriginal" }, (response) => {
        if (chrome.runtime.lastError) return;
        if (response?.success) {
          showStatusMessage("Original prompt restored!");
          chrome.tabs.sendMessage(activeTab.id!, { action: "getCurrentPrompt" }, (res) => {
            if (chrome.runtime.lastError) return;
            if (res?.text) setOriginalPrompt(res.text);
          });
        }
      });
    });
  }, [hasActiveConnection, showStatusMessage]);

  // Copy optimized prompt to clipboard
  const handleCopy = useCallback(() => {
    if (!optimizedPrompt) return;
    navigator.clipboard.writeText(optimizedPrompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [optimizedPrompt]);

  // Loading state
  if (!settings) {
    return (
      <div className="w-[420px] h-[580px] flex items-center justify-center bg-dark-bg text-dark-text border border-dark-border">
        <div className="text-center flex flex-col items-center justify-center">
          <img src={logoUrl} alt="OptiPrompt Logo" className="w-12 h-12 mb-4 animate-pulse rounded-xl object-contain bg-zinc-900/40 p-1 border border-zinc-700/35" />
          <span className="text-slate-400 text-xs font-semibold tracking-wider text-zinc-400">Loading OptiPrompt...</span>
        </div>
      </div>
    );
  }

  // Settings panel
  if (isSettingsOpen) {
    return (
      <div className="w-[420px] h-[580px] border border-dark-border bg-dark-bg overflow-hidden flex flex-col">
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="w-[420px] h-[580px] border border-dark-border bg-dark-bg overflow-hidden flex flex-col select-none animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-dark-border bg-dark-card shadow-sm">
        <div className="flex items-center gap-2.5">
          <img src={logoUrl} alt="OptiPrompt Logo" className="w-7 h-7 rounded-lg object-contain bg-zinc-900/40 p-0.5 border border-zinc-700/35 shadow-inner" />
          <div>
            <h1 className="text-sm font-black tracking-tight text-white leading-none">OptiPrompt</h1>
            <span className="text-[10px] text-zinc-400 font-bold leading-none">AI Prompt Compressor</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${
              hasActiveConnection
                ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/20"
                : "bg-slate-900 text-slate-400 border-slate-700/50"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${hasActiveConnection ? "bg-emerald-500" : "bg-slate-500"}`}
            />
            {activeSite}
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="text-slate-400 hover:text-dark-text p-1.5 hover:bg-dark-border rounded-lg transition-all duration-150 border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500/30"
            aria-label="Open settings"
          >
            <SettingsIcon size={15} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-thin">
        {/* Original Prompt */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Original Prompt</span>
            <span className="text-[10px] text-slate-500 tabular-nums">{originalPrompt.length} chars</span>
          </div>
          <textarea
            value={originalPrompt}
            onChange={(e) => {
              setOriginalPrompt(e.target.value);
              setErrorMessage(null);
            }}
            placeholder="Type your prompt here, or write in your active chat box..."
            className="w-full h-24 bg-dark-card border border-dark-border rounded-xl p-3 text-xs text-dark-text focus:outline-none focus:ring-2 focus:ring-zinc-500/30 focus:border-zinc-500/60 resize-none leading-relaxed transition-all shadow-inner placeholder-slate-500"
          />
          <button
            onClick={handleOptimize}
            disabled={isOptimizing || !originalPrompt.trim()}
            className="w-full mt-2 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed rounded-xl text-xs font-bold text-zinc-950 shadow-md hover:shadow-zinc-500/10 active:scale-[0.97] transition-all duration-150 focus:outline-none"
          >
            {isOptimizing ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-r-2 border-white mr-1" />
                Optimizing...
              </>
            ) : (
              <>
                <Sparkles size={13} /> Optimize Prompt
              </>
            )}
          </button>
          {errorMessage && (
            <div className="mt-2 bg-rose-950/20 border border-rose-500/30 text-rose-400 text-[10px] p-2.5 rounded-xl leading-normal font-semibold animate-fadeIn">
              {errorMessage}
            </div>
          )}
          {noticeMessage && (
            <div className="mt-2 bg-amber-950/20 border border-amber-500/30 text-amber-400 text-[10px] p-2.5 rounded-xl leading-normal font-semibold animate-fadeIn">
              {noticeMessage}
            </div>
          )}
        </div>

        {/* Optimized Prompt */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Optimized Prompt</span>
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-dark-border/60 rounded text-[9px] font-bold text-slate-300">
                {getPromptTypeIcon(promptType)}
                <span>{promptType}</span>
              </div>
            </div>

            {stats.savedPercentage > 0 && (
              <span className="text-[10px] text-emerald-400 font-bold tabular-nums">
                -{stats.savedPercentage}% tokens
              </span>
            )}
          </div>
          <div className="relative">
            <textarea
              value={optimizedPrompt}
              readOnly
              placeholder="Optimization output will show here..."
              className="w-full h-24 bg-dark-card/50 border border-dark-border rounded-xl p-3 pr-10 text-xs text-zinc-300 focus:outline-none resize-none leading-relaxed shadow-inner placeholder-zinc-600"
            />
            {optimizedPrompt && (
              <button
                onClick={handleCopy}
                className="absolute right-2.5 bottom-2.5 p-1.5 bg-dark-card border border-dark-border rounded-lg text-zinc-400 hover:text-dark-text hover:bg-dark-border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-zinc-500/30"
                title="Copy Optimized Prompt"
                aria-label="Copy optimized prompt"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            )}
          </div>
        </div>

        {/* Quality Score */}
        {settings.promptScore && <ScoreGauge score={qualityScore} />}

        {/* Token Stats */}
        {settings.tokenEstimation && (
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Original" value={stats.originalTokens} />
            <MetricCard label="Optimized" value={stats.optimizedTokens} />
            <MetricCard
              label="Saved"
              value={stats.savedTokens}
              subValue={stats.savedPercentage > 0 ? `(${stats.savedPercentage}%)` : undefined}
              variant={stats.savedTokens > 0 ? "success" : "neutral"}
            />
          </div>
        )}

        {/* Changes Summary */}
        <div className="bg-dark-card border border-dark-border rounded-xl p-3 shadow-md">
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-2">
            Optimization Summary
          </span>
          {changesMade.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {changesMade.map((change, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-xs text-zinc-300">
                  <span className="text-zinc-400 font-bold mt-0.5 flex-shrink-0">•</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-500 italic">
              {originalPrompt
                ? "Prompt is already optimized."
                : "Write a prompt above to see the changes list."}
            </p>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-4 py-3 border-t border-dark-border bg-dark-card flex justify-between items-center shadow-lg relative">
        {actionStatus && (
          <div className="absolute top-[-36px] left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs px-3.5 py-1.5 rounded-full shadow-lg font-medium tracking-wide animate-fadeIn">
            {actionStatus}
          </div>
        )}

        <div className="flex gap-2 w-full">
          {hasActiveConnection ? (
            <>
              <button
                onClick={handleOptimizeTabInput}
                disabled={!optimizedPrompt}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed rounded-xl text-xs font-bold text-zinc-950 shadow-md hover:shadow-zinc-500/10 active:scale-[0.97] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-zinc-500/40"
              >
                Apply to Chat <ArrowRight size={14} />
              </button>
              <button
                onClick={handleRestoreTabInput}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-transparent border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900 rounded-xl text-xs font-bold text-zinc-300 transition-all duration-150 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-zinc-500/30"
                title="Restore Original Input"
                aria-label="Restore original prompt"
              >
                <RotateCcw size={14} />
              </button>
            </>
          ) : (
            <button
              onClick={handleCopy}
              disabled={!optimizedPrompt}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed rounded-xl text-xs font-bold text-zinc-950 shadow-md hover:shadow-zinc-500/10 active:scale-[0.97] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-zinc-500/40"
            >
              {copied ? (
                <>
                  <Check size={14} /> Copied!
                </>
              ) : (
                <>
                  <Copy size={14} /> Copy Optimized Prompt
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
