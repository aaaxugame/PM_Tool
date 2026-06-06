export const CURRENCIES = [
  { code: 'USD', symbol: '$',    label: 'USD — US Dollar' },
  { code: 'EUR', symbol: '€',    label: 'EUR — Euro' },
  { code: 'GBP', symbol: '£',    label: 'GBP — British Pound' },
  { code: 'JPY', symbol: '¥',    label: 'JPY — Japanese Yen' },
  { code: 'CAD', symbol: 'CA$',  label: 'CAD — Canadian Dollar' },
  { code: 'AUD', symbol: 'A$',   label: 'AUD — Australian Dollar' },
  { code: 'CHF', symbol: 'CHF',  label: 'CHF — Swiss Franc' },
  { code: 'CNY', symbol: '¥',    label: 'CNY — Chinese Yuan' },
  { code: 'HKD', symbol: 'HK$',  label: 'HKD — Hong Kong Dollar' },
  { code: 'SGD', symbol: 'S$',   label: 'SGD — Singapore Dollar' },
  { code: 'TWD', symbol: 'NT$',  label: 'TWD — Taiwan Dollar' },
  { code: 'KRW', symbol: '₩',    label: 'KRW — South Korean Won' },
  { code: 'MXN', symbol: 'MX$',  label: 'MXN — Mexican Peso' },
  { code: 'BRL', symbol: 'R$',   label: 'BRL — Brazilian Real' },
  { code: 'INR', symbol: '₹',    label: 'INR — Indian Rupee' },
]

const SYMBOL_MAP: Record<string, string> = Object.fromEntries(
  CURRENCIES.map(c => [c.code, c.symbol])
)

export function currencySymbol(code: string): string {
  return SYMBOL_MAP[code] ?? code
}

export function fmtMoney(amount: number | string, currency = 'USD'): string {
  const sym = currencySymbol(currency)
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
