import { Component, type ReactNode } from 'react';
import { ErrorState } from './States';

interface Props {
  children: ReactNode;
}

/**
 * Atrapa fallos al cargar una pantalla (p. ej. un trozo de la app que aún no está en la caché sin conexión)
 * y ofrece reintentarlo, en lugar de dejar la pantalla en blanco.
 */
export class RouteBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('No se pudo cargar la pantalla', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <ErrorState
        message="no se pudo cargar esta pantalla. Si no tienes conexión, vuelve a intentarlo cuando la recuperes."
        onRetry={() => this.setState({ failed: false })}
      />
    );
  }
}
