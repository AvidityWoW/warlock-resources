// Every rank of the warlock damage spells, for the Coefficients page's full detail: its level slider and Classic comparison.
// Generated from spelldb: WoW Forever 1.60.1.70862 with the client's hotfixes (70888), and Classic Era 1.15.9.70003.
// Times are in ms. Forever gives a base and a variance; Classic gives dice (lo to hi), stored here as their middle and spread too.
import type { School } from './coefficients';

export const CLASSIC_BUILD = '1.15.9.70003';

export interface Rank {
  id: number;
  /** the spell that deals the damage, when it is another one (Hellfire's AoE, Rain of Fire) */
  dmgId?: number;
  /** level it is learned at, and the levels its damage scales between (MaxLevel 0: no cap but 60) */
  learn: number; bl?: number; ml?: number;
  base: number; per?: number; var?: number;
  /** Classic's damage dice, low and high */
  dice?: [number, number];
  /** spell-power coefficient of one hit or tick */
  coef?: number;
  ticks: number; period?: number; dur?: number; cast: number;
}
export interface RankedSpell {
  key: string; name: string; school: School; part: string;
  /** Bane of Agony: its base damage ramps x0.5 / x1 / x1.5 over three stages */
  agony?: true;
  forever: Rank[];
  classic: { name: string; ranks: Rank[] } | null;
}

