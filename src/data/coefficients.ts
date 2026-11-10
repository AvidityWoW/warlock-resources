// Warlock spell-power coefficients at level 60, from the WoW Forever client tables plus server hotfixes (spelldb).
// Values are text, printed as shown; a field left out is blank in the tables. Rows are in A to Z order.
export const COEFF_BUILD = '1.60.1.70862 + hotfixes (client 1.60.1.70888, 2026-11-10)';

export type School = 'Fire' | 'Shadow';
/** one Bane of Agony stage: only its base damage ramps, every tick gets the same share of spell power */
export interface Stage { ticks: string; mult: string; perTick: string; damage: string; coeff: string }
export interface CoeffRow {
  school: School;
  name: string;
  /** name in the summary when it differs (Immolate's DoT part) */
  label?: string;
  /** Direct, DoT, Channel, with (leech), (aoe) and so on */
  part: string;
  /** highest rank; "a → b" when the damage comes from the spell it triggers */
  id: string;
  level: string;
  cast: string;
  duration?: string;
  /** base points */
  base: string;
  /** added per level from the level it is learned up to 60 */
  perLevel?: string;
  /** ± spread of direct damage */
  variance?: string;
  period?: string;
  ticks?: string;
  perTick?: string;
  /** damage at 60 before spell power */
  damage: string;
  coeffPerTick?: string;
  /** total spell-power coefficient */
  coeff: string;
  stages?: Stage[];
}

export const coefficients: CoeffRow[] = [
  { school: 'Shadow', name: 'Bane of Agony', part: 'DoT', id: '11713', level: '58', cast: 'instant', duration: '24 s', base: '46', period: '2 s', ticks: '12', perTick: '23/46/69', damage: '552', coeffPerTick: '0.133', coeff: '1.596',
    stages: [
      { ticks: '1–4', mult: '×0.5', perTick: '23', damage: '92', coeff: '0.532' },
      { ticks: '5–8', mult: '×1', perTick: '46', damage: '184', coeff: '0.532' },
      { ticks: '9–12', mult: '×1.5', perTick: '69', damage: '276', coeff: '0.532' },
    ] },
  { school: 'Shadow', name: 'Bane of Doom', part: 'DoT', id: '603', level: '60', cast: 'instant', duration: '60 s', base: '1742', period: '60 s', ticks: '1', perTick: '1742', damage: '1742', coeffPerTick: '4', coeff: '4' },
  { school: 'Fire', name: 'Conflagrate', part: 'Direct', id: '18932', level: '60', cast: 'instant', base: '282', perLevel: '+1.3', variance: '±11%', damage: '251–313', coeff: '0.429' },
  { school: 'Shadow', name: 'Corruption', part: 'DoT', id: '25311', level: '60', cast: '2 s', duration: '18 s', base: '73', period: '3 s', ticks: '6', perTick: '73', damage: '438', coeffPerTick: '0.2', coeff: '1.2' },
  { school: 'Shadow', name: 'Death Coil', part: 'Direct (leech)', id: '17926', level: '58', cast: 'instant', base: '454', perLevel: '+3', damage: '460', coeff: '0.214' },
  { school: 'Shadow', name: 'Drain Life', part: 'Channel (leech)', id: '11700', level: '54', cast: 'instant', duration: '5 s', base: '51', period: '1 s', ticks: '5', perTick: '51', damage: '255', coeffPerTick: '0.1', coeff: '0.5' },
  { school: 'Shadow', name: 'Drain Soul', part: 'Channel', id: '11675', level: '52', cast: 'instant', duration: '15 s', base: '84', period: '3 s', ticks: '5', perTick: '84', damage: '420', coeffPerTick: '0.1', coeff: '0.5' },
  { school: 'Fire', name: 'Hellfire', part: 'Channel (self + aoe)', id: '11684 → 11682', level: '54', cast: 'instant', duration: '15 s', base: '206', perLevel: '+0.7', period: '1 s', ticks: '15', perTick: '210', damage: '3150', coeffPerTick: '0.022', coeff: '0.33' },
  { school: 'Fire', name: 'Immolate', part: 'Direct', id: '25309', level: '60', cast: '2 s', base: '158', perLevel: '+2.3', damage: '158', coeff: '0.2' },
  { school: 'Fire', name: 'Immolate', label: 'Immolate (dot)', part: 'DoT', id: '25309', level: '60', cast: '2 s', duration: '15 s', base: '55', period: '3 s', ticks: '5', perTick: '55', damage: '275', coeffPerTick: '0.13', coeff: '0.65' },
  { school: 'Fire', name: 'Incinerate', part: 'Direct', id: '1293813', level: '60', cast: '2.5 s', base: '217', perLevel: '+1.4', variance: '±7.5%', damage: '201–234', coeff: '0.714' },
  { school: 'Fire', name: 'Rain of Fire', part: 'Channel (aoe)', id: '11678 → 1282385', level: '58', cast: 'instant', duration: '8 s', base: '220', perLevel: '+0.6', period: '2 s', ticks: '4', perTick: '221', damage: '884', coeffPerTick: '0.083', coeff: '0.332' },
  { school: 'Fire', name: 'Searing Pain', part: 'Direct', id: '17923', level: '58', cast: '1.5 s', base: '114', perLevel: '+1.2', variance: '±8.1%', damage: '107–126', coeff: '0.429' },
  { school: 'Shadow', name: 'Shadow Bolt', part: 'Direct', id: '25307', level: '60', cast: '3 s', base: '268', perLevel: '+1.9', variance: '±5.5%', damage: '253–283', coeff: '0.857' },
  { school: 'Shadow', name: 'Shadowburn', part: 'Direct', id: '18871', level: '56', cast: 'instant', base: '266', perLevel: '+1.8', variance: '±5.5%', damage: '258–289', coeff: '0.429' },
  { school: 'Shadow', name: 'Siphon Life', part: 'DoT (leech)', id: '18881', level: '58', cast: 'instant', duration: '30 s', base: '41', period: '3 s', ticks: '10', perTick: '41', damage: '410', coeffPerTick: '0.05', coeff: '0.5' },
  { school: 'Fire', name: 'Soul Fire', part: 'Direct', id: '17924', level: '56', cast: '6 s', base: '431', perLevel: '+1.9', variance: '±11.2%', damage: '389–488', coeff: '1' },
  { school: 'Shadow', name: 'Wrack', part: 'Channel', id: '1316697', level: '40', cast: 'instant', duration: '6 s', base: '25.2', perLevel: '+1.75', period: '1 s', ticks: '6', perTick: '60', damage: '360', coeffPerTick: '0.2002', coeff: '1.201' },
];
