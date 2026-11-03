import { families, familyMap, frontierFamilies, notableFamilies } from './models';

function ordered(ids: string[]) {
  return ids.flatMap((id) => {
    const family = familyMap.get(id);
    return family ? [family] : [];
  });
}

export const curatedSections = [
  { name: 'Frontier', items: ordered(frontierFamilies) },
  { name: 'Notable', items: ordered(notableFamilies) },
];

const curatedIds = new Set([...frontierFamilies, ...notableFamilies]);
const otherFamilies = families
  .filter((family) => !curatedIds.has(family.family))
  .toSorted(
    (a, b) =>
      a.model.labName.localeCompare(b.model.labName) ||
      (b.model.released ?? '').localeCompare(a.model.released ?? ''),
  );

export function selectedOtherFamilies(selected: string[]) {
  return otherFamilies.filter((family) => selected.includes(family.family));
}

export function browseFamilies(selected: string[], showOpen: boolean, showOlder: boolean) {
  return otherFamilies.filter(
    (family) =>
      selected.includes(family.family) ||
      ((showOpen || !family.model.open) && (showOlder || !family.model.deprecated)),
  );
}
