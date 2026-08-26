import React, { useState, useEffect } from 'react';

const MobileFilterButton = ({
  buttonLabel,
  selectedLabel,
  selectedValue,
  selectedValues = [],
  icon,
  sections,
  onSelect,
  onApply,
  onClear,
  multiSelect = false,
  panelTitle
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValues, setTempValues] = useState([]);

  useEffect(() => {
    if (isOpen && multiSelect) {
      setTempValues([...selectedValues]);
    }
  }, [isOpen, selectedValues, multiSelect]);

  const hasSelection = multiSelect
    ? (selectedValues && selectedValues.length > 0)
    : selectedLabel !== buttonLabel;

  const displayLabel = multiSelect
    ? (selectedValues && selectedValues.length > 0
      ? `${selectedValues.length} selected`
      : buttonLabel)
    : selectedLabel;

  const handleToggleOption = (value) => {
    if (multiSelect) {
      setTempValues((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
      );
    } else {
      onSelect(value);
      setIsOpen(false);
    }
  };

  const handleApply = () => {
    if (onApply) {
      onApply(tempValues);
    } else {
      onSelect(tempValues);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
      setTempValues([]);
    } else if (multiSelect) {
      setTempValues([]);
    } else {
      onSelect('');
    }
    if (!multiSelect) {
      setIsOpen(false);
    }
  };

  return (
    <div className="block md:hidden w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm transition hover:border-gray-400 ${
          hasSelection ? 'text-blue-600 border-blue-200 bg-blue-50/20' : 'text-gray-700'
        } focus:outline-none`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent bg-transparent ${
            hasSelection ? 'text-blue-700' : 'text-blue-600'
          }`}>
            {icon}
          </span>
          <span className="truncate text-left font-medium">{displayLabel}</span>
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-4 w-4 shrink-0 text-gray-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm transition-opacity duration-300"
            style={{ animation: 'fadeIn 0.2s ease-out' }}
            aria-label="Close filters"
          />

          <div
            className="relative z-10 w-full max-h-[85vh] flex flex-col rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ease-out"
            style={{ animation: 'slideUp 0.28s cubic-bezier(0.32, 0.94, 0.6, 1)' }}
          >
            <div className="flex justify-center py-3 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-slate-200" />
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 px-6 pb-4 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{panelTitle || buttonLabel}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {multiSelect ? 'Select multiple options' : 'Choose an option'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                aria-label="Close"
              >
                <svg className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-5 scrollbar-hide">
              {sections.map((section) => (
                <div key={section.key} className="space-y-3">
                  {section.title && (
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{section.title}</span>
                      <span className="h-px flex-1 bg-slate-100" />
                    </div>
                  )}
                  <div className="grid gap-2.5">
                    {section.items.map((item) => {
                      const isSelected = multiSelect
                        ? tempValues.includes(item.value)
                        : item.value === selectedValue;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => handleToggleOption(item.value)}
                          className={`flex items-start justify-between gap-3 w-full rounded-2xl border p-4 text-left transition ${
                            isSelected
                              ? 'border-blue-200 bg-blue-50/50 text-blue-900 font-semibold shadow-sm'
                              : 'border-slate-100 bg-white text-slate-700 hover:border-blue-100 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm">{item.label}</div>
                            {item.description && (
                              <p className="mt-1 text-xs text-slate-500 font-normal leading-normal">{item.description}</p>
                            )}
                          </div>
                          {multiSelect ? (
                            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition ${
                              isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                                  <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.42 0l-3.2-3.2a1 1 0 111.42-1.42l2.49 2.49 6.49-6.49a1 1 0 011.42 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </span>
                          ) : isSelected ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-blue-600">
                              <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.42 0l-3.2-3.2a1 1 0 111.42-1.42l2.49 2.49 6.49-6.49a1 1 0 011.42 0z" clipRule="evenodd" />
                            </svg>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 p-6 flex gap-3 bg-slate-50/50 shrink-0">
              {(multiSelect || hasSelection) && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {multiSelect ? 'Reset' : 'Clear Filter'}
                </button>
              )}
              {multiSelect && (
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-lg"
                >
                  Apply Filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileFilterButton;
