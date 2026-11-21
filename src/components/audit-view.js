export function renderAuditView(events = []) {
  const container = document.createElement('div')
  container.innerHTML = `
    <section class="audit-view">
      <div class="panel-heading">
        <h2>Registro de auditoría</h2>
        <p>Bitácora cronológica de eventos (solo lectura)</p>
      </div>
      
      ${events.length === 0 ? `
        <div class="empty-state" style="padding: 20px; text-align: center; color: #777;">
          <span class="placeholder-icon"
            ><svg viewBox="0 0 24 24"><path d="M4 5h16M4 12h16M4 19h16" /></svg></span>
          <p>No hay eventos de auditoría</p>
        </div>
      ` : ''
    }
    
    ${events.length > 0 ? `
      <div class="audit-table-container">
        <table>
          <thead>
            <tr>
              <th>FECHA</th>
              <th>USUARIO</th>
              <th>ACCION</th>
              <th>ENTIDAD</th>
              <th>DETALLE</th>
            </tr>
          </thead>
          <tbody>
          ${events.map((event, index) => {
            const date = new Date(event.timestamp).toLocaleDateString('es-ES')
            const time = new Date(event.timestamp).toLocaleTimeString('es-ES')
            const entityInfo = event.entityId ? `ID: ${event.entityId}` : 'N/A'
            const detail = event.metadata ? 
              Object.entries(event.metadata).map(([key, value]) => `${key}: ${value}`).join(' | ') : 'N/A'
            
            return `
              <tr>
                <td>${date} ${time}</td>
                <td>${event.metadata?.userId || 'N/A'}</td>
                <td>${event.type}</td>
                <td>${entityInfo}</td>
                <td>${detail}</td>
              </tr>
            `
          }).join('')}
          </tbody>
        </table>
      </div>
    `}
  `
  
  return container.firstElementChild
}

export function initAuditView() {
  // No event listeners - view is read-only
  // Filters and other interactivity would be added separately
  return renderAuditView()
}