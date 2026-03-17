import Link from 'next/link'

const cards = [
  { href: '/admin/turmas', icon: '🏫', label: 'Turmas', desc: 'Gerenciar turmas e turnos' },
  { href: '/admin/alunos', icon: '👥', label: 'Alunos', desc: 'Cadastrar alunos e gerar QR Codes' },
  { href: '/admin/professores', icon: '👨‍🏫', label: 'Professores', desc: 'Usuários professores e secretaria' },
  { href: '/admin/disciplinas', icon: '📚', label: 'Disciplinas', desc: 'Disciplinas e vínculos' },
  { href: '/admin/aulas', icon: '🗓', label: 'Aulas', desc: 'Programar grade de aulas' },
  { href: '/adm', icon: '📊', label: 'Painel ADM', desc: 'Ver painel da secretaria' },
  { href: '/portaria', icon: '📱', label: 'Portaria QR', desc: 'Leitor de QR Code da portaria' },
]

export default function AdminPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Administração</h1>
        <p className="text-gray-400 mt-1 text-sm">Gerencie todos os aspectos do sistema</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(c => (
          <Link key={c.href} href={c.href}
            className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all group"
          >
            <div className="text-3xl mb-3">{c.icon}</div>
            <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors">{c.label}</h3>
            <p className="text-gray-400 text-sm mt-1">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
