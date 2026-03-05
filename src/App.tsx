/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Scale, 
  Ruler, 
  Droplets, 
  Brain, 
  Sparkles, 
  MessageCircle, 
  BookOpen, 
  Trophy, 
  Volume2, 
  ChevronRight, 
  Search, 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Star,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Modality } from "@google/genai";

// --- Constants & Types ---

const XP_PER_LEVEL = 100;
const XP_PER_CORRECT = 20;

const TITLES = [
  "Scale Scout",
  "Metric Master",
  "Dimension Detective",
  "Volume Voyager",
  "Measurement Monarch",
  "Grand Estimator"
];

type UnitCategory = 'weight' | 'length' | 'volume';

interface UnitInfo {
  id: string;
  name: string;
  symbol: string;
  category: UnitCategory;
  emoji: string;
  example: string;
  description: string;
}

const UNITS: UnitInfo[] = [
  // Weight
  { id: 'g', name: 'Gram', symbol: 'g', category: 'weight', emoji: '📎', example: 'A paperclip', description: 'Very light! About the weight of a small paperclip.' },
  { id: 'kg', name: 'Kilogram', symbol: 'kg', category: 'weight', emoji: '🎒', example: 'A full backpack', description: 'Heavier! 1000 grams. Like a big bag of rice or a full backpack.' },
  { id: 'oz', name: 'Ounce', symbol: 'oz', category: 'weight', emoji: '🍞', example: 'A slice of bread', description: 'Light. About the weight of a single slice of bread.' },
  { id: 'lb', name: 'Pound', symbol: 'lb', category: 'weight', emoji: '🍞🍞', example: 'A loaf of bread', description: 'About 16 ounces. Like a whole loaf of bread or a small kitten.' },
  
  // Length
  { id: 'cm', name: 'Centimeter', symbol: 'cm', category: 'length', emoji: '☝️', example: 'Width of your finger', description: 'Small! About the width of your pinky finger.' },
  { id: 'm', name: 'Meter', symbol: 'm', category: 'length', emoji: '🚪', example: 'Height of a door handle', description: 'Long! About the distance from the floor to a door handle.' },
  { id: 'in', name: 'Inch', symbol: 'in', category: 'length', emoji: '📎', example: 'A large paperclip', description: 'Small length. About the length of a large paperclip.' },
  { id: 'ft', name: 'Foot', symbol: 'ft', category: 'length', emoji: '📏', example: 'A standard ruler', description: '12 inches. The length of a standard school ruler.' },

  // Volume
  { id: 'ml', name: 'Milliliter', symbol: 'ml', category: 'volume', emoji: '💧', example: 'A few drops', description: 'Tiny amount of liquid. About 20 drops of water.' },
  { id: 'l', name: 'Liter', symbol: 'l', category: 'volume', emoji: '🧴', example: 'A large water bottle', description: 'A common size for big water bottles or soda.' },
  { id: 'cup', name: 'Cup', symbol: 'cup', category: 'volume', emoji: '🥛', example: 'A glass of juice', description: 'The amount of milk or juice in a standard glass.' },
  { id: 'gal', name: 'Gallon', symbol: 'gal', category: 'volume', emoji: '🥛🥛', example: 'A large milk jug', description: 'A lot of liquid! Like a big jug of milk from the store.' },
];

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  unit: string;
  category: UnitCategory;
}

// --- Components ---

