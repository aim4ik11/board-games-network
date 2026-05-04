import { SuggestionMultiSelect, type SuggestionMultiSelectOption } from './ui';

export type MultiSelectOption = SuggestionMultiSelectOption;

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
  searchPlaceholder = 'Search...',
  emptyText = 'No options found.',
  loading = false,
}: MultiSelectPickerProps) {
  return (
    <SuggestionMultiSelect
      options={options}
      selectedIds={selectedIds}
      onChange={onChange}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      selectedEmptyText={placeholder}
      loading={loading}
    />
  );
}
