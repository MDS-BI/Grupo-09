import { renderPlaceholderView } from './placeholder.js';

export const viewInfo = {
  title: 'Centros de costo',
  breadcrumb: 'Centros de costo',
  description: 'Controla presupuestos y analiza gastos por departamento.',
  action: 'Nuevo centro de costo',
};

export function render() {
  return renderPlaceholderView(viewInfo);
}
