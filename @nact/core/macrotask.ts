import { run, clear } from 'macrotask';

export const addMacrotask: (f: () => any) => number = globalThis.setImmediate ?? run;
export const clearMacrotask: (token: number) => void = globalThis.clearImmediate ?? clear;
