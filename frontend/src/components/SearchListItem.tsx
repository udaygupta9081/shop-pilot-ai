import { FaMagnifyingGlass } from "react-icons/fa6";

export interface SearchListItemProps {
  label: string;
  onSelect: (label: string) => void;
  showArrow?: boolean;
}

/**
 * A single clickable row used for "RECENT", "POPULAR" and suggestion
 * lists on the Search page. Kept as one reusable component instead of
 * duplicating the row markup in three places.
 */
const SearchListItem = ({
  label,
  onSelect,
  showArrow = true,
}: SearchListItemProps) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(label)}
      className="group w-full flex items-center justify-between gap-3 py-3 px-2 rounded-lg text-left border-b border-gray-100 last:border-none hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 cursor-pointer"
    >
      <span className="flex items-center gap-3 min-w-0">
        <FaMagnifyingGlass className="text-gray-400 text-sm shrink-0" />
        <span className="text-sm sm:text-base text-black font-medium truncate">
          {label}
        </span>
      </span>
      {showArrow && (
        <span className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0">
          ↗
        </span>
      )}
    </button>
  );
};

export default SearchListItem;
