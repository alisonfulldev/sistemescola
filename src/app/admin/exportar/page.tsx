'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, Users, BookOpen, BarChart3, Calendar, GraduationCap, School } from 'lucide-react'

const ABAS = [
  { icon: Users,           label: 'Alunos',        desc: 'Nome, matrícula, turma, situação e responsável' },
  { icon: BookOpen,        label: 'Notas',          desc: 'B1, B2, B3, B4, média e situação por disciplina' },
  { icon: BarChart3,       label: 'Frequência',     desc: 'Presenças, faltas e % de frequência por aluno' },
  { icon: School,          label: 'Turmas',         desc: 'Nome, turno, série, grau e aulas previstas' },
  { icon: GraduationCap,   label: 'Disciplinas',    desc: 'Nome, professor e código' },
  { icon: Users,           label: 'Usuários',       desc: 'Nome, email, perfil e status' },
  { icon: Calendar,        label: 'Anos Letivos',   desc: 'Ano, período e status' },
]

export default function ExportarPage() {
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)

  async function exportar() {
    setBaixando(true)
    setErro('')
    setOk(false)
    try {
      const res = await fetch('/api/admin/export/dados-completos')
      if (!res.ok) {
        const d = await res.json()
        setErro(d.error || `Erro ${res.status}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dados-escola-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setOk(true)
      setTimeout(() => setOk(false), 4000)
    } catch (e: any) {
      setErro('Erro de conexão: ' + (e?.message || 'tente novamente'))
    } finally {
      setBaixando(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Exportar Dados</h1>
        <p className="text-slate-500 text-sm mt-1">
          Gera um arquivo Excel com todos os dados do sistema organizados em abas.
        </p>
      </div>

      {/* Abas incluídas */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-6">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Conteúdo do arquivo — {ABAS.length} abas
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {ABAS.map((aba, i) => {
            const Icon = aba.icon
            return (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{aba.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{aba.desc}</p>
                </div>
                <span className="text-xs text-slate-300 font-mono shrink-0">Aba {i + 1}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Feedback */}
      {erro && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {erro}
        </div>
      )}
      {ok && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
          <span>✓</span> Arquivo baixado com sucesso!
        </div>
      )}

      {/* Botão exportar */}
      <button
        onClick={exportar}
        disabled={baixando}
        className="flex items-center gap-3 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl shadow-sm transition-all"
      >
        {baixando ? (
          <>
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Gerando arquivo...
          </>
        ) : (
          <>
            <FileSpreadsheet className="w-5 h-5" />
            Baixar Excel com todos os dados
          </>
        )}
      </button>

      <p className="text-xs text-slate-400 mt-3">
        O arquivo inclui dados ativos e inativos. Formato: .xlsx (compatível com Excel, Google Planilhas e LibreOffice).
      </p>
    </div>
  )
}
