import React from 'react';

const FilterMenu = ({
  menuRef,
  isOpen,
  setIsOpen,
  buttonLabel,
  selectedLabel,
  selectedValue,
  icon,
  sections,
  onSelect,
  panelTitle,
  panelSubtitle = 'Choose an option',
  panelWidthClass = 'w-80',
  panelMaxHeightClass = 'max-h-80',
  alignClass = 'right-0'
}) => {
  const hasSelection = selectedLabel !== buttonLabel;

  return (
    <div ref={menuRef} className={`relative ${panelWidthClass}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-3 rounded-lg border-0 bg-white px-3 py-2.5 text-sm shadow-sm ring-1 ring-inset transition ${hasSelection ? 'ring-blue-900 text-gray-900' : 'ring-gray-300 text-gray-700'} focus:outline-none focus:ring-2 focus:ring-blue-900`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600">
            {icon}
          </span>
          <span className="truncate text-left">{selectedLabel}</span>
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className={`dropdown-menu-panel absolute ${alignClass} top-full z-50 mt-2 ${panelWidthClass} overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl`}>
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">{panelTitle}</p>
            </div>
          </div>

          <div className={`overflow-y-auto p-2.5 scrollbar-hide ${panelMaxHeightClass}`}>
            <div className="space-y-3.5">
              {sections.map((section) => (
                <div key={section.key} className="border-b border-gray-100 pb-3.5 last:border-b-0 last:pb-0">
                  <div className="mb-2.5 flex items-center gap-3">
                    <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">{section.title}</span>
                    <span className="h-px flex-1 bg-gray-100" />
                  </div>
                  <div className={section.gridClassName || 'grid gap-2'}>
                    {section.items.map((item) => {
                      const isSelected = item.value === selectedValue;
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
                            {isSelected && (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-blue-700">
                                <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.42 0l-3.2-3.2a1 1 0 111.42-1.42l2.49 2.49 6.49-6.49a1 1 0 011.42 0z" clipRule="evenodd" />
                              </svg>
                            )}
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
