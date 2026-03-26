import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { MapLocation, Item } from '../types';

export const ProgressBar: React.FC<{ value: number, max: number, color: string, label?: string }> = ({ value, max, color, label }) => {
  const safeMax = (Number.isFinite(max) && max > 0) ? max : 1;
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(value, safeMax)) : 0;
  const percentage = (safeValue / safeMax) * 100;

  return (
    <div className="w-full">
      {label && <div className="flex justify-between text-[10px] uppercase tracking-wider mb-1 opacity-70">
        <span>{label}</span>
        <span>{Math.floor(safeValue)}/{Math.floor(safeMax)}</span>
      </div>}
      <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${color} shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
        />
      </div>
    </div>
  );
};

export const MapView: React.FC<{ locations: MapLocation[], currentLocName: string }> = ({ locations, currentLocName }) => {
  return (
    <div className="relative w-full aspect-square bg-black/40 rounded-3xl border border-white/5 overflow-hidden p-4">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #f59e0b 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {locations.length > 1 && locations.map((loc, i) => {
          if (i === 0) return null;
          const prev = locations[i-1];
          return (
            <line 
              key={i}
              x1={`${prev.x}%`} y1={`${prev.y}%`} 
              x2={`${loc.x}%`} y2={`${loc.y}%`} 
              stroke="rgba(245, 158, 11, 0.2)" 
              strokeWidth="1" 
              strokeDasharray="4"
            />
          );
        })}
      </svg>
      {locations.map((loc) => (
        <motion.div
          key={loc.id}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute group cursor-help"
          style={{ left: `${loc.x}%`, top: `${loc.y}%`, transform: 'translate(-50%, -50%)' }}
        >
          <div className={`w-3 h-3 rounded-full border-2 ${loc.name === currentLocName ? 'bg-amber-500 border-white shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse' : 'bg-white/20 border-white/10'}`} />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-black/90 backdrop-blur-md border border-white/10 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
            <div className="text-[9px] font-bold text-amber-400 uppercase mb-1 leading-tight">{loc.name}</div>
            <div className="text-[8px] opacity-60 leading-tight">{loc.description}</div>
            <div className="mt-1 text-[7px] uppercase tracking-widest text-amber-500/40">{loc.type}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export const CombatEffectOverlay: React.FC<{ type: 'attack' | 'spell' | 'parry' | null }> = ({ type }) => {
  if (!type) return null;
  const variants = {
    attack: { scale: [1, 1.5, 1], opacity: [0, 1, 0], rotate: [0, 15, -15, 0] },
    spell: { scale: [0.5, 2, 0.5], opacity: [0, 0.8, 0], filter: ["blur(0px)", "blur(10px)", "blur(0px)"] },
    parry: { x: [-10, 10, -10, 0], opacity: [0, 1, 0] }
  };
  return (
    <motion.div 
      animate={variants[type]}
      transition={{ duration: 0.5 }}
      className={`absolute inset-0 z-50 pointer-events-none flex items-center justify-center ${type === 'spell' ? 'bg-blue-500/20' : type === 'attack' ? 'bg-red-500/20' : 'bg-white/10'}`}
    >
      {type === 'attack' && <div className="text-8xl">💥</div>}
      {type === 'spell' && <div className="text-8xl">✨</div>}
      {type === 'parry' && <div className="text-8xl">🛡️</div>}
    </motion.div>
  );
};

export const Tooltip: React.FC<{ content: React.ReactNode, children: React.ReactNode }> = ({ content, children }) => (
  <div className="relative group">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-[#0f0f0f] border border-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-[100] shadow-2xl backdrop-blur-xl">
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#0f0f0f]" />
    </div>
  </div>
);

export const BackgroundEffects = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80" />
    <div className="absolute top-0 left-0 w-full h-full opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #f59e0b 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
    {[...Array(20)].map((_, i) => (
      <motion.div
        key={i}
        animate={{
          y: [-20, -100],
          x: [Math.random() * 100 - 50, Math.random() * 100 - 50],
          opacity: [0, 0.5, 0],
          scale: [0, 1, 0]
        }}
        transition={{
          duration: Math.random() * 5 + 5,
          repeat: Infinity,
          delay: Math.random() * 10
        }}
        className="absolute w-1 h-1 bg-amber-500/30 rounded-full blur-[1px]"
        style={{ left: `${Math.random() * 100}%`, bottom: '-10px' }}
      />
    ))}
  </div>
);

export const CraftingPreview: React.FC<{ items: any[], onCraft: () => void }> = ({ items, onCraft }) => (
  <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
    <div className="text-[10px] uppercase tracking-widest text-amber-500 mb-2 font-bold">Anteprima Crafting</div>
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {items.map((item, i) => (
          <div key={i} className="w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-xs shadow-lg">
            {item.name[0]}
          </div>
        ))}
      </div>
      <div className="text-amber-200/40">→</div>
      <button 
        onClick={onCraft}
        className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-500 transition-all shadow-[0_4px_15px_rgba(217,119,6,0.3)]"
      >
        Combina Oggetti
      </button>
    </div>
  </div>
);

export const CraftingItemButton: React.FC<{ item: Item, isSelected: boolean, onClick: () => void }> = ({ item, isSelected, onClick }) => {
  return (
    <Tooltip 
      content={
        <>
          <div className="text-xs text-amber-100/60 mb-2">{item.description}</div>
          {item.stats && Object.keys(item.stats).length > 0 && (
            <div className="pt-2 border-t border-white/5 flex flex-wrap gap-1">
              {Object.entries(item.stats).map(([k, v]) => (
                <span key={k} className="text-[8px] px-1.5 py-0.5 bg-white/5 rounded border border-white/10 uppercase">{k}: {v}</span>
              ))}
            </div>
          )}
        </>
      }
    >
      <button
        onClick={onClick}
        className={`w-full text-left p-3 rounded-xl border transition-all ${isSelected ? 'bg-amber-500/20 border-amber-500' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
      >
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-amber-100">{item.name}</span>
          {isSelected && <CheckCircle2 size={14} className="text-amber-500" />}
        </div>
        <div className="text-[9px] uppercase tracking-widest opacity-40">{item.type}</div>
      </button>
    </Tooltip>
  );
};
