import { renderPlaceholderView } from './placeholder.js';

export const viewInfo = {
  title: 'Nueva transacción',
  breadcrumb: 'Nueva transacción',
  description: 'Registra asientos contables con partida doble y trazabilidad completa.',
  action: 'Guardar transacción',
};

export function render() {
  return renderPlaceholderView(viewInfo);
}
