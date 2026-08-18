import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default class PharmacyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Pharmacy POS crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center p-6">
          <div className="max-w-lg rounded-lg border border-red-200 bg-red-50 p-6 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
            <p className="font-semibold text-red-800 text-lg">Pharmacy POS encountered an error</p>
            <p className="text-sm text-red-600">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}