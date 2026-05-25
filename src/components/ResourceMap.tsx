import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Resource, ResourceCategory } from '../types';
import { Plus, X, MapPin } from 'lucide-react';

interface ResourceMapProps {
  isAdmin?: boolean;
  onUpdateCoordinates?: (resource: any, lat: number, lng: number) => void;
  resources: Resource[];
  selectedResource: Resource | null;
  onSelectResource: (resource: Resource | null) => void;
  isAddingCustom: boolean;
  onMapClickToAdd: (lat: number, lng: number) => void;
  tempMarkerCoords: { lat: number; lng: number } | null;
}

// Map color-coding definitions
export const CATEGORY_COLORS: Record<ResourceCategory, { bg: string; border: string; text: string; shadow: string; label: string; icon: string }> = {
  educacion: {
    bg: '#2563eb', // Blue-600
    border: 'border-blue-600',
    text: 'text-blue-600',
    shadow: 'shadow-blue-500/50',
    label: 'Educación y Oficios',
    icon: '🎓'
  },
  salud: {
    bg: '#dc2626', // Red-600
    border: 'border-red-600',
    text: 'text-red-600',
    shadow: 'shadow-red-500/50',
    label: 'Salud y Consumos',
    icon: '🩺'
  },
  contencion: {
    bg: '#16a34a', // Green-600
    border: 'border-green-600',
    text: 'text-green-600',
    shadow: 'shadow-green-500/50',
    label: 'Contención Social',
    icon: '🛡️'
  },
  comunidad: {
    bg: '#ea580c', // Orange-600
    border: 'border-orange-600',
    text: 'text-orange-600',
    shadow: 'shadow-orange-500/50',
    label: 'Comunidad y Apoyo',
    icon: '🤝'
  },
  recreacion: {
    bg: '#9333ea', // Purple-600
    border: 'border-purple-600',
    text: 'text-purple-600',
    shadow: 'shadow-purple-500/50',
    label: 'Recreativo y Cultural',
    icon: '⚽'
  },
  legal: {
    bg: '#0f766e', // Teal-700
    border: 'border-teal-700',
    text: 'text-teal-700',
    shadow: 'shadow-teal-500/50',
    label: 'Derechos y Legal',
    icon: '⚖️'
  },
  personal: {
    bg: '#ca8a04', // Yellow-600
    border: 'border-yellow-600',
    text: 'text-yellow-600',
    shadow: 'shadow-yellow-500/50',
    label: 'Marcador Personal',
    icon: '⭐'
  }
};

