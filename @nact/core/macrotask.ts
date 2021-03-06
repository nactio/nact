import { run, clear } from './vendored/macrotask';

export const addMacrotask: (f: () => any) => number = (globalThis as any).setImmediate ?? run;
export const clearMacrotask: (token: number | undefined) => void = (globalThis as any).clearImmediate ?? clear;
