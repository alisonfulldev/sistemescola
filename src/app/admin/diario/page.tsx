'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Download, Database } from 'lucide-react'
import { exportarDados } from '@/lib/export-data'

export default function DiarioPage() {
  const [loading, setLoading] = useState(false)
  const [exportandoDia, setExportandoDia] = useState(false)
  const [exportandoCompleto, setExportandoCompleto] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null)

  const supabase = createClient()

  async function handleExportar(tipo: 'dia' | 'completo') {
    if (tipo === 'dia') setExportandoDia(true)
    else setExportandoCompleto(true)

    setMensagem(null)

    try {
      const resultado = await exportarDados(supabase, tipo)
      setMensagem({
        tipo: resultado.sucesso ? 'sucesso' : 'erro',
        texto: resultado.mensagem
      })
    } catch (err) {
      setMensagem({
        tipo: 'erro',
        texto: (err as Error).message || 'Erro ao exportar dados'
      })
    } finally {
      if (tipo === 'dia') setExportandoDia(false)
      else setExportandoCompleto(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Database className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">Exportar Dados</h1>
        </div>
        <p className="text-slate-600 text-sm">Exporte todos os dados do sistema em Excel para análise e backup</p>
      </div>

      {/* Mensagem */}
      {mensagem && (
        <div className={`mb-6 p-4 border rounded-lg flex items-start gap-3 ${
          mensagem.tipo === 'sucesso'
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className={mensagem.tipo === 'sucesso' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
            {mensagem.tipo === 'sucesso' ? '✓' : '✕'}
          </div>
          <p className={`text-sm ${mensagem.tipo === 'sucesso' ? 'text-green-700' : 'text-red-700'}`}>
            {mensagem.texto}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card: Dados do Dia */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:border-blue-300 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Dados do Dia</h3>
              <p className="text-sm text-slate-500 mt-1">
                Exporta apenas os registros de hoje (aulas, chamadas e frequência)
              </p>
            </div>
            <div className="text-3xl">📅</div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 mb-4 text-sm text-slate-600 space-y-1">
            <p><strong>Inclui:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Aulas de hoje</li>
              <li>Chamadas e frequência</li>
              <li>Configurações da escola</li>
            </ul>
          </div>

          <button
            onClick={() => handleExportar('dia')}
            disabled={exportandoDia || exportandoCompleto}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            {exportandoDia ? 'Exportando...' : 'Exportar Dados do Dia'}
          </button>
        </div>

        {/* Card: Dados Completos */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:border-blue-300 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Dados Completos</h3>
              <p className="text-sm text-slate-500 mt-1">
                Backup completo de todos os dados do banco (desde o início)
              </p>
            </div>
            <div className="text-3xl">💾</div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 mb-4 text-sm text-slate-600 space-y-1">
            <p><strong>Inclui:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Todos os alunos e responsáveis</li>
              <li>Todas as turmas e disciplinas</li>
              <li>Todas as notas e frequência</li>
              <li>Todas as aulas e conteúdo</li>
              <li>Usuários e configurações</li>
            </ul>
          </div>

          <button
            onClick={() => handleExportar('completo')}
            disabled={exportandoDia || exportandoCompleto}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            {exportandoCompleto ? 'Exportando...' : 'Exportar Dados Completos'}
          </button>
        </div>
      </div>

      {/* Informações */}
      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Sobre as Exportações</h2>
        <div className="space-y-4 text-sm text-slate-600">
          <p>
            <strong>Formato:</strong> Os dados são exportados em Excel (.xlsx) com múltiplas abas, uma para cada tabela do sistema.
          </p>
          <p>
            <strong>Estrutura:</strong> Cada aba contém dados bem organizados com cabeçalhos e formatação adequada para análise de dados.
          </p>
          <p>
            <strong>Uso:</strong> Ideal para o time de análise de dados, backup e relatórios em ferramentas como Power BI, Tableau ou Google Sheets.
          </p>
          <p>
            <strong>Dados do Dia:</strong> Útil para acompanhamento diário de atividades (aulas, frequência do dia).
          </p>
          <p>
            <strong>Dados Completos:</strong> Recomendado como backup periódico (semanal/mensal) de todos os dados do sistema.
          </p>
        </div>
      </div>
    </div>
  )
}
