const LABELS = {
  nouveau: 'Nouveau',
  rdv_pris: 'RDV pris',
  devis: 'Devis',
  signe: 'Signé',
  installe: 'Installé',
  perdu: 'Perdu',
}

const VARS = {
  nouveau: '--status-nouveau',
  rdv_pris: '--status-rdv_pris',
  devis: '--status-devis',
  signe: '--status-signe',
  installe: '--status-installe',
  perdu: '--status-perdu',
}

export default function StatusBadge({ statut }) {
  if (!statut) return null
  const varName = VARS[statut] ?? '--status-nouveau'
  return (
    <span className="status-pill" style={{ background: `var(${varName})` }}>
      {LABELS[statut] ?? statut}
    </span>
  )
}
