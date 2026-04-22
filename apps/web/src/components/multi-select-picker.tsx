import { useEffect, useMemo, useRef, useState } from "react";

export type MultiSelectOption = {
  id: string;
  label: string;
  description?: string | null;
  avatarUrl?: string | null;
};

type MultiSelectPickerProps = {
  options: MultiSelectOption[];
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
};

export function MultiSelectPicker({
  options,
  selectedIds,
  onChange,
  placeholder,
  searchPlaceholder = "Search...",
  emptyText = "No options found.",
  loading = false,
}: MultiSelectPickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [isOpen]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

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
      .filter((option): option is MultiSelectOption => option != null);
  }, [options, selectedIds]);

  const toggle = (optionId: string) => {
    if (selectedSet.has(optionId)) {
      onChange(selectedIds.filter((id) => id !== optionId));
      return;
    }
    onChange([...selectedIds, optionId]);
  };

  return (
    <div className="base-multi-select" ref={rootRef}>
      <input
        className="input"
        value={query}
        placeholder={searchPlaceholder}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
      />
      {isOpen && (
        <div className="base-multi-select-dropdown">
          {loading && <p className="muted">Loading…</p>}
          {!loading && filteredOptions.length === 0 && (
            <p className="muted">{emptyText}</p>
          )}
          {!loading &&
            filteredOptions.map((option) => {
              const selected = selectedSet.has(option.id);
              const initial = option.label.trim().charAt(0).toUpperCase() || "?";
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`base-multi-select-option${selected ? " is-selected" : ""}`}
                  onClick={() => toggle(option.id)}
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
                  {option.description && <span className="muted">{option.description}</span>}
                </button>
              );
            })}
        </div>
      )}
      <div className="base-multi-select-badges">
        {selectedOptions.length === 0 && (
          <p className="muted">{placeholder}</p>
        )}
        {selectedOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className="base-multi-select-badge"
            onClick={() => toggle(option.id)}
          >
            {option.label} <span aria-hidden="true">×</span>
          </button>
        ))}
      </div>
    </div>
  );
}
