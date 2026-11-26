import { DEMO_PASSWORD } from '../services/auth-service.js';

export function renderLoginScreen(profiles) {
  return `
    <div class="login-screen" id="login-screen" role="dialog" aria-modal="true" aria-labelledby="login-title">
      <div class="login-card">
        <div class="login-brand">
          <span class="brand-mark" aria-hidden="true"
            ><svg viewBox="0 0 36 36">
              <path d="M18 3 33 11.5v13L18 33 3 24.5v-13L18 3Z" />
              <path d="m11 22 4.2-10h5.6L25 22M13 18h10M14.5 22l-2 3M21.5 22l2 3" /></svg
          ></span>
          <span class="brand-copy"><strong>atlas</strong><small>ERP WORKSPACE</small></span>
        </div>
        <div class="login-eyebrow"><span class="eyebrow-line"></span> ACCESO AL WORKSPACE</div>
        <h1 id="login-title">Iniciar sesión</h1>
        <p class="login-subtitle">Elige el perfil con el que deseas trabajar. Tus permisos se aplicarán en todo el módulo.</p>

        <label class="login-password-label" for="login-password">Contraseña de demostración</label>
        <input
          class="login-password"
          id="login-password"
          type="text"
          value="${escapeHtml(DEMO_PASSWORD)}"
          autocomplete="off"
          spellcheck="false"
        />
        <p class="login-hint">Contraseña visible: <strong>${escapeHtml(DEMO_PASSWORD)}</strong>. Selecciona un perfil para entrar con un clic.</p>

        <div class="login-profiles" role="group" aria-label="Perfiles disponibles">
          ${profiles.map(renderProfile).join('')}
        </div>
        <p class="login-error" id="login-error" role="alert" hidden></p>
        <div class="login-footer">Atlas ERP · Entorno de demostración · Datos almacenados localmente</div>
      </div>
    </div>
  `;
}

export default renderLoginScreen;

function renderProfile(profile) {
  const role = profile.role || 'user';
  const name = profile.name || profile.id;
  return `
    <button class="login-profile" type="button" data-user-id="${escapeHtml(profile.id)}" data-role="${escapeHtml(role)}">
      <span class="login-profile-avatar role-${escapeHtml(role)}">${escapeHtml(profile.initials || name.slice(0, 2))}</span>
      <span class="login-profile-copy">
        <strong>${escapeHtml(name)}</strong>
        <small>${escapeHtml(profile.jobTitle || profile.roleLabel || role)}</small>
      </span>
      <span class="login-role-badge role-${escapeHtml(role)}">${escapeHtml(profile.roleLabel || role)}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
    </button>
  `;
}

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
}
