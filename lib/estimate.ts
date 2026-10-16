// ATTENTION : valeurs de démonstration. Remplacez par des barèmes que vous pouvez justifier,
// ou n'affichez qu'un message qualitatif. Une estimation trompeuse est un risque juridique.
export function estimateEnergies(factureAnnuelle: number) {
  return { min: Math.round(factureAnnuelle * 0.15), max: Math.round(factureAnnuelle * 0.35) };
}
