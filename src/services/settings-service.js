const STORAGE_KEY = '@erp-settings'
const SCHEMA_VERSION = '1.0'

export function loadSettings() {
  const settingsString = localStorage.getItem(STORAGE_KEY)
  if (!settingsString) return null
  
  try {
    const settings = JSON.parse(settingsString)
    if (settings.schemaVersion) {
      return settings
    }
    // Legacy schema - migrate
    return migrateLegacySettings(settings)
  } catch {
    return null
  }
}

function migrateLegacySettings(settings) {
  const migrated = {
    schemaVersion: SCHEMA_VERSION,
    activePeriod: settings.activePeriod || { from: '', to: '', preset: 'month' },
    defaults: settings.defaults || {}
  }
  saveSettings(migrated)
  return migrated
}

export function saveSettings(settings) {
  const validated = validateSettings(settings)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(validated))
  return validated
}

function validateSettings(settings) {
  const result = { schemaVersion: SCHEMA_VERSION }
  
  // Validate activePeriod
  if (settings.activePeriod) {
    const { from, to, preset } = settings.activePeriod
    result.activePeriod = { from, to, preset }
    
    // Reject inverted ranges
    if (from && to) {
      const fromDate = new Date(`2026-${from}`)
      const toDate = new Date(`2026-${to}`)
      if (fromDate > toDate) {
        // Preserve previous configuration - return current valid settings
        const current = loadSettings()
        if (current) return current
        return result
      }
    }
  } else {
    result.activePeriod = { from: '', to: '', preset: 'month' }
  }
  
  // Validate schemaVersion
  result.schemaVersion = settings.schemaVersion || SCHEMA_VERSION
  
  // Preserve defaults if present
  if (settings.defaults) {
    result.defaults = settings.defaults
  }
  
  return result
}

export function setActivePeriod(from, to, preset = 'month') {
  // Don't accept inverted ranges
  if (from && to) {
    const fromDate = new Date(`2026-${from}`)
    const toDate = new Date(`2026-${to}`)
    if (fromDate > toDate) {
      return { success: false, error: 'Rango de fechas inválido' }
    }
  }
  
  const settings = saveSettings({
    activePeriod: { from, to, preset },
    schemaVersion: SCHEMA_VERSION
  })
  
  return { success: true, settings }
}