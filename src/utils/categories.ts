export interface CategoryInfo {
  id: string;
  label: string;
  class: string;
}

export function mapCategory(tagOrCategory?: string): CategoryInfo {
  if (!tagOrCategory) {
    return { id: 'sist', label: 'Sistemi e IA', class: 'c-sist' };
  }
  const val = tagOrCategory.toLowerCase().trim();
  if (
    val.includes('energia') ||
    val.includes('fotovoltaico') ||
    val.includes('hems') ||
    val.includes('solar') ||
    val.includes('batter')
  ) {
    return { id: 'energia', label: 'Energia', class: 'c-energia' };
  }
  if (
    val.includes('ottim') ||
    val.includes('milp') ||
    val.includes('solver')
  ) {
    return { id: 'ottim', label: 'Ottimizzazione', class: 'c-ottim' };
  }
  if (
    val.includes('proto') ||
    val.includes('embedded') ||
    val.includes('esp') ||
    val.includes('modbus') ||
    val.includes('mqtt') ||
    val.includes('hardware') ||
    val.includes('rtsp') ||
    val.includes('ssh')
  ) {
    return { id: 'proto', label: 'Protocolli ed embedded', class: 'c-proto' };
  }
  return { id: 'sist', label: 'Sistemi e IA', class: 'c-sist' };
}

export function getPostCategory(tags: string[] = []): CategoryInfo {
  if (!tags || tags.length === 0) {
    return { id: 'sist', label: 'Sistemi e IA', class: 'c-sist' };
  }
  for (const tag of tags) {
    const mapped = mapCategory(tag);
    if (mapped.id !== 'sist') return mapped;
  }
  return mapCategory(tags[0]);
}
