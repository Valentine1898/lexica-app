'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import AddWordModal from '@/components/AddWordModal';

interface WordWithReview {
  id: number;
  word: string;
  phonetic: string | null;
  audio_url: string | null;
  definition: string;
  part_of_speech: string | null;
  frequency_rank: number | null;
  examples: string | null;
  created_at: string;
  due_date: string | null;
  ease_factor: number | null;
  interval_days: number | null;
  repetitions: number | null;
}

function getFrequencyBadge(rank: number | null): { label: string; className: string } {
  if (rank === null) return { label: '', className: '' };
  if (rank <= 3000)
    return { label: 'Must Know', className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' };
  if (rank <= 10000)
    return { label: 'Common', className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' };
  return { label: 'Rare', className: 'bg-gray-500/10 text-gray-500 border border-gray-500/20' };
}

function getDueDatePill(dateStr: string | null): { label: string; className: string } {
  if (!dateStr) return { label: 'New', className: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' };
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0)
    return { label: 'Due today', className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' };
  if (diff === 1)
    return { label: 'Due tomorrow', className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' };
  if (diff < 7)
    return {
      label: `In ${diff}d`,
      className: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
    };
  return {
    label: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    className: 'bg-gray-500/10 text-gray-500 border border-gray-500/20',
  };
}

function WordCard({
  word,
  onDelete,
}: {
  word: WordWithReview;
  onDelete: (id: number) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const freq = getFrequencyBadge(word.frequency_rank);
  const due = getDueDatePill(word.due_date);

  const handleDelete = async () => {
    if (!window.confirm(`Remove "${word.word}" from your word list?`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/words/${word.id}`, { method: 'DELETE' });
      if (res.ok) {
        onDelete(word.id);
      }
    } catch (err) {
      console.error('Failed to delete word:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 card-hover flex flex-col gap-3">
      {/* Top row: word + delete */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-white capitalize leading-tight">{word.word}</h3>
          {word.phonetic && (
            <span className="text-sm text-gray-500 font-light mt-0.5 block">{word.phonetic}</span>
          )}
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 shrink-0 mt-0.5"
          title="Delete word"
          aria-label={`Delete ${word.word}`}
        >
          {isDeleting ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          )}
        </button>
      </div>

      {/* Badges row: part of speech + frequency */}
      <div className="flex items-center gap-2 flex-wrap">
        {word.part_of_speech && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {word.part_of_speech}
          </span>
        )}
        {freq.label && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${freq.className}`}>
            {freq.label}
          </span>
        )}
      </div>

      {/* Definition */}
      <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 flex-1">
        {word.definition}
      </p>

      {/* Footer: due date pill */}
      <div className="flex items-center justify-between pt-2 border-t border-[#2a2a2a]">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${due.className}`}>
          {due.label}
        </span>
        {word.repetitions !== null && word.repetitions > 0 && (
          <span className="text-xs text-gray-700">
            {word.repetitions} review{word.repetitions !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

export default function WordsPage() {
  const [words, setWords] = useState<WordWithReview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchWords = useCallback(async () => {
    try {
      const res = await fetch('/api/words');
      const data = await res.json();
      if (Array.isArray(data)) {
        setWords(data);
      }
    } catch (err) {
      console.error('Failed to fetch words:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  const handleDelete = useCallback((id: number) => {
    setWords((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const filteredWords = useMemo(() => {
    if (!searchQuery.trim()) return words;
    const q = searchQuery.toLowerCase().trim();
    return words.filter(
      (w) =>
        w.word.toLowerCase().includes(q) ||
        w.definition.toLowerCase().includes(q) ||
        (w.part_of_speech && w.part_of_speech.toLowerCase().includes(q))
    );
  }, [words, searchQuery]);

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">My Words</h1>
            <p className="text-gray-500 text-sm mt-1">
              {isLoading ? (
                <span className="inline-block shimmer h-4 w-24 rounded" />
              ) : (
                `${words.length} word${words.length !== 1 ? 's' : ''} in your collection`
              )}
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 transition-colors btn-glow w-fit shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Word
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search words or definitions..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-150"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Loading shimmer skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shimmer rounded-xl h-44" />
            ))}
          </div>
        )}

        {/* Word grid */}
        {!isLoading && filteredWords.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWords.map((word) => (
              <WordCard key={word.id} word={word} onDelete={handleDelete} />
            ))}
          </div>
        )}

        {/* Empty state — no words at all */}
        {!isLoading && words.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-5">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">No words yet</h3>
            <p className="text-gray-600 text-sm mb-6 max-w-sm leading-relaxed">
              Add words to start building your vocabulary library.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 transition-colors btn-glow"
            >
              Add your first word
            </button>
          </div>
        )}

        {/* Empty state — no search results */}
        {!isLoading && words.length > 0 && filteredWords.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <p className="text-gray-400 font-medium mb-1">No results for "{searchQuery}"</p>
            <p className="text-gray-600 text-sm">Try a different search term</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      <AddWordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onWordAdded={fetchWords}
      />
    </>
  );
}