export default function App() {
  const [view, setView] = useState<'home' | 'explore' | 'quiz' | 'estimator' | 'helper' | 'story'>('home');
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [audioLoading, setAudioLoading] = useState(false);

  // Leveling Logic
  useEffect(() => {
    const newLevel = Math.floor(xp / XP_PER_LEVEL) + 1;
    if (newLevel > level) {
      setLevel(newLevel);
    }
  }, [xp, level]);

  const currentTitle = TITLES[Math.min(level - 1, TITLES.length - 1)];

  // Gemini API
  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' }), []);

  const speak = async (text: string) => {
    if (!process.env.GEMINI_API_KEY) return;
    setAudioLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say clearly and kindly: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const part = response.candidates?.[0]?.content?.parts?.[0];
      const base64Audio = part?.inlineData?.data;
      const mimeType = part?.inlineData?.mimeType || 'audio/mp3';

      if (base64Audio) {
        if (mimeType.includes('pcm')) {
          // Handle raw PCM audio (Gemini TTS default)
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const binaryString = window.atob(base64Audio);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Gemini TTS usually returns 16-bit PCM at 24kHz
          const pcmData = new Int16Array(bytes.buffer);
          const floatData = new Float32Array(pcmData.length);
          for (let i = 0; i < pcmData.length; i++) {
            floatData[i] = pcmData[i] / 32768.0;
          }
          
          const buffer = audioCtx.createBuffer(1, floatData.length, 24000);
          buffer.getChannelData(0).set(floatData);
          
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(audioCtx.destination);
          source.start();
        } else {
          // Handle containerized audio (MP3, WAV, etc.)
          const audioUrl = `data:${mimeType};base64,${base64Audio}`;
          const audio = new Audio(audioUrl);
          await audio.play();
        }
      }
    } catch (err) {
      console.error("TTS Error:", err);
    } finally {
      setAudioLoading(false);
    }
  };

  const addXp = (amount: number) => {
    setXp(prev => prev + amount);
  };

  const hasApiKey = !!process.env.GEMINI_API_KEY;

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#2D2D2D] font-sans selection:bg-emerald-100">
      {!hasApiKey && (
        <div className="bg-amber-500 text-white text-[10px] font-bold py-1 px-4 text-center uppercase tracking-widest">
          AI Features are sleeping (API Key Missing)
        </div>
      )}
      {/* Header / Stats */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Scale size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Unit Master</h1>
            <p className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">{currentTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 text-amber-500 font-bold">
              <Star size={16} fill="currentColor" />
              <span>Level {level}</span>
            </div>
            <div className="w-24 h-1.5 bg-stone-100 rounded-full overflow-hidden mt-1">
              <motion.div 
                className="h-full bg-amber-400"
                initial={{ width: 0 }}
                animate={{ width: `${(xp % XP_PER_LEVEL)}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-emerald-50 rounded-3xl p-8 border border-emerald-100 relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-3xl font-bold mb-2">Ready to measure?</h2>
                  <p className="text-emerald-700 max-w-[240px]">Learn how big, heavy, and full things are in the real world!</p>
                  <button 
                    onClick={() => setView('explore')}
                    className="mt-6 bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-colors flex items-center gap-2 group"
                  >
                    Start Exploring
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-10">
                  <Scale size={180} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <MenuCard 
                  icon={<Brain className="text-purple-500" />}
                  title="Quiz Time"
                  desc="Test your skills"
                  color="bg-purple-50"
                  onClick={() => setView('quiz')}
                />
                <MenuCard 
                  icon={<Search className="text-blue-500" />}
                  title="AI Estimator"
                  desc="Measure anything"
                  color="bg-blue-50"
                  onClick={() => setView('estimator')}
                />
                <MenuCard 
                  icon={<MessageCircle className="text-orange-500" />}
                  title="Unit Helper"
                  desc="Ask a question"
                  color="bg-orange-50"
                  onClick={() => setView('helper')}
                />
                <MenuCard 
                  icon={<BookOpen className="text-rose-500" />}
                  title="Story Mode"
                  desc="Daily adventure"
                  color="bg-rose-50"
                  onClick={() => setView('story')}
                />
              </div>
            </motion.div>
          )}

          {view === 'explore' && <ExploreView onBack={() => setView('home')} onSpeak={speak} />}
          {view === 'quiz' && <QuizView onBack={() => setView('home')} onCorrect={() => addXp(XP_PER_CORRECT)} onSpeak={speak} />}
          {view === 'estimator' && <EstimatorView onBack={() => setView('home')} ai={ai} onSpeak={speak} />}
          {view === 'helper' && <HelperView onBack={() => setView('home')} ai={ai} onSpeak={speak} />}
          {view === 'story' && <StoryView onBack={() => setView('home')} ai={ai} onSpeak={speak} />}
        </AnimatePresence>
      </main>

      {audioLoading && (
        <div className="fixed bottom-4 right-4 bg-white shadow-xl rounded-full p-3 border border-stone-100 flex items-center gap-2 animate-pulse">
          <Volume2 size={20} className="text-emerald-500" />
          <span className="text-xs font-bold text-stone-500">Speaking...</span>
        </div>
      )}
    </div>
  );
}

function MenuCard({ icon, title, desc, color, onClick }: { icon: React.ReactNode, title: string, desc: string, color: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`${color} p-6 rounded-3xl border border-black/5 text-left transition-transform active:scale-95 hover:shadow-md`}
    >
      <div className="mb-4 bg-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm">
        {icon}
      </div>
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="text-sm opacity-60">{desc}</p>
    </button>
  );
}

// --- Sub-Views ---

function ExploreView({ onBack, onSpeak }: { onBack: () => void, onSpeak: (t: string) => void }) {
  const [filter, setFilter] = useState<UnitCategory | 'all'>('all');

  const filteredUnits = UNITS.filter(u => filter === 'all' || u.category === filter);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold">Explore Units</h2>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'weight', 'length', 'volume'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat as any)}
            className={`px-4 py-2 rounded-full text-sm font-bold capitalize transition-colors ${
              filter === cat ? 'bg-[#2D2D2D] text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {filteredUnits.map((unit) => (
          <div key={unit.id} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex items-start gap-4">
            <div className="text-4xl">{unit.emoji}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-xl">{unit.name} ({unit.symbol})</h3>
                <button 
                  onClick={() => onSpeak(`${unit.name}. ${unit.description}`)}
                  className="p-2 hover:bg-emerald-50 text-emerald-500 rounded-full transition-colors"
                >
                  <Volume2 size={20} />
                </button>
              </div>
              <p className="text-stone-500 text-sm mb-3">{unit.description}</p>
              <div className="bg-stone-50 px-3 py-2 rounded-xl inline-flex items-center gap-2 text-xs font-bold text-stone-600">
                <Sparkles size={14} className="text-amber-500" />
                Example: {unit.example}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function QuizView({ onBack, onCorrect, onSpeak }: { onBack: () => void, onCorrect: () => void, onSpeak: (t: string) => void }) {
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);

  const generateQuestion = () => {
    const unit = UNITS[Math.floor(Math.random() * UNITS.length)];
    const otherUnits = UNITS.filter(u => u.category === unit.category && u.id !== unit.id);
    const options = [unit.example];
    
    // Add 2 distractors
    const distractors = [...otherUnits].sort(() => 0.5 - Math.random()).slice(0, 2).map(u => u.example);
    options.push(...distractors);
    
    const shuffled = options.sort(() => 0.5 - Math.random());
    const correctIndex = shuffled.indexOf(unit.example);

    setCurrentQuestion({
      id: Date.now(),
      question: `Which of these is closest to 1 ${unit.name}?`,
      options: shuffled,
      correctIndex,
      unit: unit.name,
      category: unit.category
    });
    setSelected(null);
    setIsCorrect(null);
  };

  useEffect(() => {
    generateQuestion();
  }, []);

  const handleAnswer = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    const correct = index === currentQuestion?.correctIndex;
    setIsCorrect(correct);
    if (correct) {
      onCorrect();
      setStreak(s => s + 1);
      onSpeak("Great job! That's correct.");
    } else {
      setStreak(0);
      onSpeak(`Oops! The correct answer was ${currentQuestion?.options[currentQuestion.correctIndex]}.`);
    }
  };

  if (!currentQuestion) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2 hover:bg-stone-100 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-2 bg-amber-50 px-4 py-1.5 rounded-full border border-amber-100">
          <Zap size={16} className="text-amber-500 fill-amber-500" />
          <span className="text-sm font-bold text-amber-700">{streak} Streak</span>
        </div>
      </div>

      <div className="text-center space-y-4">
        <div className="inline-block p-4 bg-purple-100 rounded-3xl text-purple-600 mb-2">
          {currentQuestion.category === 'weight' && <Scale size={40} />}
          {currentQuestion.category === 'length' && <Ruler size={40} />}
          {currentQuestion.category === 'volume' && <Droplets size={40} />}
        </div>
        <h2 className="text-2xl font-bold px-4">{currentQuestion.question}</h2>
      </div>

      <div className="grid gap-3">
        {currentQuestion.options.map((option, idx) => {
          const isSelected = selected === idx;
          const isCorrectOption = currentQuestion.correctIndex === idx;
          
          let bgColor = 'bg-white';
          let borderColor = 'border-stone-200';
          let textColor = 'text-[#2D2D2D]';

          if (selected !== null) {
            if (isCorrectOption) {
              bgColor = 'bg-emerald-50';
              borderColor = 'border-emerald-500';
              textColor = 'text-emerald-700';
            } else if (isSelected) {
              bgColor = 'bg-rose-50';
              borderColor = 'border-rose-500';
              textColor = 'text-rose-700';
            } else {
              bgColor = 'bg-stone-50';
              borderColor = 'border-stone-100';
              textColor = 'text-stone-400';
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              disabled={selected !== null}
              className={`p-5 rounded-2xl border-2 ${bgColor} ${borderColor} ${textColor} font-bold text-lg transition-all flex items-center justify-between group`}
            >
              {option}
              {selected !== null && isCorrectOption && <CheckCircle2 size={24} className="text-emerald-500" />}
              {selected !== null && isSelected && !isCorrectOption && <XCircle size={24} className="text-rose-500" />}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={generateQuestion}
          className="w-full bg-[#2D2D2D] text-white py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-transform"
        >
          Next Question
        </motion.button>
      )}
    </motion.div>
  );
}

function EstimatorView({ onBack, ai, onSpeak }: { onBack: () => void, ai: GoogleGenAI, onSpeak: (t: string) => void }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleEstimate = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Estimate the weight, length, and volume of "${query}". Provide the answer in JSON format for a 7-year-old. Use common units like grams/kilograms, centimeters/meters, and milliliters/liters. Include a fun fact.
        Schema: { weight: string, length: string, volume: string, funFact: string, emoji: string }`,
        config: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(response.text);
      setResult(data);
      onSpeak(`A ${query} is about ${data.weight} heavy, ${data.length} long, and has a volume of ${data.volume}. Did you know? ${data.funFact}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-stone-100 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold">AI Estimator</h2>
      </div>

      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 space-y-4">
        <p className="text-blue-700 font-medium">Type any object to see how big it is!</p>
        {!process.env.GEMINI_API_KEY && <p className="text-xs text-amber-600 font-bold">⚠️ AI Estimator needs an API key to work.</p>}
        <div className="flex gap-2">
          <input 
            type="text"
            disabled={!process.env.GEMINI_API_KEY}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. A blue whale, a pencil..."
            className="flex-1 bg-white border border-blue-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium disabled:opacity-50"
            onKeyDown={(e) => e.key === 'Enter' && handleEstimate()}
          />
          <button 
            onClick={handleEstimate}
            disabled={loading || !process.env.GEMINI_API_KEY}
            className="bg-blue-500 text-white p-3 rounded-2xl shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            {loading ? <div className="animate-spin border-2 border-white/30 border-t-white rounded-full w-6 h-6" /> : <Search size={24} />}
          </button>
        </div>
      </div>

      {result && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6"
        >
          <div className="text-center">
            <div className="text-6xl mb-4">{result.emoji || '✨'}</div>
            <h3 className="text-2xl font-bold capitalize">{query}</h3>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <StatBox icon={<Scale size={20} />} label="Weight" value={result.weight} color="text-amber-500" />
            <StatBox icon={<Ruler size={20} />} label="Length" value={result.length} color="text-emerald-500" />
            <StatBox icon={<Droplets size={20} />} label="Volume" value={result.volume} color="text-blue-500" />
          </div>

          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Fun Fact</p>
            <p className="text-stone-700 leading-relaxed">{result.funFact}</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function StatBox({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
  return (
    <div className="text-center space-y-1">
      <div className={`mx-auto w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <p className="text-[10px] font-bold text-stone-400 uppercase">{label}</p>
      <p className="text-xs font-bold leading-tight">{value}</p>
    </div>
  );
}

function HelperView({ onBack, ai, onSpeak }: { onBack: () => void, ai: GoogleGenAI, onSpeak: (t: string) => void }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are a friendly measurement teacher for a 7-year-old. Explain measurement concepts using simple analogies. Question: ${userMsg}`,
        config: { systemInstruction: "Keep answers short (max 3 sentences) and use emojis." }
      });
      const aiMsg = response.text;
      setMessages(prev => [...prev, { role: 'ai', text: aiMsg }]);
      onSpeak(aiMsg);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-[70vh]"
    >
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-stone-100 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold">Unit Helper</h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 p-2 scrollbar-hide">
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <div className="bg-orange-100 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto text-orange-500">
              <MessageCircle size={32} />
            </div>
            <p className="text-stone-500 font-medium">Ask me anything about measuring!</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["How big is a meter?", "What is a gram?", "Why do we measure?"].map(q => (
                <button 
                  key={q}
                  onClick={() => setInput(q)}
                  className="bg-stone-100 px-4 py-2 rounded-full text-xs font-bold text-stone-600 hover:bg-stone-200"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl font-medium ${
              m.role === 'user' ? 'bg-[#2D2D2D] text-white rounded-tr-none' : 'bg-white border border-stone-200 rounded-tl-none shadow-sm'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-stone-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
              <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <input 
          type="text"
          disabled={!process.env.GEMINI_API_KEY}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={process.env.GEMINI_API_KEY ? "Type a question..." : "AI Helper is offline"}
          className="flex-1 bg-white border border-stone-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400 font-medium disabled:opacity-50"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button 
          onClick={handleSend}
          disabled={loading || !process.env.GEMINI_API_KEY}
          className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg shadow-orange-200 disabled:opacity-50"
        >
          <Sparkles size={24} />
        </button>
      </div>
    </motion.div>
  );
}

function StoryView({ onBack, ai, onSpeak }: { onBack: () => void, ai: GoogleGenAI, onSpeak: (t: string) => void }) {
  const [story, setStory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateStory = async () => {
    setLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Tell a short, 3-sentence adventure story for a 7-year-old where measuring something (weight, length, or volume) saves the day. Use lots of emojis.",
      });
      setStory(response.text);
      onSpeak(response.text);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-stone-100 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold">Story Mode</h2>
      </div>

      <div className="bg-rose-50 p-8 rounded-[40px] border border-rose-100 text-center space-y-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-rose-200 mb-6 text-rose-500">
            <BookOpen size={40} />
          </div>
          
          {story ? (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-bold text-rose-900 leading-relaxed italic"
            >
              "{story}"
            </motion.p>
          ) : (
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-rose-800">Adventure Awaits!</h3>
              <p className="text-rose-600">Click below to generate a measurement mission.</p>
            </div>
          )}

          <button 
            onClick={generateStory}
            disabled={loading || !process.env.GEMINI_API_KEY}
            className="mt-8 bg-rose-500 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-rose-200 hover:bg-rose-600 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            {!process.env.GEMINI_API_KEY ? "Story Mode Offline" : (loading ? "Writing..." : (story ? "Another Story" : "Generate Story"))}
            {!loading && process.env.GEMINI_API_KEY && <Sparkles size={20} />}
          </button>
        </div>
        
        <div className="absolute top-0 right-0 opacity-5 pointer-events-none">
          <Trophy size={200} />
        </div>
      </div>
    </motion.div>
  );
}
