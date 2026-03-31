import Link from 'next/link'

const cards = [
  { href: '/admin/turmas', icon: '🏫', label: 'Turmas', desc: 'Gerenciar turmas e turnos' },
  { href: '/admin/alunos', icon: '👥', label: 'Alunos', desc: 'Cadastrar e gerenciar alunos' },
  { href: '/admin/usuarios', icon: '👤', label: 'Usuários', desc: 'Gerenciar usuários e senhas' },
  { href: '/admin/disciplinas', icon: '📚', label: 'Disciplinas', desc: 'Disciplinas e vínculos' },
  { href: '/admin/aulas', icon: '🗓', label: 'Aulas', desc: 'Programar grade de aulas' },
  { href: '/adm', icon: '📊', label: 'Painel ADM', desc: 'Ver painel da secretaria' },

]

export default function AdminPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Administração</h1>
        <p className="text-slate-600 mt-1 text-sm">Gerencie todos os aspectos do sistema</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(c => (
          <Link key={c.href} href={c.href}
            className="bg-white border border-slate-200 rounded-xl p-6 hover:border-blue-300 hover:bg-blue-50 transition-all group shadow-sm"
          >
            <div className="text-3xl mb-3">{c.icon}</div>
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{c.label}</h3>
            <p className="text-slate-500 text-sm mt-1">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
