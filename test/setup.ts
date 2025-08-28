// Polyfill for Node.js 18 compatibility with Undici
if (typeof globalThis.File === 'undefined') {
  // @ts-ignore
  globalThis.File = class File {
    constructor(bits: any[], name: string, options?: any) {
      // Basic File polyfill for testing
    }
  };
}

export {};