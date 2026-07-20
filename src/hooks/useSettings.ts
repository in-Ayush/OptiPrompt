import { useEffect, useState } from "react";
import { getSettings, saveSettings } from "../storage/settings";
import type { Settings } from "../types";

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings | null>(null);

  useEffect(() => {
    getSettings().then(setSettingsState);

    // Sync state if settings are updated in other parts of the extension
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === "local" && changes.settings) {
        setSettingsState(changes.settings.newValue);
      }
    };

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, []);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    if (!settings) return;
    const updated = { ...settings, ...newSettings };
    setSettingsState(updated);
    await saveSettings(updated);
  };

  return { settings, updateSettings };
}
