'use client';

import { useState, useCallback } from 'react';

interface FlipCardProps {
  word: string;
  phonetic: string | null;
  audioUrl: string | null;
  definition: string;
  ukrainianTranslation: string | null;
  partOfSpeech: string | null;
  frequencyRank: number | null;
  examples: string[];
  onRate: (quality: number) => void;
  isLoading?: boolean;
}

function getFrequencyBadge(rank: number | null): {
  label: string;
  className: string;
} {
  if (rank === null) return { label: 'Unknown', className: 'bg-gray-500/15 text-gray-400 border-gray-500/20' };
  if (rank <= 3000) return { label: 'Must Know', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' };
  if (rank <= 10000) return { label: 'Common', className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' };
  return { label: 'Rare', className: 'bg-gray-500/15 text-gray-400 border-gray-500/20' };
}

function FrequencyBadge({ rank }: { rank: number | null }) {
  const badge = getFrequencyBadge(rank);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {badge.label}
      {rank !== null && (
        <span className="opacity-60">#{rank.toLocaleString()}</span>
      )}
    </span>
  );
}

const ratingConfig = [
  {
    quality: 0,
    label: 'Again',
    sublabel: '<1d',
    className: 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40',
  },
  {
    quality: 1,
    label: 'Hard',
    sublabel: '~3d',
    className: 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/40',
  },
  {
    quality: 2,
    label: 'Good',
    sublabel: '~7d',
    className: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40',
  },
  {
    quality: 3,
    label: 'Easy',
    sublabel: '~14d',
    className: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/40',
  },
];

export default function FlipCard({
  word,
  phonetic,
  audioUrl,
  definition,
  ukrainianTranslation,
  partOfSpeech,
  frequencyRank,
  examples,
  onRate,
  isLoading = false,
}: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleSpeak = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      // Try audio URL first
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play().catch(() => {
          // Fall back to Web Speech API
          speakWithWebSpeech();
        });
        return;
      }

      speakWithWebSpeech();
    },
    [audioUrl, word]
  );

  const speakWithWebSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      utterance.pitch = 1;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  }, [word]);

  const handleRate = useCallback(
    (e: React.MouseEvent, quality: number) => {
      e.stopPropagation();
      onRate(quality);
    },
    [onRate]
  );

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* Card */}
      <div
        className="flip-card-container w-full max-w-2xl"
        style={{ height: '380px' }}
      >
        <div
          className={`flip-card-inner cursor-pointer ${isFlipped ? 'flipped' : ''}`}
          onClick={handleFlip}
        >
          {/* Front */}
          <div className="flip-card-front bg-[#1a1a1a] border border-[#2a2a2a] flex flex-col items-center justify-center p-8 select-none">
            {/* Frequency badge */}
            <div className="absolute top-5 left-5">
              <FrequencyBadge rank={frequencyRank} />
            </div>

            {/* Part of speech */}
            {partOfSpeech && (
              <div className="absolute top-5 right-5">
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {partOfSpeech}
                </span>
              </div>
            )}

            {/* Word */}
            <div className="text-center">
              <h2 className="text-5xl font-bold tracking-tight text-white mb-3">
                {word}
              </h2>

              {/* Phonetic + Audio */}
              <div className="flex items-center justify-center gap-3 mt-2">
                {phonetic && (
                  <span className="text-gray-400 text-lg font-light">{phonetic}</span>
                )}
                <button
                  onClick={handleSpeak}
                  className={`
                    flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200
                    ${isSpeaking
                      ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                      : 'bg-white/5 border-[#3a3a3a] text-gray-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400'
                    }
                  `}
                  title="Pronounce word"
                  aria-label="Play pronunciation"
                >
                  {isSpeaking ? (
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                      <path d="M18.5 12A6.5 6.5 0 0 0 15 6.23V4.18A8.5 8.5 0 0 1 20.5 12a8.5 8.5 0 0 1-5.5 7.82v-2.05A6.5 6.5 0 0 0 18.5 12zM3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1-3.29-2.5-4.03V16c1.5-.71 2.5-2.24 2.5-4z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Flip hint */}
            <div className="absolute bottom-5 left-0 right-0 flex justify-center">
              <span className="text-xs text-gray-600 flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 6.186-3.286.075zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
                </svg>
                Click to reveal definition
              </span>
            </div>
          </div>

          {/* Back */}
          <div className="flip-card-back bg-[#1a1a1a] border border-[#2a2a2a] flex flex-col justify-between p-8 select-none">
            <div className="flex-1 overflow-y-auto">
              {/* Word reminder */}
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-xl font-semibold text-white">{word}</span>
                {partOfSpeech && (
                  <span className="text-sm text-indigo-400 font-medium">{partOfSpeech}</span>
                )}
              </div>

              {/* Ukrainian translation */}
              {ukrainianTranslation && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Переклад</p>
                  <p className="text-indigo-300 text-xl font-semibold leading-relaxed">{ukrainianTranslation}</p>
                </div>
              )}

              {/* Definition */}
              <div className="mb-5">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Definition</p>
                <p className="text-gray-200 text-base leading-relaxed">{definition}</p>
              </div>

              {/* Examples */}
              {examples.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Examples</p>
                  <ul className="space-y-2">
                    {examples.slice(0, 3).map((ex, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-gray-400 leading-relaxed">
                        <span className="text-indigo-500 mt-0.5 shrink-0">›</span>
                        <span className="italic">{ex}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rating buttons - show after flip */}
      <div
        className={`w-full max-w-2xl transition-all duration-300 ${
          isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <p className="text-center text-xs text-gray-600 mb-3 uppercase tracking-wider font-medium">
          How well did you know this?
        </p>
        <div className="grid grid-cols-4 gap-3">
          {ratingConfig.map((rating) => (
            <button
              key={rating.quality}
              onClick={(e) => handleRate(e, rating.quality)}
              disabled={isLoading}
              className={`
                rating-btn flex flex-col items-center gap-1 py-3 px-2 rounded-xl border font-medium
                transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                ${rating.className}
              `}
            >
              <span className="text-sm font-semibold">{rating.label}</span>
              <span className="text-xs opacity-60">{rating.sublabel}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
