import { createClient } from '../lib/supabase/client'
import { useEffect, useState } from 'react'

export function useEscola() {
  const [escolaId, setEscolaId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Single-school mode: null escolaId
    setEscolaId(null)
    setReady(true)
  }, [])

  return { escolaId, ready }
}
