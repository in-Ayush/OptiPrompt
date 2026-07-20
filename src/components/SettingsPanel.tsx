import React, { useState } from "react";
import type { Settings } from "../types";

interface ToggleSwitchProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  label,
  description,
  checked,
  onChange
}) => {
  return (
    <div className="flex items-start justify-between py-3 border-b border-dark-border/40 last:border-b-0">
      <div className="flex-1 pr-4">
        <div className="text-xs font-bold text-dark-text mb-0.5">{label}</div>
        <div className="text-[10px] text-slate-400 leading-normal">{description}</div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer mt-0.5 select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-8 h-5 bg-zinc-800 rounded-full peer peer-focus:ring-2 peer-focus:ring-zinc-500/20 peer-checked:after:translate-x-full peer-checked:after:border-zinc-950 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-500 after:border-zinc-500 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-200 peer-checked:after:bg-zinc-950 peer-checked:after:border-zinc-950"></div>
      </label>
    </div>
  );
};

interface SettingsPanelProps {
  settings: Settings;
  onUpdate: (updates: Partial<Settings>) => void;
  onClose: () => void;
}

const POPULAR_MODELS = [
  { id: "openrouter/free", name: "Auto (OpenRouter Free)" },
  { id: "deepseek/deepseek-chat:free", name: "DeepSeek V3 (Free)" },
  { id: "google/gemini-2.5-flash:free", name: "Gemini 2.5 Flash (Free)" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)" },
  { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Free)" },
  { id: "nvidia/llama-3.1-nemotron-70b-instruct:free", name: "Nemotron 70B (Free)" },
  { id: "custom", name: "Custom Model ID..." }
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdate,
  onClose
}) => {
  const [showKey, setShowKey] = useState(false);

  const toggleOptions = [
    {
      key: "tokenEstimation" as keyof Settings,
      label: "Token Estimation",
      description: "Estimate prompt token usage and calculate text savings."
    },
    {
      key: "promptScore" as keyof Settings,
      label: "Prompt Score",
      description: "Rate prompt structure, conciseness, and clarity from 0 to 100."
    },
    {
      key: "outputOptimization" as keyof Settings,
      label: "Output Optimization",
      description: "Instruct downstream AI to respond concisely and return direct results."
    }
  ];

  const isKnownModel = POPULAR_MODELS.some((m) => m.id === settings.openRouterModel && m.id !== "custom");
  const selectValue = isKnownModel ? settings.openRouterModel : "custom";

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "custom") {
      onUpdate({ openRouterModel: isKnownModel ? "" : settings.openRouterModel });
    } else {
      onUpdate({ openRouterModel: val });
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-bg text-dark-text select-none animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-dark-border bg-dark-card shadow-sm">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#a1a1aa"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="text-xs font-black tracking-wide uppercase text-zinc-400">Settings</span>
        </div>
        <button
          onClick={onClose}
          className="text-xs font-semibold text-slate-400 hover:text-dark-text px-3 py-1 hover:bg-dark-border rounded-lg transition-all duration-150 border border-slate-700/50 hover:border-slate-600"
        >
          Back
        </button>
      </div>

      {/* Preferences Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4 scrollbar-thin">
        {/* OpenRouter API Key */}
        <div className="bg-dark-card border border-dark-border/40 rounded-xl p-3 shadow-md">
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
            OpenRouter API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={settings.openRouterKey || ""}
              onChange={(e) => onUpdate({ openRouterKey: e.target.value })}
              placeholder="sk-or-..."
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 pr-12 text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-zinc-500 placeholder-slate-600 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1.5 px-2 py-0.5 bg-dark-bg border border-dark-border rounded text-[9px] text-slate-400 hover:text-dark-text font-bold"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
          <div className="mt-1.5 text-[9px] text-slate-500 leading-tight">
            Required for prompt compression. Keys are saved securely and never shared. Obtain one at{" "}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:underline font-semibold"
            >
              openrouter.ai/keys
            </a>
          </div>
        </div>

        {/* Model Selection */}
        <div className="bg-dark-card border border-dark-border/40 rounded-xl p-3 shadow-md">
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
            Optimizer Model
          </label>
          <select
            value={selectValue}
            onChange={handleModelChange}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer"
          >
            {POPULAR_MODELS.map((m) => (
              <option key={m.id} value={m.id} className="bg-dark-card text-dark-text">
                {m.name}
              </option>
            ))}
          </select>

          {selectValue === "custom" && (
            <div className="mt-2 animate-fadeIn">
              <input
                type="text"
                value={settings.openRouterModel || ""}
                onChange={(e) => onUpdate({ openRouterModel: e.target.value })}
                placeholder="e.g. anthropic/claude-3.5-sonnet"
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-zinc-500 font-mono"
              />
              <div className="mt-1 text-[9px] text-slate-500">
                Enter the exact model identifier from OpenRouter.
              </div>
            </div>
          )}
        </div>

        {/* Metric Toggles */}
        <div className="bg-dark-card border border-dark-border/40 rounded-xl px-3 py-1 shadow-md">
          {toggleOptions.map((opt) => (
            <ToggleSwitch
              key={opt.key}
              label={opt.label}
              description={opt.description}
              checked={settings[opt.key] as boolean}
              onChange={(val) => onUpdate({ [opt.key]: val })}
            />
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="p-3 border-t border-dark-border/50 text-[9px] text-center text-slate-500 leading-normal bg-dark-card">
        All settings are saved automatically in your extension storage.
      </div>
    </div>
  );
};
