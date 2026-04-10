'use client';

import { useState, useRef, useEffect } from 'react';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWordAdded: () => void;
}

export default function AddWordModal({ isOpen, onClose, onWordAdded }: AddWordModalProps) {
  const [word, setWord] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setWord('');
      setError(null);
      setSuccess(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = word.trim().toLowerCase();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to add word. Please try again.');
        return;
      }

      setSuccess(`"${data.word}" added successfully!`);
      setWord('');
      onWordAdded();

      // Auto-close after short delay
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 modal-backdrop" />

      {/* Modal */}
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Add New Word</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                We'll fetch the definition automatically
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                English Word
              </label>
              <input
                ref={inputRef}
                type="text"
                value={word}
                onChange={(e) => {
                  setWord(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. serendipity"
                className="
                  w-full px-4 py-3 rounded-xl bg-[#0f0f0f] border border-[#3a3a3a]
                  text-white placeholder-gray-600 text-base
                  focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30
                  transition-all duration-150
                "
                disabled={isLoading}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-emerald-400">{success}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !word.trim()}
              className="
                w-full py-3 px-4 rounded-xl font-semibold text-sm
                bg-indigo-500 text-white
                hover:bg-indigo-400 active:bg-indigo-600
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-150 btn-glow
                flex items-center justify-center gap-2
              "
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Fetching definition...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Word
                </>
              )}
            </button>
          </form>

          {/* Info footer */}
          <p className="text-xs text-gray-600 text-center mt-4">
            Powered by Free Dictionary API · Definitions saved locally
          </p>
        </div>
      </div>
    </div>
  );
}
