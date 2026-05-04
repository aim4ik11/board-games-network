import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

export type SuggestionMultiSelectOption = {
  id: string;
  label: string;
  description?: string | null;
  avatarUrl?: string | null;
};

type SuggestionMultiSelectProps = {
  options: SuggestionMultiSelectOption[];
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  searchPlaceholder?: string;
  emptyText?: string;
  selectedEmptyText?: string;
  loading?: boolean;
};

export function SuggestionMultiSelect({
  options,
  selectedIds,
  onChange,
  searchPlaceholder = 'Search...',
  emptyText = 'No options found.',
  selectedEmptyText = 'No items selected.',
  loading = false,
}: SuggestionMultiSelectProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onEscape);
    };
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return options;
    }
    return options.filter((option) => {
      return (
        option.label.toLowerCase().includes(normalized) ||
        option.description?.toLowerCase().includes(normalized)
      );
    });
  }, [options, query]);

  const selectedOptions = useMemo(() => {
    const byId = new Map(options.map((option) => [option.id, option]));
    return selectedIds
      .map((id) => byId.get(id))
      .filter(
        (option): option is SuggestionMultiSelectOption => option != null,
      );
  }, [options, selectedIds]);

  const toggle = (optionId: string) => {
    if (selectedSet.has(optionId)) {
      onChange(selectedIds.filter((id) => id !== optionId));
      return;
    }
    onChange([...selectedIds, optionId]);
  };

  const safeHighlightedIndex =
    filteredOptions.length === 0
      ? 0
      : Math.min(highlightedIndex, filteredOptions.length - 1);

  const selectByIndex = (index: number) => {
    const option = filteredOptions[index];
    if (!option) {
      return;
    }
    toggle(option.id);
  };

  return (
    <div className="base-multi-select" ref={rootRef}>
      <div className="base-multi-select-input-wrap">
        <input
          ref={inputRef}
          className="input base-multi-select-input"
          value={query}
          placeholder={searchPlaceholder}
          onMouseDown={(event) => {
            event.preventDefault();
            if (isOpen) {
              setIsOpen(false);
              inputRef.current?.blur();
              return;
            }
            setIsOpen(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              if (!isOpen) {
                setIsOpen(true);
                return;
              }
              setHighlightedIndex((prev) =>
                Math.min(prev + 1, Math.max(filteredOptions.length - 1, 0)),
              );
              return;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              if (!isOpen) {
                setIsOpen(true);
                return;
              }
              setHighlightedIndex((prev) => Math.max(prev - 1, 0));
              return;
            }
            if (event.key === 'Enter' && isOpen) {
              event.preventDefault();
              selectByIndex(safeHighlightedIndex);
              return;
            }
            if (event.key === 'Escape' && isOpen) {
              event.preventDefault();
              setIsOpen(false);
              inputRef.current?.blur();
            }
          }}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        />
        <button
          type="button"
          className="base-multi-select-chevron"
          aria-label={isOpen ? 'Close options' : 'Open options'}
          onMouseDown={(event) => {
            event.preventDefault();
            if (isOpen) {
              setIsOpen(false);
              inputRef.current?.blur();
              return;
            }
            setIsOpen(true);
            inputRef.current?.focus();
          }}
        >
          {isOpen ? (
            <ChevronUp size={16} aria-hidden="true" />
          ) : (
            <ChevronDown size={16} aria-hidden="true" />
          )}
        </button>
        {isOpen && (
          <div className="base-multi-select-dropdown">
            {loading && <p className="muted">Loading…</p>}
            {!loading && filteredOptions.length === 0 && (
              <p className="muted">{emptyText}</p>
            )}
            {!loading &&
              filteredOptions.map((option, index) => {
                const selected = selectedSet.has(option.id);
                const initial =
                  option.label.trim().charAt(0).toUpperCase() || '?';
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`base-multi-select-option${selected ? ' is-selected' : ''}${index === safeHighlightedIndex ? ' is-highlighted' : ''}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => toggle(option.id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span className="base-multi-select-option-user">
                      {option.avatarUrl ? (
                        <img
                          className="base-multi-select-option-avatar"
                          src={option.avatarUrl}
                          alt={option.label}
                        />
                      ) : (
                        <span className="base-multi-select-option-avatar base-multi-select-option-avatar-placeholder">
                          {initial}
                        </span>
                      )}
                      <span className="base-multi-select-option-main">
                        {option.label}
                      </span>
                    </span>
                    {option.description && (
                      <span className="base-multi-select-option-meta muted">
                        {option.description}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        )}
      </div>
      <div className="base-multi-select-badges">
        {selectedOptions.length === 0 && (
          <p className="muted">{selectedEmptyText}</p>
        )}
        {selectedOptions.map((option) => (
          <span key={option.id} className="base-multi-select-badge">
            <span>{option.label}</span>
            <button
              type="button"
              className="base-multi-select-badge-remove"
              onClick={() => toggle(option.id)}
              aria-label={`Remove ${option.label}`}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
