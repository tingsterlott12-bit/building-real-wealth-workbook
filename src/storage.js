import { STORE_KEY, DEFAULT_DATA, deepMerge } from "./data.js";

/** Simple localStorage polyfill that matches the original async API shape */
const storage = {
  async get(key) {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? { value } : null;
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("storage.set failed", e);
    }
  },
};

let saveTimer = null;

export async function loadData() {
  try {
    const res = await storage.get(STORE_KEY);
    if (res && res.value) {
      const parsed = JSON.parse(res.value);
      return deepMerge(DEFAULT_DATA, parsed);
    }
  } catch (e) {
    console.warn("loadData failed, using defaults", e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

export function scheduleSave(data) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    storage.set(STORE_KEY, JSON.stringify(data)).catch((e) =>
      console.warn("save failed", e)
    );
  }, 350);
}
