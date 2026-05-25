import React, { useState, useRef } from 'react';
import { Resource, ResourceCategory } from '../types';
import { 
  Search, Plus, Trash2, Edit3, X, ChevronLeft, ChevronRight, 
  ShieldAlert, UploadCloud, CheckCircle2, AlertTriangle, FileText, Database, Copy
} from 'lucide-react';
import { motion } from 'motion/react';
import { CATEGORY_COLORS } from './ResourceMap';

interface AdminConsoleModalProps {
  resources: Resource[];
  onClose: () => void;
  onEdit: (resource: Resource) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
  onBulkImport: (newResources: Resource[]) => void;
}

// Fallback Lat/Lng centers for La Plata Localities
const LOCALITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  'la plata': { lat: -34.9213, lng: -57.9544 },
  'centro': { lat: -34.9213, lng: -57.9544 },
  'casco': { lat: -34.9213, lng: -57.9544 },
  'joaquín gorina': { lat: -34.8988, lng: -58.0235 },
  'gorina': { lat: -34.8988, lng: -58.0235 },
  'arturo seguí': { lat: -34.8879, lng: -58.0894 },
  'seguí': { lat: -34.8879, lng: -58.0894 },
  'city bell': { lat: -34.8725, lng: -58.0494 },
  'el peligro': { lat: -34.9686, lng: -58.1633 },
  'melchor romero': { lat: -34.9312, lng: -58.0641 },
  'romero': { lat: -34.9312, lng: -58.0641 },
  'tolosa': { lat: -34.9015, lng: -57.9712 },
  'ringuelet': { lat: -34.8962, lng: -57.9825 },
  'gonnet': { lat: -34.8856, lng: -58.0162 },
  'manuel b. gonnet': { lat: -34.8856, lng: -58.0162 },
  'los hornos': { lat: -34.9455, lng: -57.9942 },
  'altos de san lorenzo': { lat: -34.9542, lng: -57.9625 },
  'villa elvira': { lat: -34.9436, lng: -57.9252 },
  'san carlos': { lat: -34.9315, lng: -57.9985 },
  'villa alba': { lat: -34.9512, lng: -57.9152 },
  'abasto': { lat: -34.9652, lng: -58.0772 },
  'hernández': { lat: -34.8895, lng: -58.0012 },
  'josé hernández': { lat: -34.8895, lng: -58.0012 },
  'lisandro olmos': { lat: -34.9582, lng: -58.0652 },
  'olmos': { lat: -34.9582, lng: -58.0652 },
  'arana': { lat: -34.9782, lng: -57.9452 },
  'ángel etcheverry': { lat: -34.9925, lng: -58.1123 },
  'etcheverry': { lat: -34.9925, lng: -58.1123 },
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeName(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export default function AdminConsoleModal({
  resources,
  onClose,
  onEdit,
  onDelete,
  onAddNew,
  onBulkImport
}: AdminConsoleModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'bulk'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ResourceCategory | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Bulk Upload States
  const [csvText, setCsvText] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [parsedPreviewList, setParsedPreviewList] = useState<Resource[]>([]);
  const [parsedStats, setParsedStats] = useState<{
    total: number;
    matched: number;
    newAdded: number;
    errorsCount: number;
  } | null>(null);
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Filter Resources (For Directorio Tab) ---
  const filtered = resources.filter((res) => {
    // 1. Text Search
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

    // 2. Category selection
    if (activeCategory !== 'all') {
      if (res.category !== activeCategory) return false;
    }

    return true;
  });

  // Calculate pages inside General Directory list
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const categoryOptions: { label: string; value: ResourceCategory | 'all'; icon: string }[] = [
    { label: 'Todos', value: 'all', icon: '🗺️' },
    { label: 'Educación', value: 'educacion', icon: '🎓' },
    { label: 'Salud', value: 'salud', icon: '🩺' },
    { label: 'Contención', value: 'contencion', icon: '🛡️' },
    { label: 'Comunidad', value: 'comunidad', icon: '🤝' },
    { label: 'Club/Recreación', value: 'recreacion', icon: '⚽' },
    { label: 'Derechos/Legal', value: 'legal', icon: '⚖️' },
    { label: 'Mis Pines/Otros', value: 'personal', icon: '⭐' }
  ];

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente el recurso "${name}" de la Red? Esta acción no se puede deshacer.`)) {
      onDelete(id);
      const updatedTotalPages = Math.ceil((filtered.length - 1) / itemsPerPage) || 1;
      if (currentPage > updatedTotalPages) {
        setCurrentPage(updatedTotalPages);
      }
    }
  };

  // --- Bulk CSV Parser (Client-Side implementation running synchronously) ---
  const handleValidateCSV = () => {
    setErrorMessage('');
    setIsSavedSuccessfully(false);
    
    if (!csvText.trim()) {
      setErrorMessage('Por favor ingresa texto CSV o arrastra un archivo válido.');
      return;
    }

    try {
      const lines = csvText.split(/\r?\n/).map(l => l.trim());
      if (lines.length < 2) {
        setErrorMessage('El documento no contiene suficientes filas. Debe contener al menos el encabezado y una fila de datos.');
        return;
      }

      // Compute averages from active resources per locality for precision
      const localityCoordsAcc: Record<string, { latSum: number; lngSum: number; count: number }> = {};
      resources.forEach((item) => {
        const match = item.address.match(/(Joaquín Gorina|Arturo Seguí|City Bell|El Peligro|Melchor Romero|Tolosa|Ringuelet|Gonnet|Los Hornos|Altos de San Lorenzo|Villa Elvira|San Carlos|Villa Alba|Abasto|Hernández|Lisandro Olmos|Arana|Ángel Etcheverry)/i);
        const loc = (match ? match[0] : '').toLowerCase().trim();
        if (loc && item.lat && item.lng) {
          if (!localityCoordsAcc[loc]) {
            localityCoordsAcc[loc] = { latSum: 0, lngSum: 0, count: 0 };
          }
          localityCoordsAcc[loc].latSum += item.lat;
          localityCoordsAcc[loc].lngSum += item.lng;
          localityCoordsAcc[loc].count += 1;
        }
      });

      const localityAverages: Record<string, { lat: number; lng: number }> = {};
      Object.keys(localityCoordsAcc).forEach((loc) => {
        const data = localityCoordsAcc[loc];
        localityAverages[loc] = {
          lat: data.latSum / data.count,
          lng: data.lngSum / data.count
        };
      });

      const importedList: Resource[] = [];
      let matchedCount = 0;
      let newAddedCount = 0;
      let errorsCount = 0;
      const usedIds = new Set<string>();

      // Parse headers
      const headers = parseCSVLine(lines[0]);
      const hasProperHeaders = headers.some(h => h.toUpperCase().includes('NOMBRE') || h.toUpperCase().includes('RECURSO') || h.toUpperCase().includes('DESCRIPCI'));
      
      // Determine columns order index with smart fallback matching
      let colDimensiones = headers.findIndex(h => h.toUpperCase().includes('DIMENSI'));
      let colRecurso = headers.findIndex(h => h.toUpperCase().includes('RECURSO') && !h.toUpperCase().includes('NOMBRE'));
      let colNombre = headers.findIndex(h => h.toUpperCase().includes('NOMBRE'));
      let colDescripcion = headers.findIndex(h => h.toUpperCase().includes('DESCRIPCI') || h.toUpperCase().includes('DETALLE'));
      let colDireccion = headers.findIndex(h => h.toUpperCase().includes('DIRECC') || h.toUpperCase().includes('CALLE'));
      let colLocalidad = headers.findIndex(h => h.toUpperCase().includes('LOCALI') || h.toUpperCase().includes('BARRIO'));
      let colContacto = headers.findIndex(h => h.toUpperCase().includes('CONTACTO') || h.toUpperCase().includes('TELEF'));
      let colZona = headers.findIndex(h => h.toUpperCase().includes('ZONA'));

      // If headers mismatch completely, fallback to default positions from standard template
      if (!hasProperHeaders || colNombre === -1) {
        colDimensiones = 0;
        colRecurso = 1;
        colNombre = 2;
        colDescripcion = 3;
        colDireccion = 4;
        colLocalidad = 5;
        colContacto = 6;
        colZona = 7;
      }

      // Loop lines starting from line 1
      for (let i = 1; i < lines.length; i++) {
        const currentLineText = lines[i];
        if (!currentLineText) continue;

        const row = parseCSVLine(currentLineText);
        // Skip incomplete rows
        if (row.length < 3) {
          errorsCount++;
          continue;
        }

        const rawDim = row[colDimensiones] || 'Promoción';
        const rawRec = row[colRecurso] || 'Comunidad';
        const rawNombre = row[colNombre] || '';
        const rawDesc = row[colDescripcion] || '';
        const rawDirecc = row[colDireccion] || '';
        const rawLocal = row[colLocalidad] || '';
        const rawCont = row[colContacto] || '';

        if (!rawNombre) {
          errorsCount++;
          continue;
        }

        // 1. Determine Category
        let category: ResourceCategory = 'comunidad';
        const dimNormalized = rawDim.toUpperCase();
        const recNormalized = rawRec.toUpperCase();

        if (dimNormalized.includes('SALUD ADOLESCENTE') || dimNormalized.includes('SALUD')) {
          category = 'salud';
        } else if (dimNormalized.includes('EDUCATIVA') || dimNormalized.includes('EDUCACION') || dimNormalized.includes('FORMACION LABORAL') || dimNormalized.includes('CENS')) {
          category = 'educacion';
        } else if (dimNormalized.includes('SEGURIDAD')) {
          category = 'legal';
        } else if (dimNormalized.includes('PROTECCION') || dimNormalized.includes('PROTECCIÓN ESPECIAL') || dimNormalized.includes('DERECHOS DE NNYA')) {
          category = 'contencion';
        } else if (dimNormalized.includes('PROMOCIÓN') || dimNormalized.includes('PROMOCION') || dimNormalized.includes('CUIDADO')) {
          if (recNormalized.includes('CLUBES') || recNormalized.includes('CLUB') || recNormalized.includes('DEPORTE')) {
            category = 'recreacion';
          } else {
            category = 'comunidad';
          }
        }

        // 2. Identify Management (isPublic or private/community-based)
        let isPublic = true;
        const descLower = rawDesc.toLowerCase();
        const recLower = rawRec.toLowerCase();

        if (
          descLower.includes('gestion privada') ||
          descLower.includes('gestión privada') ||
          descLower.includes('privado') ||
          descLower.includes('asociación civil') ||
          descLower.includes('asociacion civil') ||
          descLower.includes('organización civil') ||
          descLower.includes('colegio privado') ||
          descLower.includes('parroquial') ||
          descLower.includes('iglesia') ||
          descLower.includes('capilla') ||
          descLower.includes('parroquia') ||
          descLower.includes('diocesano') ||
          recLower.includes('iglesias') ||
          recLower.includes('clubes') ||
          recLower.includes('otro') ||
          descLower.includes('comunitario')
        ) {
          isPublic = false;
        }

        if (descLower.includes('gestion estatal') || descLower.includes('gestión estatal') || descLower.includes('publica') || descLower.includes('pública') || descLower.includes('oficial provincial')) {
          isPublic = true;
        }

        // 3. Guardia 24h
        let isGuardia24h = false;
        if (
          recLower.includes('subcomisaría') ||
          recLower.includes('comisaría') ||
          descLower.includes('24 horas') ||
          descLower.includes('santo') ||
          descLower.includes('guardia permanente') ||
          descLower.includes('24 hs') ||
          descLower.includes('urgencia 24hs')
        ) {
          isGuardia24h = true;
        }

        // 4. Target Age range
        let targetAge = 'Todo público';
        if (recLower.includes('secundarias') || recLower.includes('secundaria')) {
          targetAge = '12 - 18 años';
        } else if (recLower.includes('cens') || recLower.includes('nivel secundario s.')) {
          targetAge = '16+ años';
        } else if (descLower.includes('adolescentes y jovenes') || descLower.includes('adolescentes y jóvenes')) {
          targetAge = '12 - 25 años';
        } else if (descLower.includes('nnya') || descLower.includes('ninos') || descLower.includes('niños')) {
          targetAge = '0 - 18 años';
        }

        // 5. Look up name in existing list for coordinate mapping preservation
        const normName = normalizeName(rawNombre);
        const existing = resources.find((item) => normalizeName(item.name) === normName && !usedIds.has(item.id));

        let lat = -34.9213;
        let lng = -57.9544;
        let finalId = '';

        if (existing) {
          lat = existing.lat;
          lng = existing.lng;
          finalId = existing.id;
          usedIds.add(finalId);
          matchedCount++;
        } else {
          // Geocode using locality average fallbacks
          const localLower = rawLocal.toLowerCase().trim();
          let matchedCenter = localityAverages[localLower] || LOCALITY_CENTERS[localLower];
          if (!matchedCenter) {
            // sub-string evaluation matching
            const matchedKey = Object.keys(LOCALITY_CENTERS).find(
              (k) => localLower.includes(k) || k.includes(localLower)
            );
            if (matchedKey) {
              matchedCenter = LOCALITY_CENTERS[matchedKey];
            }
          }

          if (matchedCenter) {
            // Jitter coordinates within a 150m boundary to avoid strict stacking layers
            lat = matchedCenter.lat + (Math.random() - 0.5) * 0.005;
            lng = matchedCenter.lng + (Math.random() - 0.5) * 0.005;
          } else {
            // General La Plata default with moderate scatter
            lat = -34.9213 + (Math.random() - 0.5) * 0.02;
            lng = -57.9544 + (Math.random() - 0.5) * 0.02;
          }

          finalId = `${normName.substring(0, 35)}-${i}`;
          usedIds.add(finalId);
          newAddedCount++;
        }

        importedList.push({
          id: finalId,
          name: rawNombre.trim(),
          category,
          subcategory: rawRec ? rawRec.trim() : rawDim.trim(),
          address: rawDirecc ? rawDirecc.trim() : rawLocal ? `${rawLocal.trim()}, La Plata` : 'La Plata, Buenos Aires',
          lat,
          lng,
          description: rawDesc ? rawDesc.trim() : `${rawNombre.trim()} - Recurso asistencial en localidad de ${rawLocal || 'La Plata'}.`,
          targetAge,
          isPublic,
          isGuardia24h,
          phone: rawCont ? rawCont.trim() : undefined,
          isCustom: true
        });
      }

      setParsedPreviewList(importedList);
      setParsedStats({
        total: importedList.length,
        matched: matchedCount,
        newAdded: newAddedCount,
        errorsCount: errorsCount
      });

    } catch (err: any) {
      setErrorMessage(`Ocurrió un error al procesar el archivo: ${err.message || err}`);
    }
  };

  const handleApplyImport = async () => {
    if (parsedPreviewList.length === 0) {
      setErrorMessage('No hay recursos válidos procesados para importar.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    let finalResourcesToSave: Resource[] = [];
    if (importMode === 'append') {
      // Combinar: keep non-overlapping previous records, override exact matching names
      const previewNormalizedNames = new Set(parsedPreviewList.map(item => normalizeName(item.name)));
      const preservedLegacy = resources.filter(res => !previewNormalizedNames.has(normalizeName(res.name)));
      finalResourcesToSave = [...preservedLegacy, ...parsedPreviewList];
    } else {
      // Sobrescribir: Solamente usar la lista del CSV
      finalResourcesToSave = [...parsedPreviewList];
    }

    try {
      const response = await fetch('/api/resources/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': 'admin',
        },
        body: JSON.stringify(finalResourcesToSave)
      });

      if (response.ok) {
        const payloadFromDb = await response.json();
        onBulkImport(payloadFromDb);
        setIsSavedSuccessfully(true);
        setParsedPreviewList([]);
        setCsvText('');
        setParsedStats(null);
      } else {
        const errJson = await response.json();
        setErrorMessage(errJson.error || 'Error de procesamiento en la consola de servidor.');
      }
    } catch (err: any) {
      setErrorMessage(`Fallo de conexión con el backend: ${err.message || 'Servidor inalcanzable'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      setIsSavedSuccessfully(false);
    };
    reader.readAsText(file);
  };

  const handleCopyTemplate = () => {
    const templateHeader = "DIMENSIONES;RECURSO;NOMBRE DEL RECURSO/PROGRAMA;DESCRIPCIÓN DEL RECURSO;DIRECCIÓN;LOCALIDAD;CONTACTO;ZONA\n" +
      "PROMOCIÓN;Escuelas Secundarias;ESCUELA DE PRUEBA;Ofrece formación pública obligatoria para jóvenes;Calle 15 nro. 450;City Bell;221-456789;ZONA NORTE";
    navigator.clipboard.writeText(templateHeader);
    alert('Estructura de columnas copiada al portapapeles. Puedes pegarla en tu Excel o bloc de notas.');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-[1100] flex items-center justify-center p-4 overflow-y-auto animate-fade-in pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 15 }}
        className="bg-white rounded-2xl shadow-3xl border border-slate-150 max-w-5xl w-full flex flex-col h-[85vh] overflow-hidden relative font-sans"
      >
        {/* Header Console with Navigation Tab Buttons */}
        <div className="px-6 py-4.5 border-b border-slate-100 bg-linear-to-b from-slate-50/50 to-white flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs shrink-0">
              <ShieldAlert className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-800 font-display leading-tight">
                Mesa de Administración y Carga Masiva
              </h1>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                Total registrado: <span className="text-indigo-600 font-extrabold">{resources.length}</span> activos | Base de datos persistente
              </p>
            </div>
          </div>

          {/* Navigation Tabs Pill Toggler */}
          <div className="flex bg-slate-100 p-1 rounded-xl self-start border border-slate-150">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                activeTab === 'list' 
                  ? 'bg-white text-slate-800 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Directorio General</span>
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                activeTab === 'bulk' 
                  ? 'bg-white text-slate-800 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Carga Masiva (CSV)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {activeTab === 'list' && (
              <button
                onClick={onAddNew}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black px-4 py-2 rounded-xl transition hover:shadow-lg hover:shadow-indigo-100 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>CARGAR RECURSO</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-150 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title="Cerrar Consola"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ==================================== */}
        {/* TAB 1: INDIVIDUAL RESOURCES DIRECTORY */}
        {/* ==================================== */}
        {activeTab === 'list' && (
          <>
            {/* Filter Controls Bar */}
            <div className="px-6 py-3 border-b border-slate-50 bg-slate-50/30 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
              {/* Quick Real-time search inside console */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  className="w-full bg-slate-100 hover:bg-slate-200/60 focus:bg-white border-none rounded-xl py-2 pl-10 pr-4 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Buscar por nombre, barrio, etc..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* Category Tabs inside panel */}
              <div className="flex flex-wrap gap-1 w-full sm:w-auto items-center justify-start sm:justify-end">
                {categoryOptions.map((opt) => {
                  const isSelected = activeCategory === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setActiveCategory(opt.value);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer select-none ${
                        isSelected
                          ? 'bg-slate-800 border-slate-800 text-white'
                          : 'bg-white border-slate-150 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Console Table view */}
            <div className="flex-1 overflow-x-auto min-h-0">
              {filtered.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50/20">
                  <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mb-3">
                    <Search className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 font-display">No hay registros con estos filtros</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Verifica el texto ingresado o cambia de categoría en el menú de arriba.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-50/50 sticky top-0 z-10">
                      <th className="py-3 px-6 w-[250px]">Nombre del Recurso</th>
                      <th className="py-3 px-4 w-[160px]">Categoría / Especialidad</th>
                      <th className="py-3 px-4">Dirección / Localidad</th>
                      <th className="py-3 px-4 w-[120px] text-center">Atributos</th>
                      <th className="py-3 px-6 w-[110px] text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {paginatedItems.map((item) => {
                      const colorConfig = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.personal;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-6 font-bold text-slate-800 max-w-[250px] truncate" title={item.name}>
                            <div className="flex flex-col gap-0.5">
                              <span className="truncate">{item.name}</span>
                              {item.isCustom && (
                                <span className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-0.5">
                                  ✨ Agregado del Admin
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-extrabold text-[9px] uppercase tracking-wider text-slate-450 flex items-center gap-1.5 grayscale opacity-80">
                                <span>{colorConfig.icon}</span>
                                <span>{item.category}</span>
                              </span>
                              <span className="text-slate-500 font-medium truncate max-w-[150px]">{item.subcategory}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-medium truncate max-w-[220px]" title={item.address}>
                            {item.address}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex justify-center flex-wrap gap-1 max-w-[120px] mx-auto select-none">
                              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                                item.isPublic ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' : 'bg-amber-50 text-amber-700 border border-amber-150'
                              }`}>
                                {item.isPublic ? 'Público' : 'Social/Org'}
                              </span>
                              {item.isGuardia24h && (
                                <span className="bg-rose-50 text-rose-700 border border-rose-150 px-1.5 py-0.5 rounded-md text-[9px] font-black">
                                  24h
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-6 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => onEdit(item)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg transition-all cursor-pointer"
                                title="Editar recurso"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(item.id, item.name)}
                                className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50/60 rounded-lg transition-all cursor-pointer"
                                title="Eliminar recurso"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Pagination controls */}
            <div className="px-6 py-4 border-t border-slate-100 bg-linear-to-t from-slate-50/50 to-white flex items-center justify-between shrink-0 text-xs shadow-inner">
              <span className="text-slate-400 font-medium">
                Mostrando resultados <span className="font-bold text-slate-700">{Math.min(startIndex + 1, filtered.length)}</span> al <span className="font-bold text-slate-700">{Math.min(startIndex + itemsPerPage, filtered.length)}</span> de <span className="font-bold text-indigo-600">{filtered.length}</span>
              </span>

              <div className="flex items-center gap-1.5 select-none">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-1.5 rounded-lg border border-slate-150 transition flex items-center justify-center cursor-pointer ${
                    currentPage === 1 ? 'opacity-40 cursor-not-allowed text-slate-300' : 'hover:bg-slate-50 text-slate-500'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = currentPage;
                  if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  if (pageNum < 1 || pageNum > totalPages) return null;

                  const isCurrent = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-7.5 h-7.5 rounded-lg text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer border ${
                        isCurrent
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                          : 'bg-white border-slate-150 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-1.5 rounded-lg border border-slate-150 transition flex items-center justify-center cursor-pointer ${
                    currentPage === totalPages ? 'opacity-40 cursor-not-allowed text-slate-300' : 'hover:bg-slate-50 text-slate-500'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* ============================== */}
        {/* TAB 2: MASS BULK LOAD WITH CSV */}
        {/* ============================== */}
        {activeTab === 'bulk' && (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            
            {/* Banner Instructions & Template Reference */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 flex flex-col md:flex-row gap-5 items-start justify-between">
              <div className="space-y-2">
                <h3 className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                  <FileText className="w-4.5 h-4.5 text-indigo-600" />
                  ¿Cómo preparar tu archivo de datos?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  Para cargar masivamente, ingresa una lista separada por <strong>puntos y comas ( ; )</strong>. Si el sistema detecta cabeceras correspondientes, las mapeará automáticamente. De lo contrario, se utilizará el orden de la plantilla. Las ubicaciones geográficas de cada localidad de La Plata serán resguardadas y scattereadas en el mapa de forma automática.
                </p>
                <div className="bg-slate-800 text-slate-300 font-mono text-[9px] p-2.5 rounded-lg select-text overflow-x-auto w-full max-w-xl pointer-events-auto leading-normal">
                  DIMENSIONES;RECURSO;NOMBRE DEL RECURSO;DESCRIPCIÓN DEL RECURSO;DIRECCIÓN;LOCALIDAD;CONTACTO;ZONA
                </div>
              </div>

              <button
                onClick={handleCopyTemplate}
                className="flex items-center gap-1.5 border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 text-[10px] font-black px-3.5 py-2.5 rounded-xl transition cursor-pointer self-stretch md:self-auto justify-center active:scale-95"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>COPIAR PLANTILLA</span>
              </button>
            </div>

            {/* Error messaging bar */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-150 p-4 rounded-xl text-red-800 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-650 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success messaging bar */}
            {isSavedSuccessfully && (
              <div className="bg-emerald-50 border border-emerald-150 p-4.5 rounded-xl text-emerald-800 text-xs flex items-center gap-2.5 animate-fade-in">
                <CheckCircle2 className="w-5.5 h-5.5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-extrabold text-[13px]">¡Carga Masiva guardada con éxito en el Servidor!</p>
                  <p className="text-emerald-700 mt-0.5 font-medium">
                    La Red de Recursos Juveniles ha sido enriquecida e indexada. Los marcadores y coordenadas se han actualizado en tiempo real.
                  </p>
                </div>
              </div>
            )}

            {/* Action panel & Textarea inputs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-[250px]">
              
              {/* CSV Input Panel */}
              <div className="lg:col-span-7 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Pega los datos del CSV (delimitados por ';')</span>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-600 hover:text-indigo-800 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Seleccionar Archivo (.csv / .txt)</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv,.txt"
                    className="hidden"
                  />
                </div>

                <div className="flex-1 relative">
                  <textarea
                    className="w-full h-full min-h-[180px] bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 hover:border-slate-350 focus:ring-2 focus:focus:ring-indigo-200 rounded-xl p-4 text-xs font-mono text-slate-700 focus:outline-none transition-all placeholder:text-slate-400 leading-normal resize-none"
                    placeholder="DIMENSIONES;RECURSO;NOMBRE DEL RECURSO/PROGRAMA;DESCRIPCIÓN DEL RECURSO;DIRECCIÓN;LOCALIDAD;CONTACTO;ZONA&#10;Salud;Centro de Salud;CENTRO DE SALUD Nº N;Atención médica primaria;Calle 54 nro 200;La Plata;221-123456;ZONA CENTRO"
                    value={csvText}
                    onChange={(e) => {
                      setCsvText(e.target.value);
                      setIsSavedSuccessfully(false);
                    }}
                  />
                </div>
              </div>

              {/* Import Options Panel */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col gap-4.5 justify-between">
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Opciones de Importación</h4>
                  
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="mt-0.5 text-indigo-600 ring-indigo-500"
                      />
                      <div>
                        <span className="text-xs font-black text-slate-800 block">Combinar / Agregar nuevos (Guardar anterior)</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Preserva los recursos que ya tienes y agrega únicamente los nuevos. Si un recurso se llama igual, actualizará su información pero preservará su ubicación.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer select-none mt-1">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="mt-0.5 text-indigo-600 ring-indigo-500"
                      />
                      <div>
                        <span className="text-xs font-black text-red-750 block">Sobrescribir toda la base (Reemplazo total)</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5 text-red-900/80">
                          <strong>¡Atención!</strong> Se eliminarán todos los recursos de la base de datos del servidor y se reemplazarán en su totalidad por los cargados aquí.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleValidateCSV}
                    className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs py-3.5 rounded-xl transition cursor-pointer active:scale-95 flex items-center justify-center gap-1"
                  >
                    <span>⚡ VALIDAR DATOS</span>
                  </button>

                  {parsedPreviewList.length > 0 && (
                    <button
                      onClick={handleApplyImport}
                      disabled={isSaving}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3.5 rounded-xl transition cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      {isSaving ? (
                        <span>Guardando...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>IMPORTAR {parsedPreviewList.length} ITEMS</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Validation Live Preview Results */}
            {parsedStats && (
              <div className="border border-slate-205 rounded-xl overflow-hidden mt-2 bg-white flex-1 min-h-[250px] flex flex-col">
                {/* Stats summary header */}
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h4 className="text-xs font-black text-slate-700">Resultado de la Validación del Lector</h4>
                  </div>

                  <div className="flex gap-3 text-xs select-none">
                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-900 px-2 py-0.5 rounded-md font-bold text-[10px]">
                      Totales legibles: <strong className="font-black text-indigo-700">{parsedStats.total}</strong>
                    </span>
                    <span className="bg-teal-50 border border-teal-100 text-teal-900 px-2 py-0.5 rounded-md font-bold text-[10px]">
                      Coordenadas existentes: <strong className="font-black text-teal-700">{parsedStats.matched}</strong>
                    </span>
                    <span className="bg-amber-50 border border-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-bold text-[10px]">
                      Nuevos geolocalizados: <strong className="font-black text-amber-700">{parsedStats.newAdded}</strong>
                    </span>
                    {parsedStats.errorsCount > 0 && (
                      <span className="bg-rose-50 border border-rose-100 text-rose-900 px-2 py-0.5 rounded-md font-bold text-[10px]">
                        Errores omitidos: <strong>{parsedStats.errorsCount}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Table containing the preview */}
                <div className="flex-1 overflow-y-auto max-h-[300px]">
                  <table className="w-full text-left text-xs border-collapse divide-y divide-slate-100">
                    <thead className="bg-slate-50/40 sticky top-0 font-bold text-[10px] uppercase text-slate-400">
                      <tr>
                        <th className="py-2.5 px-4">Nombre del Recurso</th>
                        <th className="py-2.5 px-4">Categoría Mapeada</th>
                        <th className="py-2.5 px-4">Especialidad (Recurso)</th>
                        <th className="py-2.5 px-4">Dirección o Jurisdicción</th>
                        <th className="py-2.5 px-4">Rango Edad</th>
                        <th className="py-2.5 px-4">Tipo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium text-slate-750">
                      {parsedPreviewList.map((item, idx) => {
                        const colorConfig = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.personal;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-4 font-black text-slate-800 text-xs">{item.name}</td>
                            <td className="py-2 px-4 text-[10px]">
                              <span className="px-1.5 py-0.5 rounded-md uppercase font-extrabold tracking-wide text-slate-600 border bg-slate-50/80 inline-flex items-center gap-1">
                                <span>{colorConfig.icon}</span>
                                <span>{item.category}</span>
                              </span>
                            </td>
                            <td className="py-2 px-4 text-slate-500 font-medium">{item.subcategory}</td>
                            <td className="py-2 px-4 text-slate-500 font-medium">{item.address}</td>
                            <td className="py-2 px-4 font-bold text-slate-600 font-sans text-[10px]">{item.targetAge}</td>
                            <td className="py-2 px-4 font-bold text-[10px]">
                              <span className={item.isPublic ? "text-indigo-600" : "text-amber-600"}>
                                {item.isPublic ? "Público estatal" : "Social / Priv"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex justify-end shrink-0">
                  <button
                    onClick={handleApplyImport}
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    {isSaving ? (
                      <span>Guardando en Servidor...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar e Importar {parsedPreviewList.length} Recursos en la Red</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </motion.div>
    </div>
  );
}
