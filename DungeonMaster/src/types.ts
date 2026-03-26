export interface Stats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  damage?: string;
  type: 'attack' | 'spell' | 'utility';
  cooldown?: number;
  currentCooldown?: number;
  icon?: string;
}

export type EquipmentSlot = 'head' | 'body' | 'hands' | 'feet' | 'ring' | 'amulet' | 'weapon' | 'shield';

export interface Item {
  id: string;
  name: string;
  description: string;
  lore?: string;
  type: 'weapon' | 'armor' | 'potion' | 'misc' | 'ring' | 'amulet';
  slot?: EquipmentSlot;
  stats?: Partial<Stats & { ac: number; damage: string }>;
  isEquipped?: boolean;
  imageUrl?: string;
}

export interface Monster {
  name: string;
  hp: number;
  maxHp: number;
  description: string;
  visualDescription: string;
  imageUrl?: string;
  abilities?: string[];
  isBoss?: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  rewardXp?: number;
}

export interface MapLocation {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  type: 'town' | 'dungeon' | 'wilderness' | 'landmark';
}

export interface Character {
  name: string;
  race: string;
  class: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  stats: Stats;
  inventory: Item[];
  activeQuests: Quest[];
  portraitUrl?: string;
  abilities: Ability[];
  location: string;
  discoveredLocations: MapLocation[];
  equipment: Partial<Record<EquipmentSlot, Item | null>>;
}

export enum GameState {
  START = 'START',
  CHARACTER_CREATION = 'CHARACTER_CREATION',
  EXPLORATION = 'EXPLORATION',
  COMBAT = 'COMBAT',
  LEVEL_UP = 'LEVEL_UP',
  DIALOGUE = 'DIALOGUE'
}

export interface NPC {
  name: string;
  role: string;
  description: string;
  visualDescription: string;
  imageUrl?: string;
  dialogue?: string;
}

export interface EnvironmentalObject {
  name: string;
  description: string;
  type: 'statue' | 'inscription' | 'altar' | 'chest' | 'corpse' | 'mechanism' | 'other';
}

export interface GameResponse {
  narration: string;
  visualDescription: string;
  characterPortraitDescription?: string;
  xpGained?: number;
  updatedCharacter?: Partial<Character>;
  newMonster?: Monster;
  newLoot?: Item;
  updatedQuests?: Quest[];
  bestiaryEntry?: { name: string; details: string };
  suggestedActions?: string[];
  diceRoll?: { value: number; type: string; success: boolean };
  soundEffect?: 'hit' | 'loot' | 'level_up' | 'discovery' | 'magic' | 'quest';
  environmentalObjects?: EnvironmentalObject[];
  currentLocation?: MapLocation;
  consumedItemIds?: string[];
  activeNPC?: NPC;
}

export interface CombatResponse extends GameResponse {
  combatLog: string;
  monsterDamageTaken: number;
  playerDamageTaken: number;
  isMonsterDead: boolean;
}
