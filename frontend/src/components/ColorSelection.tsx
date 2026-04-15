import { useEffect, useMemo, useState } from 'react';
import { COLOR_GROUPS, ALL_COLORS, ColorOption, ColorGroup } from '../lib/colorConstants';

const RECENT_COLORS_STORAGE_KEY = 'design_recent_colors';
const MAX_RECENT_COLORS = 12;

const normalizeHex = (value: string) => {
  if (!value) return '#000000';
  const hex = value.trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(hex)) return hex;
  return '#000000';
};

const getPresetColorByHex = (hex: string) => {
  return ALL_COLORS.find((item) => item.hex.toUpperCase() === hex.toUpperCase());
};

const getStoredRecentColors = () => {
  if (typeof window === 'undefined') return [] as ColorOption[];

  try {
    const raw = window.localStorage.getItem(RECENT_COLORS_STORAGE_KEY); 
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is ColorOption => (
        !!item && typeof item.name === 'string' && typeof item.hex === 'string'
      ))
      .map((item) => ({
        name: item.name.trim(),
        hex: normalizeHex(item.hex)
      }))
      .filter((item) => item.name.length > 0);
  } catch {
    return [];
  }
};

const persistRecentColors = (colors: ColorOption[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(RECENT_COLORS_STORAGE_KEY, JSON.stringify(colors));
};

interface ColorSelectionProps {
  value: {
    color_name: string;
    color_code: string;
  };
  onChange: (next: { color_name: string; color_code: string }) => void;
}

export function ColorSelection({ value, onChange }: ColorSelectionProps) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [recentColors, setRecentColors] = useState<ColorOption[]>([]);
  const [customColorName, setCustomColorName] = useState('');

  const normalizedColorCode = useMemo(() => normalizeHex(value.color_code), [value.color_code]);
  const selectedPresetColor = useMemo(() => getPresetColorByHex(normalizedColorCode), [normalizedColorCode]);
  const isCustomSelected = !selectedPresetColor;

  useEffect(() => {
    setRecentColors(getStoredRecentColors());
  }, []);

  useEffect(() => {
    if (selectedPresetColor) {
      setCustomColorName('');
      return;
    }

    if (value.color_name && value.color_name !== 'Custom Color') {
      setCustomColorName(value.color_name);
      return;
    }

    setCustomColorName('');
  }, [selectedPresetColor, value.color_name, normalizedColorCode]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return COLOR_GROUPS;

    return COLOR_GROUPS
      .map((group) => ({
        ...group,
        colors: group.colors.filter((item) => item.name.toLowerCase().includes(query) || item.hex.toLowerCase().includes(query))
      }))
      .filter((group) => group.colors.length > 0);
  }, [search]);

  const handlePresetSelect = (selected: ColorOption) => {
    onChange({ color_name: selected.name, color_code: selected.hex });
    setShowModal(false);
  };

  const handleCustomColorSelect = (nextHex: string) => {
    const normalized = normalizeHex(nextHex);
    const presetMatch = getPresetColorByHex(normalized);
    const nextName = presetMatch?.name || customColorName.trim() || 'Custom Color';
    onChange({
      color_name: nextName,
      color_code: normalized
    });
  };

  const handleCustomNameChange = (nextName: string) => {
    setCustomColorName(nextName);
    if (!isCustomSelected) return;

    onChange({
      color_name: nextName.trim() || 'Custom Color',
      color_code: normalizedColorCode
    });
  };

  const handleSaveRecentColor = () => {
    if (!isCustomSelected) return;

    const trimmedName = customColorName.trim();
    if (!trimmedName) return;

    const nextColor = {
      name: trimmedName,
      hex: normalizedColorCode
    };

    const nextRecentColors = [
      nextColor,
      ...recentColors.filter((item) => item.hex !== nextColor.hex && item.name.toLowerCase() !== nextColor.name.toLowerCase())
    ].slice(0, MAX_RECENT_COLORS);

    setRecentColors(nextRecentColors);
    persistRecentColors(nextRecentColors);
    onChange({
      color_name: trimmedName,
      color_code: normalizedColorCode
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="w-full text-left rounded-lg border border-gray-100 bg-gray-50 p-2.5 hover:border-gray-300 transition"
        aria-label="Open color selector"
      >
        <div className="grid grid-cols-[56px_1fr] sm:grid-cols-[64px_1fr] items-center gap-3">
          <div
            className="h-14 w-14 sm:h-16 sm:w-16 rounded-lg border border-gray-300"
            style={{ backgroundColor: normalizedColorCode }}
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {value.color_name || 'Select a color'} <span className="text-gray-500">({normalizedColorCode})</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">Click shade to open color selector</p>
          </div>
        </div>
      </button>

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-700">Custom color</label>
        <input
          type="color"
          value={normalizedColorCode}
          onChange={(e) => handleCustomColorSelect(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-gray-300 bg-white"
          title="Choose custom color"
        />
      </div>

      {isCustomSelected && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customColorName}
              onChange={(e) => handleCustomNameChange(e.target.value)}
              placeholder="Add custom color name"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleSaveRecentColor}
              disabled={!customColorName.trim()}
              className="px-3 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-gray-500">Name your custom color and save it to recent colors.</p>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl bg-white shadow-xl border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">Choose Color Shade</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)] space-y-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by color name or hex"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />

              {recentColors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recent Colors</p>
                  <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 gap-2">
                    {recentColors.map((item) => {
                      const isSelected = item.hex.toUpperCase() === normalizedColorCode && value.color_name === item.name;
                      return (
                        <button
                          key={`recent-${item.name}-${item.hex}`}
                          type="button"
                          onClick={() => handlePresetSelect(item)}
                          title={`${item.name} (${item.hex})`}
                          aria-label={`${item.name} ${item.hex}`}
                          aria-pressed={isSelected}
                          className={`rounded-lg p-1.5 border transition focus:outline-none focus:ring-2 focus:ring-primary ${
                            isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <span className="block h-7 w-full rounded-md border border-black/10" style={{ backgroundColor: item.hex }} />
                          <span className="mt-1 block truncate text-[10px] text-gray-700">{item.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredGroups.length === 0 && (
                <p className="text-sm text-gray-500">No shades found.</p>
              )}

              {filteredGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{group.label}</p>
                  <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 gap-2">
                    {group.colors.map((item) => {
                      const isSelected = item.hex.toUpperCase() === normalizedColorCode;
                      return (
                        <button
                          key={`${group.label}-${item.name}-${item.hex}`}
                          type="button"
                          onClick={() => handlePresetSelect(item)}
                          title={`${item.name} (${item.hex})`}
                          aria-label={`${item.name} ${item.hex}`}
                          aria-pressed={isSelected}
                          className={`rounded-lg p-1.5 border transition focus:outline-none focus:ring-2 focus:ring-primary ${
                            isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <span className="block h-7 w-full rounded-md border border-black/10" style={{ backgroundColor: item.hex }} />
                          <span className="mt-1 block truncate text-[10px] text-gray-700">{item.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
