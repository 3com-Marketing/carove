import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Crash en árbol React:', error, errorInfo);
    this.setState({ errorInfo });
  }

  reset = () => this.setState({ hasError: false, error: null, errorInfo: null });
  goHome = () => { window.location.href = '/'; };
  reload = () => window.location.reload();

  render() {
    if (!this.state.hasError) return this.props.children;

    const stack = (this.state.error?.stack || '').split('\n').slice(0, 6).join('\n');
    const componentStack = (this.state.errorInfo?.componentStack || '').split('\n').slice(0, 6).join('\n');

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-2xl w-full bg-card border rounded-xl shadow-lg p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Algo salió mal</h1>
              <p className="text-sm text-muted-foreground">Se ha producido un error inesperado en la aplicación.</p>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 border p-3 space-y-1">
            <p className="text-xs font-mono text-destructive break-words">
              {this.state.error?.message || 'Error desconocido'}
            </p>
          </div>

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground select-none">Detalles técnicos</summary>
            <pre className="mt-2 p-3 bg-muted/30 rounded border overflow-x-auto whitespace-pre-wrap break-words text-[10px] leading-relaxed">
{stack}{componentStack ? '\n— Component stack —\n' + componentStack : ''}
            </pre>
          </details>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={this.reset} variant="default" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
            </Button>
            <Button onClick={this.reload} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" /> Recargar página
            </Button>
            <Button onClick={this.goHome} variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" /> Ir al inicio
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground border-t pt-3">
            Si el problema persiste, copia los detalles técnicos y avisa al equipo.
          </p>
        </div>
      </div>
    );
  }
}
