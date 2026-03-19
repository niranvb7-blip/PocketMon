/** Starter Pokémon options shown on the selection screen */
export const STARTERS = [
  {
    id: 'bulbasaur',
    displayName: 'Bulbasaur',
    type: 'grass / poison',
    description: 'Tanky with\nstatus moves',
    color: 0x4caf50,
  },
  {
    id: 'charmander',
    displayName: 'Charmander',
    type: 'fire',
    description: 'High Speed &\nSpecial Attack',
    color: 0xff6d2e,
  },
  {
    id: 'squirtle',
    displayName: 'Squirtle',
    type: 'water',
    description: 'Balanced with\nhigh Defense',
    color: 0x42a5f5,
  },
];

/** Wild Pokémon pool per wave tier */
export const WILD_POOLS = {
  1:  ['rattata','pidgey','caterpie','weedle','metapod'],
  2:  ['ekans','sandshrew','nidoran-f','nidoran-m','clefairy','zubat','oddish','paras'],
  3:  ['psyduck','mankey','growlithe','poliwag','abra','machop','bellsprout','tentacool'],
  4:  ['geodude','ponyta','slowpoke','magnemite','doduo','seel','grimer','shellder'],
  5:  ['gastly','onix','drowzee','krabby','voltorb','exeggcute','cubone','lickitung'],
  6:  ['koffing','rhyhorn','tangela','kangaskhan','horsea','goldeen','staryu','jynx'],
  7:  ['electabuzz','magmar','pinsir','tauros','magikarp','lapras','kabutops','aerodactyl'],
  8:  ['snorlax','articuno','zapdos','moltres','dratini','dragonair','dragonite','mewtwo'],
};

/** Trainer configurations (milestone waves) */
export const TRAINER_CONFIGS = {
  1:  { name: 'RIVAL',        party: ['pidgey','rattata'],                    baseLv: 8  },
  2:  { name: 'BROCK',        party: ['geodude','onix'],                      baseLv: 14 },
  3:  { name: 'MISTY',        party: ['staryu','starmie'],                    baseLv: 21 },
  4:  { name: 'LT. SURGE',    party: ['voltorb','pikachu','raichu'],           baseLv: 28 },
  5:  { name: 'ERIKA',        party: ['victreebel','tangela','vileplume'],     baseLv: 35 },
  6:  { name: 'KOGA',         party: ['koffing','muk','koffing','weezing'],    baseLv: 43 },
  7:  { name: 'SABRINA',      party: ['kadabra','mr-mime','venomoth','alakazam'],baseLv:50},
  8:  { name: 'BLAINE',       party: ['growlithe','ponyta','rapidash','arcanine'],baseLv:58},
  9:  { name: 'GIOVANNI',     party: ['rhyhorn','dugtrio','nidoqueen','nidoking','rhydon'],baseLv:65},
  10: { name: 'ELITE FOUR',   party: ['gengar','haunter','alakazam','machamp','golem','gyarados'],baseLv:72},
};

/** Reward item pool */
export const REWARD_ITEMS = [
  { id: 'rare-candy',    name: 'Rare Candy',    desc: '+1 Level on any\nPokémon',      icon: '🍬' },
  { id: 'potion',        name: 'Super Potion',  desc: 'Restore 50 HP\nto any Pokémon',icon: '🧪' },
  { id: 'shell-bell',    name: 'Shell Bell',    desc: 'Heal 1/8 HP on\nevery hit',    icon: '🔔' },
  { id: 'choice-scarf',  name: 'Choice Scarf',  desc: 'Speed ×1.5 but\nlocked to 1 move',icon:'💨'},
  { id: 'life-orb',      name: 'Life Orb',      desc: 'Power ×1.3 but\nloses 10% HP', icon: '🔮' },
  { id: 'focus-sash',    name: 'Focus Sash',    desc: 'Survive 1 hit\nfrom full HP',  icon: '🎗️' },
  { id: 'lum-berry',     name: 'Lum Berry',     desc: 'Cures any\nstatus condition', icon: '🍋' },
  { id: 'xspeed',        name: 'X Speed',       desc: 'Speed +20\nfor 1 battle',     icon: '⚡' },
];
