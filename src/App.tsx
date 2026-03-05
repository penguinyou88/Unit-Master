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
  VolumeX,
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
  { id: 'mg', name: 'Milligram', symbol: 'mg', category: 'weight', emoji: '🧂', example: 'A grain of salt', description: 'Super tiny! Like a single grain of salt or a tiny speck of dust.' },
  { id: 'g', name: 'Gram', symbol: 'g', category: 'weight', emoji: '📎', example: 'A paperclip', description: 'Very light! About the weight of a small paperclip or a grape.' },
  { id: 'kg', name: 'Kilogram', symbol: 'kg', category: 'weight', emoji: '🎒', example: 'A full backpack', description: 'Heavier! 1000 grams. Like a big bag of rice, a liter of water, or a full backpack.' },
  { id: 'oz', name: 'Ounce', symbol: 'oz', category: 'weight', emoji: '🍞', example: 'A slice of bread', description: 'Light. About the weight of a single slice of bread or a AA battery.' },
  { id: 'lb', name: 'Pound', symbol: 'lb', category: 'weight', emoji: '🍞🍞', example: 'A loaf of bread', description: 'About 16 ounces. Like a whole loaf of bread, a small kitten, or a soccer ball.' },
  { id: 'ton', name: 'Ton', symbol: 't', category: 'weight', emoji: '🐘', example: 'A small elephant', description: 'Huge! Like a small car or a baby elephant.' },
  
  // Length
  { id: 'mm', name: 'Millimeter', symbol: 'mm', category: 'length', emoji: '💳', example: 'Thickness of a credit card', description: 'Tiny! About the thickness of a credit card or a ID card.' },
  { id: 'cm', name: 'Centimeter', symbol: 'cm', category: 'length', emoji: '☝️', example: 'Width of your finger', description: 'Small! About the width of your pinky finger or a blueberry.' },
  { id: 'in', name: 'Inch', symbol: 'in', category: 'length', emoji: '📎', example: 'A large paperclip', description: 'Small length. About the length of a large paperclip or a thumb.' },
  { id: 'ft', name: 'Foot', symbol: 'ft', category: 'length', emoji: '📏', example: 'A standard ruler', description: '12 inches. The length of a standard school ruler or a large sub sandwich.' },
  { id: 'm', name: 'Meter', symbol: 'm', category: 'length', emoji: '🚪', example: 'Height of a door handle', description: 'Long! About the distance from the floor to a door handle or a big guitar.' },
  { id: 'km', name: 'Kilometer', symbol: 'km', category: 'length', emoji: '🏙️', example: '10 city blocks', description: 'Very long! Like walking across 10 city blocks or a long bridge.' },

  // Volume
  { id: 'ml', name: 'Milliliter', symbol: 'ml', category: 'volume', emoji: '💧', example: 'A few drops', description: 'Tiny amount of liquid. About 20 drops of water or a small spoon.' },
  { id: 'tsp', name: 'Teaspoon', symbol: 'tsp', category: 'volume', emoji: '🥄', example: 'Small spoon of sugar', description: 'Small! Used for baking or medicine.' },
  { id: 'tbsp', name: 'Tablespoon', symbol: 'tbsp', category: 'volume', emoji: '🥄🥄', example: 'Large spoon of honey', description: '3 teaspoons. About the size of a large soup spoon.' },
  { id: 'cup', name: 'Cup', symbol: 'cup', category: 'volume', emoji: '🥛', example: 'A glass of juice', description: 'The amount of milk or juice in a standard glass or a small bowl.' },
  { id: 'pt', name: 'Pint', symbol: 'pt', category: 'volume', emoji: '🍦', example: 'A tub of ice cream', description: '2 cups. Like a standard tub of premium ice cream.' },
  { id: 'qt', name: 'Quart', symbol: 'qt', category: 'volume', emoji: '🥛🥛🥛', example: 'A carton of milk', description: '2 pints or 4 cups. Like a tall carton of milk or orange juice.' },
  { id: 'l', name: 'Liter', symbol: 'l', category: 'volume', emoji: '🧴', example: 'A large water bottle', description: 'A common size for big water bottles or soda.' },
  { id: 'gal', name: 'Gallon', symbol: 'gal', category: 'volume', emoji: '🥛🥛', example: 'A large milk jug', description: 'A lot of liquid! Like a big jug of milk from the store or a bucket.' },
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
  const [isMuted, setIsMuted] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<QuizQuestion[]>([]);

  // Leveling Logic
  useEffect(() => {
    const newLevel = Math.floor(xp / XP_PER_LEVEL) + 1;
    if (newLevel > level) {
      setLevel(newLevel);
      setShowLevelUp(true);
      speak(`Congratulations! You reached level ${newLevel}! You are now a ${TITLES[Math.min(newLevel - 1, TITLES.length - 1)]}.`);
    }
  }, [xp, level]);

  const currentTitle = TITLES[Math.min(level - 1, TITLES.length - 1)];

  // Gemini API
  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' }), []);

  const speak = async (text: string) => {
    if (!process.env.GEMINI_API_KEY || isMuted) return;
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
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-500"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
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
              className="space-y-8"
            >
              {/* Prominent Level Display */}
              <div className="text-center py-6">
                <motion.div 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="relative inline-block"
                >
                  <div className="w-32 h-32 bg-amber-400 rounded-full flex flex-col items-center justify-center text-white shadow-2xl shadow-amber-200 border-4 border-white">
                    <span className="text-xs font-bold uppercase tracking-widest opacity-80">Level</span>
                    <span className="text-5xl font-black">{level}</span>
                  </div>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-2 border-2 border-dashed border-amber-300 rounded-full"
                  />
                </motion.div>
                <h2 className="mt-4 text-2xl font-bold text-stone-800">{currentTitle}</h2>
                <p className="text-stone-400 font-medium">{xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP to next level</p>
              </div>

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
          {view === 'quiz' && (
            <QuizView 
              onBack={() => setView('home')} 
              onCorrect={() => addXp(XP_PER_CORRECT)} 
              onSpeak={speak} 
              wrongQuestions={wrongQuestions}
              setWrongQuestions={setWrongQuestions}
            />
          )}
          {view === 'estimator' && <EstimatorView onBack={() => setView('home')} ai={ai} onSpeak={speak} />}
          {view === 'helper' && <HelperView onBack={() => setView('home')} ai={ai} onSpeak={speak} />}
          {view === 'story' && <StoryView onBack={() => setView('home')} ai={ai} onSpeak={speak} onCorrect={() => addXp(XP_PER_CORRECT * 2)} />}
        </AnimatePresence>
      </main>

      {/* Level Up Modal */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.5, y: 100 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 100 }}
              className="bg-white rounded-[40px] p-8 max-w-sm w-full text-center shadow-2xl border-4 border-amber-400"
            >
              <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500">
                <Trophy size={48} />
              </div>
              <h2 className="text-3xl font-black text-stone-800 mb-2">LEVEL UP!</h2>
              <p className="text-stone-500 mb-6 font-medium">You've reached Level {level} and earned the title of <span className="text-amber-600 font-bold">{currentTitle}</span>!</p>
              <button 
                onClick={() => setShowLevelUp(false)}
                className="w-full bg-amber-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-amber-200 active:scale-95 transition-transform"
              >
                Awesome!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

function QuizView({ onBack, onCorrect, onSpeak, wrongQuestions, setWrongQuestions }: { 
  onBack: () => void, 
  onCorrect: () => void, 
  onSpeak: (t: string) => void,
  wrongQuestions: QuizQuestion[],
  setWrongQuestions: React.Dispatch<React.SetStateAction<QuizQuestion[]>>
}) {
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false);

  const generateQuestion = () => {
    if (isReviewMode && wrongQuestions.length > 0) {
      const q = wrongQuestions[0];
      setCurrentQuestion(q);
      setSelected(null);
      setIsCorrect(null);
      return;
    }

    // Difficulty scaling:
    // 0-5 streak: 3 options, common units
    // 6-10 streak: 4 options, common units
    // 11+ streak: 4 options, any units
    const difficulty = streak < 6 ? 'easy' : streak < 11 ? 'medium' : 'hard';
    const numOptions = difficulty === 'easy' ? 3 : 4;
    
    const availableUnits = difficulty === 'hard' 
      ? UNITS 
      : UNITS.filter(u => !['ton', 'mm', 'km', 'mg', 'tsp', 'tbsp', 'pt', 'qt'].includes(u.id));

    const unit = availableUnits[Math.floor(Math.random() * availableUnits.length)];
    const otherUnits = availableUnits.filter(u => u.category === unit.category && u.id !== unit.id);
    const options = [unit.example];
    
    const distractors = [...otherUnits].sort(() => 0.5 - Math.random()).slice(0, numOptions - 1).map(u => u.example);
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
  }, [isReviewMode]);

  const handleAnswer = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    const correct = index === currentQuestion?.correctIndex;
    setIsCorrect(correct);
    if (correct) {
      onCorrect();
      setStreak(s => s + 1);
      onSpeak("Great job! That's correct.");
      
      if (isReviewMode && currentQuestion) {
        setWrongQuestions(prev => prev.filter(q => q.id !== currentQuestion.id));
      }
    } else {
      setStreak(0);
      onSpeak(`Oops! The correct answer was ${currentQuestion?.options[currentQuestion.correctIndex]}.`);
      
      if (!isReviewMode && currentQuestion) {
        setWrongQuestions(prev => {
          if (prev.find(q => q.unit === currentQuestion.unit)) return prev;
          return [...prev, currentQuestion];
        });
      }
    }
  };

  if (!currentQuestion && isReviewMode && wrongQuestions.length === 0) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-500">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-bold">Review Complete!</h2>
        <p className="text-stone-500">You've mastered all your tricky questions.</p>
        <button onClick={() => setIsReviewMode(false)} className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-bold">Back to Quiz</button>
      </div>
    );
  }

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
        <div className="flex gap-2">
          {wrongQuestions.length > 0 && (
            <button 
              onClick={() => setIsReviewMode(!isReviewMode)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                isReviewMode ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-rose-500 border-rose-200'
              }`}
            >
              {isReviewMode ? 'Exit Review' : `Review (${wrongQuestions.length})`}
            </button>
          )}
          <div className="flex items-center gap-2 bg-amber-50 px-4 py-1.5 rounded-full border border-amber-100">
            <Zap size={16} className="text-amber-500 fill-amber-500" />
            <span className="text-sm font-bold text-amber-700">{streak} Streak</span>
          </div>
        </div>
      </div>

      <div className="text-center space-y-4">
        {isReviewMode && <p className="text-rose-500 font-bold text-sm uppercase tracking-widest">Reviewing a tricky one!</p>}
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

function StoryView({ onBack, ai, onSpeak, onCorrect }: { onBack: () => void, ai: GoogleGenAI, onSpeak: (t: string) => void, onCorrect: () => void }) {
  const [storyPart, setStoryPart] = useState<{ text: string, options: string[], correctIndex: number } | null>(null);
  const [storyHistory, setStoryHistory] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const generateStory = async () => {
    setLoading(true);
    setSelected(null);
    setIsCorrect(null);
    setImageUrl(null);
    try {
      // 1. Generate Story Text
      const historyContext = storyHistory.slice(-3).join(" ");
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are writing a continuous adventure story for a 7-year-old. 
        Previous context: ${historyContext || "The adventure begins!"}
        
        Continue the story with a new challenge that requires a missing unit. 
        Example: "The hero reached a bridge that was [BLANK] long."
        Provide 3 options where only one makes sense (e.g., 5 Meters, 5 Grams, 5 Liters).
        Return JSON: { "text": string, "options": string[], "correctIndex": number, "imagePrompt": string }`,
        config: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(response.text);
      setStoryPart(data);
      setStoryHistory(prev => [...prev, data.text.replace("[BLANK]", data.options[data.correctIndex])]);
      onSpeak(data.text.replace("[BLANK]", "something"));

      // 2. Generate Image
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: `A colorful, child-friendly illustration for a storybook: ${data.imagePrompt}`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      });
      
      for (const part of imageResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          setImageUrl(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === storyPart?.correctIndex;
    setIsCorrect(correct);
    if (correct) {
      onCorrect();
      onSpeak("Perfect! You saved the day!");
    } else {
      onSpeak("Oh no! That doesn't seem right.");
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

      <div className="bg-rose-50 p-8 rounded-[40px] border border-rose-100 text-center space-y-6 relative overflow-hidden min-h-[400px] flex flex-col justify-center">
        <div className="relative z-10">
          {!storyPart && !loading && (
            <div className="space-y-6">
              <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-rose-200 text-rose-500">
                <BookOpen size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-rose-800">Interactive Adventure</h3>
                <p className="text-rose-600">Help the hero by choosing the right units!</p>
              </div>
              <button 
                onClick={generateStory}
                disabled={!process.env.GEMINI_API_KEY}
                className="bg-rose-500 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-rose-200 hover:bg-rose-600 transition-colors disabled:opacity-50"
              >
                {!process.env.GEMINI_API_KEY ? "Story Mode Offline" : "Start Adventure"}
              </button>
            </div>
          )}

          {loading && (
            <div className="space-y-4">
              <div className="w-full aspect-video bg-rose-100 rounded-2xl animate-pulse flex items-center justify-center">
                <Sparkles size={48} className="text-rose-300 animate-spin" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-rose-200 rounded-full w-3/4 mx-auto animate-pulse" />
                <div className="h-4 bg-rose-200 rounded-full w-1/2 mx-auto animate-pulse" />
              </div>
            </div>
          )}

          {storyPart && (
            <div className="space-y-6">
              {imageUrl && (
                <motion.img 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={imageUrl} 
                  alt="Story scene" 
                  className="w-full aspect-video object-cover rounded-2xl shadow-lg border-2 border-white"
                  referrerPolicy="no-referrer"
                />
              )}
              
              <p className="text-2xl font-bold text-rose-900 leading-relaxed italic">
                "{storyPart.text.replace("[BLANK]", "_______")}"
              </p>

              <div className="grid gap-3">
                {storyPart.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    disabled={selected !== null}
                    className={`p-4 rounded-2xl font-bold text-lg border-2 transition-all ${
                      selected === idx 
                        ? (isCorrect ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-rose-500 border-rose-500 text-white')
                        : (selected !== null && idx === storyPart.correctIndex ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-white border-rose-200 text-rose-700')
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {selected !== null && (
                <button 
                  onClick={generateStory}
                  className="w-full bg-rose-500 text-white py-4 rounded-2xl font-bold shadow-lg"
                >
                  Next Adventure
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
