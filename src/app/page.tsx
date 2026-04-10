'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AddWordModal from '@/components/AddWordModal';

interface DashboardStats {
  dueToday: number;
  reviewedToday: number;
  streak: number;
  totalWords: number;
}

interface WordWithReview {
  id: number;
  word: string;
  phonetic: string | null;
  definition: string;
  part_of_speech: string | null;
  frequency_rank: number | null;
  due_date: string | null;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getFrequencyInfo(rank: number | null): { label: string; className: string } {
  if (rank === null) return { label: '', className: '' };
  if (rank <= 3000) return { label: 'Must Know', className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' };
  if (rank <= 10000) return { label: 'Common', className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' };
  return { label: 'Rare', className: 'bg-gray-500/10 text-gray-500 border border-gray-500/20' };
}

function StatCard({
  label,
  value,
  icon,
  colorClass,
  bgClass,
  sublabel,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  sublabel?: string;
}) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 card-hover">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className={`text-4xl font-bold mt-1 ${colorClass}`}>{value}</p>
          {sublabel && <p className="text-xs text-gray-600 mt-1">{sublabel}</p>}
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 ${bgClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentWords, setRecentWords] = useState<WordWithReview[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, wordsRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/words'),
      ]);
      const statsData: DashboardStats = await statsRes.json();
      const wordsData: WordWithReview[] = await wordsRes.json();
      setStats(statsData);
      setRecentWords(wordsData.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleWordAdded = useCallback(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-[#2a2a2a] rounded-xl w-64" />
        <div className="h-4 bg-[#1a1a1a] rounded-lg w-40" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 shimmer rounded-2xl" />
          ))}
        </div>
        <div className="h-16 shimmer rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 shimmer rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const dueToday = stats?.dueToday ?? 0;

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {getGreeting()}, Learner
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 transition-colors btn-glow shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add New Word
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Due Today"
            value={stats?.dueToday ?? 0}
            colorClass="text-amber-400"
            bgClass="bg-amber-500/10"
            sublabel="cards to review"
            icon={
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            }
          />
          <StatCard
            label="Reviewed Today"
            value={stats?.reviewedToday ?? 0}
            colorClass="text-emerald-400"
            bgClass="bg-emerald-500/10"
            sublabel="cards completed"
            icon={
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Streak"
            value={`${stats?.streak ?? 0} 🔥`}
            colorClass="text-indigo-400"
            bgClass="bg-indigo-500/10"
            sublabel={stats?.streak === 1 ? 'day in a row' : 'days in a row'}
            icon={
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
              </svg>
            }
          />
          <StatCard
            label="Total Words"
            value={stats?.totalWords ?? 0}
            colorClass="text-gray-300"
            bgClass="bg-[#2a2a2a]"
            sublabel="in your library"
            icon={
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            }
          />
        </div>

        {/* Start Review — prominent CTA when words are due */}
        {dueToday > 0 && (
          <Link
            href="/review"
            className="flex items-center justify-between gap-4 p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/15 hover:border-indigo-500/40 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/20 group-hover:bg-indigo-500/30 transition-colors">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold text-white">Start Review Session</p>
                <p className="text-sm text-gray-400 mt-0.5">Your cards are ready — let's go!</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="inline-flex items-center justify-center min-w-[2.25rem] h-9 px-3 rounded-full bg-indigo-500 text-white text-sm font-bold">
                {dueToday}
              </span>
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-indigo-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </Link>
        )}

        {/* Add Word banner when nothing is due */}
        {dueToday === 0 && (stats?.totalWords ?? 0) > 0 && (
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
            <div className="p-2.5 rounded-xl bg-emerald-500/10">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-emerald-300">All caught up!</p>
              <p className="text-sm text-gray-500 mt-0.5">No reviews due. Check back tomorrow or add new words.</p>
            </div>
          </div>
        )}

        {/* Recent words */}
        {recentWords.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Words</h2>
              <Link
                href="/words"
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                View all
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentWords.map((word) => {
                const freq = getFrequencyInfo(word.frequency_rank);
                return (
                  <div
                    key={word.id}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 card-hover"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white capitalize truncate">{word.word}</h3>
                        {word.phonetic && (
                          <span className="text-xs text-gray-500 font-light">{word.phonetic}</span>
                        )}
                      </div>
                      {freq.label && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${freq.className}`}>
                          {freq.label}
                        </span>
                      )}
                    </div>
                    {word.part_of_speech && (
                      <span className="inline-block text-xs text-indigo-400 mb-2">{word.part_of_speech}</span>
                    )}
                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                      {word.definition}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {recentWords.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-5">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Your library is empty</h3>
            <p className="text-gray-600 text-sm mb-6 max-w-sm leading-relaxed">
              Start by adding some words to learn. We'll fetch definitions automatically from the dictionary.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 transition-colors btn-glow"
            >
              Add your first word
            </button>
          </div>
        )}
      </div>

      <AddWordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onWordAdded={handleWordAdded}
      />
    </>
  );
}
