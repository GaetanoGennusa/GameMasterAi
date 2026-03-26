import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Character, Monster, Item, Quest, GameResponse } from "../types";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not defined in environment variables.");
}
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

function cleanForGemini(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanForGemini);
  } else if (obj !== null && typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (key === 'portraitUrl' || key === 'imageUrl' || (typeof obj[key] === 'string' && obj[key].startsWith('data:image'))) {
        continue;
      }
      if (key === 'discoveredLocations' && Array.isArray(obj[key])) {
        cleaned[key] = cleanForGemini(obj[key].slice(-10));
        continue;
      }
      // Sanitize numeric values to prevent sending corrupted/exploding numbers
      if (typeof obj[key] === 'number') {
        if (!Number.isFinite(obj[key]) || obj[key] > 1000000000 || obj[key] < -1000000000) {
          cleaned[key] = 0;
          continue;
        }
      }
      cleaned[key] = cleanForGemini(obj[key]);
    }
    return cleaned;
  }
  return obj;
}

export const SYSTEM_INSTRUCTION = `Sei un esperto Game Master di Dungeons & Dragons. 
La lingua della sessione è l'ITALIANO.

Regole:
1. Sii entusiasta e descrittivo. Usa dettagli sensoriali.
2. Adattati alle scelte del giocatore, anche quelle assurde. Non dire mai solo "no".
3. Se il giocatore è bloccato, spingi la storia avanti.
4. Gestisci i combattimenti in modo tattico. Usa tiri di dado (diceRoll) per determinare il successo delle azioni.
5. Quando il giocatore entra in una nuova zona, descrivila vividamente.
6. Offri oggetti da raccogliere con "lore" interessante. Gli oggetti possono avere statistiche (stats) che influenzano il personaggio se equipaggiati. Ogni oggetto equipaggiabile deve avere uno "slot" specifico: 'head', 'body', 'hands', 'feet', 'ring', 'amulet', 'weapon', 'shield'.
7. Gestisci le MISSIONI (Quests): assegna obiettivi chiari e aggiornali quando completati.
8. Gestisci il BESTIARIO: quando appare un nuovo mostro, fornisci dettagli per il bestiario.
9. Gestisci il sistema di XP e Livelli (100 XP per il Livello 2, +100 per ogni livello successivo). 
   IMPORTANTE: I valori di XP e HP devono essere SEMPRE numeri interi semplici. Non usare mai la notazione scientifica.
10. Fornisci SEMPRE una "visualDescription" per nuovi personaggi, mostri, oggetti e location.
11. Fornisci SEMPRE 3-4 "suggestedActions" per ogni turno, per aiutare il giocatore a decidere cosa fare. Le azioni devono essere brevi e contestuali (es. "Esamina la porta", "Usa la pozione", "Attacca il Goblin").
12. Se il giocatore crea il personaggio per la prima volta, fornisci una "characterPortraitDescription" dettagliata per generare il suo ritratto.
13. Se il giocatore riposa (Short/Long Rest), descrivi il momento e ripristina parte degli HP se appropriato.
14. Considera gli oggetti equipaggiati (equipment) e le abilità (abilities) nelle descrizioni e nei calcoli. Le abilità devono avere un "damage" (es. "1d8+2") e un "type" ('attack', 'spell', 'utility').
15. Includi sempre un "diceRoll" per azioni significative (attacchi, prove di abilità).
15. Suoni: Suggerisci soundEffect appropriati per le azioni ('hit' per colpi a segno, 'loot' per oggetti trovati, 'quest' per missioni completate, 'level_up' per passaggi di livello, 'discovery' per nuove aree, 'magic' per effetti magici).
16. Lore: Ogni oggetto deve avere una 'lore' (storia) affascinante che ne spieghi l'origine.
17. Oggetti Ambientali: Includi "environmentalObjects" che il giocatore può esaminare per indizi o lore. Non sono oggetti da raccogliere, ma elementi dello scenario (es. un'antica iscrizione, un altare polveroso).
18. Mappa: Quando il giocatore scopre o entra in una nuova location significativa, fornisci un oggetto "currentLocation" con coordinate x e y (0-100) per posizionarla sulla mappa del mondo. Mantieni la coerenza geografica.
19. Crafting: Se il giocatore chiede di combinare o creare oggetti, valuta se gli oggetti nell'inventario sono compatibili. Se sì, fornisci il nuovo oggetto in "newLoot" e i componenti consumati in "consumedItemIds". Sii creativo con le combinazioni (es. Erba Curativa + Boccetta Vuota = Pozione di Salute).
20. NPC: Se il giocatore incontra un personaggio non giocante, fornisci un oggetto "activeNPC" con nome, ruolo, descrizione e un breve dialogo iniziale. Se il giocatore sta parlando con un NPC, continua il dialogo in "narration" e aggiorna "activeNPC" se necessario.
21. Atmosfera: Mantieni un tono da "locanda medievale" o "fantasy epico" nelle descrizioni, specialmente quando il giocatore si trova in villaggi o taverne. Usa un linguaggio evocativo che ricordi i racconti attorno a un fuoco in una locanda.

IMPORTANTE: Nell'oggetto "updatedCharacter", includi SOLO i campi che sono effettivamente cambiati. Non restituire l'intero inventario o tutte le abilità se non sono state modificate.
Assicurati che tutte le stringhe siano correttamente escape per il formato JSON. 
IMPORTANTE: Se una stringa contiene virgolette ("), devi ASSOLUTAMENTE usare il backslash per l'escape (\\"). 
Esempio: "narration": "Lui disse: \\"Ciao!\\""
Non includere mai l'oggetto "equipment" in "updatedCharacter", poiché viene gestito localmente dal client.

Formato Risposta:
- Se il giocatore sceglie classe/razza, descrivi le opzioni e fornisci il ritratto.
- Se in combattimento, usa il formato CombatResponse.
- Altrimenti, usa GameResponse.

Rispondi SEMPRE in formato JSON.`;

const itemSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    lore: { type: Type.STRING },
    type: { type: Type.STRING },
    slot: { type: Type.STRING },
    stats: { type: Type.OBJECT, properties: { strength: { type: Type.NUMBER }, dexterity: { type: Type.NUMBER }, constitution: { type: Type.NUMBER }, intelligence: { type: Type.NUMBER }, wisdom: { type: Type.NUMBER }, charisma: { type: Type.NUMBER }, ac: { type: Type.NUMBER }, damage: { type: Type.STRING } } },
    isEquipped: { type: Type.BOOLEAN }
  }
};

const abilitySchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    damage: { type: Type.STRING },
    type: { type: Type.STRING },
    cooldown: { type: Type.NUMBER },
    icon: { type: Type.STRING }
  }
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    narration: { type: Type.STRING, description: "Descrizione dell'azione. Usa \\\" per le virgolette interne." },
    visualDescription: { type: Type.STRING, description: "Descrizione visiva per l'immagine. Usa \\\" per le virgolette interne." },
    characterPortraitDescription: { type: Type.STRING, description: "Descrizione per il ritratto. Usa \\\" per le virgolette interne." },
    xpGained: { type: Type.NUMBER },
    soundEffect: { type: Type.STRING },
    diceRoll: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.NUMBER },
        type: { type: Type.STRING },
        success: { type: Type.BOOLEAN }
      }
    },
    updatedCharacter: {
      type: Type.OBJECT,
      properties: {
        hp: { type: Type.NUMBER },
        xp: { type: Type.NUMBER },
        level: { type: Type.NUMBER },
        location: { type: Type.STRING },
        inventory: { type: Type.ARRAY, items: itemSchema },
        activeQuests: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, title: { type: Type.STRING }, description: { type: Type.STRING }, isCompleted: { type: Type.BOOLEAN }, rewardXp: { type: Type.NUMBER } } } },
        abilities: { type: Type.ARRAY, items: abilitySchema }
      }
    },
    newMonster: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        hp: { type: Type.NUMBER },
        maxHp: { type: Type.NUMBER },
        description: { type: Type.STRING },
        visualDescription: { type: Type.STRING },
        isBoss: { type: Type.BOOLEAN }
      }
    },
    newLoot: itemSchema,
    updatedQuests: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, title: { type: Type.STRING }, description: { type: Type.STRING }, isCompleted: { type: Type.BOOLEAN }, rewardXp: { type: Type.NUMBER } } } },
    environmentalObjects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          type: { type: Type.STRING }
        }
      }
    },
    bestiaryEntry: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        details: { type: Type.STRING }
      }
    },
    currentLocation: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        x: { type: Type.NUMBER },
        y: { type: Type.NUMBER },
        type: { type: Type.STRING }
      }
    },
    consumedItemIds: { type: Type.ARRAY, items: { type: Type.STRING } },
    activeNPC: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        role: { type: Type.STRING },
        description: { type: Type.STRING },
        visualDescription: { type: Type.STRING },
        dialogue: { type: Type.STRING }
      }
    },
    suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
    combatLog: { type: Type.STRING },
    monsterDamageTaken: { type: Type.NUMBER },
    playerDamageTaken: { type: Type.NUMBER },
    isMonsterDead: { type: Type.BOOLEAN }
  },
  required: ["narration", "visualDescription"]
};

