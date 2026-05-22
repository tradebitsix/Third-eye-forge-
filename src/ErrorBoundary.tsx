import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const errMessage = this.state.error?.message || "";
      const isRenderCrash = 
        errMessage.includes("WebGL") || 
        errMessage.includes("three") || 
        errMessage.includes("Context") || 
        errMessage.includes("canvas") || 
        errMessage.includes("XR") ||
        errMessage.includes("renderer") ||
        errMessage.includes("WebGLRenderer") ||
        errMessage.includes("three.js");

      if (isRenderCrash) {
        // Automatically save driver status
        try {
          localStorage.setItem('webgl_rendering_failed', 'true');
        } catch (e) {}

        return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white font-sans selection:bg-rose-500/30">
            <div className="max-w-md bg-slate-900 border border-red-500/20 shadow-2xl rounded-2xl p-8 backdrop-blur-md">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5 text-red-400">
                <span className="font-mono text-xl font-black">⚠</span>
              </div>
              <h2 className="text-lg font-bold tracking-tight text-white mb-2">GPU RENDER PIPELINE FAILURE</h2>
              <p className="text-xs text-gray-400 font-mono mb-4 leading-relaxed uppercase">
                YOUR GRAPHICS DRIVER REJECTED WEBGL INITIALIZATION (ANGLE OR CONTEXT BIND FAILED).
              </p>
              
              <div className="p-3 bg-red-950/20 border border-red-500/10 rounded mb-6 text-[10px] font-mono text-red-400 break-all select-all">
                {errMessage || "WebGL Context Creation Denied by Host Platform"}
              </div>

              <button
                onClick={() => {
                  try {
                    localStorage.setItem('webgl_rendering_failed', 'true');
                    localStorage.setItem('force_2d_mode', 'true');
                  } catch (e) {}
                  window.location.reload();
                }}
                className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-mono text-xs font-bold uppercase rounded-lg shadow-lg hover:shadow-orange-500/10 transition-all pointer-events-auto"
              >
                Enter Safe 2D Fallback Mode
              </button>
            </div>
          </div>
        );
      }

      return (
        <div style={{ color: "red", padding: "20px", background: "black", width: "100%", height: "100%" }}>
          <h2>Application Crash</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
