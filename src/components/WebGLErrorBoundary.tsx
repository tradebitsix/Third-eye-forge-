import React, { Component, ErrorInfo, ReactNode } from 'react';
import { markWebGLFailed } from '../webglCheck';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
  onCrash?: () => void;
}

interface State {
  hasError: boolean;
}

export class WebGLErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("WebGL or Three.js crash caught by ErrorBoundary:", error, errorInfo);
    // Mark WebGL as failed so all components globally update to 2D Mode
    markWebGLFailed();
    if (this.props.onCrash) {
      this.props.onCrash();
    }
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
