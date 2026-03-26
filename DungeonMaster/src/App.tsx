import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Sword, 
  Scroll, 
  Backpack, 
  User, 
  ChevronRight, 
  Send, 
  Heart, 
  Zap, 
  Trophy, 
  MapPin, 
  BookOpen, 
  RefreshCw,
  Dices,
  Info,
  Volume2,
  VolumeX,
  Music,
  CheckCircle2,
  AlertCircle,
  Eye,
  Quote,
  Crown,
  Shirt,
  Hand,
  Footprints,
  Gem,
  Layout,
  Sparkles,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { Character, Monster, Item, Quest, GameState, GameResponse, CombatResponse, Ability, EnvironmentalObject, MapLocation, NPC } from './types';
import { getGameAction, generateGameImage } from './services/geminiService';
import { ProgressBar, MapView, CombatEffectOverlay, Tooltip, BackgroundEffects, CraftingPreview, CraftingItemButton } from './components/UIComponents';
import { CharacterCreation } from './components/CharacterCreation';

// --- Constants ---
const RACES = [
  { id: 'human', name: 'Umano', description: 'Versatili e ambiziosi, gli umani si adattano a ogni sfida.', icon: '👤' },
  { id: 'elf', name: 'Elfo', description: 'Eleganti e longevi, maestri della magia e dell\'arco.', icon: '🧝' },
  { id: 'dwarf', name: 'Nano', description: 'Resistenti e tenaci, esperti minatori e guerrieri.', icon: '🧔' },
  { id: 'halfling', name: 'Halfling', description: 'Piccoli e fortunati, maestri della furtività.', icon: '🦶' },
];

const CLASSES = [
  { id: 'warrior', name: 'Guerriero', description: 'Maestro delle armi e della difesa fisica.', icon: '⚔️' },
  { id: 'mage', name: 'Mago', description: 'Studioso delle arti arcane e dei potenti incantesimi.', icon: '🪄' },
  { id: 'rogue', name: 'Ladro', description: 'Esperto di furtività, trappole e attacchi a sorpresa.', icon: '🗡️' },
  { id: 'cleric', name: 'Chierico', description: 'Servitore del divino, capace di curare e proteggere.', icon: '✨' },
  { id: 'paladin', name: 'Paladino', description: 'Guerriero sacro che unisce forza fisica e poteri divini.', icon: '🛡️' },
  { id: 'ranger', name: 'Ranger', description: 'Esploratore delle terre selvagge, letale con l\'arco.', icon: '🏹' },
  { id: 'bard', name: 'Bardo', description: 'Artista carismatico che usa la musica per incantare.', icon: '🪕' },
];

const AUDIO_ASSETS = {
  bgm_exploration: 'https://assets.mixkit.co/music/preview/mixkit-medieval-fantasy-582.mp3', // Tavern/Medieval style
  bgm_combat: 'https://assets.mixkit.co/music/preview/mixkit-epic-heroic-battle-287.mp3', // Epic Boss Fight style
  sfx_hit: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  sfx_loot: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  sfx_level_up: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
  sfx_quest: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Success/Quest sound
  sfx_discovery: 'https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3',
  sfx_magic: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
};

const DEFAULT_SUGGESTED_ACTIONS = [
  "Esplora la zona",
  "Guarda intorno",
  "Controlla l'inventario",
  "Riposa un momento"
];

const COMBAT_SUGGESTED_ACTIONS = [
  "Attacca con l'arma",
  "Tenta di schivare",
  "Usa una pozione",
  "Cerca di fuggire"
];

// --- Components ---
// Moved to src/components/

const STAT_EXPLANATIONS: Record<string, string> = {
  strength: "Potenza fisica, danni in mischia e capacità di carico.",
  dexterity: "Riflessi, precisione, difesa e abilità furtive.",
  constitution: "Salute totale, resistenza fisica e tempra.",
  intelligence: "Potenza magica, conoscenza e capacità di analisi.",
  wisdom: "Intuizione, percezione e resistenza mentale.",
  charisma: "Forza di personalità, persuasione e influenza sociale.",
};

