import AsyncStorage from '@react-native-async-storage/async-storage';

// Memory cache for instant synchronous access on mobile
const memoryCache: Record<string, string> = {};

export const appStorage = {
  getItemSync(key: string): string | null {
    return memoryCache[key] ?? null;
  },

  async getItem(key: string): Promise<string | null> {
    if (key in memoryCache) {
      return memoryCache[key];
    }
    try {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) {
        memoryCache[key] = val;
      }
      return val;
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    memoryCache[key] = value;
    try {
      await AsyncStorage.setItem(key, value);
    } catch (err) {
      console.warn('AsyncStorage setItem error:', err);
    }
  },

  async removeItem(key: string): Promise<void> {
    delete memoryCache[key];
    try {
      await AsyncStorage.removeItem(key);
    } catch (err) {
      console.warn('AsyncStorage removeItem error:', err);
    }
  },

  async initialize(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const pairs = await AsyncStorage.multiGet(keys);
      pairs.forEach(([k, v]) => {
        if (v !== null) {
          memoryCache[k] = v;
        }
      });
    } catch {
      // Fallback to memory
    }
  },
};
