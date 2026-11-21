import { renderPlaceholderView } from './placeholder.js';

export const viewInfo = {
  title: 'Consulta',
  breadcrumb: 'Consulta',
  description: 'Busca asientos y cuentas con filtros combinados.',
  action: 'Nueva búsqueda',
};

export function render() {
  return renderPlaceholderView(viewInfo);
}
