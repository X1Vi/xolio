import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly onReset: () => void;
}

interface ErrorBoundaryState {
  readonly error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (error !== null) {
      return (
        <div className="reader-crash">
          <p className="reader-crash-title">This book could not be displayed.</p>
          <p className="reader-crash-detail">Try opening the file again or choosing another book.</p>
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              this.setState({ error: null });
              this.props.onReset();
            }}
          >
            Back to library
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
