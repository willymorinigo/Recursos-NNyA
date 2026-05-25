import * as fs from 'fs';
import * as path from 'path';

// Types
type ResourceCategory = 'educacion' | 'salud' | 'contencion' | 'comunidad' | 'recreacion' | 'legal' | 'personal';

interface Resource {
  id: string;
  name: string;
  category: ResourceCategory;
  subcategory: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  email?: string;
  hours?: string;
  description: string;
  targetAge?: string;
  isPublic: boolean;
  isGuardia24h?: boolean;
  isCustom?: boolean;
  notes?: string;
}

// Fallback Centers for La Plata Localities
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

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // remove accents
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function runImport() {
  console.log('Starting resource import process...');

  const dbPath = path.join(process.cwd(), 'db-resources.json');
  const csvPath = path.join(process.cwd(), 'csv_raw.txt');

  if (!fs.existsSync(csvPath)) {
    console.error('Error: csv_raw.txt not found.');
    return;
  }

  // 1. Read existing database to preserve coords and names
  let existingList: Resource[] = [];
  if (fs.existsSync(dbPath)) {
    try {
      const dbContent = fs.readFileSync(dbPath, 'utf8');
      existingList = JSON.parse(dbContent);
      console.log(`Loaded ${existingList.length} existing database records of reference.`);
    } catch (err) {
      console.warn('Could not parse db-resources.json, will create afresh.', err);
    }
  }

  // Calculate Average Coordinates per Locality from existing geocoded records for precision
  const localityCoordsAcc: Record<string, { latSum: number; lngSum: number; count: number }> = {};
  existingList.forEach((item) => {
    // extract fallback locality
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
  console.log('Computed local averages for:', Object.keys(localityAverages));

  // 2. Read and parse lines from csv_raw.txt
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split(/\r?\n/);
  console.log(`Analyzing raw CSV. Total lines: ${lines.length}`);

  const header = parseCSVLine(lines[0]);
  console.log('CSV Headers:', header);

  const importedList: Resource[] = [];
  let addedCount = 0;
  let updatedCount = 0;
  const usedIds = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row = parseCSVLine(line);
    if (row.length < 5) {
      // Incomplete row
      continue;
    }

    const [dimensiones, recurso, nombre, descripcion, direccion, localidad, contacto, zona] = row;

    if (!nombre || !dimensiones) continue;

    // Determine category from DIMENSIONES and RECURSO
    let category: ResourceCategory = 'comunidad';
    const dimNormalized = dimensiones.toUpperCase();
    const recNormalized = (recurso || '').toUpperCase();

    if (dimNormalized.includes('SALUD ADOLESCENTE')) {
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

    // Determine isPublic
    let isPublic = true;
    const descLower = (descripcion || '').toLowerCase();
    const nameLower = nombre.toLowerCase();
    const recLower = (recurso || '').toLowerCase();

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

    // Secondary checks for public
    if (descLower.includes('gestion estatal') || descLower.includes('gestión estatal') || descLower.includes('publica') || descLower.includes('pública') || descLower.includes('oficial provincial')) {
      isPublic = true;
    }

    // Guardia 24h
    let isGuardia24h = false;
    if (
      recLower.includes('subcomisaría') ||
      recLower.includes('comisaría') ||
      descLower.includes('24 horas') ||
      descLower.includes('24 hs') ||
      descLower.includes('urgencia 24hs')
    ) {
      isGuardia24h = true;
    }

    // Target age range
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

    // Find if record exists in our catalog
    const normName = normalize(nombre);
    const existing = existingList.find((item) => normalize(item.name) === normName && !usedIds.has(item.id));

    let lat = -34.9213;
    let lng = -57.9544;
    let finalId = '';

    if (existing) {
      lat = existing.lat;
      lng = existing.lng;
      finalId = existing.id;
      usedIds.add(finalId);
      updatedCount++;
    } else {
      // Find coordinates from averages or centers
      const localLower = (localidad || '').toLowerCase().trim();
      let matchedCenter = localityAverages[localLower] || LOCALITY_CENTERS[localLower];
      if (!matchedCenter) {
        // try sub-match
        const key = Object.keys(LOCALITY_CENTERS).find((k) => localLower.includes(k) || k.includes(localLower));
        if (key) {
          matchedCenter = LOCALITY_CENTERS[key];
        }
      }

      if (matchedCenter) {
        // Add random safety jitter (~150 meters) so they don't stack
        lat = matchedCenter.lat + (Math.random() - 0.5) * 0.005;
        lng = matchedCenter.lng + (Math.random() - 0.5) * 0.005;
      } else {
        // La Plata center default with jitter
        lat = -34.9213 + (Math.random() - 0.5) * 0.02;
        lng = -57.9544 + (Math.random() - 0.5) * 0.02;
      }

      // Generate secure unique ID
      const baseId = normalize(nombre).substring(0, 35);
      finalId = `${baseId}-${i}`;
      usedIds.add(finalId);
      addedCount++;
    }

    const parsedResource: Resource = {
      id: finalId,
      name: nombre.trim(),
      category,
      subcategory: recurso ? recurso.trim() : dimensiones.trim(),
      address: direccion ? direccion.trim() : localidad ? `${localidad.trim()}, La Plata` : 'La Plata, Buenos Aires',
      lat,
      lng,
      description: descripcion ? descripcion.trim() : `${nombre.trim()} - Recurso asistencial en localidad de ${localidad || 'La Plata'}.`,
      targetAge,
      isPublic,
      isGuardia24h,
      phone: contacto ? contacto.trim() : undefined
    };

    importedList.push(parsedResource);
  }

  console.log(`Parsed ${importedList.length} total resources from CSV.`);
  console.log(`Matched (Preserved locations): ${updatedCount}, Brand New Added: ${addedCount}`);

  // 3. Keep any legacy custom resources added by the user manually (not starting with standard IDs)
  const manualCustoms = existingList.filter(item => item.isCustom && !usedIds.has(item.id));
  manualCustoms.forEach(item => usedIds.add(item.id));
  console.log(`Preserved ${manualCustoms.length} legacy manually added custom markers.`);

  const finalMergedList = [...importedList, ...manualCustoms];

  // 4. Save to db-resources.json
  fs.writeFileSync(dbPath, JSON.stringify(finalMergedList, null, 2), 'utf8');
  console.log(`Saved ${finalMergedList.length} items to db-resources.json`);

  // 5. Keep client-side src/data.ts synchronized
  const srcDataFilePath = path.join(process.cwd(), 'src', 'data.ts');
  const fileContents = `import { Resource } from './types';\n\nexport const DEFAULT_RESOURCES: Resource[] = ${JSON.stringify(finalMergedList, null, 2)};\n`;
  fs.writeFileSync(srcDataFilePath, fileContents, 'utf8');
  console.log(`Saved ${finalMergedList.length} items to src/data.ts`);
}

runImport();
