import { useState, useEffect } from 'react';

// Cache to store if WebGL was flagged as failed inside this session
let webglFailedCached = false;
let isWebglSupported: boolean | null = null;

if (typeof window !== 'undefined') {
  try {
    webglFailedCached = localStorage.getItem('webgl_rendering_failed') === 'true';
  } catch(e) {}
}

function detectWebGLSupport(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl', { 
      failIfMajorPerformanceCaveat: false, 
      powerPreference: 'default' 
    }) || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    
    if (!gl) return false;
    
    // Query a standard gl parameter to verify context is responsive & alive
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    }
    
    return !gl.isContextLost();
  } catch (e) {
    return false;
  }
}

export function checkWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  if (webglFailedCached) return false;
  
  // Check if user manually opted for 2D mode to avoid WebGL crashes/lags
  try {
    if (localStorage.getItem('force_2d_mode') === 'true') {
      return false;
    }
  } catch (e) {}

  // Run the hardware capability check ONCE and cache it
  if (isWebglSupported === null) {
    isWebglSupported = detectWebGLSupport();
  }
  return isWebglSupported;
}

// Global hook synchronization listeners
const listeners = new Set<() => void>();

export function toggleForce2DMode(force: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('force_2d_mode', force ? 'true' : 'false');
    listeners.forEach(l => l());
  } catch(e) {}
}

export function isForced2D(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('force_2d_mode') === 'true';
  } catch(e) {
    return false;
  }
}

export function markWebGLFailed() {
  if (typeof window === 'undefined') return;
  webglFailedCached = true;
  isWebglSupported = false; // Force cached support to false on crash
  try {
    localStorage.setItem('webgl_rendering_failed', 'true');
    listeners.forEach(l => l());
  } catch(e) {}
}

export function resetWebGLStatus() {
  if (typeof window === 'undefined') return;
  webglFailedCached = false;
  isWebglSupported = null; // Reset so detectWebGLSupport() runs again
  try {
    localStorage.removeItem('webgl_rendering_failed');
    localStorage.removeItem('force_2d_mode');
    listeners.forEach(l => l());
  } catch(e) {}
}

export function useWebGLAvailable() {
  const [isAvailable, setIsAvailable] = useState<boolean>(() => checkWebGL());

  useEffect(() => {
    // Re-verify immediately on mount
    setIsAvailable(checkWebGL());

    const handleUpdate = () => {
      setIsAvailable(checkWebGL());
    };

    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  return isAvailable;
}

// Global Safety Interceptors
if (typeof window !== 'undefined') {
  // 1. Listen for browser WebGL context creation failure events
  window.addEventListener('webglcontextcreationerror', (e: any) => {
    console.warn("Global WebGL context creation failure intercepted:", e.statusMessage || "driver context rejected request");
    markWebGLFailed();
  }, true);

  // 2. Patch console.error and console.warn to capture three.js/canvas initialization issues
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  const interceptAndDetectWebGLFailure = (args: any[]) => {
    const errorString = args.map(arg => {
      if (arg instanceof Error) {
        return arg.message + '\n' + (arg.stack || '');
      }
      try {
        return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
      } catch (e) {
        return String(arg);
      }
    }).join(' ');

    const isFailureReason = 
      errorString.includes('WebGLRenderer') ||
      errorString.includes('WebGL context') ||
      errorString.includes('Error creating WebGL') ||
      errorString.includes('not connected to three.js') ||
      errorString.includes('missing the <XR> component') ||
      errorString.includes('canvas is not yet loaded') ||
      errorString.includes('BindToCurrentSequence failed') ||
      errorString.includes('ANGLE');

    if (isFailureReason) {
      // Trigger instant safe 2D fallback mode
      markWebGLFailed();
    }
  };

  console.error = function(...args: any[]) {
    interceptAndDetectWebGLFailure(args);
    originalConsoleError.apply(console, args);
  };

  console.warn = function(...args: any[]) {
    interceptAndDetectWebGLFailure(args);
    originalConsoleWarn.apply(console, args);
  };

  // 3. Catch general unhandled runtime exceptions pointing to Three.js or canvas
  window.addEventListener('error', (event) => {
    const message = event.message || '';
    if (
      message.includes('WebGL') ||
      message.includes('Three') ||
      message.includes('three.js') ||
      message.includes('@react-three')
    ) {
      markWebGLFailed();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const reasonMessage = reason && (reason.message || String(reason));
    if (
      reasonMessage &&
      (reasonMessage.includes('WebGL') ||
       reasonMessage.includes('Three') ||
       reasonMessage.includes('three.js') ||
       reasonMessage.includes('@react-three'))
    ) {
      markWebGLFailed();
    }
  });
}
