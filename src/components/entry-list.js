export function renderEntryList(filters = {}, entries = []) {
  const container = document.createElement('div')
  container.innerHTML = `
    <section class="transactions-panel">
      <div class="panel-heading transactions-heading">
        <div>
          <h2>Consulta de asientos</h2>
          <p>Aplica filtros combinados para encontrar asientos específicos</p>
        </div>
        <div class="table-actions">
          <label class="table-search">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" /></svg
            ><input
              id="entry-search"
              type="search"
              placeholder="Buscar asientos..."
              aria-label="Buscar asientos" /></label
          ><button class="button button-secondary button-compact" data-go="entries">
            Ver todas <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>DESCRIPCIÓN</th>
              <th>FECHA</th>
              <th>ESTADO</th>
              <th class="amount-col">IMPORTE</th>
              <th><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody id="entries-body">
          </tbody>
        </table>
        <div class="no-results" id="no-results-entries" hidden>No se encontraron asientos para esta búsqueda.</div>
      </section>
  `

  // If no filters, show all entries
  const filteredEntries = filters.busqueda_texto || filters.estado
    ? applyFilters(filters)
    : entries

  const tbody = container.querySelector('#entries-body')
  const noResults = container.querySelector('#no-results-entries')

  tbody.innerHTML = ''
  noResults.hidden = true

  if (filteredEntries.length === 0) {
    noResults.hidden = false
    return container.firstElementChild
  }

  // Use DocumentFragment for efficient batch DOM updates
  const fragment = document.createDocumentFragment()
  
  filteredEntries.forEach((entry, index) => {
    const hasEfectivo = entry.detalles.some(d => {
      const account = loadCollection('accounts').records.find(a => a.id === d.id_cuenta)
      return account && account.es_efectivo
    })

    const rows = entry.detalles.map((line, lineIdx) => {
      const account = loadCollection('accounts').records.find(a => a.id === line.id_cuenta)
      const monto = line.monto_debe > 0 ? line.monto_debe : line.monto_haber >= 0 ? line.monto_haber : 0
      const amountClass = monto < 0 ? 'amount-negative' : 'amount-positive'
      
      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>
          <span class="transaction-main"
            ><strong>${entry.descripcion}</strong><small>${entry.fecha_contable}</small></span
          ></td>
        <td>${entry.fecha_contable}</td>
        <td>${entry.estado}</td>
        <td class="amount-col ${amountClass}">${hasEfectivo ? `$${monto.toFixed(2)}` : `$${monto}</span></td>
        <td>
          <button class="row-more" aria-label="Acciones para entrada ${index}">···</button>
        </td>
      `
      fragment.appendChild(tr)
    })
  })

  tbody.appendChild(fragment)

  return container.firstElementChild
}

function applyFilters(filters) {
  const { filterEntries } = await import('../services/query-service.js')
  return filterEntries(filters)
}

export function initEntryList(filters = {}) {
  const entries = loadCollection('entries').records
  const listElement = renderEntryList(filters, entries)
  
  const mainContent = document.querySelector('.main-content')
  if (mainContent) {
    mainContent.innerHTML = ''
    mainContent.appendChild(listElement)
  }
  
  // Add search event listener
  const searchInput = document.querySelector('#entry-search')
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.trim().toLocaleLowerCase('es')
      initEntryList({ busqueda_texto: searchTerm })
    })
  }
  
  // Add clear filters listener
  const clearBtn = document.querySelector('[data-go="entries"]')
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      initEntryList({})
    })
  }
  
  return listElement
}