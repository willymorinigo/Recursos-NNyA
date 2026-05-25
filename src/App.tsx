import { useState, useEffect } from 'react';
import { Resource, ResourceCategory, MapFilters } from './types';
import { DEFAULT_RESOURCES } from './data';
import ResourceMap from './components/ResourceMap';
import ResourceSidebar from './components/ResourceSidebar';
import ResourceFilters from './components/ResourceFilters';
import ResourceDetails from './components/ResourceDetails';
import AddCustomMarkerModal from './components/AddCustomMarkerModal';
import AdminLoginModal from './components/AdminLoginModal';
import AdminConsoleModal from './components/AdminConsoleModal';
import { HelpCircle, SlidersHorizontal, Map, List, Sparkles, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // --- Persistent States from Local Storage ---
  const [resources, setResourcesState] = useState<Resource[]>(() => {
    const data = localStorage.getItem('youth_resources_full_v3');
    let loaded: Resource[] = [];
    if (data) {
      loaded = JSON.parse(data);
    } else {
      // Backward compatibility merge of legacy custom_youth_resources if present
      const legacy = localStorage.getItem('custom_youth_resources');
      const legacyList = legacy ? JSON.parse(legacy) : [];
      loaded = [...DEFAULT_RESOURCES, ...legacyList];
    }
    // Deduplicate loaded array by 'id' to be absolutely sure there are no keys collision
    const seen = new Set<string>();
    return loaded.filter(res => {
      if (!res.id || seen.has(res.id)) return false;
      seen.add(res.id);
      return true;
    });
  });

  const setResources = (update: Resource[] | ((prev: Resource[]) => Resource[])) => {
    setResourcesState(prev => {
      const nextList = typeof update === 'function' ? update(prev) : update;
      const seen = new Set<string>();
      return nextList.filter(res => {
        if (!res.id || seen.has(res.id)) return false;
        seen.add(res.id);
        return true;
      });
    });
  };

  const [favorites, setFavorites] = useState<string[]>(() => {
    const data = localStorage.getItem('favorite_youth_resources');
    return data ? JSON.parse(data) : [];
  });

  const [resourceNotes, setResourceNotes] = useState<Record<string, string>>(() => {
    const data = localStorage.getItem('youth_resource_notes');
    return data ? JSON.parse(data) : {};
  });

  // --- Administrative Operator States ---
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('admin_active_session') === 'true';
  });

  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  // --- Active Focus States ---
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // --- Custom pin drop creation sequence state ---
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [tempMarkerCoords, setTempMarkerCoords] = useState<{ lat: number; lng: number } | null>(null);

  // --- Search and category controls ---
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ResourceCategory | 'all'>('all');

  // --- Collapsible Filters States ---
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<MapFilters>({
    searchQuery: '',
    categories: [],
    isPublicOnly: null,
    isGuardiaOnly: false,
    ageGroups: []
  });

  // --- Mobile visual view toggler ---
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [showIntroTips, setShowIntroTips] = useState(true);

  // --- Localstorage syncing side-effects ---
  useEffect(() => {
    localStorage.setItem('youth_resources_full_v3', JSON.stringify(resources));
  }, [resources]);

  useEffect(() => {
    localStorage.setItem('favorite_youth_resources', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('youth_resource_notes', JSON.stringify(resourceNotes));
  }, [resourceNotes]);

  useEffect(() => {
    localStorage.setItem('admin_active_session', isAdmin ? 'true' : 'false');
  }, [isAdmin]);

  // --- Real-time Persistent Server Database synchronization ---
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const response = await fetch('/api/resources');
        if (response.ok) {
          const list = await response.json();
          if (Array.isArray(list) && list.length > 0) {
            // Deduplicate incoming array by 'id' to prevent duplicate keys
            const seen = new Set<string>();
            const uniqueList = list.filter(res => {
              if (!res.id || seen.has(res.id)) return false;
              seen.add(res.id);
              return true;
            });
            setResources(uniqueList);
          }
        }
      } catch (err) {
        console.error("No se pudo conectar a la API del servidor (modo offline):", err);
      }
    };
    fetchResources();
  }, []);

  // --- Map resources with user customized notes if they exist ---
  const allResources = resources.map(res => ({
    ...res,
    notes: resourceNotes[res.id] || ''
  }));

  // --- Filtering Evaluation pipeline ---
  const filteredResources = allResources.filter(res => {
    // 1. Text Search matches Name, Description, Address or Subcategory
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesName = res.name.toLowerCase().includes(q);
      const matchesDesc = res.description.toLowerCase().includes(q);
      const matchesAddress = res.address.toLowerCase().includes(q);
      const matchesSubcategory = res.subcategory.toLowerCase().includes(q);
      
      if (!matchesName && !matchesDesc && !matchesAddress && !matchesSubcategory) {
        return false;
      }
    }

    // 2. Quick filters main category selector
    if (activeCategory !== 'all') {
      if (res.category !== activeCategory) return false;
    }

    // 3. Management sector filter (Estatales / Comunitarios/ONG)
    if (filters.isPublicOnly !== null) {
      if (res.isPublic !== filters.isPublicOnly) return false;
    }

    // 4. Urgency coverage shifts
    if (filters.isGuardiaOnly) {
      if (!res.isGuardia24h) return false;
    }

    // 5. Age group restriction parameters
    if (filters.ageGroups.length > 0) {
      if (!res.targetAge || !filters.ageGroups.includes(res.targetAge)) return false;
    }

    return true;
  });

  // --- Event Handling functions ---
  const handleToggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleSaveNotes = (id: string, notesText: string) => {
    setResourceNotes(prev => ({
      ...prev,
      [id]: notesText
    }));
  };

  const handleStartAddCustom = () => {
    if (!isAdmin) return;
    setIsAddingCustom(true);
    setTempMarkerCoords(null);
    setSelectedResource(null);
    setEditingResource(null);
    // On mobile, force focus to the map so the user can easily click to drop the pin
    setShowMobileMap(true);
  };

  const handleCancelAddCustom = () => {
    setIsAddingCustom(false);
    setTempMarkerCoords(null);
  };

  const handleMapClickToAdd = (lat: number, lng: number) => {
    setTempMarkerCoords({ lat, lng });
  };

  const handleSaveCustomResource = async (details: Omit<Resource, 'id'> & { id?: string }) => {
    if (!isAdmin) return;
    const isEditing = !!details.id;
    const tempId = details.id || `custom-${Date.now()}`;
    const payload = {
      ...details,
      id: details.id || undefined,
      isCustom: !isEditing ? true : details.isCustom
    };

    // Optimistic Update
    const tempResource: Resource = {
      ...payload,
      id: tempId,
    } as Resource;

    if (isEditing) {
      setResources(prev => prev.map(res => res.id === tempId ? { ...res, ...payload } as Resource : res));
      setSelectedResource(tempResource);
      setEditingResource(null);
    } else {
      setResources(prev => [tempResource, ...prev]);
      setIsAddingCustom(false);
      setTempMarkerCoords(null);
      setSelectedResource(tempResource);
    }

    // Call API
    try {
      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': 'admin',
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const updatedList = await response.json();
        setResources(updatedList);
        // Sync selection with server-confirmed item
        const synced = updatedList.find((item: any) => item.id === tempId || (item.name === tempResource.name && Math.abs(item.lat - tempResource.lat) < 0.0001));
        if (synced) {
          setSelectedResource(synced);
        }
      }
    } catch (err) {
      console.error("No se pudo persistir el cambio en el servidor. Preservando estado local:", err);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!isAdmin) return;
    // Optimistic Update
    setResources(prev => prev.filter(res => res.id !== id));
    setFavorites(prev => prev.filter(f => f !== id));
    setResourceNotes(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    if (selectedResource?.id === id) {
      setSelectedResource(null);
    }

    // Call API
    try {
      const response = await fetch(`/api/resources/${id}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Auth': 'admin'
        }
      });
      if (response.ok) {
        const updatedList = await response.json();
        setResources(updatedList);
      }
    } catch (err) {
      console.error("No se pudo eliminar el recurso del servidor. Preservando estado local:", err);
    }
  };

  const handleResetDatabase = async () => {
    if (!isAdmin) return;
    // Optimistic Update
    setResources(DEFAULT_RESOURCES);
    setFavorites([]);
    setResourceNotes({});
    setSelectedResource(null);
    setEditingResource(null);
    setIsAddingCustom(false);
    setTempMarkerCoords(null);

    // Call API
    try {
      const response = await fetch('/api/resources/reset', {
        method: 'POST',
        headers: {
          'X-Admin-Auth': 'admin'
        }
      });
      if (response.ok) {
        const updatedList = await response.json();
        setResources(updatedList);
      }
    } catch (err) {
      console.error("No se pudo restaurar la base de datos en el servidor:", err);
    }
  };

  const handleAdminLoginToggle = () => {
    if (isAdmin) {
      setIsAdmin(false);
      setSelectedResource(null);
      setEditingResource(null);
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    setIsAdminLoginOpen(false);
    // Automatically present the resource console for a smooth user flow!
    setIsAdminConsoleOpen(true);
  };

  const handleOpenAdminConsole = () => {
    setIsAdminConsoleOpen(true);
  };

  const handleAddNewFromConsole = () => {
    // Standard coordinates of central La Plata with a random minute jitter so cards don't occupy exact duplicate locations on screen
    const jitterLat = -34.9213 + (Math.random() - 0.5) * 0.008;
    const jitterLng = -57.9544 + (Math.random() - 0.5) * 0.008;
    setTempMarkerCoords({ lat: jitterLat, lng: jitterLng });
    setIsAddingCustom(true);
    // Keep console hidden during details creation, it can be re-opened if desired
    setIsAdminConsoleOpen(false);
  };

  const handleEditFromConsole = (resource: Resource) => {
    setEditingResource(resource);
    setIsAdminConsoleOpen(false);
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      categories: [],
      isPublicOnly: null,
      isGuardiaOnly: false,
      ageGroups: []
    });
  };

  const handleSelectResourceFromCard = (resource: Resource | null) => {
    setSelectedResource(resource);
    // Switch to map view on mobile if selecting a resource card
    if (resource) {
      setShowMobileMap(true);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-slate-50 font-sans overflow-hidden text-slate-800">
      
      {/* Intro Onboarding Tips Bar (Aesthetic craftsmanship - can be closed info banner) */}
      {showIntroTips && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1050] max-w-sm md:max-w-md bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-150/80 shadow-2xl pointer-events-auto flex items-center gap-3 animate-bounce shadow-indigo-100/40">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-left text-xs gap-1 flex flex-col">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 font-display">Red de Inclusión de La Plata</span>
              <button onClick={() => setShowIntroTips(false)} className="text-[10px] text-slate-400 font-bold hover:text-slate-600 cursor-pointer ml-3 px-1">Cerrar</button>
            </div>
            <p className="text-slate-500 leading-snug">
              Filtra oficios, centros de salud mental o guarda notas del caso. Puedes registrar nuevos recursos tocando <strong>Agregar Marcador</strong> y luego un punto del mapa.
            </p>
          </div>
        </div>
      )}

      {/* LEFT COMPONENT - Directory list & search */}
      <div className={`h-full flex flex-col shrink-0 ${showMobileMap ? 'hidden md:flex' : 'flex w-full md:w-auto'}`}>
        <ResourceSidebar
          resources={filteredResources}
          selectedResource={selectedResource}
          onSelectResource={handleSelectResourceFromCard}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onStartAddCustom={handleStartAddCustom}
          isAddingCustom={isAddingCustom}
          onCancelAddCustom={handleCancelAddCustom}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          isAdmin={isAdmin}
          onAdminLoginToggle={handleAdminLoginToggle}
          onResetDatabase={handleResetDatabase}
          onOpenAdminConsole={handleOpenAdminConsole}
        />
      </div>

      {/* RIGHT WORKSPACE COMPONENT - Advanced filters + Map View */}
      <div className={`flex-1 flex flex-col h-full relative ${!showMobileMap ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Accordion toolbar filters */}
        <div className="shrink-0 z-20">
          <ResourceFilters
            filters={filters}
            onChangeFilters={setFilters}
            isOpen={isFiltersOpen}
            onToggleOpen={() => setIsFiltersOpen(!isFiltersOpen)}
            onResetFilters={handleResetFilters}
          />
        </div>

        {/* Dynamic Leaflet Map */}
        <div className="flex-1 w-full h-full relative min-h-0 bg-slate-100">
          <ResourceMap
            resources={filteredResources}
            selectedResource={selectedResource}
            onSelectResource={setSelectedResource}
            isAddingCustom={isAddingCustom}
            onMapClickToAdd={handleMapClickToAdd}
            tempMarkerCoords={tempMarkerCoords}
            isAdmin={isAdmin}
            onUpdateCoordinates={handleSaveCustomResource}
          />

          {/* Collapsible Details Panel layer sliding from right edge */}
          <AnimatePresence>
            {selectedResource && (
              <motion.div
                initial={{ x: '100%', opacity: 0.9 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0.9 }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className="absolute inset-y-0 right-0 z-[1010]"
              >
                <ResourceDetails
                  resource={selectedResource}
                  onClose={() => setSelectedResource(null)}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  onSaveNotes={handleSaveNotes}
                  onDeleteCustomResource={handleDeleteResource}
                  isAdmin={isAdmin}
                  onStartEdit={(res) => setEditingResource(res)}
                  onDeleteResource={handleDeleteResource}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Add / Edit Resource Modals */}
      <AnimatePresence>
        {isAddingCustom && tempMarkerCoords && (
          <AddCustomMarkerModal
            coords={tempMarkerCoords}
            onClose={() => setTempMarkerCoords(null)}
            onSave={handleSaveCustomResource}
            isAdmin={isAdmin}
          />
        )}
        {editingResource && (
          <AddCustomMarkerModal
            coords={null}
            resourceToEdit={editingResource}
            onClose={() => setEditingResource(null)}
            onSave={handleSaveCustomResource}
            isAdmin={isAdmin}
          />
        )}
      </AnimatePresence>

      {/* Admin Verification Modal */}
      <AnimatePresence>
        {isAdminLoginOpen && (
          <AdminLoginModal
            onClose={() => setIsAdminLoginOpen(false)}
            onLoginSuccess={handleAdminLoginSuccess}
          />
        )}
      </AnimatePresence>

      {/* Admin Console Directory Modal */}
      <AnimatePresence>
        {isAdminConsoleOpen && (
          <AdminConsoleModal
            resources={resources}
            onClose={() => setIsAdminConsoleOpen(false)}
            onEdit={handleEditFromConsole}
            onDelete={handleDeleteResource}
            onAddNew={handleAddNewFromConsole}
            onBulkImport={setResources}
          />
        )}
      </AnimatePresence>

      {/* RESPONSIVE MOBILE ACTION TOGGLER TAB BAR */}
      <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white shadow-2xl px-5 py-3.5 rounded-2xl flex items-center gap-7 z-[1040] select-none scale-102">
        <button
          onClick={() => {
            setShowMobileMap(false);
          }}
          className={`flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${!showMobileMap ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <List className="w-4 h-4" />
          <span>Explorar Red</span>
        </button>

        <span className="text-slate-700 font-light">|</span>

        <button
          onClick={() => {
            setShowMobileMap(true);
          }}
          className={`flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${showMobileMap ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Map className="w-4 h-4" />
          <span>Ver Mapa</span>
        </button>
      </div>

    </div>
  );
}