export default function App() {
  // --- State ---
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<{ role: 'player' | 'gm', text: string, diceRoll?: any }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeMonster, setActiveMonster] = useState<Monster | null>(null);
  const [activeNPC, setActiveNPC] = useState<NPC | null>(null);
  const [pendingLoot, setPendingLoot] = useState<Item | null>(null);
  const [backgroundImage, setBackgroundImage] = useState('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop');
  const [activeTab, setActiveTab] = useState<'stats' | 'inventory' | 'equipment' | 'crafting' | 'quests' | 'map' | 'bestiary' | 'journal'>('stats');
  const [journal, setJournal] = useState<string[]>([]);
  const [bestiary, setBestiary] = useState<{ name: string, details: string }[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackTypeRef = useRef<'exploration' | 'combat' | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [environmentalObjects, setEnvironmentalObjects] = useState<EnvironmentalObject[]>([]);
  const [combatEffect, setCombatEffect] = useState<'attack' | 'spell' | 'parry' | null>(null);
  const [selectedCraftingItems, setSelectedCraftingItems] = useState<string[]>([]);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [lastVisualDescription, setLastVisualDescription] = useState<string>("");
  const [lastPortraitDescription, setLastPortraitDescription] = useState<string>("");
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [keepTavernMusic, setKeepTavernMusic] = useState(false);

  // Character Creation Temp State
  const [creationStep, setCreationStep] = useState<'race' | 'class' | 'name'>('race');
  const [selectedRace, setSelectedRace] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Audio Logic ---
  const playSfx = (type: keyof typeof AUDIO_ASSETS) => {
    if (!isAudioEnabled) return;
    const audio = new Audio(AUDIO_ASSETS[type]);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  };

  const switchBgm = (type: 'exploration' | 'combat') => {
    if (!isAudioEnabled) {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
        currentTrackTypeRef.current = null;
      }
      return;
    }

    // Don't restart if same track is already playing
    if (currentTrackTypeRef.current === type && bgmRef.current) {
      if (bgmRef.current.paused) {
        bgmRef.current.play().catch(e => console.warn("Audio play failed (interaction required):", e));
      }
      return;
    }

    if (bgmRef.current) {
      bgmRef.current.pause();
    }

    const trackUrl = type === 'exploration' ? AUDIO_ASSETS.bgm_exploration : AUDIO_ASSETS.bgm_combat;
    const newBgm = new Audio(trackUrl);
    newBgm.loop = true;
    newBgm.volume = 0.3;
    newBgm.play().catch(e => console.warn("Audio play failed (interaction required):", e));
    bgmRef.current = newBgm;
    currentTrackTypeRef.current = type;
  };

  useEffect(() => {
    const isCombat = gameState === GameState.COMBAT;
    switchBgm(isCombat && !keepTavernMusic ? 'combat' : 'exploration');
  }, [isAudioEnabled, gameState, keepTavernMusic]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (isAudioEnabled && (!bgmRef.current || bgmRef.current.paused)) {
        const isCombat = gameState === GameState.COMBAT;
        switchBgm(isCombat ? 'combat' : 'exploration');
      }
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [isAudioEnabled, gameState]);

  const handleEquip = (item: Item) => {
    if (!character || !item.slot) return;
    
    const newEquipment = { ...character.equipment };
    const oldItem = newEquipment[item.slot];
    
    // Unequip old item if exists
    let newInventory = character.inventory.map(i => 
      i.id === item.id ? { ...i, isEquipped: true } : i
    );
    
    if (oldItem) {
      newInventory = newInventory.map(i => 
        i.id === oldItem.id ? { ...i, isEquipped: false } : i
      );
    }
    
    newEquipment[item.slot] = item;
    
    setCharacter({
      ...character,
      inventory: newInventory,
      equipment: newEquipment
    });
    
    toast.success(`${item.name} equipaggiato in ${item.slot}!`);
    playSfx('sfx_magic');
  };

  const handleUnequip = (slot: keyof Character['equipment']) => {
    if (!character) return;
    const item = character.equipment[slot];
    if (!item) return;
    
    const newEquipment = { ...character.equipment };
    newEquipment[slot] = null;
    
    const newInventory = character.inventory.map(i => 
      i.id === item.id ? { ...i, isEquipped: false } : i
    );
    
    setCharacter({
      ...character,
      inventory: newInventory,
      equipment: newEquipment
    });
    
    toast.info(`${item.name} rimosso.`);
  };

  // --- Game Logic ---
  const handleSendMessage = async (customInput?: string) => {
    const text = customInput || input;
    if (!text.trim() || isLoading) return;

    setMessages(prev => [...prev, { role: 'player', text }]);
    setInput('');
    setIsLoading(true);
    setLastPrompt(text);

    try {
      const response: GameResponse | CombatResponse = await getGameAction(
        text, 
        character!, 
        activeMonster || undefined, 
        pendingLoot || undefined
      );

      // Handle Sound Effects
      if (response.soundEffect) {
        playSfx(`sfx_${response.soundEffect}` as any);
      }

      // Handle Visuals
      let currentTurnImage: string | null = null;
      if (response.visualDescription) {
        setLastVisualDescription(response.visualDescription);
        currentTurnImage = await generateGameImage(response.visualDescription);
        if (currentTurnImage) setBackgroundImage(currentTurnImage);
      }
      if (response.characterPortraitDescription) {
        setLastPortraitDescription(response.characterPortraitDescription);
      }

      // Handle Character Updates
      if (response.updatedCharacter) {
        const cleanNumber = (n: any, def = 0) => (Number.isFinite(n) && n < 1000000000) ? n : def;
        
        const updated = { 
          ...character!, 
          ...response.updatedCharacter,
          hp: cleanNumber(response.updatedCharacter.hp, character!.hp),
          maxHp: cleanNumber(response.updatedCharacter.maxHp, character!.maxHp),
          xp: cleanNumber(response.updatedCharacter.xp, character!.xp),
          level: cleanNumber(response.updatedCharacter.level, character!.level),
          gold: cleanNumber(response.updatedCharacter.gold, character!.gold),
        };
        
        // Level Up Detection
        if (updated.level > character!.level) {
          playSfx('sfx_level_up');
          toast.success(`LIVELLO SUPERATO! Sei ora livello ${updated.level}`, {
            icon: <Trophy className="text-amber-400" />,
            description: "Le tue statistiche sono migliorate."
          });
        }

        // Damage Shake
        if (updated.hp < character!.hp) {
          setIsShaking(true);
          playSfx('sfx_hit');
          setTimeout(() => setIsShaking(false), 500);
        }

        setCharacter(updated);
      }

      // Handle XP
      if (response.xpGained) {
        toast(`+${response.xpGained} XP`, {
          description: "Esperienza guadagnata per le tue azioni."
        });
      }

      // Handle NPCs
      if (response.activeNPC) {
        const npc = response.activeNPC;
        setActiveNPC({
          ...npc,
          imageUrl: npc.imageUrl || currentTurnImage || undefined
        });
        setGameState(GameState.DIALOGUE);
      }

      // Handle Monster
      if (response.newMonster) {
        const cleanNumber = (n: any, def = 0) => (Number.isFinite(n) && n < 1000000000) ? n : def;
        const monster = response.newMonster;
        const hp = cleanNumber(monster.hp, 50);
        const maxHp = cleanNumber(monster.maxHp, hp);
        
        setActiveMonster({
          ...monster,
          hp,
          maxHp,
          imageUrl: monster.imageUrl || currentTurnImage || undefined
        });
        setGameState(GameState.COMBAT);
        playSfx('sfx_discovery');
        toast.warning(`COMBATTIMENTO! Un ${response.newMonster.name} appare!`);
      }

      // Handle Combat Logic
      if ('combatLog' in response) {
        const combat = response as CombatResponse;
        if (combat.monsterDamageTaken > 0) {
          playSfx('sfx_hit');
          // Trigger attack or spell effect if not already set by input detection
          if (!combatEffect) {
            const lowerInput = text.toLowerCase();
            const usedAbility = character?.abilities.find(a => lowerInput.includes(a.name.toLowerCase()));
            if (usedAbility?.type === 'spell') setCombatEffect('spell');
            else setCombatEffect('attack');
            setTimeout(() => setCombatEffect(null), 800);
          }
        }
        
        if (combat.playerDamageTaken > 0) {
          // Parry effect if damage is low or narration mentions it
          if (response.narration.toLowerCase().includes('para') || response.narration.toLowerCase().includes('schiva')) {
            setCombatEffect('parry');
            setTimeout(() => setCombatEffect(null), 800);
          }
        }

        if (combat.isMonsterDead) {
          setActiveMonster(null);
          setGameState(GameState.EXPLORATION);
          toast.success("VITTORIA! Il nemico è stato sconfitto.");
        } else if (activeMonster) {
          const cleanNumber = (n: any, def = 0) => (Number.isFinite(n) && n < 1000000000) ? n : def;
          const damage = cleanNumber(combat.monsterDamageTaken, 0);
          setActiveMonster({
            ...activeMonster,
            hp: Math.max(0, activeMonster.hp - damage)
          });
        }
      }

      // Handle Loot
      if (response.newLoot) {
        setPendingLoot(response.newLoot);
        playSfx('sfx_loot');
      }

      // Handle Consumed Items (Crafting)
      if (response.consumedItemIds && response.consumedItemIds.length > 0) {
        setCharacter(prev => {
          if (!prev) return null;
          return {
            ...prev,
            inventory: prev.inventory.filter(item => !response.consumedItemIds!.includes(item.id))
          };
        });
        setSelectedCraftingItems([]);
        toast.info("Oggetti consumati nel processo di creazione.");
      }

      // Handle Quests
      if (response.updatedQuests) {
        const completed = response.updatedQuests.filter(q => q.isCompleted && !character?.activeQuests.find(aq => aq.id === q.id && aq.isCompleted));
        completed.forEach(q => toast.success(`Missione Completata: ${q.title}`));
      }

      // Handle Bestiary
      if (response.bestiaryEntry) {
        if (!bestiary.find(b => b.name === response.bestiaryEntry!.name)) {
          setBestiary(prev => [...prev, response.bestiaryEntry!]);
          toast.info(`Nuova voce nel Bestiario: ${response.bestiaryEntry.name}`);
        }
      }

      // Handle Suggested Actions
      if (response.suggestedActions) {
        setSuggestedActions(response.suggestedActions);
      } else {
        setSuggestedActions([]);
      }

      // Handle Environmental Objects
      if (response.environmentalObjects) {
        setEnvironmentalObjects(response.environmentalObjects);
      } else {
        setEnvironmentalObjects([]);
      }

      // Handle Map Location
      if (response.currentLocation) {
        const loc = response.currentLocation;
        setCharacter(prev => {
          if (!prev) return null;
          if (prev.discoveredLocations.find(l => l.id === loc.id)) return prev;
          toast.info(`Nuovo Luogo Scoperto: ${loc.name}`, { icon: <MapPin className="text-blue-400" /> });
          return {
            ...prev,
            discoveredLocations: [...prev.discoveredLocations, loc]
          };
        });
      }

      setMessages(prev => [...prev, { 
        role: 'gm', 
        text: response.narration + (('combatLog' in response) ? `\n\n*${response.combatLog}*` : ''),
        diceRoll: response.diceRoll
      }]);

      setJournal(prev => [...prev, response.narration]);

    } catch (error: any) {
      console.error(error);
      const errorMessage = error.message || "Errore di connessione con il Master.";
      toast.error(errorMessage, {
        duration: 10000,
        icon: <AlertCircle className="text-red-500" />,
        action: {
          label: "Riprova",
          onClick: () => handleSendMessage(lastPrompt)
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startCreation = () => {
    setGameState(GameState.CHARACTER_CREATION);
    if (isAudioEnabled) switchBgm('exploration');
  };

  const finalizeCreation = async () => {
    if (!tempName || !selectedRace || !selectedClass) return;
    
    const initialPrompt = `Inizia l'avventura per un ${selectedRace} ${selectedClass} di nome ${tempName}. 
    Fornisci statistiche iniziali (strength, dexterity, constitution, intelligence, wisdom, charisma), HP massimi, e almeno 2 abilità di classe.
    Restituisci questi dati nell'oggetto 'updatedCharacter'.
    Includi anche una 'characterPortraitDescription' dettagliata per il ritratto del personaggio.`;
    
    setLastPrompt(initialPrompt);
    setIsLoading(true);
    
    try {
      console.log("Starting character creation for:", tempName, selectedRace, selectedClass);
      // Create a dummy character for the first call
      const dummyChar: Character = {
        name: tempName,
        race: selectedRace,
        class: selectedClass,
        level: 1,
        xp: 0,
        hp: 20,
        maxHp: 20,
        stats: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
        inventory: [],
        equipment: {},
        activeQuests: [],
        abilities: [],
        location: 'Inizio',
        discoveredLocations: []
      };

      const response: GameResponse = await getGameAction(initialPrompt, dummyChar);
      
      const portraitDescription = response.characterPortraitDescription || 
        `Un ritratto eroico di un ${selectedRace} ${selectedClass} di nome ${tempName}, stile fantasy digitale, atmosfera epica.`;
      
      setLastPortraitDescription(portraitDescription);

      let portrait = null;
      try {
        portrait = await generateGameImage(portraitDescription);
      } catch (e) {
        console.error("Initial portrait generation failed:", e);
      }

      const initialLoc = response.currentLocation || {
        id: 'start',
        name: 'Inizio',
        description: 'Il punto di partenza del tuo viaggio.',
        x: 50,
        y: 50,
        type: 'landmark'
      };

      setCharacter({
        ...dummyChar,
        ...response.updatedCharacter,
        abilities: response.updatedCharacter?.abilities?.length 
          ? response.updatedCharacter.abilities 
          : [
              { id: 'attack', name: 'Attacco Base', description: 'Un colpo standard con la tua arma.', type: 'attack', damage: '1d8' },
              { id: 'dodge', name: 'Schivata', description: 'Tenti di evitare il prossimo colpo.', type: 'utility' }
            ],
        portraitUrl: portrait || undefined,
        discoveredLocations: [initialLoc]
      });
      
      setMessages([{ role: 'gm', text: response.narration }]);
      setJournal([response.narration]);
      setSuggestedActions(response.suggestedActions || []);
      setEnvironmentalObjects(response.environmentalObjects || []);
      setGameState(GameState.EXPLORATION);
      playSfx('sfx_discovery');
    } catch (error: any) {
      console.error("Creation Error:", error);
      const errorMessage = error.message || "Errore sconosciuto nella creazione.";
      toast.error(`Errore nella creazione: ${errorMessage}`, {
        duration: 10000,
        icon: <AlertCircle className="text-red-500" />,
        action: {
          label: "Riprova",
          onClick: () => finalizeCreation()
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const collectLoot = () => {
    if (!pendingLoot || !character) return;
    setCharacter({
      ...character,
      inventory: [...character.inventory, pendingLoot]
    });
    setPendingLoot(null);
    playSfx('sfx_loot');
    toast.success(`${pendingLoot.name} aggiunto all'inventario!`);
  };

  const resetGame = () => {
    if (confirm("Sei sicuro di voler resettare l'avventura? Tutti i progressi andranno persi.")) {
      setGameState(GameState.START);
      setCharacter(null);
      setMessages([]);
      setActiveMonster(null);
      setPendingLoot(null);
      setJournal([]);
      setBestiary([]);
      setSuggestedActions([]);
      setEnvironmentalObjects([]);
      setCreationStep('race');
      setSelectedRace(null);
      setSelectedClass(null);
      setTempName('');
      setSelectedCraftingItems([]);
      setActiveNPC(null);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!process.env.GEMINI_API_KEY) {
      toast.error("Chiave API Gemini mancante!", {
        description: "Assicurati di aver configurato GEMINI_API_KEY nel file .env per il funzionamento locale.",
        duration: Infinity,
        icon: <AlertCircle className="text-red-500" />
      });
    }
  }, []);

  const regenerateImage = async (type: 'portrait' | 'background' | 'monster' | 'npc') => {
    if (isRegeneratingImage) return;
    setIsRegeneratingImage(true);
    const description = type === 'portrait' ? lastPortraitDescription : 
                       type === 'monster' ? activeMonster?.visualDescription :
                       type === 'npc' ? activeNPC?.visualDescription :
                       lastVisualDescription;
    
    if (!description) {
      toast.error("Nessuna descrizione disponibile per rigenerare l'immagine.");
      setIsRegeneratingImage(false);
      return;
    }

    toast.info("Rigenerazione immagine in corso...");
    try {
      const img = await generateGameImage(description);
      if (img) {
        if (type === 'portrait') setCharacter(prev => prev ? { ...prev, portraitUrl: img } : null);
        else if (type === 'monster') setActiveMonster(prev => prev ? { ...prev, imageUrl: img } : null);
        else if (type === 'npc') setActiveNPC(prev => prev ? { ...prev, imageUrl: img } : null);
        else setBackgroundImage(img);
        toast.success("Immagine rigenerata con successo!");
      } else {
        toast.error("Impossibile rigenerare l'immagine. Riprova più tardi.");
      }
    } catch (e) {
      toast.error("Errore durante la rigenerazione.");
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  // --- Render Helpers ---

  if (gameState === GameState.START) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center max-w-2xl"
        >
          <h1 className="text-7xl font-serif text-amber-500 mb-4 tracking-tighter italic">Echi di Eldoria</h1>
          <p className="text-amber-100/60 text-lg mb-12 font-light leading-relaxed">
            Un'avventura epica guidata dall'intelligenza artificiale. 
            Il tuo destino è scritto tra le ombre e la luce di un mondo dimenticato.
          </p>
          <button 
            onClick={startCreation}
            className="group relative px-12 py-4 bg-amber-600/20 border border-amber-500/50 text-amber-400 rounded-full text-xl font-medium hover:bg-amber-600/40 transition-all duration-500 overflow-hidden"
          >
            <span className="relative z-10">Inizia il Viaggio</span>
            <motion.div 
              className="absolute inset-0 bg-amber-500/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"
            />
          </button>
        </motion.div>
      </div>
    );
  }

  if (gameState === GameState.CHARACTER_CREATION) {
    return (
      <CharacterCreation
        creationStep={creationStep}
        setCreationStep={setCreationStep}
        selectedRace={selectedRace}
        setSelectedRace={setSelectedRace}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        tempName={tempName}
        setTempName={setTempName}
        finalizeCreation={finalizeCreation}
        isLoading={isLoading}
        RACES={RACES}
        CLASSES={CLASSES}
      />
    );
  }

  return (
    <div className={`flex h-screen bg-[#050505] text-amber-100/90 font-sans selection:bg-amber-500/30 ${isShaking ? 'animate-shake' : ''}`}>
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* --- Sidebar --- */}
      <aside className="w-80 border-r border-white/5 bg-[#0a0a0a] flex flex-col relative z-20">
        <div className="p-6 border-bottom border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-serif italic text-amber-500">Echi di Eldoria</h1>
            <div className="flex gap-2">
              <button onClick={() => setIsAudioEnabled(!isAudioEnabled)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                {isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button onClick={resetGame} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-red-400/70">
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          {/* Character Portrait */}
          <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-black/40 mb-6 group">
            {character?.portraitUrl ? (
              <img src={character.portraitUrl} alt="Portrait" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center opacity-20">
                <User size={64} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            
            {/* Regenerate Portrait Button */}
            <button 
              onClick={() => regenerateImage('portrait')}
              disabled={isRegeneratingImage}
              className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-500/20 hover:border-amber-500/50 disabled:opacity-50 z-30"
              title="Rigenera Ritratto"
            >
              <Camera size={14} className={isRegeneratingImage ? 'animate-spin' : ''} />
            </button>

            <div className="absolute bottom-4 left-4 right-4">
              <div className="text-lg font-medium text-white">{character?.name}</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500/80">{character?.race} • {character?.class}</div>
            </div>
          </div>

          {/* Core Stats */}
          <div className="space-y-4">
            <ProgressBar value={character?.hp || 0} max={character?.maxHp || 1} color="bg-red-500" label="Salute" />
            <ProgressBar value={character?.xp || 0} max={100 + (character?.level || 0) * 100} color="bg-amber-500" label={`Livello ${character?.level} • XP`} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-y border-white/5 bg-black/20">
          {[
            { id: 'stats', icon: Shield },
            { id: 'equipment', icon: Layout },
            { id: 'inventory', icon: Backpack },
            { id: 'crafting', icon: RefreshCw },
            { id: 'quests', icon: Scroll },
            { id: 'map', icon: MapPin },
            { id: 'bestiary', icon: BookOpen },
            { id: 'journal', icon: BookOpen }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 flex justify-center transition-all ${activeTab === tab.id ? 'text-amber-500 bg-amber-500/5' : 'text-white/20 hover:text-white/40'}`}
            >
              <tab.icon size={18} />
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'stats' && (
              <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(character?.stats || {}).map(([key, val]) => (
                    <Tooltip 
                      key={key} 
                      content={
                        <>
                          <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">{key}</div>
                          <p className="text-[10px] text-white/60 leading-tight">{STAT_EXPLANATIONS[key] || "Statistica del personaggio."}</p>
                        </>
                      }
                    >
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5 w-full">
                        <div className="text-[9px] uppercase tracking-widest opacity-40 mb-1">{key.slice(0, 3)}</div>
                        <div className="text-xl font-medium text-amber-200">{val}</div>
                      </div>
                    </Tooltip>
                  ))}
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-[10px] uppercase tracking-widest text-amber-500/60 font-bold">Abilità Speciali</h3>
                  {character?.abilities.map(ability => (
                    <Tooltip 
                      key={ability.id} 
                      content={
                        <>
                          <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">{ability.name}</div>
                          <p className="text-[10px] text-white/60 leading-tight mb-2">{ability.description}</p>
                          <div className="flex justify-between items-center pt-2 border-t border-white/5">
                            <span className="text-[8px] uppercase opacity-40">Tipo: {ability.type}</span>
                            {ability.damage && <span className="text-[8px] text-red-400 uppercase">Danni: {ability.damage}</span>}
                          </div>
                        </>
                      }
                    >
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-amber-500/30 transition-all cursor-help w-full">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium text-amber-100">{ability.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded uppercase">{ability.type}</span>
                        </div>
                        <p className="text-[11px] opacity-50 leading-relaxed truncate">{ability.description}</p>
                      </div>
                    </Tooltip>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'equipment' && (
              <motion.div key="equip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="text-[10px] uppercase tracking-widest text-amber-500/60 font-bold mb-4">Equipaggiamento Attuale</div>
                
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { slot: 'head', label: 'Testa', icon: Crown },
                    { slot: 'body', label: 'Corpo', icon: Shirt },
                    { slot: 'hands', label: 'Mani', icon: Hand },
                    { slot: 'feet', label: 'Piedi', icon: Footprints },
                    { slot: 'weapon', label: 'Arma', icon: Sword },
                    { slot: 'shield', label: 'Scudo', icon: Shield },
                    { slot: 'ring', label: 'Anello', icon: Gem },
                    { slot: 'amulet', label: 'Amuleto', icon: Zap },
                  ].map(({ slot, label, icon: Icon }) => {
                    const item = character?.equipment[slot as any];
                    return (
                      <div key={slot} className="bg-white/5 p-3 rounded-2xl border border-white/10 flex flex-col items-center text-center group relative">
                        <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center mb-2 border border-white/5">
                          {item?.imageUrl ? (
                            <img src={item.imageUrl} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                          ) : (
                            <Icon size={18} className="opacity-20" />
                          )}
                        </div>
                        <div className="text-[8px] uppercase tracking-widest opacity-40 mb-1">{label}</div>
                        <div className="text-[10px] font-medium text-amber-100 truncate w-full">
                          {item ? item.name : 'Vuoto'}
                        </div>
                        
                        {item && (
                          <button 
                            onClick={() => handleUnequip(slot as any)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === 'inventory' && (
              <motion.div key="inv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {character?.inventory.length === 0 ? (
                  <div className="text-center py-12 opacity-20 italic text-sm">Zaino vuoto...</div>
                ) : (
                  character?.inventory.map(item => (
                    <div key={item.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 group">
                      <div className="flex gap-4 mb-3">
                        <div className="w-12 h-12 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden">
                          {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <Shield size={20} className="opacity-20" />}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-amber-100">{item.name}</div>
                          <div className="text-[9px] uppercase tracking-widest text-amber-500/60">{item.type}</div>
                        </div>
                      </div>
                      <p className="text-[11px] opacity-50 mb-3">{item.description}</p>
                      {item.lore && (
                        <div className="p-2 bg-black/40 rounded-lg border border-white/5 mb-3">
                          <div className="text-[8px] uppercase tracking-widest opacity-30 mb-1">Lore</div>
                          <p className="text-[10px] italic opacity-40 leading-relaxed">{item.lore}</p>
                        </div>
                      )}
                      {item.stats && (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(item.stats).map(([k, v]) => (
                            <span key={k} className="text-[9px] px-2 py-0.5 bg-white/5 rounded border border-white/10 uppercase">{k}: {v}</span>
                          ))}
                        </div>
                      )}
                      
                      {item.slot && (
                        <button
                          onClick={() => item.isEquipped ? handleUnequip(item.slot!) : handleEquip(item)}
                          className={`mt-3 w-full py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all ${item.isEquipped ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-amber-500 text-black hover:bg-amber-400'}`}
                        >
                          {item.isEquipped ? 'Rimuovi' : 'Equipaggia'}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {activeTab === 'quests' && (
              <motion.div key="quests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {character?.activeQuests.length === 0 ? (
                  <div className="text-center py-12 opacity-20 italic text-sm">Nessuna missione attiva...</div>
                ) : (
                  character?.activeQuests.map(quest => (
                    <div key={quest.id} className={`p-4 rounded-2xl border ${quest.isCompleted ? 'bg-green-500/5 border-green-500/20' : 'bg-white/5 border-white/10'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className={`text-sm font-medium ${quest.isCompleted ? 'text-green-400 line-through' : 'text-amber-100'}`}>{quest.title}</h4>
                        {quest.isCompleted && <CheckCircle2 size={14} className="text-green-400" />}
                      </div>
                      <p className="text-[11px] opacity-50">{quest.description}</p>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {activeTab === 'bestiary' && (
              <motion.div key="bestiary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {bestiary.length === 0 ? (
                  <div className="text-center py-12 opacity-20 italic text-sm">Nessuna creatura scoperta...</div>
                ) : (
                  bestiary.map((entry, i) => (
                    <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-sm font-medium text-amber-400 mb-2">{entry.name}</h4>
                      <p className="text-[11px] opacity-50 leading-relaxed">{entry.details}</p>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {activeTab === 'journal' && (
              <motion.div key="journal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {journal.map((entry, i) => (
                  <div key={i} className="text-[11px] opacity-40 leading-relaxed border-l border-white/10 pl-4 py-1">
                    {entry}
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'map' && (
              <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="text-[10px] uppercase tracking-widest text-amber-500/60 font-bold mb-2">Mappa del Mondo</div>
                <MapView locations={character?.discoveredLocations || []} currentLocName={character?.location || ''} />
                <div className="space-y-3">
                  <h4 className="text-[9px] uppercase tracking-widest opacity-40">Luoghi Visitati</h4>
                  {character?.discoveredLocations.map(loc => (
                    <div key={loc.id} className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-medium ${loc.name === character.location ? 'text-amber-400' : 'text-amber-100'}`}>{loc.name}</span>
                        <span className="text-[8px] opacity-30 uppercase">{loc.type}</span>
                      </div>
                      <p className="text-[10px] opacity-40 leading-tight">{loc.description}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'crafting' && (
              <motion.div key="crafting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="text-[10px] uppercase tracking-widest text-amber-500/60 font-bold mb-2">Laboratorio di Alchimia</div>
                <p className="text-[11px] opacity-50 italic mb-4">Seleziona due o più oggetti dal tuo inventario per tentare di combinarli.</p>
                
                {/* Crafting Preview */}
                <CraftingPreview 
                  items={character?.inventory.filter(i => selectedCraftingItems.includes(i.id)) || []} 
                  onCraft={() => {
                    const items = character?.inventory.filter(i => selectedCraftingItems.includes(i.id)).map(i => i.name).join(' e ');
                    handleSendMessage(`Tento di combinare ${items} per creare qualcosa di nuovo.`);
                  }} 
                />

                {/* Selected Items Summary */}
                {selectedCraftingItems.length > 0 && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
                    <div className="text-[9px] uppercase tracking-widest text-amber-500 font-bold">Oggetti Selezionati ({selectedCraftingItems.length})</div>
                    <div className="flex flex-wrap gap-2">
                      {character?.inventory.filter(i => selectedCraftingItems.includes(i.id)).map(item => (
                        <div key={item.id} className="px-2 py-1 bg-amber-500/20 rounded-lg text-[10px] text-amber-200 border border-amber-500/20 flex items-center gap-2">
                          {item.name}
                          <button onClick={() => setSelectedCraftingItems(prev => prev.filter(id => id !== item.id))} className="hover:text-white">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                  {character?.inventory.map(item => (
                    <CraftingItemButton
                      key={item.id}
                      item={item}
                      isSelected={selectedCraftingItems.includes(item.id)}
                      onClick={() => {
                        setSelectedCraftingItems(prev => 
                          prev.includes(item.id) 
                            ? prev.filter(id => id !== item.id) 
                            : [...prev, item.id]
                        );
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* NPC Overlay */}
        <AnimatePresence>
          {gameState === GameState.DIALOGUE && activeNPC && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-2xl z-30"
            >
              <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                <div className="flex items-start gap-6">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-amber-500/50 flex-shrink-0">
                    <img src={activeNPC.imageUrl || 'https://picsum.photos/seed/npc/200/200'} alt={activeNPC.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1">
                    <div className="text-amber-500 text-[10px] uppercase tracking-[0.2em] font-bold mb-1">{activeNPC.role}</div>
                    <h2 className="text-3xl font-bold text-white mb-4">{activeNPC.name}</h2>
                    <div className="relative">
                      <Quote className="absolute -left-4 -top-2 text-amber-500/20 w-8 h-8" />
                      <p className="text-lg text-amber-100/90 italic leading-relaxed pl-4">
                        "{activeNPC.dialogue}"
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-end gap-4">
                  <button 
                    onClick={() => {
                      setActiveNPC(null);
                      setGameState(GameState.EXPLORATION);
                    }}
                    className="px-6 py-2 text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                  >
                    Congedati
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0">
          <motion.div 
            key={activeNPC?.imageUrl || activeMonster?.imageUrl || backgroundImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${activeNPC?.imageUrl || activeMonster?.imageUrl || backgroundImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#050505]" />
          
          {/* Combat Effects */}
          <CombatEffectOverlay type={combatEffect} />
          
          {/* Background Animations */}
          <BackgroundEffects gameState={gameState} />
          
          {/* Hit Flash Overlay */}
          <AnimatePresence>
            {combatEffect === 'attack' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-white pointer-events-none z-40"
              />
            )}
          </AnimatePresence>
        </div>

        {/* Header Overlay */}
        <header className="relative z-10 p-6 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3">
              <MapPin size={16} className="text-amber-500" />
              <span className="text-xs uppercase tracking-widest font-medium">{character?.location}</span>
            </div>
            <div className={`px-4 py-2 rounded-2xl text-[10px] uppercase tracking-[0.2em] font-bold border backdrop-blur-md ${gameState === GameState.COMBAT ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
              {gameState}
            </div>
          </div>

          {activeMonster && (
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-96 bg-black/60 backdrop-blur-md border border-red-500/30 rounded-2xl p-4 flex gap-4"
            >
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-red-500/30 flex-shrink-0 bg-black/40 shadow-lg shadow-red-500/10">
                {activeMonster.imageUrl ? (
                  <img src={activeMonster.imageUrl} alt={activeMonster.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-20">
                    <AlertCircle size={32} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-red-500 uppercase tracking-widest">{activeMonster.name}</span>
                  {activeMonster.isBoss && <Trophy size={14} className="text-amber-500" />}
                </div>
                <ProgressBar value={activeMonster.hp} max={activeMonster.maxHp} color="bg-red-600" label="Salute Mostro" />
                <div className="mt-2 text-[10px] opacity-40 italic leading-tight">{activeMonster.description}</div>
              </div>
            </motion.div>
          )}
        </header>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 relative z-10 overflow-y-auto scrollbar-hide p-8 space-y-8">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'player' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-2xl ${msg.role === 'player' ? 'bg-amber-600 text-black font-medium rounded-2xl rounded-tr-none px-6 py-4 shadow-xl' : 'space-y-4'}`}>
                  {msg.role === 'gm' && (
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl rounded-tl-none p-8 shadow-2xl">
                      <p className="text-lg leading-relaxed font-light italic whitespace-pre-wrap">{msg.text}</p>
                      
                      {msg.diceRoll && (
                        <div className="mt-6 flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold border-2 ${msg.diceRoll.success ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-red-500 text-red-400 bg-red-500/10'}`}>
                            {msg.diceRoll.value}
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-widest opacity-40">Tiro di {msg.diceRoll.type}</div>
                            <div className={`text-xs font-bold uppercase tracking-widest ${msg.diceRoll.success ? 'text-green-400' : 'text-red-400'}`}>
                              {msg.diceRoll.success ? 'Successo' : 'Fallimento'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {msg.role === 'player' && msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl rounded-tl-none p-6 flex gap-2">
                <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              </div>
            </div>
          )}

          {pendingLoot && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex justify-center"
            >
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-8 text-center max-w-sm backdrop-blur-xl">
                <div className="w-20 h-20 bg-amber-500/20 rounded-2xl mx-auto mb-6 flex items-center justify-center text-amber-400">
                  <Trophy size={40} />
                </div>
                <h3 className="text-xl font-serif italic text-amber-400 mb-2">Nuovo Oggetto Trovato!</h3>
                <p className="text-sm opacity-60 mb-8">{pendingLoot.name}</p>
                <button 
                  onClick={collectLoot}
                  className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-all"
                >
                  Raccogli Bottino
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="relative z-10 p-8 bg-gradient-to-t from-black via-black/80 to-transparent">
          <div className="max-w-4xl mx-auto">
            {/* Environmental Objects */}
            {!isLoading && environmentalObjects.length > 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-2">
                {environmentalObjects.map((obj, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(`Esamino ${obj.name}`)}
                    className="flex-shrink-0 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-xl text-[10px] uppercase tracking-widest text-blue-400 hover:bg-blue-500/20 transition-all flex items-center gap-2"
                  >
                    <Eye size={12} /> {obj.name}
                  </button>
                ))}
              </div>
            )}

            {/* Suggested Actions */}
            {!isLoading && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2 ml-1">
                  <div className="text-[9px] uppercase tracking-widest text-amber-500 font-bold">Azioni Suggerite</div>
                  <button 
                    onClick={() => handleSendMessage("Continua")}
                    className="text-[9px] uppercase tracking-widest text-white/40 hover:text-amber-500 transition-colors flex items-center gap-1"
                  >
                    <ChevronRight size={10} /> Continua
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {(suggestedActions.length > 0 ? suggestedActions : (gameState === GameState.COMBAT ? COMBAT_SUGGESTED_ACTIONS : DEFAULT_SUGGESTED_ACTIONS)).map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(action)}
                      className="flex-shrink-0 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[10px] uppercase tracking-widest text-amber-400 hover:bg-amber-500/20 transition-all shadow-[0_4px_10px_rgba(0,0,0,0.3)]"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Combat Actions Shortcut */}
            {gameState === GameState.COMBAT && character?.abilities && character.abilities.length > 0 && (
              <div className="mb-4">
                <div className="text-[9px] uppercase tracking-widest text-red-500 font-bold mb-2 ml-1">Abilità di Battaglia</div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {character.abilities.map(ability => (
                    <button
                      key={ability.id}
                      onClick={() => {
                        if (ability.type === 'spell') playSfx('sfx_magic');
                        else if (ability.type === 'attack') playSfx('sfx_hit');
                        handleSendMessage(`Usa ${ability.name}`);
                      }}
                      className="flex-shrink-0 px-5 py-3 bg-red-600 text-white rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-red-500 transition-all flex items-center gap-2 shadow-[0_4px_15px_rgba(220,38,38,0.4)] border border-red-400/20"
                    >
                      {ability.type === 'spell' ? <Zap size={14} /> : <Sword size={14} />} 
                      {ability.name}
                      {ability.damage && <span className="opacity-60 font-normal ml-1">({ability.damage})</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={gameState === GameState.COMBAT ? "Cosa fai in battaglia?..." : "Cosa vuoi fare?..."}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 pr-16 text-lg focus:outline-none focus:border-amber-500/50 transition-all backdrop-blur-md"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className="absolute right-4 p-3 text-amber-500 hover:text-amber-400 disabled:opacity-20 transition-all"
              >
                <Send size={24} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