export default function ResourceMap({
  isAdmin = false,
  onUpdateCoordinates,
  resources,
  selectedResource,
  onSelectResource,
  isAddingCustom,
  onMapClickToAdd,
  tempMarkerCoords
}: ResourceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.FeatureGroup | null>(null);
  const tempMarkerLayerRef = useRef<L.Marker | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // La Plata center coordinates
    const LaPlataCenter: L.LatLngExpression = [-34.9213, -57.9544];

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true
    }).setView(LaPlataCenter, 13);

    // Gorgeous grey-neutral stylish theme basemap from CartoDB (clean display)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Zoom buttons in a clean position
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Layers
    const markersGroup = L.featureGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapRef.current = map;
    setIsMapReady(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle container resize to prevent Leaflet broken / partial tile rendering
  useEffect(() => {
    const map = mapRef.current;
    const container = mapContainerRef.current;
    if (!map || !container) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });

    resizeObserver.observe(container);

    // Staggered timers to ensure the map redraws correctly as parent animations complete
    const timers = [
      setTimeout(() => map.invalidateSize(), 50),
      setTimeout(() => map.invalidateSize(), 150),
      setTimeout(() => map.invalidateSize(), 300),
      setTimeout(() => map.invalidateSize(), 600),
      setTimeout(() => map.invalidateSize(), 1200),
      setTimeout(() => map.invalidateSize(), 2000),
      setTimeout(() => map.invalidateSize(), 3500),
    ];

    // Regular interval fallback check (robust for slow loaders)
    const interval = setInterval(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 2000);

    return () => {
      resizeObserver.disconnect();
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [isMapReady]);

  // Handle map clicks when in "Drop Pin / Adding custom resource" mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isAddingCustom) {
        const { lat, lng } = e.latlng;
        onMapClickToAdd(lat, lng);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isAddingCustom, onMapClickToAdd]);

  // Handle Temp Marker rendering for customization
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tempMarkerLayerRef.current) {
      tempMarkerLayerRef.current.remove();
      tempMarkerLayerRef.current = null;
    }

    if (tempMarkerCoords) {
      const tempIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative flex items-center justify-center animate-bounce">
            <div class="absolute -inset-2 rounded-full bg-yellow-500/40 blur-sm scale-125"></div>
            <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-600 to-amber-400 text-white border-2 border-white flex items-center justify-center shadow-lg transform scale-110">
              <span class="text-lg">⭐</span>
            </div>
            <div class="absolute -bottom-1 w-2 h-2 bg-yellow-600 rotate-45 border-r border-b border-white z-0"></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40]
      });

      const tempMarker = L.marker([tempMarkerCoords.lat, tempMarkerCoords.lng], { icon: tempIcon }).addTo(map);
      tempMarkerLayerRef.current = tempMarker;
      map.panTo([tempMarkerCoords.lat, tempMarkerCoords.lng], { animate: true });
    }
  }, [tempMarkerCoords]);

  // Re-render resources markers when they filter or change
  useEffect(() => {
    const map = mapRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup || !isMapReady) return;

    // Force map container recalculation on database changes
    map.invalidateSize();

    // Clear previous markers
    markersGroup.clearLayers();

    resources.forEach((resource) => {
      const config = CATEGORY_COLORS[resource.category] || CATEGORY_COLORS.personal;
      
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative group flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-110 active:scale-95" id="marker-${resource.id}">
            <!-- Glow backdrop -->
            <div class="absolute -inset-1.5 bg-[${config.bg}] opacity-15 blur-[4px] rounded-full group-hover:opacity-35 transition duration-300"></div>
            <!-- Pin Body -->
            <div class="relative w-9 h-9 rounded-full flex items-center justify-center border-2 shadow-md font-semibold transition overflow-hidden bg-white" style="border-color: ${config.bg}; flex-shrink: 0;">
              <!-- Overlay layer: 40% category color on top of solid white -->
              <div class="absolute inset-0 z-0 opacity-40" style="background-color: ${config.bg};"></div>
              <span class="text-base select-none leading-none z-10">${config.icon}</span>
            </div>
            <!-- Arrow pointer -->
            <div class="absolute -bottom-0.5 w-1.5 h-1.5 rotate-45 border-r border-b z-0 bg-white overflow-hidden" style="border-color: ${config.bg};">
              <!-- Overlay layer: 40% category color on top of solid white -->
              <div class="absolute inset-0 opacity-40" style="background-color: ${config.bg};"></div>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([resource.lat, resource.lng], { 
        icon: customIcon,
        draggable: !!isAdmin
      });

      if (isAdmin && onUpdateCoordinates) {
        marker.on('dragend', (event: any) => {
          const newLatLng = event.target.getLatLng();
          const confirmText = `¿Estás seguro de que deseas reubicar el marcador de "${resource.name}" a esta nueva posición?\n\nCoordenadas Nuevas:\nLatitud: ${newLatLng.lat.toFixed(6)}\nLongitud: ${newLatLng.lng.toFixed(6)}`;
          if (window.confirm(confirmText)) {
            onUpdateCoordinates(resource, newLatLng.lat, newLatLng.lng);
          } else {
            event.target.setLatLng([resource.lat, resource.lng]);
          }
        });
      }

      // Create a small elegant popup layout
      const popupContent = document.createElement('div');
      popupContent.className = 'p-3 flex flex-col gap-1.5 pointer-events-auto select-none';
      popupContent.innerHTML = `
        <div class="flex items-center gap-1.5">
          <span class="text-sm">${config.icon}</span>
          <span class="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">${resource.subcategory}</span>
        </div>
        <h4 class="text-sm font-bold text-slate-800 leading-tight">${resource.name}</h4>
        <p class="text-xs text-slate-500 flex items-center gap-1 mt-1">
          <svg class="w-3.5 h-3.5 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          <span class="truncate">${resource.address}</span>
        </p>
        <button class="w-full text-center mt-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs py-1.5 px-3 rounded-lg shadow-sm transition active:scale-95 text-center block">
          Ver Detalles Completos
        </button>
      `;

      // Handle custom clicks inside the popup
      popupContent.querySelector('button')?.addEventListener('click', () => {
        onSelectResource(resource);
        map.closePopup();
      });

      marker.bindPopup(popupContent, {
        closeButton: false,
        offset: [0, -10]
      });

      // Also set selected state on clicking marker itself without opening popup if sidebar handles detail, or let map open popup
      marker.on('click', () => {
        // Trigger React select state for sidebar focus
        onSelectResource(resource);
      });

      markersGroup.addLayer(marker);
    });

    // Auto-fit bounds if we have markers map and no selectedResource to focus on
    if (resources.length > 0 && !selectedResource && !tempMarkerCoords) {
      try {
        const bounds = markersGroup.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        }
      } catch (e) {
        // Safe fallbacks
      }
    }
  }, [resources, isMapReady]);

  // Center or zoom in when selectedResource changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedResource) return;

    // Refresh size in case the sidebar / drawer transitions opened simultaneously
    map.invalidateSize();

    map.setView([selectedResource.lat, selectedResource.lng], 16, {
      animate: true,
      duration: 1.0
    });

    // Find and open popup of the selected marker automatically
    markersLayerRef.current?.eachLayer((layer) => {
      const marker = layer as L.Marker;
      const { lat, lng } = marker.getLatLng();
      if (Math.abs(lat - selectedResource.lat) < 0.0001 && Math.abs(lng - selectedResource.lng) < 0.0001) {
        marker.openPopup();
      }
    });
  }, [selectedResource]);

  return (
    <div className="relative w-full h-full flex flex-col rounded-2xl overflow-hidden shadow-lg border border-slate-100">
      {/* Admin Georeferencing Instruction */}
      {isAdmin && !isAddingCustom && (
        <div className="absolute top-4 left-4 right-12 z-[1000] bg-indigo-50/95 backdrop-blur-md text-slate-800 border-2 border-indigo-200 shadow-xl px-4 py-3 rounded-2xl flex items-center gap-3 pointer-events-auto animate-fade-in">
          <span className="flex h-3 w-3 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600"></span>
          </span>
          <div className="text-xs">
            <span className="font-extrabold text-indigo-950 block">Modo Administrador Activo</span>
            <span className="text-slate-600 font-bold">¡Georreferenciación interactiva!</span> Puedes arrastrar cualquier marcador en el mapa para corregir su ubicación automáticamente.
          </div>
        </div>
      )}

      {/* Map Banner Header / Floating Instruction */}
      {isAddingCustom && (
        <div className="absolute top-4 left-4 right-12 z-[1000] bg-amber-50/95 backdrop-blur-md text-amber-900 border-2 border-amber-200 shadow-xl px-4.5 py-3.5 rounded-2xl flex items-center justify-between pointer-events-auto animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <div className="text-xs">
              <p className="font-extrabold text-slate-800">Modo Marcador Personalizado</p>
              <p className="text-slate-500 font-medium mt-0.5">Haz clic en cualquier punto del mapa para fijar las coordenadas del nuevo recurso.</p>
            </div>
          </div>
          {tempMarkerCoords && (
            <div className="text-[10px] font-black font-mono bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200 shrink-0">
              Ubicado: {tempMarkerCoords.lat.toFixed(4)}, {tempMarkerCoords.lng.toFixed(4)}
            </div>
          )}
        </div>
      )}

      {/* Actual Map Container */}
      <div id="resource-leaflet-map" ref={mapContainerRef} className="w-full h-full min-h-[400px] md:min-h-0 md:flex-1" />

      {/* Base overlay statistics inside the map corner for nice aesthetics */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-100/80 shadow-md flex items-center gap-2.5 text-xs pointer-events-none select-none">
        <MapPin className="w-4 h-4 text-emerald-600 animate-pulse" />
        <div>
          <span className="font-bold text-slate-800">{resources.length}</span>
          <span className="text-slate-500 ml-1">Lugares filtrados</span>
        </div>
      </div>
    </div>
  );
}
