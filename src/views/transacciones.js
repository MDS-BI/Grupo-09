import { renderPlaceholderView } from './placeholder.js';

export const viewInfo = {
  title: 'Transacciones',
  breadcrumb: 'Transacciones',
  description: 'Administra y consulta los movimientos financieros de tu empresa.',
  action: 'Nueva transacción',
};

export function render() {
  return renderPlaceholderView(viewInfo);
}
