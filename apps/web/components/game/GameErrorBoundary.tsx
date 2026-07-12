'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface GameErrorBoundaryProps {
  readonly fallback: (reset: () => void) => ReactNode;
  readonly children: ReactNode;
}

interface GameErrorBoundaryState {
  readonly hasError: boolean;
}

/**
 * Catches unexpected render failures in the game surface so a stray UI error is
 * recoverable (return to a safe reset) rather than a blank crash — one of the
 * Phase 2 required states.
 */
export class GameErrorBoundary extends Component<GameErrorBoundaryProps, GameErrorBoundaryState> {
  override state: GameErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GameErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // No card hands or private data are ever logged (privacy). Component stack
    // only, to aid debugging.
    if (process.env.NODE_ENV !== 'production') {
      console.error('Game surface error:', error.message, info.componentStack);
    }
  }

  reset = (): void => {
    this.setState({ hasError: false });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback(this.reset);
    }
    return this.props.children;
  }
}