export const ranked: RankedSpell[] = [
  { key: "Bane of Agony", name: "Bane of Agony", school: 'Shadow', part: "DoT", agony: true,
    forever: [
      {"id":980,"learn":8,"bl":8,"base":6.0,"coef":0.133,"ticks":12,"period":2000,"dur":24000,"cast":0},
      {"id":1014,"learn":18,"bl":18,"base":10.0,"coef":0.133,"ticks":12,"period":2000,"dur":24000,"cast":0},
      {"id":6217,"learn":28,"bl":28,"base":14.0,"coef":0.133,"ticks":12,"period":2000,"dur":24000,"cast":0},
      {"id":11711,"learn":38,"bl":38,"base":21.0,"coef":0.133,"ticks":12,"period":2000,"dur":24000,"cast":0},
      {"id":11712,"learn":48,"bl":48,"base":33.0,"coef":0.133,"ticks":12,"period":2000,"dur":24000,"cast":0},
      {"id":11713,"learn":58,"bl":58,"base":46.0,"coef":0.133,"ticks":12,"period":2000,"dur":24000,"cast":0},
    ],
    classic: { name: "Curse of Agony", ranks: [
      {"id":980,"learn":8,"bl":8,"base":7.0,"coef":0.046,"ticks":12,"period":2000,"dur":24000,"cast":0},
      {"id":1014,"learn":18,"bl":18,"base":15.0,"coef":0.077,"ticks":12,"period":2000,"dur":24000,"cast":0},
      {"id":6217,"learn":28,"bl":28,"base":27.0,"coef":0.083,"ticks":12,"period":2000,"dur":24000,"cast":0},
      {"id":11711,"learn":38,"bl":38,"base":42.0,"coef":0.083,"ticks":12,"period":2000,"dur":24000,"cast":0},
      {"id":11712,"learn":48,"bl":48,"base":65.0,"coef":0.083,"ticks":12,"period":2000,"dur":24000,"cast":0},
      {"id":11713,"learn":58,"bl":58,"base":87.0,"coef":0.083,"ticks":12,"period":2000,"dur":24000,"cast":0},
    ] },
  },
  { key: "Bane of Doom", name: "Bane of Doom", school: 'Shadow', part: "DoT",
    forever: [
      {"id":603,"learn":60,"bl":60,"base":1742.0,"coef":4.0,"ticks":1,"period":60000,"dur":60000,"cast":0},
    ],
    classic: { name: "Curse of Doom", ranks: [
      {"id":603,"learn":60,"bl":60,"base":3200.0,"coef":1.0,"ticks":1,"period":60000,"dur":60000,"cast":0},
    ] },
  },
  { key: "Conflagrate", name: "Conflagrate", school: 'Fire', part: "Direct",
    forever: [
      {"id":1293817,"learn":25,"bl":25,"ml":30,"base":95.0,"per":0.9,"var":0.241758,"coef":0.429,"ticks":0,"cast":0},
      {"id":1293818,"learn":32,"bl":32,"ml":38,"base":122.0,"per":0.9,"var":0.241758,"coef":0.429,"ticks":0,"cast":0},
      {"id":17962,"learn":40,"bl":40,"ml":46,"base":146.0,"per":1.0,"var":0.241758,"coef":0.429,"ticks":0,"cast":0},
      {"id":18930,"learn":48,"bl":48,"ml":54,"base":194.0,"per":1.1,"var":0.224719,"coef":0.429,"ticks":0,"cast":0},
      {"id":18931,"learn":54,"bl":54,"ml":60,"base":239.0,"per":1.2,"var":0.222738,"coef":0.429,"ticks":0,"cast":0},
      {"id":18932,"learn":60,"bl":60,"ml":66,"base":282.0,"per":1.3,"var":0.219124,"coef":0.429,"ticks":0,"cast":0},
    ],
    classic: { name: "Conflagrate", ranks: [
      {"dice":[240,306],"id":17962,"learn":40,"bl":40,"ml":46,"base":273.0,"per":1.6,"var":0.241758,"coef":0.429,"ticks":0,"cast":0},
      {"dice":[316,396],"id":18930,"learn":48,"bl":48,"ml":54,"base":356.0,"per":1.8,"var":0.224719,"coef":0.429,"ticks":0,"cast":0},
      {"dice":[383,479],"id":18931,"learn":54,"bl":54,"ml":60,"base":431.0,"per":2.0,"var":0.222738,"coef":0.429,"ticks":0,"cast":0},
      {"dice":[447,557],"id":18932,"learn":60,"bl":60,"ml":66,"base":502.0,"per":2.2,"var":0.219124,"coef":0.429,"ticks":0,"cast":0},
    ] },
  },
  { key: "Corruption", name: "Corruption", school: 'Shadow', part: "DoT",
    forever: [
      {"id":172,"learn":4,"bl":4,"ml":9,"base":10.0,"coef":0.2,"ticks":4,"period":3000,"dur":12000,"cast":2000},
      {"id":6222,"learn":14,"bl":14,"ml":19,"base":13.0,"coef":0.2,"ticks":5,"period":3000,"dur":15000,"cast":2000},
      {"id":6223,"learn":24,"bl":24,"ml":29,"base":22.0,"coef":0.2,"ticks":6,"period":3000,"dur":18000,"cast":2000},
      {"id":7648,"learn":34,"bl":34,"ml":39,"base":28.0,"coef":0.2,"ticks":6,"period":3000,"dur":18000,"cast":2000},
      {"id":11671,"learn":44,"bl":44,"ml":49,"base":40.0,"coef":0.2,"ticks":6,"period":3000,"dur":18000,"cast":2000},
      {"id":11672,"learn":54,"bl":54,"ml":59,"base":57.0,"coef":0.2,"ticks":6,"period":3000,"dur":18000,"cast":2000},
      {"id":25311,"learn":60,"bl":60,"ml":65,"base":73.0,"coef":0.2,"ticks":6,"period":3000,"dur":18000,"cast":2000},
    ],
    classic: { name: "Corruption", ranks: [
      {"id":172,"learn":4,"bl":4,"ml":9,"base":10.0,"coef":0.08,"ticks":4,"period":3000,"dur":12000,"cast":2000},
      {"id":6222,"learn":14,"bl":14,"ml":19,"base":18.0,"coef":0.155,"ticks":5,"period":3000,"dur":15000,"cast":2000},
      {"id":6223,"learn":24,"bl":24,"ml":29,"base":37.0,"coef":0.167,"ticks":6,"period":3000,"dur":18000,"cast":2000},
      {"id":7648,"learn":34,"bl":34,"ml":39,"base":54.0,"coef":0.167,"ticks":6,"period":3000,"dur":18000,"cast":2000},
      {"id":11671,"learn":44,"bl":44,"ml":49,"base":81.0,"coef":0.167,"ticks":6,"period":3000,"dur":18000,"cast":2000},
      {"id":11672,"learn":54,"bl":54,"ml":59,"base":111.0,"coef":0.167,"ticks":6,"period":3000,"dur":18000,"cast":2000},
      {"id":25311,"learn":60,"bl":60,"ml":65,"base":137.0,"coef":0.167,"ticks":6,"period":3000,"dur":18000,"cast":2000},
    ] },
  },
  { key: "Death Coil", name: "Death Coil", school: 'Shadow', part: "Direct",
    forever: [
      {"id":6789,"learn":42,"bl":42,"ml":48,"base":272.0,"per":2.2,"coef":0.214,"ticks":0,"dur":3000,"cast":0},
      {"id":17925,"learn":50,"bl":50,"ml":56,"base":359.0,"per":2.6,"coef":0.214,"ticks":0,"dur":3000,"cast":0},
      {"id":17926,"learn":58,"bl":58,"ml":64,"base":454.0,"per":3.0,"coef":0.214,"ticks":0,"dur":3000,"cast":0},
    ],
    classic: { name: "Death Coil", ranks: [
      {"id":6789,"learn":42,"bl":42,"ml":48,"base":287.0,"per":2.2,"coef":0.214,"ticks":0,"dur":3000,"cast":0},
      {"id":17925,"learn":50,"bl":50,"ml":56,"base":375.0,"per":2.6,"coef":0.214,"ticks":0,"dur":3000,"cast":0},
      {"id":17926,"learn":58,"bl":58,"ml":64,"base":470.0,"per":3.0,"coef":0.214,"ticks":0,"dur":3000,"cast":0},
    ] },
  },
  { key: "Drain Life", name: "Drain Life", school: 'Shadow', part: "Channel",
    forever: [
      {"id":689,"learn":14,"bl":14,"ml":19,"base":10.0,"coef":0.1,"ticks":5,"period":1000,"dur":5000,"cast":0},
      {"id":699,"learn":22,"bl":22,"ml":27,"base":14.0,"coef":0.1,"ticks":5,"period":1000,"dur":5000,"cast":0},
      {"id":709,"learn":30,"bl":30,"ml":35,"base":22.0,"coef":0.1,"ticks":5,"period":1000,"dur":5000,"cast":0},
      {"id":7651,"learn":38,"bl":38,"ml":43,"base":28.0,"coef":0.1,"ticks":5,"period":1000,"dur":5000,"cast":0},
      {"id":11699,"learn":46,"bl":46,"ml":51,"base":39.0,"coef":0.1,"ticks":5,"period":1000,"dur":5000,"cast":0},
      {"id":11700,"learn":54,"bl":54,"ml":59,"base":51.0,"coef":0.1,"ticks":5,"period":1000,"dur":5000,"cast":0},
    ],
    classic: { name: "Drain Life", ranks: [
      {"id":689,"learn":14,"bl":14,"ml":19,"base":10.0,"coef":0.078,"ticks":5,"period":1000,"dur":5000,"cast":0},
      {"id":699,"learn":22,"bl":22,"ml":27,"base":17.0,"coef":0.1,"ticks":5,"period":1000,"dur":5000,"cast":0},
      {"id":709,"learn":30,"bl":30,"ml":35,"base":29.0,"coef":0.1,"ticks":5,"period":1000,"dur":5000,"cast":0},
      {"id":7651,"learn":38,"bl":38,"ml":43,"base":41.0,"coef":0.1,"ticks":5,"period":1000,"dur":5000,"cast":0},
      {"id":11699,"learn":46,"bl":46,"ml":51,"base":55.0,"coef":0.1,"ticks":5,"period":1000,"dur":5000,"cast":0},
      {"id":11700,"learn":54,"bl":54,"ml":59,"base":71.0,"coef":0.1,"ticks":5,"period":1000,"dur":5000,"cast":0},
    ] },
  },
  { key: "Drain Soul", name: "Drain Soul", school: 'Shadow', part: "Channel",
    forever: [
      {"id":1120,"learn":10,"bl":10,"base":17.0,"coef":0.1,"ticks":5,"period":3000,"dur":15000,"cast":0},
      {"id":8288,"learn":24,"bl":24,"base":34.0,"coef":0.1,"ticks":5,"period":3000,"dur":15000,"cast":0},
      {"id":8289,"learn":38,"bl":38,"base":54.0,"coef":0.1,"ticks":5,"period":3000,"dur":15000,"cast":0},
      {"id":11675,"learn":52,"bl":52,"base":84.0,"coef":0.1,"ticks":5,"period":3000,"dur":15000,"cast":0},
    ],
    classic: { name: "Drain Soul", ranks: [
      {"id":1120,"learn":10,"bl":10,"base":11.0,"coef":0.063,"ticks":5,"period":3000,"dur":15000,"cast":0},
      {"id":8288,"learn":24,"bl":24,"base":31.0,"coef":0.1,"ticks":5,"period":3000,"dur":15000,"cast":0},
      {"id":8289,"learn":38,"bl":38,"base":59.0,"coef":0.1,"ticks":5,"period":3000,"dur":15000,"cast":0},
      {"id":11675,"learn":52,"bl":52,"base":91.0,"coef":0.1,"ticks":5,"period":3000,"dur":15000,"cast":0},
    ] },
  },
  { key: "Hellfire", name: "Hellfire", school: 'Fire', part: "Channel",
    forever: [
      {"id":1949,"dmgId":5857,"learn":30,"bl":30,"ml":40,"base":82.0,"per":0.4,"coef":0.022,"ticks":15,"period":1000,"dur":15000,"cast":0},
      {"id":11683,"dmgId":11681,"learn":42,"bl":42,"ml":52,"base":137.0,"per":0.5,"coef":0.022,"ticks":15,"period":1000,"dur":15000,"cast":0},
      {"id":11684,"dmgId":11682,"learn":54,"bl":54,"ml":64,"base":206.0,"per":0.7,"coef":0.022,"ticks":15,"period":1000,"dur":15000,"cast":0},
    ],
    classic: { name: "Hellfire", ranks: [
      {"id":1949,"dmgId":5857,"learn":30,"bl":30,"ml":40,"base":83.0,"per":0.4,"coef":0.022,"ticks":15,"period":1000,"dur":15000,"cast":0},
      {"id":11683,"dmgId":11681,"learn":42,"bl":42,"ml":52,"base":139.0,"per":0.5,"coef":0.022,"ticks":15,"period":1000,"dur":15000,"cast":0},
      {"id":11684,"dmgId":11682,"learn":54,"bl":54,"ml":64,"base":208.0,"per":0.7,"coef":0.022,"ticks":15,"period":1000,"dur":15000,"cast":0},
    ] },
  },
  { key: "Immolate", name: "Immolate", school: 'Fire', part: "Direct",
    forever: [
      {"id":348,"learn":1,"bl":1,"ml":5,"base":8.0,"per":0.7,"coef":0.2,"ticks":0,"dur":15000,"cast":2000},
      {"id":707,"learn":10,"bl":10,"ml":15,"base":17.0,"per":0.8,"coef":0.2,"ticks":0,"dur":15000,"cast":2000},
      {"id":1094,"learn":20,"bl":20,"ml":25,"base":32.0,"per":1.2,"coef":0.2,"ticks":0,"dur":15000,"cast":2000},
      {"id":2941,"learn":30,"bl":30,"ml":35,"base":56.0,"per":1.5,"coef":0.2,"ticks":0,"dur":15000,"cast":2000},
      {"id":11665,"learn":40,"bl":40,"ml":45,"base":72.0,"per":1.6,"coef":0.2,"ticks":0,"dur":15000,"cast":2000},
      {"id":11667,"learn":50,"bl":50,"ml":55,"base":106.0,"per":1.9,"coef":0.2,"ticks":0,"dur":15000,"cast":2000},
      {"id":11668,"learn":60,"bl":60,"ml":65,"base":146.0,"per":2.3,"coef":0.2,"ticks":0,"dur":15000,"cast":2000},
      {"id":25309,"learn":60,"bl":60,"ml":65,"base":158.0,"per":2.3,"coef":0.2,"ticks":0,"dur":15000,"cast":2000},
    ],
    classic: { name: "Immolate", ranks: [
      {"id":348,"learn":1,"bl":1,"ml":5,"base":8.0,"per":0.6,"coef":0.058,"ticks":0,"dur":15000,"cast":2000},
      {"id":707,"learn":10,"bl":10,"ml":15,"base":19.0,"per":0.9,"coef":0.125,"ticks":0,"dur":15000,"cast":2000},
      {"id":1094,"learn":20,"bl":20,"ml":25,"base":45.0,"per":1.5,"coef":0.2,"ticks":0,"dur":15000,"cast":2000},
      {"id":2941,"learn":30,"bl":30,"ml":35,"base":90.0,"per":2.1,"coef":0.2,"ticks":0,"dur":15000,"cast":2000},
      {"id":11665,"learn":40,"bl":40,"ml":45,"base":134.0,"per":2.7,"coef":0.2,"ticks":0,"dur":15000,"cast":2000},
      {"id":11667,"learn":50,"bl":50,"ml":55,"base":192.0,"per":3.2,"coef":0.2,"ticks":0,"dur":15000,"cast":2000},
      {"id":11668,"learn":60,"bl":60,"ml":65,"base":258.0,"per":3.8,"coef":0.2,"ticks":0,"dur":15000,"cast":2000},
      {"id":25309,"learn":60,"bl":60,"ml":65,"base":279.0,"per":3.9,"coef":0.2,"ticks":0,"dur":15000,"cast":2000},
    ] },
  },
  { key: "Immolate (dot)", name: "Immolate", school: 'Fire', part: "DoT",
    forever: [
      {"id":348,"learn":1,"bl":1,"ml":5,"base":3.0,"coef":0.13,"ticks":5,"period":3000,"dur":15000,"cast":2000},
      {"id":707,"learn":10,"bl":10,"ml":15,"base":6.0,"coef":0.13,"ticks":5,"period":3000,"dur":15000,"cast":2000},
      {"id":1094,"learn":20,"bl":20,"ml":25,"base":12.0,"coef":0.13,"ticks":5,"period":3000,"dur":15000,"cast":2000},
      {"id":2941,"learn":30,"bl":30,"ml":35,"base":19.0,"coef":0.13,"ticks":5,"period":3000,"dur":15000,"cast":2000},
      {"id":11665,"learn":40,"bl":40,"ml":45,"base":25.0,"coef":0.13,"ticks":5,"period":3000,"dur":15000,"cast":2000},
      {"id":11667,"learn":50,"bl":50,"ml":55,"base":38.0,"coef":0.13,"ticks":5,"period":3000,"dur":15000,"cast":2000},
      {"id":11668,"learn":60,"bl":60,"ml":65,"base":52.0,"coef":0.13,"ticks":5,"period":3000,"dur":15000,"cast":2000},
      {"id":25309,"learn":60,"bl":60,"ml":65,"base":55.0,"coef":0.13,"ticks":5,"period":3000,"dur":15000,"cast":2000},
    ],
    classic: { name: "Immolate", ranks: [
      {"id":348,"learn":1,"bl":1,"ml":5,"base":4.0,"coef":0.037,"ticks":5,"period":3000,"dur":15000,"cast":2000},
      {"id":707,"learn":10,"bl":10,"ml":15,"base":8.0,"coef":0.081,"ticks":5,"period":3000,"dur":15000,"cast":2000},
      {"id":1094,"learn":20,"bl":20,"ml":25,"base":18.0,"coef":0.13,"ticks":5,"period":3000,"dur":15000,"cast":2000},
      {"id":2941,"learn":30,"bl":30,"ml":35,"base":33.0,"coef":0.13,"ticks":5,"period":3000,"dur":15000,"cast":2000},
      {"id":11665,"learn":40,"bl":40,"ml":45,"base":51.0,"coef":0.13,"ticks":5,"period":3000,"dur":15000,"cast":2000},
      {"id":11667,"learn":50,"bl":50,"ml":55,"base":73.0,"coef":0.13,"ticks":5,"period":3000,"dur":15000,"cast":2000},
      {"id":11668,"learn":60,"bl":60,"ml":65,"base":97.0,"coef":0.13,"ticks":5,"period":3000,"dur":15000,"cast":2000},
      {"id":25309,"learn":60,"bl":60,"ml":65,"base":102.0,"coef":0.13,"ticks":5,"period":3000,"dur":15000,"cast":2000},
    ] },
  },
  { key: "Incinerate", name: "Incinerate", school: 'Fire', part: "Direct",
    forever: [
      {"id":412758,"learn":40,"bl":40,"ml":49,"base":97.0,"per":1.1,"var":0.15,"coef":0.714,"ticks":0,"cast":2500},
      {"id":1293812,"learn":50,"bl":50,"ml":59,"base":145.0,"per":1.3,"var":0.15,"coef":0.714,"ticks":0,"cast":2500},
      {"id":1293813,"learn":60,"bl":60,"ml":69,"base":217.0,"per":1.4,"var":0.15,"coef":0.714,"ticks":0,"cast":2500},
    ],
    classic: null,
  },
  { key: "Rain of Fire", name: "Rain of Fire", school: 'Fire', part: "Channel",
    forever: [
      {"id":5740,"dmgId":1282380,"learn":20,"bl":20,"ml":25,"base":40.0,"per":0.3,"coef":0.083,"ticks":4,"period":2000,"dur":8000,"cast":0},
      {"id":6219,"dmgId":1282383,"learn":34,"bl":34,"ml":39,"base":91.0,"per":0.4,"coef":0.083,"ticks":4,"period":2000,"dur":8000,"cast":0},
      {"id":11677,"dmgId":1282384,"learn":46,"bl":46,"ml":51,"base":149.0,"per":0.5,"coef":0.083,"ticks":4,"period":2000,"dur":8000,"cast":0},
      {"id":11678,"dmgId":1282385,"learn":58,"bl":58,"ml":63,"base":220.0,"per":0.6,"coef":0.083,"ticks":4,"period":2000,"dur":8000,"cast":0},
    ],
    classic: { name: "Rain of Fire", ranks: [
      {"id":5740,"learn":20,"bl":20,"ml":25,"base":42.0,"per":0.3,"coef":0.083,"ticks":4,"period":2000,"dur":8000,"cast":0},
      {"id":6219,"learn":34,"bl":34,"ml":39,"base":96.0,"per":0.4,"coef":0.083,"ticks":4,"period":2000,"dur":8000,"cast":0},
      {"id":11677,"learn":46,"bl":46,"ml":51,"base":155.0,"per":0.5,"coef":0.083,"ticks":4,"period":2000,"dur":8000,"cast":0},
      {"id":11678,"learn":58,"bl":58,"ml":63,"base":226.0,"per":0.6,"coef":0.083,"ticks":4,"period":2000,"dur":8000,"cast":0},
    ] },
  },
  { key: "Searing Pain", name: "Searing Pain", school: 'Fire', part: "Direct",
    forever: [
      {"id":5676,"learn":18,"bl":18,"ml":24,"base":23.0,"per":0.6,"var":0.210526,"coef":0.429,"ticks":0,"cast":1500},
      {"id":17919,"learn":26,"bl":26,"ml":32,"base":33.0,"per":0.7,"var":0.184615,"coef":0.429,"ticks":0,"cast":1500},
      {"id":17920,"learn":34,"bl":34,"ml":40,"base":44.0,"per":0.8,"var":0.189474,"coef":0.429,"ticks":0,"cast":1500},
      {"id":17921,"learn":42,"bl":42,"ml":48,"base":62.0,"per":0.9,"var":0.179104,"coef":0.429,"ticks":0,"cast":1500},
      {"id":17922,"learn":50,"bl":50,"ml":56,"base":85.0,"per":1.0,"var":0.17341,"coef":0.429,"ticks":0,"cast":1500},
      {"id":17923,"learn":58,"bl":58,"ml":64,"base":114.0,"per":1.2,"var":0.162162,"coef":0.429,"ticks":0,"cast":1500},
    ],
    classic: { name: "Searing Pain", ranks: [
      {"dice":[34,42],"id":5676,"learn":18,"bl":18,"ml":24,"base":38.0,"per":0.7,"var":0.210526,"coef":0.396,"ticks":0,"cast":1500},
      {"dice":[59,71],"id":17919,"learn":26,"bl":26,"ml":32,"base":65.0,"per":1.0,"var":0.184615,"coef":0.429,"ticks":0,"cast":1500},
      {"dice":[86,104],"id":17920,"learn":34,"bl":34,"ml":40,"base":95.0,"per":1.2,"var":0.189474,"coef":0.429,"ticks":0,"cast":1500},
      {"dice":[122,146],"id":17921,"learn":42,"bl":42,"ml":48,"base":134.0,"per":1.5,"var":0.179104,"coef":0.429,"ticks":0,"cast":1500},
      {"dice":[158,188],"id":17922,"learn":50,"bl":50,"ml":56,"base":173.0,"per":1.7,"var":0.17341,"coef":0.429,"ticks":0,"cast":1500},
      {"dice":[204,240],"id":17923,"learn":58,"bl":58,"ml":64,"base":222.0,"per":2.0,"var":0.162162,"coef":0.429,"ticks":0,"cast":1500},
    ] },
  },
  { key: "Shadow Bolt", name: "Shadow Bolt", school: 'Shadow', part: "Direct",
    forever: [
      {"id":686,"learn":1,"bl":1,"ml":5,"base":13.0,"per":0.2,"var":0.285714,"coef":0.486,"ticks":0,"cast":1700},
      {"id":695,"learn":6,"bl":6,"ml":11,"base":23.0,"per":0.3,"var":0.230769,"coef":0.629,"ticks":0,"cast":2200},
      {"id":705,"learn":12,"bl":12,"ml":17,"base":40.0,"per":0.6,"var":0.153846,"coef":0.8,"ticks":0,"cast":2800},
      {"id":1088,"learn":20,"bl":20,"ml":25,"base":58.0,"per":0.8,"var":0.130435,"coef":0.857,"ticks":0,"cast":3000},
      {"id":1106,"learn":28,"bl":28,"ml":33,"base":78.0,"per":1.2,"var":0.131579,"coef":0.857,"ticks":0,"cast":3000},
      {"id":7641,"learn":36,"bl":36,"ml":41,"base":101.0,"per":1.2,"var":0.119816,"coef":0.857,"ticks":0,"cast":3000},
      {"id":11659,"learn":44,"bl":44,"ml":49,"base":141.0,"per":1.4,"var":0.114094,"coef":0.857,"ticks":0,"cast":3000},
      {"id":11660,"learn":52,"bl":52,"ml":57,"base":191.0,"per":1.6,"var":0.110236,"coef":0.857,"ticks":0,"cast":3000},
      {"id":11661,"learn":60,"bl":60,"ml":65,"base":251.0,"per":1.8,"var":0.108108,"coef":0.857,"ticks":0,"cast":3000},
      {"id":25307,"learn":60,"bl":60,"ml":65,"base":268.0,"per":1.9,"var":0.109804,"coef":0.857,"ticks":0,"cast":3000},
    ],
    classic: { name: "Shadow Bolt", ranks: [
      {"dice":[12,16],"id":686,"learn":1,"bl":1,"ml":5,"base":14.0,"per":0.4,"var":0.285714,"coef":0.14,"ticks":0,"cast":1700},
      {"dice":[23,29],"id":695,"learn":6,"bl":6,"ml":11,"base":26.0,"per":0.6,"var":0.230769,"coef":0.299,"ticks":0,"cast":2200},
      {"dice":[48,56],"id":705,"learn":12,"bl":12,"ml":17,"base":52.0,"per":0.9,"var":0.153846,"coef":0.56,"ticks":0,"cast":2800},
      {"dice":[86,98],"id":1088,"learn":20,"bl":20,"ml":25,"base":92.0,"per":1.2,"var":0.130435,"coef":0.857,"ticks":0,"cast":3000},
      {"dice":[142,162],"id":1106,"learn":28,"bl":28,"ml":33,"base":152.0,"per":1.6,"var":0.131579,"coef":0.857,"ticks":0,"cast":3000},
      {"dice":[204,230],"id":7641,"learn":36,"bl":36,"ml":41,"base":217.0,"per":1.9,"var":0.119816,"coef":0.857,"ticks":0,"cast":3000},
      {"dice":[281,315],"id":11659,"learn":44,"bl":44,"ml":49,"base":298.0,"per":2.3,"var":0.114094,"coef":0.857,"ticks":0,"cast":3000},
      {"dice":[360,402],"id":11660,"learn":52,"bl":52,"ml":57,"base":381.0,"per":2.6,"var":0.110236,"coef":0.857,"ticks":0,"cast":3000},
      {"dice":[455,507],"id":11661,"learn":60,"bl":60,"ml":65,"base":481.0,"per":3.0,"var":0.108108,"coef":0.857,"ticks":0,"cast":3000},
      {"dice":[482,538],"id":25307,"learn":60,"bl":60,"ml":65,"base":510.0,"per":3.1,"var":0.109804,"coef":0.857,"ticks":0,"cast":3000},
    ] },
  },
  { key: "Shadowburn", name: "Shadowburn", school: 'Shadow', part: "Direct",
    forever: [
      {"id":17877,"learn":20,"bl":20,"ml":24,"base":66.0,"per":0.9,"var":0.129032,"coef":0.429,"ticks":0,"dur":8000,"cast":0},
      {"id":18867,"learn":24,"bl":24,"ml":30,"base":80.0,"per":1.0,"var":0.130081,"coef":0.429,"ticks":0,"dur":8000,"cast":0},
      {"id":18868,"learn":32,"bl":32,"ml":38,"base":118.0,"per":1.3,"var":0.121212,"coef":0.429,"ticks":0,"dur":8000,"cast":0},
      {"id":18869,"learn":40,"bl":40,"ml":46,"base":148.0,"per":1.3,"var":0.115523,"coef":0.429,"ticks":0,"dur":8000,"cast":0},
      {"id":18870,"learn":48,"bl":48,"ml":54,"base":203.0,"per":1.6,"var":0.113208,"coef":0.429,"ticks":0,"dur":8000,"cast":0},
      {"id":18871,"learn":56,"bl":56,"ml":62,"base":266.0,"per":1.8,"var":0.109244,"coef":0.429,"ticks":0,"dur":8000,"cast":0},
    ],
    classic: { name: "Shadowburn", ranks: [
      {"dice":[87,99],"id":17877,"learn":20,"bl":20,"ml":24,"base":93.0,"per":1.2,"var":0.129032,"coef":0.429,"ticks":0,"dur":5000,"cast":0},
      {"dice":[115,131],"id":18867,"learn":24,"bl":24,"ml":30,"base":123.0,"per":1.4,"var":0.130081,"coef":0.429,"ticks":0,"dur":5000,"cast":0},
      {"dice":[186,210],"id":18868,"learn":32,"bl":32,"ml":38,"base":198.0,"per":1.8,"var":0.121212,"coef":0.429,"ticks":0,"dur":5000,"cast":0},
      {"dice":[261,293],"id":18869,"learn":40,"bl":40,"ml":46,"base":277.0,"per":2.2,"var":0.115523,"coef":0.429,"ticks":0,"dur":5000,"cast":0},
      {"dice":[350,392],"id":18870,"learn":48,"bl":48,"ml":54,"base":371.0,"per":2.6,"var":0.113208,"coef":0.429,"ticks":0,"dur":5000,"cast":0},
      {"dice":[450,502],"id":18871,"learn":56,"bl":56,"ml":62,"base":476.0,"per":3.0,"var":0.109244,"coef":0.429,"ticks":0,"dur":5000,"cast":0},
    ] },
  },
  { key: "Siphon Life", name: "Siphon Life", school: 'Shadow', part: "DoT",
    forever: [
      {"id":18265,"learn":30,"bl":30,"ml":38,"base":11.0,"coef":0.05,"ticks":10,"period":3000,"dur":30000,"cast":0},
      {"id":18879,"learn":38,"bl":38,"ml":48,"base":19.0,"coef":0.05,"ticks":10,"period":3000,"dur":30000,"cast":0},
      {"id":18880,"learn":48,"bl":48,"ml":58,"base":29.0,"coef":0.05,"ticks":10,"period":3000,"dur":30000,"cast":0},
      {"id":18881,"learn":58,"bl":58,"ml":68,"base":41.0,"coef":0.05,"ticks":10,"period":3000,"dur":30000,"cast":0},
    ],
    classic: { name: "Siphon Life", ranks: [
      {"id":18265,"learn":30,"bl":30,"ml":38,"base":15.0,"coef":0.05,"ticks":10,"period":3000,"dur":30000,"cast":0},
      {"id":18879,"learn":38,"bl":38,"ml":48,"base":22.0,"coef":0.05,"ticks":10,"period":3000,"dur":30000,"cast":0},
      {"id":18880,"learn":48,"bl":48,"ml":58,"base":33.0,"coef":0.05,"ticks":10,"period":3000,"dur":30000,"cast":0},
      {"id":18881,"learn":58,"bl":58,"ml":68,"base":45.0,"coef":0.05,"ticks":10,"period":3000,"dur":30000,"cast":0},
    ] },
  },
  { key: "Soul Fire", name: "Soul Fire", school: 'Fire', part: "Direct",
    forever: [
      {"id":6353,"learn":48,"bl":48,"ml":54,"base":377.0,"per":1.7,"var":0.227596,"coef":1.0,"ticks":0,"cast":6000},
      {"id":17924,"learn":56,"bl":56,"ml":62,"base":431.0,"per":1.9,"var":0.224747,"coef":1.0,"ticks":0,"cast":6000},
    ],
    classic: { name: "Soul Fire", ranks: [
      {"dice":[623,783],"id":6353,"learn":48,"bl":48,"ml":54,"base":703.0,"per":2.9,"var":0.227596,"coef":1.0,"ticks":0,"cast":6000},
      {"dice":[703,881],"id":17924,"learn":56,"bl":56,"ml":62,"base":792.0,"per":3.1,"var":0.224747,"coef":1.0,"ticks":0,"cast":6000},
    ] },
  },
  { key: "Wrack", name: "Wrack", school: 'Shadow', part: "Channel",
    forever: [
      {"id":1316697,"learn":40,"bl":40,"ml":60,"base":25.2,"per":1.75,"coef":0.2002,"ticks":6,"period":1000,"dur":6000,"cast":0},
    ],
    classic: null,
  },
];
