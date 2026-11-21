import { renderPlaceholderView } from './placeholder.js';

export const viewInfo = {
  title: 'Reportes financieros',
  breadcrumb: 'Reportes',
  description: 'Consulta el estado de resultados y el flujo de caja de tu empresa.',
  action: 'Generar reporte',
};

export function render() {
  return renderPlaceholderView(viewInfo);
}
