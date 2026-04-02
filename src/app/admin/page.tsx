import Link from 'next/link'
import { BookOpen, Users, User, Users2, Calendar, BarChart3 } from 'lucide-react'

const cards = [
  { href: '/admin/turmas', icon: BookOpen, label: 'Turmas', desc: 'Gerenciar turmas e turnos' },
  { href: '/admin/alunos', icon: Users, label: 'Alunos', desc: 'Cadastrar e gerenciar alunos' },
  { href: '/admin/usuarios', icon: User, label: 'Usuários', desc: 'Gerenciar usuários e senhas' },
  { href: '/admin/disciplinas', icon: Users2, label: 'Disciplinas', desc: 'Disciplinas e vínculos' },
  { href: '/admin/aulas', icon: Calendar, label: 'Aulas', desc: 'Programar grade de aulas' },
  { href: '/adm', icon: BarChart3, label: 'Dashboard', desc: 'Ver dashboard da secretaria' },
]

export default function AdminPage() {
  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900">Administração</h1>
        <p className="text-slate-600 mt-2 text-sm">Gerencie todos os aspectos do sistema escolar</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map(card => {
          const Icon = card.icon
          return (
            <Link
              key={card.href}
              href={card.href}
              className="bg-white border border-slate-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                <Icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base group-hover:text-blue-700 transition-colors">
                {card.label}
              </h3>
              <p className="text-slate-500 text-sm mt-2">{card.desc}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
