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
};

export default storageUtils;
