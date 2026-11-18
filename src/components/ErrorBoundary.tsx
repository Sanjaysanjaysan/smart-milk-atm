import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  details?: Record<string, any> | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
      details: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let parsedDetails: Record<string, any> | null = null;
    let displayMessage = error?.message || 'An unexpected application error occurred.';

    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed === 'object' && parsed.operationType) {
        parsedDetails = parsed;
        displayMessage = `Firestore ${parsed.operationType} error on "${parsed.path || 'unknown'}": ${parsed.error}`;
      }
    } catch {
      // Not structured Firestore JSON error
    }

    return {
      hasError: true,
      message: displayMessage,
      details: parsedDetails,
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl border border-rose-200 shadow-xl p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Application Recovery Notice</h2>
            <p className="text-xs text-slate-600 leading-relaxed">{this.state.message}</p>
            {this.state.details?.authInfo && (
              <div className="text-left text-[11px] bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-slate-600 space-y-1">
                <div>Operation: {this.state.details.operationType}</div>
                <div>Path: {this.state.details.path || 'N/A'}</div>
                <div>Signed In UID: {this.state.details.authInfo.userId || 'Not signed in'}</div>
              </div>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, message: '', details: null });
                window.location.reload();
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
