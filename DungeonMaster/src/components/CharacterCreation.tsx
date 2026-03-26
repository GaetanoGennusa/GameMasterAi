import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { Toaster } from 'sonner';

interface CharacterCreationProps {
  creationStep: 'race' | 'class' | 'name';
  setCreationStep: (step: 'race' | 'class' | 'name') => void;
  selectedRace: string | null;
  setSelectedRace: (race: string | null) => void;
  selectedClass: string | null;
  setSelectedClass: (cls: string | null) => void;
  tempName: string;
  setTempName: (name: string) => void;
  finalizeCreation: () => void;
  isLoading: boolean;
  RACES: any[];
  CLASSES: any[];
}

export const CharacterCreation = ({
  creationStep,
  setCreationStep,
  selectedRace,
  setSelectedRace,
  selectedClass,
  setSelectedClass,
  tempName,
  setTempName,
  finalizeCreation,
  isLoading,
  RACES,
  CLASSES
}: CharacterCreationProps) => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-amber-100/80 font-sans p-8 flex flex-col items-center">
      <Toaster position="top-center" theme="dark" />
      <div className="max-w-4xl w-full">
        <header className="text-center mb-12">
          <h2 className="text-4xl font-serif text-amber-500 italic mb-2">Creazione dell'Eroe</h2>
          <div className="flex justify-center gap-4 mt-6">
            {['race', 'class', 'name'].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${creationStep === step ? 'bg-amber-500 border-amber-500 text-black' : 'border-white/20'}`}>
                  {i + 1}
                </div>
                <span className={`text-xs uppercase tracking-widest ${creationStep === step ? 'text-amber-400' : 'opacity-40'}`}>{step}</span>
                {i < 2 && <div className="w-12 h-px bg-white/10 mx-2" />}
              </div>
            ))}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {creationStep === 'race' && (
            <motion.div 
              key="race"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {RACES.map(race => (
                <button
                  key={race.id}
                  onClick={() => { setSelectedRace(race.id); setCreationStep('class'); }}
                  className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left group"
                >
                  <div className="text-4xl mb-4">{race.icon}</div>
                  <h3 className="text-xl font-medium text-amber-400 mb-2">{race.name}</h3>
                  <p className="text-sm opacity-60 leading-relaxed">{race.description}</p>
                </button>
              ))}
            </motion.div>
          )}

          {creationStep === 'class' && (
            <motion.div 
              key="class"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {CLASSES.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => { setSelectedClass(cls.id); setCreationStep('name'); }}
                  className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left group"
                >
                  <div className="text-4xl mb-4">{cls.icon}</div>
                  <h3 className="text-xl font-medium text-amber-400 mb-2">{cls.name}</h3>
                  <p className="text-sm opacity-60 leading-relaxed">{cls.description}</p>
                </button>
              ))}
              <button onClick={() => setCreationStep('race')} className="col-span-full text-center mt-4 opacity-40 hover:opacity-100 text-sm uppercase tracking-widest">Indietro</button>
            </motion.div>
          )}

          {creationStep === 'name' && (
            <motion.div 
              key="name"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center"
            >
              <div className="w-full max-w-md bg-white/5 p-8 rounded-3xl border border-white/10">
                <label className="block text-xs uppercase tracking-widest opacity-50 mb-4">Come ti chiamano nelle terre di Eldoria?</label>
                <input 
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Il tuo nome..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-4 text-xl text-amber-100 focus:outline-none focus:border-amber-500/50 transition-all mb-8"
                  autoFocus
                />
                <button
                  onClick={finalizeCreation}
                  disabled={!tempName || isLoading}
                  className="w-full py-4 bg-amber-600 text-black font-bold rounded-xl hover:bg-amber-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <RefreshCw className="animate-spin" /> : "Inizia l'Avventura"}
                </button>
              </div>
              <button onClick={() => setCreationStep('class')} className="mt-8 opacity-40 hover:opacity-100 text-sm uppercase tracking-widest">Indietro</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
