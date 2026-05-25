import { ResourceCategory, MapFilters } from '../types';
import { Filter, SlidersHorizontal, Check, RefreshCw, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ResourceFiltersProps {
  filters: MapFilters;
  onChangeFilters: (filters: MapFilters) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onResetFilters: () => void;
}

export default function ResourceFilters({
  filters,
  onChangeFilters,
  isOpen,
  onToggleOpen,
  onResetFilters
}: ResourceFiltersProps) {
  // Sector filters helper
  const sectorOptions: { label: string; value: boolean | null }[] = [
    { label: 'Todos los sectores', value: null },
    { label: 'Estatales / Públicos', value: true },
    { label: 'Comunitarios / ONG / Privados', value: false }
  ];

  // Age group helper
  const ageOptions = [
    '0 - 18 años',
    '12 - 18 años',
    '15+ años',
    '16+ años',
    '12 - 25 años',
    'Todo público'
  ];

  const handleSectorChange = (val: boolean | null) => {
    onChangeFilters({
      ...filters,
      isPublicOnly: val
    });
  };

  const handleGuardiaToggle = () => {
    onChangeFilters({
      ...filters,
      isGuardiaOnly: !filters.isGuardiaOnly
    });
  };

  const handleAgeToggle = (age: string) => {
    const isSelected = filters.ageGroups.includes(age);
    const updated = isSelected
      ? filters.ageGroups.filter(a => a !== age)
      : [...filters.ageGroups, age];
    onChangeFilters({
      ...filters,
      ageGroups: updated
    });
  };

  const activeFiltersCount = 
    (filters.isPublicOnly !== null ? 1 : 0) + 
    (filters.isGuardiaOnly ? 1 : 0) + 
    filters.ageGroups.length;

  return (
    <div className="bg-white border-b border-slate-100 shadow-xs z-20">
      <div className="px-5 py-3.5 flex items-center justify-between gap-4">
        {/* Toggle Expand Button */}
        <button
          onClick={onToggleOpen}
          className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border transition-all cursor-pointer ${
            isOpen || activeFiltersCount > 0
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
              : 'border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
          }`}
          id="btn-toggle-filters"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filtros Avanzados</span>
          {activeFiltersCount > 0 && (
            <span className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded-full text-[10px] scale-95 leading-none">
              {activeFiltersCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2.5">
          {activeFiltersCount > 0 && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-rose-600 transition cursor-pointer uppercase"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Limpiar filtros</span>
            </button>
          )}
          <span className="text-slate-300">|</span>
          <p className="text-[11px] text-slate-400 font-medium">Filtra la red asistencial de La Plata</p>
        </div>
      </div>

      {/* Accordion panel content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden bg-slate-50 border-t border-slate-100"
          >
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600">
              {/* Sector management segment */}
              <div className="flex flex-col gap-2.5">
                <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Tipo de Gestión / Entorno</span>
                <div className="flex flex-col gap-1.5">
                  {sectorOptions.map((opt, i) => {
                    const isSelected = filters.isPublicOnly === opt.value;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSectorChange(opt.value)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl border flex items-center justify-between text-xs transition-all duration-200 cursor-pointer font-bold ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs'
                            : 'bg-white border-slate-150 text-slate-500 hover:border-slate-300 hover:text-slate-800'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Special shifts coverage */}
              <div className="flex flex-col gap-2.5">
                <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Horarios y Guardias</span>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-3.5 p-4 bg-white border-2 border-slate-150 rounded-2xl cursor-pointer hover:border-slate-300 shadow-xs hover:shadow-md transition-all duration-200 select-none">
                    <input
                      type="checkbox"
                      checked={filters.isGuardiaOnly}
                      onChange={handleGuardiaToggle}
                      className="w-5 h-5 rounded-lg text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <p className="font-black text-slate-800 text-xs font-display">Guardia de Urgencia 24hs</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Centros con cobertura residencial o sanidad activa permanente.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Age groups selection */}
              <div className="flex flex-col gap-2.5">
                <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Rango de Edad Ofrecido</span>
                <div className="grid grid-cols-2 gap-2">
                  {ageOptions.map((age) => {
                    const isSelected = filters.ageGroups.includes(age);
                    return (
                      <button
                        key={age}
                        onClick={() => handleAgeToggle(age)}
                        className={`px-3 py-2.5 text-left rounded-xl text-[11px] border transition-all duration-250 flex items-center justify-between cursor-pointer font-bold ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-2xs'
                            : 'bg-white border-slate-150 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{age}</span>
                        <div className={`w-4.5 h-4.5 rounded-lg border shrink-0 flex items-center justify-center ${
                          isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3.5]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
