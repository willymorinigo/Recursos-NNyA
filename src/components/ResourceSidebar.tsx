import { useState } from 'react';
import { Resource, ResourceCategory } from '../types';
import { CATEGORY_COLORS } from './ResourceMap';
import { Search, MapPin, Phone, Clock, Bookmark, Heart, Plus, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ResourceSidebarProps {
  resources: Resource[];
  selectedResource: Resource | null;
  onSelectResource: (resource: Resource | null) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onStartAddCustom: () => void;
  isAddingCustom: boolean;
  onCancelAddCustom: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategory: ResourceCategory | 'all';
  setActiveCategory: (cat: ResourceCategory | 'all') => void;
  isAdmin?: boolean;
  onAdminLoginToggle?: () => void;
  onResetDatabase?: () => void;
  onOpenAdminConsole?: () => void;
}

export default function ResourceSidebar({
  resources,
  selectedResource,
  onSelectResource,
  favorites,
  onToggleFavorite,
  onStartAddCustom,
  isAddingCustom,
  onCancelAddCustom,
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  isAdmin = false,
  onAdminLoginToggle,
  onResetDatabase,
  onOpenAdminConsole
}: ResourceSidebarProps) {
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  // Quick categories list
  const categoryTabs: { value: ResourceCategory | 'all'; label: string; icon: string; bgClass: string }[] = [
    { value: 'all', label: 'Todos', icon: '🗺️', bgClass: 'bg-slate-900 border-slate-900' },
    { value: 'contencion', label: 'Contención', icon: '🛡️', bgClass: 'bg-emerald-600 border-emerald-600' },
    { value: 'salud', label: 'Salud', icon: '🩺', bgClass: 'bg-red-600 border-red-600' },
    { value: 'educacion', label: 'Educación', icon: '🎓', bgClass: 'bg-blue-600 border-blue-600' },
    { value: 'comunidad', label: 'Comunidad', icon: '🤝', bgClass: 'bg-orange-600 border-orange-600' },
    { value: 'recreacion', label: 'Recreo/Club', icon: '⚽', bgClass: 'bg-purple-600 border-purple-600' },
    { value: 'legal', label: 'Derechos', icon: '⚖️', bgClass: 'bg-teal-700 border-teal-700' },
    { value: 'personal', label: 'Mis Pines', icon: '⭐', bgClass: 'bg-yellow-600 border-yellow-600' }
  ];

  // Helper to highlight search query matches
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, index) => 
          regex.test(part) ? (
            <mark key={index} className="bg-yellow-100 text-yellow-950 px-0.5 rounded font-medium">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Filter list by bookmarks toggle
  const displayedResources = resources.filter(res => {
    if (showBookmarksOnly && !favorites.includes(res.id)) return false;
    return true;
  });

  return (
    <div className="w-full md:w-[440px] flex flex-col h-full bg-white border-r border-slate-200 shrink-0 z-10 shadow-xl">
      {/* Header Program Info */}
      <div className="p-6 pb-5 border-b border-slate-100 bg-linear-to-b from-slate-50/50 to-white flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black text-indigo-600 tracking-tight leading-none mb-1.5 font-display">
              RECURSOS<br/>LA PLATA
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              MAPA COMUNITARIO Y RED DE INCLUSIÓN
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[10px] font-bold bg-indigo-600 text-white px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
              Red de Apoyo
            </span>
            <button
              onClick={onAdminLoginToggle}
              className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer select-none border ${
                isAdmin
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-100/50'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${isAdmin ? 'bg-emerald-600 animate-ping' : 'bg-slate-400'}`}></span>
              <span>{isAdmin ? 'Admin Activo' : 'Acceso Admin'}</span>
            </button>
          </div>
        </div>

        {/* Real-time search */}
        <div className="mt-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-11 pr-10 text-sm focus:ring-2 focus:ring-indigo-500 transition focus:bg-white placeholder:text-slate-400 text-slate-700 outline-none"
            placeholder="Buscar comedores, talleres, salud mental..."
            id="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-indigo-600 cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Filter / Custom controls */}
        <div className="flex items-center justify-between gap-3 mt-4 text-sm font-medium">
          <button
            onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border transition-all text-xs shrink-0 font-bold ${
              showBookmarksOnly
                ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-xs'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${showBookmarksOnly ? 'fill-rose-600 text-rose-600' : ''}`} />
            <span>Mis Marcadores ({favorites.length})</span>
          </button>

          {isAdmin && (!isAddingCustom ? (
            <button
              onClick={onStartAddCustom}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition hover:shadow-lg hover:shadow-indigo-100 active:scale-95 cursor-pointer shrink-0"
              id="btn-add-marker"
            >
              <Plus className="w-4 h-4" />
              <span>AGREGAR MARCADOR</span>
            </button>
          ) : (
            <button
              onClick={onCancelAddCustom}
              className="flex items-center gap-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
              <span>CANCELAR PIN</span>
            </button>
          ))}
        </div>
      </div>

      {/* Categories quick select (wrapped inside the column bounds) */}
      <div className="border-b border-slate-100 py-3 px-5 bg-slate-50/40 select-none">
        <div className="flex flex-wrap gap-1.5">
          {categoryTabs.map((tab) => {
            const isActive = activeCategory === tab.value;
            let activeStyle = '';
            if (isActive) {
              switch (tab.value) {
                case 'all':
                  activeStyle = 'bg-slate-900 border-slate-900 text-white shadow-xs';
                  break;
                case 'contencion':
                  activeStyle = 'bg-emerald-600 border-emerald-600 text-white shadow-xs';
                  break;
                case 'salud':
                  activeStyle = 'bg-red-600 border-red-600 text-white shadow-xs';
                  break;
                case 'educacion':
                  activeStyle = 'bg-blue-600 border-blue-600 text-white shadow-xs';
                  break;
                case 'comunidad':
                  activeStyle = 'bg-orange-600 border-orange-600 text-white shadow-xs';
                  break;
                case 'recreacion':
                  activeStyle = 'bg-purple-600 border-purple-600 text-white shadow-xs';
                  break;
                case 'legal':
                  activeStyle = 'bg-teal-700 border-teal-700 text-white shadow-xs';
                  break;
                case 'personal':
                  activeStyle = 'bg-yellow-600 border-yellow-600 text-white shadow-xs';
                  break;
                default:
                  activeStyle = 'bg-indigo-600 border-indigo-600 text-white shadow-xs';
              }
            } else {
              activeStyle = 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50';
            }

            return (
              <button
                key={tab.value}
                onClick={() => setActiveCategory(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-all border shrink-0 cursor-pointer justify-center ${activeStyle}`}
              >
                <span className="text-sm shrink-0">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Admin Reset Banner */}
      {isAdmin && (
        <div className="bg-indigo-50/55 border-b border-indigo-150 px-6 py-3 flex flex-col gap-2 animate-fade-in text-indigo-900 font-medium shrink-0">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="text-sm leading-none">⚙️</span>
              <span className="font-bold">Modo Administrador</span>
            </div>
            <button
              onClick={() => {
                if (confirm('¿Deseas restaurar todos los marcadores al estado predeterminado de la Red? Se perderán las modificaciones actuales.')) {
                  if (onResetDatabase) onResetDatabase();
                }
              }}
              className="text-[9px] font-black text-rose-700 hover:text-white hover:bg-rose-600 bg-white hover:border-rose-600 border border-slate-200 px-2 py-0.5 rounded transition-all cursor-pointer shadow-3xs"
            >
              Restaurar Base
            </button>
          </div>
          <button
            onClick={onOpenAdminConsole}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] py-2 uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>💼 Mesa de Gestión ({resources.length} recursos)</span>
          </button>
        </div>
      )}

      {/* Directory items list */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold tracking-wide uppercase">
            <span>Resultados de búsqueda</span>
            <span>{displayedResources.length} locales</span>
          </div>

          <AnimatePresence mode="popLayout">
            {displayedResources.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-xs"
              >
                <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 font-display">No se encontraron recursos</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Prueba cambiando los términos de búsqueda o limpiando los filtros activos de tu panel.
                </p>
                {(activeCategory !== 'all' || searchQuery || showBookmarksOnly) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategory('all');
                      setShowBookmarksOnly(false);
                    }}
                    className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-800 select-none cursor-pointer"
                  >
                    Restablecer filtros de búsqueda
                  </button>
                )}
              </motion.div>
            ) : (
              displayedResources.map((res) => {
                const colors = CATEGORY_COLORS[res.category] || CATEGORY_COLORS.personal;
                const isSelected = selectedResource?.id === res.id;
                const isFav = favorites.includes(res.id);

                return (
                  <motion.div
                    key={res.id}
                    layoutId={`card-${res.id}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => onSelectResource(res)}
                    className={`group relative bg-white border-2 rounded-2xl p-5 cursor-pointer transition-all duration-300 select-none shadow-sm hover:shadow-xl hover:-translate-y-0.5 ${
                      isSelected
                        ? 'border-indigo-500 ring-4 ring-indigo-100 bg-indigo-50/15 scale-[1.01]'
                        : 'border-slate-150 hover:border-slate-300'
                    }`}
                    id={`card-${res.id}`}
                  >
                    {/* Top line category indicator */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-lg shrink-0 select-none">{colors.icon}</span>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block truncate">
                            {res.subcategory}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {res.isGuardia24h && (
                          <span className="text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full select-none">
                            Guardia 24h
                          </span>
                        )}
                        {res.isCustom && (
                          <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full select-none flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                            Propio
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(res.id);
                          }}
                          className={`p-1.5 rounded-xl border hover:bg-slate-50 transition cursor-pointer ${
                            isFav ? 'bg-rose-50 border-rose-300 text-rose-600 shadow-2xs' : 'border-slate-200 text-slate-400'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Place Name */}
                    <h3 className="text-sm font-black text-slate-800 font-display mt-2 group-hover:text-indigo-600 transition leading-snug">
                      {highlightText(res.name, searchQuery)}
                    </h3>

                    {/* Brief snippet */}
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                      {highlightText(res.description, searchQuery)}
                    </p>

                    {/* Location/Age metrics footer */}
                    <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1 truncate max-w-[65%]">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate text-slate-500">{res.address}</span>
                      </span>
                      {res.targetAge && (
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] shrink-0 font-bold border border-slate-200">
                          {res.targetAge}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
