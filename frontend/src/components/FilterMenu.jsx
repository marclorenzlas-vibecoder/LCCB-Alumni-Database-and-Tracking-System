import React from 'react';

const FilterMenu = ({
  menuRef,
  isOpen,
  setIsOpen,
  buttonLabel,
  selectedLabel,
  selectedValue,
  selectedValues,
  icon,
  sections,
  onSelect,
  multiSelect = false,
  panelTitle,
  panelSubtitle = 'Choose an option',
  panelWidthClass = 'w-80',
  panelMaxHeightClass = 'max-h-80',
  alignClass = 'right-0'
}) => {
  const hasSelection = multiSelect
    ? (selectedValues && selectedValues.length > 0)
    : selectedLabel !== buttonLabel;

  const displayLabel = multiSelect
    ? (selectedValues && selectedValues.length > 0
      ? `${selectedValues.length} selected`
      : buttonLabel)
    : selectedLabel;

  return (
    <div ref={menuRef} className={`relative ${panelWidthClass}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm transition hover:border-gray-400 ${hasSelection ? 'text-gray-900' : 'text-gray-700'} focus:outline-none focus:border-blue-500 focus:ring-0`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600">
            {icon}
          </span>
          <span className="truncate text-left">{displayLabel}</span>
        </span>
        {multiSelect && selectedValues && selectedValues.length > 0 ? (
          <span className="inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
            {selectedValues.length}
          </span>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className={`dropdown-menu-panel absolute ${alignClass} top-full z-50 mt-2 ${panelWidthClass} overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl`}>
          {panelTitle && (
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">{panelTitle}</p>
            </div>
          </div>
          )}

          <div className={`overflow-y-auto p-2.5 scrollbar-hide ${panelMaxHeightClass}`}>
            <div className="space-y-3.5">
              {sections.map((section) => (
                <div key={section.key} className="pb-3.5 last:pb-0">
                  {section.title && (
                  <div className="mb-2.5 flex items-center gap-3">
                    <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">{section.title}</span>
                    <span className="h-px flex-1 bg-gray-100" />
                  </div>
                  )}
                  <div className={section.gridClassName || 'grid gap-2'}>
                    {section.items.map((item) => {
                      const isSelected = multiSelect
                        ? (selectedValues || []).includes(item.value)
                        : item.value === selectedValue;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => onSelect(item.value)}
                          className={`dropdown-menu-item rounded-xl border px-3 py-2 text-left transition ${isSelected ? 'border-blue-300 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/60'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-gray-900">{item.label}</div>
                              {item.description && (
                                <p className="mt-1 truncate text-xs leading-snug text-gray-500">{item.description}</p>
                              )}
                            </div>
                            {multiSelect ? (
                              <span className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border-2 transition ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}>
                                {isSelected && (
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-white">
                                    <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.42 0l-3.2-3.2a1 1 0 111.42-1.42l2.49 2.49 6.49-6.49a1 1 0 011.42 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </span>
                            ) : isSelected ? (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-blue-700">
                                <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.42 0l-3.2-3.2a1 1 0 111.42-1.42l2.49 2.49 6.49-6.49a1 1 0 011.42 0z" clipRule="evenodd" />
                              </svg>
                            ) : null}
                          </div>
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
};

export default FilterMenu;
