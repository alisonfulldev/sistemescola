'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors text-sm"
    >
      🖨 Imprimir
    </button>
  )
}
