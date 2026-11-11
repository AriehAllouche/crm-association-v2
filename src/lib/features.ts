/**
 * Source unique du découpage V1 / V2.
 *
 * Un module listé ici est reporté en V2. Il reste visible dans la barre de
 * navigation avec un badge « V2 » (c'est la feuille de route annoncée), mais
 * il est masqué partout où il exposerait des données comme si elles étaient
 * exploitables: onglets de fiche animal, timeline, tableau de bord, recherche.
 *
 * Sans ce garde-fou les surfaces divergent: la recherche renvoyait vers
 * /justice, qui affiche « Fonctionnalité à venir ». L'utilisateur trouvait la
 * donnée, puis se heurtait à un mur.
 *
 * Pour promouvoir un module en V1:
 *   1. retirer sa clé de V2_MODULES;
 *   2. brancher sa vraie page dans App.tsx (la route rend ComingSoonPage tant
 *      que ce n'est pas fait — les pages existent déjà mais n'ont jamais
 *      tourné, à auditer avant).
 */
export const V2_MODULES = new Set<string>([
  'transport',
  'enqueteurs',
  'registre',
  'import',
]);

/**
 * @param module Clé de module. Les onglets de fiche animal, les types
 *   d'événements de la timeline et les entrées de navigation partagent
 *   volontairement le même vocabulaire ('justice', 'pension', ...).
 */
export function isV2(module: string): boolean {
  return V2_MODULES.has(module);
}
