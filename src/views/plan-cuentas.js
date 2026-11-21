import { renderPlaceholderView } from './placeholder.js';

export const viewInfo = {
  title: 'Plan de cuentas',
  breadcrumb: 'Plan de cuentas',
  description: 'Organiza las cuentas contables y consulta su clasificación financiera.',
  action: 'Nueva cuenta contable',
};

export function render() {
  return renderPlaceholderView(viewInfo);
}
