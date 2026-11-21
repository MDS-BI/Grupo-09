export function renderPlaceholderView(info) {
  return `
    <div class="placeholder-card">
      <span class="placeholder-icon"
        ><svg viewBox="0 0 24 24"><path d="M4 5h16M4 12h16M4 19h16" /></svg
      ></span>
      <p class="eyebrow">MÓDULO FINANCIERO</p>
      <h1 id="placeholder-title">${info.title}</h1>
      <p id="placeholder-description">${info.description}</p>
      <button class="button button-primary" id="placeholder-action">
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>${info.action}
      </button>
      <div class="placeholder-note">
        La estructura visual de esta sección está lista para conectar con sus flujos y datos.
      </div>
    </div>
  `;
}