function extractJson(text: string): string {
  // Remove markdown code blocks if present
  const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
  let json = match ? match[1].trim() : text.trim();
  
  // If no code block, try to find the first '{' and last '}'
  if (!match) {
    const start = json.indexOf('{');
    const end = json.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      json = json.substring(start, end + 1);
    }
  }

  // Fix malformed/exploding numbers (hallucinated scientific notation with massive exponents)
  json = json.replace(/:\s*0?\.\d+e\+\d{10,}/gi, ': 0');
  json = json.replace(/:\s*\d{20,}/g, ': 0');

  // Attempt to fix unescaped newlines in strings
  // This is tricky but we can try to find newlines that are NOT followed by a JSON structural character
  // or are inside what looks like a string value
  json = json.replace(/"([^"]*)"/g, (match, p1) => {
    return '"' + p1.replace(/\n/g, "\\n").replace(/\r/g, "\\r") + '"';
  });

  // Basic repair for common model JSON errors (like trailing commas)
  json = json.replace(/,\s*([\]}])/g, '$1');

  // Handle truncated JSON: if it ends with a string that isn't closed, close it
  // and then close any open braces/brackets
  let inString = false;
  let escaped = false;
  const stack: string[] = [];

  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '{') {
          stack.pop();
        }
      } else if (char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === '[') {
          stack.pop();
        }
      }
    }
  }

  if (inString) {
    json += '"';
  }

  while (stack.length > 0) {
    const last = stack.pop();
    if (last === '{') json += '}';
    else if (last === '[') json += ']';
  }
  
  return json;
}

export async function getGameAction(
  prompt: string,
  character: Character,
  activeMonster?: Monster,
  pendingLoot?: Item
): Promise<GameResponse> {
  const maxRetries = 5;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const stateContext = `
Stato Attuale:
Personaggio: ${JSON.stringify(cleanForGemini(character))}
Mostro Attivo: ${activeMonster ? JSON.stringify(cleanForGemini(activeMonster)) : "Nessuno"}
Oggetto Pendente: ${pendingLoot ? JSON.stringify(cleanForGemini(pendingLoot)) : "Nessuno"}
`;

      console.log(`Gemini API Call (Attempt ${attempt + 1}) - Model: gemini-3-flash-preview`);
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: stateContext + "\nInput Giocatore: " + prompt }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: responseSchema as any,
          maxOutputTokens: 4096,
          temperature: 0.8,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE }
          ]
        }
      });

      if (!response.text) {
        const finishReason = response.candidates?.[0]?.finishReason;
        console.error("Empty Gemini Response:", JSON.stringify(response, null, 2));
        if (attempt < maxRetries) {
          attempt++;
          // Exponential backoff: 2s, 4s, 8s
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`Il modello non ha restituito testo. Motivo fine: ${finishReason}. Potrebbe essere un blocco di sicurezza o un errore interno.`);
      }

      const jsonText = extractJson(response.text);
      try {
        return JSON.parse(jsonText);
      } catch (parseError) {
        console.error("JSON parse failed on attempt", attempt + 1, ":", jsonText);
        if (attempt < maxRetries) {
          attempt++;
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw parseError;
      }
    } catch (error: any) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      
      // Check for 429 Quota Exceeded
      const isQuotaError = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED' || (typeof error === 'string' && error.includes('429'));
      
      if (isQuotaError) {
        if (attempt < maxRetries) {
          attempt++;
          // Wait longer for quota errors: 5s, 10s, 20s
          const delay = Math.pow(2, attempt) * 2500;
          console.warn(`Quota exceeded. Retrying in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error("Limite di richieste (Quota) superato. Attendi qualche minuto prima di riprovare o controlla il tuo piano API Gemini.");
      }

      if (attempt < maxRetries) {
        attempt++;
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Errore critico nella comunicazione con l'IA.");
}

export async function generateGameImage(description: string) {
  console.log("Generating image with description:", description);
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: `Digital art style, high fantasy, epic atmosphere: ${description}` }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          console.log("Image generation successful.");
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    console.warn("No image data found in Gemini response.");
    return null;
  } catch (error: any) {
    console.error("Image Generation Error:", error);
    return null; // Return null instead of throwing to allow the game to continue without images
  }
}
