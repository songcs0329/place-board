const storageUtils = {
  getLocalStorage: <T>(keyname: string): T | null => {
    const storageItem = localStorage.getItem(keyname);
    return storageItem ? JSON.parse(storageItem) : null;
  },
  setLocalStorage: <T>(keyname: string, value: T) => {
    localStorage.setItem(keyname, JSON.stringify(value));
  },
  removeLocalStorage: (keyname: string) => {
    localStorage.removeItem(keyname);
  },
  getSessionStorage: <T>(keyname: string): T | null => {
    const storageItem = sessionStorage.getItem(keyname);
    return storageItem ? JSON.parse(storageItem) : null;
  },
  setSessionStorage: <T>(keyname: string, value: T) => {
    sessionStorage.setItem(keyname, JSON.stringify(value));
  },
};

export default storageUtils;
