export function renderDashboard() {
  return `
            <div class="page-heading">
              <div>
                <div class="eyebrow"><span class="eyebrow-line"></span> LUNES, 19 DE OCTUBRE DE 2026</div>
                <h1>Buenos días, Camila <span class="wave">✳</span></h1>
                <p class="subtitle">Aquí tienes el resumen financiero de tu empresa.</p>
              </div>
              <div class="heading-actions">
                <button class="button button-secondary" id="export-button">
                  <svg viewBox="0 0 24 24"><path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4" /></svg>Exportar</button
                ><button class="button button-primary" id="new-transaction">
                  <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>Nueva transacción
                </button>
              </div>
            </div>

            <div class="period-toolbar">
              <div class="period-tabs" role="tablist" aria-label="Período del resumen">
                <button class="period-tab" data-period="7d">7 días</button
                ><button class="period-tab" data-period="30d">30 días</button
                ><button class="period-tab selected" data-period="month">Este mes</button
                ><button class="period-tab" data-period="quarter">Trimestre</button>
              </div>
              <button class="date-filter">
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M16 3v4M8 3v4M3 11h18" /></svg
                >1 oct — 31 oct, 2026<svg class="chevron" viewBox="0 0 24 24"><path d="m7 10 5 5 5-5" /></svg>
              </button>
            </div>

            <div class="metrics-grid">
              <article class="metric-card">
                <div class="metric-top">
                  <span class="metric-label">Ingresos totales</span
                  ><span class="metric-icon icon-green"
                    ><svg viewBox="0 0 24 24"><path d="M4 16 10 10l4 4 6-7M14 7h6v6" /></svg
                  ></span>
                </div>
                <div class="metric-value">$48,290<span class="metric-cents">.00</span></div>
                <div class="metric-foot">
                  <span class="trend positive"
                    ><svg viewBox="0 0 24 24"><path d="m5 15 7-7 7 7" /></svg>12.8%</span
                  ><span>vs. mes anterior</span>
                  <div class="sparkline spark-green">
                    <svg viewBox="0 0 100 34" preserveAspectRatio="none">
                      <path class="spark-area" d="M0 28 12 24 24 27 36 16 48 20 60 11 72 17 84 7 100 3V34H0Z" />
                      <path class="spark-line" d="M0 28 12 24 24 27 36 16 48 20 60 11 72 17 84 7 100 3" />
                    </svg>
                  </div>
                </div>
              </article>
              <article class="metric-card">
                <div class="metric-top">
                  <span class="metric-label">Gastos totales</span
                  ><span class="metric-icon icon-amber"
                    ><svg viewBox="0 0 24 24"><path d="M4 8 10 14l4-4 6 7M14 17h6v-6" /></svg
                  ></span>
                </div>
                <div class="metric-value">$32,640<span class="metric-cents">.00</span></div>
                <div class="metric-foot">
                  <span class="trend negative"
                    ><svg viewBox="0 0 24 24"><path d="m5 9 7 7 7-7" /></svg>4.2%</span
                  ><span>vs. mes anterior</span>
                  <div class="sparkline spark-amber">
                    <svg viewBox="0 0 100 34" preserveAspectRatio="none">
                      <path class="spark-area" d="M0 9 12 12 24 7 36 17 48 13 60 21 72 15 84 24 100 29V34H0Z" />
                      <path class="spark-line" d="M0 9 12 12 24 7 36 17 48 13 60 21 72 15 84 24 100 29" />
                    </svg>
                  </div>
                </div>
              </article>
              <article class="metric-card">
                <div class="metric-top">
                  <span class="metric-label">Resultado neto</span
                  ><span class="metric-icon icon-blue"
                    ><svg viewBox="0 0 24 24"><path d="M4 19V5m0 14h16M8 15l4-5 3 2 5-7" /></svg
                  ></span>
                </div>
                <div class="metric-value">$15,650<span class="metric-cents">.00</span></div>
                <div class="metric-foot">
                  <span class="trend positive"
                    ><svg viewBox="0 0 24 24"><path d="m5 15 7-7 7 7" /></svg>18.6%</span
                  ><span>vs. mes anterior</span>
                  <div class="sparkline spark-blue">
                    <svg viewBox="0 0 100 34" preserveAspectRatio="none">
                      <path class="spark-area" d="M0 28 12 22 24 24 36 14 48 20 60 11 72 13 84 5 100 2V34H0Z" />
                      <path class="spark-line" d="M0 28 12 22 24 24 36 14 48 20 60 11 72 13 84 5 100 2" />
                    </svg>
                  </div>
                </div>
              </article>
              <article class="metric-card">
                <div class="metric-top">
                  <span class="metric-label">Saldo disponible</span
                  ><span class="metric-icon icon-violet"
                    ><svg viewBox="0 0 24 24">
                      <rect x="3" y="6" width="18" height="14" rx="2" />
                      <path d="M3 10h18M7 15h3" />
                      <path d="M7 6V4h11v2" /></svg
                  ></span>
                </div>
                <div class="metric-value">$86,420<span class="metric-cents">.50</span></div>
                <div class="metric-foot">
                  <span class="balance-caption"><span class="balance-dot"></span> 3 cuentas bancarias</span
                  ><span class="balance-link">Ver cuentas <span>→</span></span>
                </div>
              </article>
            </div>

            <div class="dashboard-grid">
              <section class="panel cashflow-panel">
                <div class="panel-heading">
                  <div>
                    <h2>Flujo de caja</h2>
                    <p>Ingresos y gastos a lo largo del tiempo</p>
                  </div>
                  <button class="select-button" id="chart-period">
                    Mensual <svg class="chevron" viewBox="0 0 24 24"><path d="m7 10 5 5 5-5" /></svg>
                  </button>
                </div>
                <div class="chart-legend">
                  <span><i class="legend-dot legend-income"></i>Ingresos</span
                  ><span><i class="legend-dot legend-expense"></i>Gastos</span
                  ><strong>Este año <span class="legend-year">2026</span></strong>
                </div>
                <div class="chart-area">
                  <div class="chart-y-labels">
                    <span>$60k</span><span>$45k</span><span>$30k</span><span>$15k</span><span>$0</span>
                  </div>
                  <div class="chart-plot">
                    <div class="chart-gridlines"><i></i><i></i><i></i><i></i><i></i></div>
                    <div class="bar-chart" aria-label="Gráfico de ingresos y gastos mensuales">
                      <div class="bar-group">
                        <i class="bar income" style="--height: 46%"></i><i class="bar expense" style="--height: 30%"></i
                        ><span>Ene</span>
                      </div>
                      <div class="bar-group">
                        <i class="bar income" style="--height: 58%"></i><i class="bar expense" style="--height: 39%"></i
                        ><span>Feb</span>
                      </div>
                      <div class="bar-group">
                        <i class="bar income" style="--height: 51%"></i><i class="bar expense" style="--height: 35%"></i
                        ><span>Mar</span>
                      </div>
                      <div class="bar-group">
                        <i class="bar income" style="--height: 68%"></i><i class="bar expense" style="--height: 47%"></i
                        ><span>Abr</span>
                      </div>
                      <div class="bar-group">
                        <i class="bar income" style="--height: 60%"></i><i class="bar expense" style="--height: 41%"></i
                        ><span>May</span>
                      </div>
                      <div class="bar-group">
                        <i class="bar income" style="--height: 75%"></i><i class="bar expense" style="--height: 53%"></i
                        ><span>Jun</span>
                      </div>
                      <div class="bar-group">
                        <i class="bar income" style="--height: 63%"></i><i class="bar expense" style="--height: 45%"></i
                        ><span>Jul</span>
                      </div>
                      <div class="bar-group">
                        <i class="bar income" style="--height: 82%"></i><i class="bar expense" style="--height: 54%"></i
                        ><span>Ago</span>
                      </div>
                      <div class="bar-group">
                        <i class="bar income" style="--height: 72%"></i><i class="bar expense" style="--height: 51%"></i
                        ><span>Sep</span>
                      </div>
                      <div class="bar-group current">
                        <i class="bar income" style="--height: 91%"></i><i class="bar expense" style="--height: 63%"></i
                        ><span>Oct</span>
                      </div>
                      <div class="bar-group">
                        <i class="bar income muted" style="--height: 59%"></i
                        ><i class="bar expense muted" style="--height: 43%"></i><span>Nov</span>
                      </div>
                      <div class="bar-group">
                        <i class="bar income muted" style="--height: 67%"></i
                        ><i class="bar expense muted" style="--height: 49%"></i><span>Dic</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section class="panel accounts-panel">
                <div class="panel-heading">
                  <div>
                    <h2>Resumen por cuenta</h2>
                    <p>Distribución de movimientos</p>
                  </div>
                  <button class="more-button" aria-label="Más opciones">
                    <svg viewBox="0 0 24 24">
                      <circle cx="5" cy="12" r="1" />
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="19" cy="12" r="1" />
                    </svg>
                  </button>
                </div>
                <div class="account-total"><span>Saldo total</span><strong>$86,420.50</strong></div>
                <div class="account-breakdown">
                  <div class="account-row">
                    <span class="account-color color-cash"></span><span class="account-name">Caja y bancos</span
                    ><strong>$52,840</strong><small>61%</small>
                  </div>
                  <div class="account-row">
                    <span class="account-color color-receivable"></span
                    ><span class="account-name">Cuentas por cobrar</span><strong>$21,280</strong><small>25%</small>
                  </div>
                  <div class="account-row">
                    <span class="account-color color-other"></span><span class="account-name">Otros activos</span
                    ><strong>$12,300</strong><small>14%</small>
                  </div>
                </div>
                <div class="account-progress" aria-label="Distribución de cuentas"><i></i><i></i><i></i></div>
                <button class="text-link" data-go="plan-cuentas">Ver plan de cuentas <span>→</span></button>
              </section>
            </div>

            <section class="panel transactions-panel">
              <div class="panel-heading transactions-heading">
                <div>
                  <h2>Transacciones recientes</h2>
                  <p>Últimos movimientos registrados en tu cuenta</p>
                </div>
                <div class="table-actions">
                  <label class="table-search"
                    ><svg viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-4-4" /></svg
                    ><input
                      id="transaction-search"
                      type="search"
                      placeholder="Buscar transacción..."
                      aria-label="Buscar transacción" /></label
                  ><button class="button button-secondary button-compact" data-go="transacciones">
                    Ver todas <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                </div>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>DESCRIPCIÓN</th>
                      <th>CUENTA</th>
                      <th>FECHA</th>
                      <th>CENTRO DE COSTO</th>
                      <th>ESTADO</th>
                      <th class="amount-col">IMPORTE</th>
                      <th><span class="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody id="transactions-body">
                    <tr data-search="pago factura diseño creativo gastos operativos oficina">
                      <td>
                        <span class="transaction-icon transaction-expense"
                          ><svg viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14" /></svg></span
                        ><span class="transaction-main"
                          ><strong>Pago factura Diseño Creativo</strong><small>TRX-2026-1048 · Comprobante</small></span
                        >
                      </td>
                      <td>Servicios profesionales</td>
                      <td>19 oct, 2026</td>
                      <td>
                        <span class="cost-tag"><i class="cost-dot dot-design"></i>Diseño</span>
                      </td>
                      <td>
                        <span class="status-pill status-approved"><i></i>Aprobado</span>
                      </td>
                      <td class="amount-col amount-negative">−$2,450.00</td>
                      <td>
                        <button class="row-more" aria-label="Acciones para Pago factura Diseño Creativo">···</button>
                      </td>
                    </tr>
                    <tr data-search="pago cliente estudio norte ingresos ventas">
                      <td>
                        <span class="transaction-icon transaction-income"
                          ><svg viewBox="0 0 24 24"><path d="M12 19V5m-7 7 7-7 7 7" /></svg></span
                        ><span class="transaction-main"
                          ><strong>Pago de cliente Estudio Norte</strong
                          ><small>TRX-2026-1047 · Factura F-0082</small></span
                        >
                      </td>
                      <td>Ingresos por servicios</td>
                      <td>18 oct, 2026</td>
                      <td>
                        <span class="cost-tag"><i class="cost-dot dot-sales"></i>Ventas</span>
                      </td>
                      <td>
                        <span class="status-pill status-approved"><i></i>Aprobado</span>
                      </td>
                      <td class="amount-col amount-positive">+$8,200.00</td>
                      <td>
                        <button class="row-more" aria-label="Acciones para Pago de cliente Estudio Norte">···</button>
                      </td>
                    </tr>
                    <tr data-search="suscripción software nube gastos tecnología">
                      <td>
                        <span class="transaction-icon transaction-expense"
                          ><svg viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14" /></svg></span
                        ><span class="transaction-main"
                          ><strong>Suscripción software en la nube</strong
                          ><small>TRX-2026-1046 · Factura INV-2541</small></span
                        >
                      </td>
                      <td>Software y licencias</td>
                      <td>17 oct, 2026</td>
                      <td>
                        <span class="cost-tag"><i class="cost-dot dot-tech"></i>Tecnología</span>
                      </td>
                      <td>
                        <span class="status-pill status-pending"><i></i>Pendiente</span>
                      </td>
                      <td class="amount-col amount-negative">−$189.00</td>
                      <td>
                        <button class="row-more" aria-label="Acciones para Suscripción software en la nube">···</button>
                      </td>
                    </tr>
                    <tr data-search="nómina quincena octubre personal recursos humanos">
                      <td>
                        <span class="transaction-icon transaction-expense"
                          ><svg viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14" /></svg></span
                        ><span class="transaction-main"
                          ><strong>Nómina — primera quincena de octubre</strong
                          ><small>TRX-2026-1045 · Nómina</small></span
                        >
                      </td>
                      <td>Sueldos y salarios</td>
                      <td>15 oct, 2026</td>
                      <td>
                        <span class="cost-tag"><i class="cost-dot dot-people"></i>Personas</span>
                      </td>
                      <td>
                        <span class="status-pill status-approved"><i></i>Aprobado</span>
                      </td>
                      <td class="amount-col amount-negative">−$12,600.00</td>
                      <td><button class="row-more" aria-label="Acciones para Nómina octubre">···</button></td>
                    </tr>
                    <tr data-search="anticipo proyecto atlas servicios ingreso consultoría">
                      <td>
                        <span class="transaction-icon transaction-income"
                          ><svg viewBox="0 0 24 24"><path d="M12 19V5m-7 7 7-7 7 7" /></svg></span
                        ><span class="transaction-main"
                          ><strong>Anticipo proyecto Atlas</strong><small>TRX-2026-1044 · Factura F-0080</small></span
                        >
                      </td>
                      <td>Ingresos por servicios</td>
                      <td>14 oct, 2026</td>
                      <td>
                        <span class="cost-tag"><i class="cost-dot dot-ops"></i>Operaciones</span>
                      </td>
                      <td>
                        <span class="status-pill status-approved"><i></i>Aprobado</span>
                      </td>
                      <td class="amount-col amount-positive">+$6,500.00</td>
                      <td><button class="row-more" aria-label="Acciones para Anticipo proyecto Atlas">···</button></td>
                    </tr>
                  </tbody>
                </table>
                <div class="no-results" id="no-results" hidden>No se encontraron transacciones para esta búsqueda.</div>
              </div>
              <div class="table-footer">
                <span>Mostrando <strong>5</strong> de <strong>128</strong> transacciones</span>
                <div class="pagination">
                  <button aria-label="Página anterior" disabled>‹</button><button class="page-current">1</button
                  ><button>2</button><button>3</button><span>…</span><button>26</button
                  ><button aria-label="Página siguiente">›</button>
                </div>
              </div>
            </section>
            <footer class="page-footer">
              <span>© 2026 Atlas ERP</span><span><i class="secure-dot"></i> Tus datos financieros están protegidos</span
              ><a href="#help">Centro de ayuda</a>
            </footer>
  `;
}

export default renderDashboard;
