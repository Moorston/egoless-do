// Backward-compatible re-export. Reflection Links are now part of ReflectionSlice.
import { createReflectionSlice, type ReflectionSlice } from './createReflectionSlice';

export { createReflectionSlice as createReflectionLinkSlice };

export type { ReflectionSlice as ReflectionLinkSlice };
