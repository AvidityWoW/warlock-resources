// Every rank of the Warlock spells whose amounts don't scale with spell power, for the Coefficients page's Utility spells
// table. Written by tools/coefficients/utility.py from spelldb: Forever with the client's hotfixes, and Classic Era
// 1.15.9.70003 (the same spell IDs). Times are in ms. cost is paid once, costPerSec every second of a channel; spi is
// the amount added per point of Spirit (Life Tap's tooltip formula).

export interface URank {
  id: number;
  /** level it is learned at, and the levels its amount scales between (MaxLevel 0: no cap but 60) */
  learn: number; bl?: number; ml?: number;
  base: number; per?: number; spi?: number;
  ticks?: number; period?: number; dur?: number; cast: number; channel?: true;
  cost: number; costPerSec?: number; costType: 'mana' | 'health';
  /** learned from a book, not a trainer */
  book?: true;
}
export interface UtilitySpell {
  key: string; name: string;
  /** what the amount is: health into mana, health to your demon, damage absorbed, mana drained */
  kind: 'convert' | 'heal' | 'absorb' | 'drain';
  forever: URank[];
  classic: URank[] | null;
}

export const utilityRanks: UtilitySpell[] = [
  { key: "Life Tap", name: "Life Tap", kind: 'convert',
    forever: [
      {"id":1454,"learn":6,"bl":6,"ml":16,"per":1.0,"base":20.0,"spi":1.0,"cast":0,"cost":0,"costType":"health"},
      {"id":1455,"learn":16,"bl":16,"ml":26,"per":1.0,"base":65.0,"spi":1.0,"cast":0,"cost":0,"costType":"health"},
      {"id":1456,"learn":26,"bl":26,"ml":36,"per":1.0,"base":130.0,"spi":1.0,"cast":0,"cost":0,"costType":"health"},
      {"id":11687,"learn":36,"bl":36,"ml":46,"per":1.0,"base":210.0,"spi":1.0,"cast":0,"cost":0,"costType":"health"},
      {"id":11688,"learn":46,"bl":46,"ml":56,"per":1.0,"base":300.0,"spi":1.0,"cast":0,"cost":0,"costType":"health"},
      {"id":11689,"learn":56,"bl":56,"ml":66,"per":1.0,"base":420.0,"spi":1.0,"cast":0,"cost":0,"costType":"health"},
    ],
    classic: [
      {"id":1454,"learn":6,"bl":6,"ml":16,"per":1.0,"base":20.0,"cast":0,"cost":0,"costType":"health"},
      {"id":1455,"learn":16,"bl":16,"ml":26,"per":1.0,"base":65.0,"cast":0,"cost":0,"costType":"health"},
      {"id":1456,"learn":26,"bl":26,"ml":36,"per":1.0,"base":130.0,"cast":0,"cost":0,"costType":"health"},
      {"id":11687,"learn":36,"bl":36,"ml":46,"per":1.0,"base":210.0,"cast":0,"cost":0,"costType":"health"},
      {"id":11688,"learn":46,"bl":46,"ml":56,"per":1.0,"base":300.0,"cast":0,"cost":0,"costType":"health"},
      {"id":11689,"learn":56,"bl":56,"ml":66,"per":1.0,"base":420.0,"cast":0,"cost":0,"costType":"health"},
    ] },
  { key: "Health Funnel", name: "Health Funnel", kind: 'heal',
    forever: [
      {"id":755,"learn":12,"base":12.0,"ticks":10,"period":1000,"dur":10000,"cast":0,"channel":true,"cost":11,"costPerSec":5,"costType":"health"},
      {"id":3698,"learn":20,"base":24.0,"ticks":10,"period":1000,"dur":10000,"cast":0,"channel":true,"cost":15,"costPerSec":10,"costType":"health"},
      {"id":3699,"learn":28,"base":43.0,"ticks":10,"period":1000,"dur":10000,"cast":0,"channel":true,"cost":24,"costPerSec":17,"costType":"health"},
      {"id":3700,"learn":36,"base":64.0,"ticks":10,"period":1000,"dur":10000,"cast":0,"channel":true,"cost":39,"costPerSec":25,"costType":"health"},
      {"id":11693,"learn":44,"base":89.0,"ticks":10,"period":1000,"dur":10000,"cast":0,"channel":true,"cost":45,"costPerSec":35,"costType":"health"},
      {"id":11694,"learn":52,"base":119.0,"ticks":10,"period":1000,"dur":10000,"cast":0,"channel":true,"cost":62,"costPerSec":47,"costType":"health"},
      {"id":11695,"learn":60,"base":153.0,"ticks":10,"period":1000,"dur":10000,"cast":0,"channel":true,"cost":79,"costPerSec":61,"costType":"health"},
    ],
    classic: [
      {"id":755,"learn":12,"base":12.0,"ticks":10,"period":1000,"dur":10000,"cast":0,"channel":true,"cost":11,"costPerSec":5,"costType":"health"},
      {"id":3698,"learn":20,"base":24.0,"ticks":10,"period":1000,"dur":10000,"cast":0,"channel":true,"cost":15,"costPerSec":10,"costType":"health"},
      {"id":3699,"learn":28,"base":43.0,"ticks":10,"period":1000,"dur":10000,"cast":0,"channel":true,"cost":24,"costPerSec":17,"costType":"health"},
      {"id":3700,"learn":36,"base":64.0,"ticks":10,"period":1000,"dur":10000,"cast":0,"channel":true,"cost":39,"costPerSec":24,"costType":"health"},
      {"id":11693,"learn":44,"base":89.0,"ticks":10,"period":1000,"dur":10000,"cast":0,"channel":true,"cost":45,"costPerSec":33,"costType":"health"},
      {"id":11694,"learn":52,"base":119.0,"ticks":10,"period":1000,"dur":10000,"cast":0,"channel":true,"cost":62,"costPerSec":42,"costType":"health"},
      {"id":11695,"learn":60,"base":153.0,"ticks":10,"period":1000,"dur":10000,"cast":0,"channel":true,"cost":79,"costPerSec":52,"costType":"health"},
    ] },
  { key: "Shadow Ward", name: "Shadow Ward", kind: 'absorb',
    forever: [
      {"id":6229,"learn":32,"base":290.0,"dur":30000,"cast":0,"cost":135,"costType":"mana"},
      {"id":11739,"learn":42,"base":470.0,"dur":30000,"cast":0,"cost":195,"costType":"mana"},
      {"id":11740,"learn":52,"base":675.0,"dur":30000,"cast":0,"cost":255,"costType":"mana"},
      {"id":28610,"learn":60,"base":920.0,"dur":30000,"cast":0,"cost":320,"costType":"mana","book":true},
    ],
    classic: [
      {"id":6229,"learn":32,"base":290.0,"dur":30000,"cast":0,"cost":135,"costType":"mana"},
      {"id":11739,"learn":42,"base":470.0,"dur":30000,"cast":0,"cost":195,"costType":"mana"},
      {"id":11740,"learn":52,"base":675.0,"dur":30000,"cast":0,"cost":255,"costType":"mana"},
      {"id":28610,"learn":60,"base":920.0,"dur":30000,"cast":0,"cost":320,"costType":"mana"},
    ] },
  { key: "Drain Mana", name: "Drain Mana", kind: 'drain',
    forever: [
      {"id":5138,"learn":24,"bl":24,"ml":29,"per":0.4,"base":42.0,"ticks":5,"period":1000,"dur":5000,"cast":0,"channel":true,"cost":95,"costType":"mana"},
      {"id":6226,"learn":34,"bl":34,"ml":39,"per":0.5,"base":68.0,"ticks":5,"period":1000,"dur":5000,"cast":0,"channel":true,"cost":155,"costType":"mana"},
      {"id":11703,"learn":44,"bl":44,"ml":49,"per":0.6,"base":99.0,"ticks":5,"period":1000,"dur":5000,"cast":0,"channel":true,"cost":225,"costType":"mana"},
      {"id":11704,"learn":54,"bl":54,"ml":59,"per":0.7,"base":136.0,"ticks":5,"period":1000,"dur":5000,"cast":0,"channel":true,"cost":310,"costType":"mana"},
    ],
    classic: [
      {"id":5138,"learn":24,"bl":24,"ml":29,"per":0.4,"base":42.0,"ticks":5,"period":1000,"dur":5000,"cast":0,"channel":true,"cost":95,"costType":"mana"},
      {"id":6226,"learn":34,"bl":34,"ml":39,"per":0.5,"base":68.0,"ticks":5,"period":1000,"dur":5000,"cast":0,"channel":true,"cost":155,"costType":"mana"},
      {"id":11703,"learn":44,"bl":44,"ml":49,"per":0.6,"base":99.0,"ticks":5,"period":1000,"dur":5000,"cast":0,"channel":true,"cost":225,"costType":"mana"},
      {"id":11704,"learn":54,"bl":54,"ml":59,"per":0.7,"base":136.0,"ticks":5,"period":1000,"dur":5000,"cast":0,"channel":true,"cost":310,"costType":"mana"},
    ] },
];
