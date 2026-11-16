import { aggregatePostedEntries } from '../services/metrics-service.js'

export function renderDashboard(from, to) {
  const container = document.querySelector('#view-dashboard .metrics-grid')
  if (!container) return

  const metrics = aggregatePostedEntries(from, to)

  container.innerHTML = `
    <article class="metric-card">
      <div class="metric-top">
        <span class="metric-label">Ingresos totales</span>
        <span class="metric-icon icon-green">
          <svg viewBox="0 0 24 24"><path d="M4 16 10 10l4 4 6-7M14 7h6v6" /></svg>
        </span>
      </div>
      <div class="metric-value">$${metrics.ingresos}<span class="metric-cents">.00</span></div>
      <div class="metric-foot">
        <span class="trend positive"><svg viewBox="0 0 24 24"><path d="m5 15 7-7 7 7" /></svg>vs. período anterior</span>
      </div>
    </article>
    <article class="metric-card">
      <div class="metric-top">
        <span class="metric-label">Gastos totales</span>
        <span class="metric-icon icon-amber">
          <svg viewBox="0 0 24 24"><path d="M4 8 10 14l4-4 6 7M14 17h6v-6" /></svg>
        </span>
      </div>
      <div class="metric-value">$${metrics.gastos}<span class="metric-cents">.00</span></div>
      <div class="metric-foot">
        <span class="trend negative"><svg viewBox="0 0 24 24"><path d="m5 9 7 7 7-7" /></svg>vs. período anterior</span>
      </div>
    </article>
    <article class="metric-card">
      <div class="metric-top">
        <span class="metric-label">Resultado neto</span>
        <span class="metric-icon icon-blue">
          <svg viewBox="0 0 24 24"><path d="M4 19V5m0 14h16M8 15l4-5 3 2 5-7" /></svg>
        </span>
      </div>
      <div class="metric-value">$${metrics.resultadoNeto}<span class="metric-cents">.00</span></div>
      <div class="metric-foot">
        <span class="trend positive"><svg viewBox="0 0 24 24"><path d="m5 15 7-7 7 7" /></svg>18.6%</span>
      </div>
    </article>
    <article class="metric-card">
      <div class="metric-top">
        <span class="metric-label">Saldo disponible</span>
        <span class="metric-icon icon-violet">
          <svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></svg>
        </span>
      </div>
      <div class="metric-value">$${(metrics.ingresos - metrics.gastos).toFixed(2)}<span class="metric-cents">.50</span></div>
      <div class="metric-foot">
        <span class="balance-caption"><span class="balance-dot"></span>3 cuentas bancarias</span>
        <span class="balance-link">Ver cuentas →</span>
      </div>
    </article>
  `
}