import { renderPlaceholderView } from './placeholder.js';

export const viewInfo = {
  title: 'Registro de auditoría',
  breadcrumb: 'Auditoría',
  description: 'Rastrea el origen, la fecha y el autor de cada movimiento financiero.',
  action: 'Ver registros',
};

export function render() {
  return renderPlaceholderView(viewInfo);
}
