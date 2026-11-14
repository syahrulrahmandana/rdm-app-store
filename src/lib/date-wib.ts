/**
 * WIB (Waktu Indonesia Barat / UTC+7 / Asia/Jakarta) Date Utilities
 * Ensures all report calculations, daily resets, and date groupings roll over precisely at 00:00:00 WIB.
 */

export interface WIBDateParts {
  year: number
  month: number // 1-12
  day: number
  hour: number
  minute: number
  second: number
  dateStr: string // YYYY-MM-DD
}

export function getWIBDateParts(d: Date | string | number = new Date()): WIBDateParts {
  const dateObj = typeof d === 'object' && d instanceof Date ? d : new Date(d)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(dateObj)
  const map: Record<string, string> = {}
  for (const p of parts) {
    map[p.type] = p.value
  }

  const year = parseInt(map.year, 10)
  const month = parseInt(map.month, 10)
  const day = parseInt(map.day, 10)
  const hour = parseInt(map.hour, 10)
  const minute = parseInt(map.minute, 10)
  const second = parseInt(map.second, 10)
  const dateStr = `${map.year}-${map.month}-${map.day}`

  return { year, month, day, hour, minute, second, dateStr }
}

/**
 * Returns the exact UTC Date corresponding to 00:00:00.000 WIB for a given date.
 */
export function getWIBStartOfDay(d: Date | string | number = new Date()): Date {
  const parts = getWIBDateParts(d)
  return new Date(`${parts.dateStr}T00:00:00.000+07:00`)
}

/**
 * Returns the exact UTC Date corresponding to 23:59:59.999 WIB for a given date.
 */
export function getWIBEndOfDay(d: Date | string | number = new Date()): Date {
  const parts = getWIBDateParts(d)
  return new Date(`${parts.dateStr}T23:59:59.999+07:00`)
}

/**
 * Returns the exact UTC Date corresponding to Monday 00:00:00.000 WIB for the week containing d.
 */
export function getWIBStartOfWeek(d: Date | string | number = new Date()): Date {
  const dateObj = typeof d === 'object' && d instanceof Date ? d : new Date(d)
  const startOfDay = getWIBStartOfDay(dateObj)
  const dayOfWeekStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
  }).format(dateObj)

  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  const day = dayMap[dayOfWeekStr] ?? 0
  const diff = day === 0 ? 6 : day - 1 // Days elapsed since Monday
  return new Date(startOfDay.getTime() - diff * 24 * 60 * 60 * 1000)
}

/**
 * Returns the exact UTC Date corresponding to Sunday 23:59:59.999 WIB for the week containing d.
 */
export function getWIBEndOfWeek(d: Date | string | number = new Date()): Date {
  const monday = getWIBStartOfWeek(d)
  return new Date(monday.getTime() + (7 * 24 * 60 * 60 * 1000 - 1))
}

/**
 * Returns the exact UTC Date corresponding to 1st of month 00:00:00.000 WIB.
 */
export function getWIBStartOfMonth(d: Date | string | number = new Date()): Date {
  const parts = getWIBDateParts(d)
  const mm = String(parts.month).padStart(2, '0')
  return new Date(`${parts.year}-${mm}-01T00:00:00.000+07:00`)
}

/**
 * Returns the exact UTC Date corresponding to the last day of month 23:59:59.999 WIB.
 */
export function getWIBEndOfMonth(d: Date | string | number = new Date()): Date {
  const parts = getWIBDateParts(d)
  const lastDay = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate()
  const mm = String(parts.month).padStart(2, '0')
  const dd = String(lastDay).padStart(2, '0')
  return new Date(`${parts.year}-${mm}-${dd}T23:59:59.999+07:00`)
}

/**
 * Parse an input string like 'YYYY-MM-DD' as 00:00:00.000 WIB
 */
export function parseWIBDateStart(dateStr: string): Date {
  if (dateStr.includes('T')) {
    return new Date(dateStr)
  }
  return new Date(`${dateStr}T00:00:00.000+07:00`)
}

/**
 * Parse an input string like 'YYYY-MM-DD' as 23:59:59.999 WIB
 */
export function parseWIBDateEnd(dateStr: string): Date {
  if (dateStr.includes('T')) {
    return new Date(dateStr)
  }
  return new Date(`${dateStr}T23:59:59.999+07:00`)
}
