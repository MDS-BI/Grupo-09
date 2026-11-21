import { renderPlaceholderView } from './placeholder.js';

export const viewInfo = {
  title: 'Configuración',
  breadcrumb: 'Configuración',
  description: 'Administra las preferencias del período contable y las finanzas.',
  action: 'Guardar cambios',
};

export function render() {
  return renderPlaceholderView(viewInfo);
}
