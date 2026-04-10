'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import FlipCard from '@/components/FlipCard';
import AddWordModal from '@/components/AddWordModal';

interface WordWithReview {
  id: number;
  word: string;
  phonetic: string | null;
  audio_url: string | null;
  definition: string;
  ukrainian_translation: string | null;
  part_of_speech: string | null;
  frequency_rank: number | null;
  examples: string | null;
  review_id: number;
  ease_factor: number;
  interval_days: number;
  due_date: string;
  repetitions: number;
}

function parseExamples(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ReviewPage() {
  const [dueWords, setDueWords] = useState<WordWithReview[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRating, setIsRating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [cardKey, setCardKey] = useState(0); // Force remount on card change

  const fetchDueWords = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/review');
      const data = await res.json();
      if (Array.isArray(data)) {
        setDueWords(data);
        setTotalCount(data.length);
        setCurrentIndex(0);
        setReviewedCount(0);
        setIsComplete(data.length === 0);
        setCardKey((k) => k + 1);
      }
    } catch (err) {
      console.error('Failed to fetch due words:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDueWords();
  }, [fetchDueWords]);

  const handleRate = useCallback(
    async (quality: number) => {
      const currentWord = dueWords[currentIndex];
      if (!currentWord || isRating) return;

      setIsRating(true);
      try {
        await fetch('/api/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wordId: currentWord.id,
            quality,
          }),
        });

        const nextIndex = currentIndex + 1;
        setReviewedCount((c) => c + 1);

        if (nextIndex >= dueWords.length) {
          setIsComplete(true);
        } else {
          setCurrentIndex(nextIndex);
          setCardKey((k) => k + 1);
        }
      } catch (err) {
        console.error('Failed to submit review:', err);
      } finally {
        setIsRating(false);
      }
    },
    [currentIndex, dueWords, isRating]
  );

  const currentWord = dueWords[currentIndex];
  const progress = totalCount > 0 ? (reviewedCount / totalCount) * 100 : 0;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="shimmer h-6 w-36 rounded-lg" />
            <div className="shimmer h-4 w-24 rounded-lg" />
          </div>
          <div className="shimmer h-5 w-20 rounded-lg" />
        </div>
        <div className="shimmer h-2 w-full rounded-full" />
        <div className="shimmer w-full rounded-2xl" style={{ height: '380px' }} />
        <div className="shimmer w-full h-14 rounded-xl" />
        <div className="shimmer w-full h-14 rounded-xl" />
        <div className="shimmer w-full h-14 rounded-xl" />
      </div>
    );
  }

  if (isComplete) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="mb-8">
            {/* Celebration icon */}
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 animate-pulse-slow">
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {reviewedCount > 0 ? (
              <>
                <h1 className="text-3xl font-bold text-white mb-3">Session Complete!</h1>
                <p className="text-gray-400 text-lg">
                  You reviewed{' '}
                  <span className="text-emerald-400 font-semibold">{reviewedCount}</span>{' '}
                  {reviewedCount === 1 ? 'card' : 'cards'} today.
                </p>
                <p className="text-gray-600 text-sm mt-2">
                  Great work! Keep your streak going tomorrow.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-white mb-3">All caught up!</h1>
                <p className="text-gray-400 text-lg">
                  No cards are due for review right now.
                </p>
                <p className="text-gray-600 text-sm mt-2">
                  Add more words or come back later to review.
                </p>
              </>
            )}
          </div>

          {/* Stats summary */}
          {reviewedCount > 0 && (
            <div className="flex items-center gap-8 mb-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{reviewedCount}</p>
                <p className="text-xs text-gray-600 mt-1">Reviewed</p>
              </div>
              <div className="w-px h-10 bg-[#2a2a2a]" />
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-400">100%</p>
                <p className="text-xs text-gray-600 mt-1">Complete</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 text-sm font-medium hover:border-[#3a3a3a] hover:text-white transition-colors"
            >
              Back to Dashboard
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 transition-colors btn-glow"
            >
              Add New Word
            </button>
          </div>
        </div>
        <AddWordModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onWordAdded={() => {
            fetchDueWords();
          }}
        />
      </>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Review Session</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {currentIndex + 1} of {totalCount} cards
          </p>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          End session
        </Link>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-gray-600">{reviewedCount} reviewed</span>
          <span className="text-xs text-gray-600">{totalCount - reviewedCount} remaining</span>
        </div>
      </div>

      {/* Flip card */}
      {currentWord && (
        <FlipCard
          key={cardKey}
          word={currentWord.word}
          phonetic={currentWord.phonetic}
          audioUrl={currentWord.audio_url}
          definition={currentWord.definition}
          ukrainianTranslation={currentWord.ukrainian_translation}
          partOfSpeech={currentWord.part_of_speech}
          frequencyRank={currentWord.frequency_rank}
          examples={parseExamples(currentWord.examples)}
          onRate={handleRate}
          isLoading={isRating}
        />
      )}

      {/* Keyboard shortcut hint */}
      <p className="text-center text-xs text-gray-700 mt-6">
        Click card to flip · Rate with the buttons below
      </p>
    </div>
  );
}
