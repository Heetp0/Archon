import '@testing-library/jest-dom';

class StorageMock {
  private store: Record<string, string> = {};
  
  clear() {
    this.store = {};
  }
  
  getItem(key: string) {
    return this.store[key] !== undefined ? this.store[key] : null;
  }
  
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }
  
  removeItem(key: string) {
    delete this.store[key];
  }
  
  get length() {
    return Object.keys(this.store).length;
  }
  
  key(index: number) {
    return Object.keys(this.store)[index] || null;
  }
}

const mockLocal = new StorageMock();
const mockSession = new StorageMock();

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: mockLocal, writable: true, configurable: true });
  Object.defineProperty(window, 'sessionStorage', { value: mockSession, writable: true, configurable: true });
}

if (typeof global !== 'undefined') {
  Object.defineProperty(global, 'localStorage', { value: mockLocal, writable: true, configurable: true });
  Object.defineProperty(global, 'sessionStorage', { value: mockSession, writable: true, configurable: true });
}
