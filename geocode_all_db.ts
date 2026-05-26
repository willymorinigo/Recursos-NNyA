import * as fs from 'fs';
import * as path from 'path';

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

const isFallbackCoordinate = (lat: number, lng: number): boolean => {
  for (const key of Object.keys(LOCALITY_CENTERS)) {
    const center = LOCALITY_CENTERS[key];
    if (Math.abs(lat - center.lat) < 0.015 && Math.abs(lng - center.lng) < 0.015) {
      return true;
    }
  }
  return false;
};

// Sleep function matching rate-limiting delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function geocodeAddress(addressText: string): Promise<{ lat: number; lng: number } | null> {
  try {
    let query = addressText;
    if (!query.toLowerCase().includes('la plata')) {
      query += ', La Plata, Buenos Aires, Argentina';
    } else if (!query.toLowerCase().includes('argentina')) {
      query += ', Argentina';
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'YouthResourcesApp/1.0.0 (willymorinigo@gmail.com)'
      }
    });

    if (response.status === 429) {
      console.log('Rate limited! Waiting 7 seconds to retry...');
      await sleep(7000);
      return geocodeAddress(addressText);
    }

    if (response.ok) {
      const results = await response.json();
      if (results && results.length > 0) {
        return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
      }
    }

    // Try simplified fallback query logic
    let simplifiedQuery = addressText;
    simplifiedQuery = simplifiedQuery
      .replace(/e\/\s*\d+\s*y\s*\d+/gi, '')
      .replace(/esq\.?\s*\d+/gi, '')
      .replace(/\s+y\s+\d+/gi, '');

    if (!simplifiedQuery.toLowerCase().includes('la plata')) {
      simplifiedQuery += ', La Plata, Buenos Aires, Argentina';
    }

    const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(simplifiedQuery)}&limit=1`;
    const fallbackRes = await fetch(fallbackUrl, {
      headers: {
        'User-Agent': 'YouthResourcesApp/1.0.0 (willymorinigo@gmail.com)'
      }
    });

    if (fallbackRes.status === 429) {
      console.log('Rate limited on fallback! Waiting 7 seconds to retry...');
      await sleep(7000);
      return geocodeAddress(addressText);
    }

    if (fallbackRes.ok) {
      const fallbackResults = await fallbackRes.json();
      if (fallbackResults && fallbackResults.length > 0) {
        return { lat: parseFloat(fallbackResults[0].lat), lng: parseFloat(fallbackResults[0].lon) };
      }
    }
  } catch (e) {
    console.error("Geocoding runtime error for address:", addressText, e);
  }
  return null;
}

async function runGeocodingBatch() {
  const dbPath = path.join(process.cwd(), 'db-resources.json');
  const srcDataFilePath = path.join(process.cwd(), 'src', 'data.ts');

  if (!fs.existsSync(dbPath)) {
    console.error('db-resources.json does not exist. Run import_csv first.');
    return;
  }

  const databaseList = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const fallbackList = databaseList.filter((item: any) => isFallbackCoordinate(item.lat, item.lng));

  console.log(`Starting geocoding batch run...`);
  console.log(`To Process (fallback coords): ${fallbackList.length} out of ${databaseList.length} total entries.`);

  let successes = 0;
  let failures = 0;
  let count = 0;

  for (const item of fallbackList) {
    count++;
    console.log(`[${count}/${fallbackList.length}] Processing "${item.name}"... Address: "${item.address}"`);

    const result = await geocodeAddress(item.address);
    if (result) {
      successes++;
      // Update coordinates in the list
      const dbItem = databaseList.find((x: any) => x.id === item.id);
      if (dbItem) {
        dbItem.lat = result.lat;
        dbItem.lng = result.lng;
      }
      console.log(`  -> SUCCESS! Found: ${result.lat}, ${result.lng}`);
    } else {
      failures++;
      console.log(`  -> FAILED to geocode. Keeping original jittered center.`);
    }

    // Save incrementally every 5 requests to protect progress
    if (count % 5 === 0 || count === fallbackList.length) {
      console.log(`[Incremental Backup] Saving active list state of ${databaseList.length} items...`);
      fs.writeFileSync(dbPath, JSON.stringify(databaseList, null, 2), 'utf8');
      
      const fileContents = `import { Resource } from './types';\n\nexport const DEFAULT_RESOURCES: Resource[] = ${JSON.stringify(databaseList, null, 2)};\n`;
      fs.writeFileSync(srcDataFilePath, fileContents, 'utf8');
    }

    // Comply with 1 request per second Nominatim terms of service
    await sleep(1150);
  }

  console.log('=== Batch Geocoding Completed ===');
  console.log(`Total Handled Fallbacks: ${fallbackList.length}`);
  console.log(`Geocoding Successes: ${successes}`);
  console.log(`Geocoding Failures/Unsolved: ${failures}`);
}

runGeocodingBatch();
