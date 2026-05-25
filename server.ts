import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { DEFAULT_RESOURCES } from "./src/data";
import { Resource } from "./src/types";

const app = express();
const PORT = 3000;
const DATABASE_FILE = path.join(process.cwd(), "db-resources.json");
const BACKUPS_DIR = path.join(process.cwd(), "backups");

// Middleware to parse JSON bodies with a highly generous limit for bulk uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Helper function to handle automatic database backups with its timestamp/date every 15 days
function checkAndCreateBackup() {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const files = fs.readdirSync(BACKUPS_DIR);
    const backupFiles = files.filter(f => f.startsWith("backup-") && f.endsWith(".json"));

    let shouldBackup = false;

    if (backupFiles.length === 0) {
      shouldBackup = true;
    } else {
      let latestTime = 0;
      backupFiles.forEach(file => {
        try {
          const filePath = path.join(BACKUPS_DIR, file);
          const stats = fs.statSync(filePath);
          if (stats.mtimeMs > latestTime) {
            latestTime = stats.mtimeMs;
          }
        } catch (e) {
          // Ignore stats errors
        }
      });

      const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      if (now - latestTime >= fifteenDaysMs) {
        shouldBackup = true;
      }
    }

    if (shouldBackup) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      
      const backupFileName = `backup-${year}-${month}-${day}_${hours}-${minutes}.json`;
      const backupPath = path.join(BACKUPS_DIR, backupFileName);
      
      if (fs.existsSync(DATABASE_FILE)) {
        fs.copyFileSync(DATABASE_FILE, backupPath);
        console.log(`[Backup] Creado backup automático de seguridad: ${backupFileName}`);
      }
    }
  } catch (error) {
    console.error("Error al procesar el backup automático:", error);
  }
}

// Security Middleware to restrict writing/deleting endpoints only for administrator
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["x-admin-auth"];
  if (authHeader === "admin") {
    next();
  } else {
    console.warn(`[API Security] Intento de acceso denegado sin credenciales admin desde IP ${req.ip}`);
    res.status(403).json({ error: "Acceso denegado: Se requiere perfil de administrador para realizar esta operación." });
  }
}

// Helper functions for Database
function getResourcesFromDb(): Resource[] {
  try {
    if (fs.existsSync(DATABASE_FILE)) {
      const data = fs.readFileSync(DATABASE_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading db-resources.json, fallback to defaults:", error);
  }

  // Seed database on first run
  try {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(DEFAULT_RESOURCES, null, 2), "utf8");
  } catch (error) {
    console.error("Could not write initial db-resources.json seed:", error);
  }
  return DEFAULT_RESOURCES;
}

function saveResourcesToDb(data: Resource[]) {
  try {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2), "utf8");
    // Trigger backup check after successful saves
    checkAndCreateBackup();
  } catch (error) {
    console.error("Could not persist data to db-resources.json:", error);
    throw new Error("Fallo de escritura en base de datos");
  }
}

// Ensure database file is initialized and backup checked on bootup
getResourcesFromDb();
checkAndCreateBackup();

// Clean background checker every 12 hours for backups when the server is idle
setInterval(checkAndCreateBackup, 12 * 60 * 60 * 1000);

// --- REST API ENDPOINTS FOR RESOURCES ---

// HEALTH
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", backend: "express", database: "json_file" });
});

// GET ALL RESOURCES
app.get("/api/resources", (_req, res) => {
  try {
    const list = getResourcesFromDb();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "No se pudo recuperar la lista de recursos" });
  }
});

// SAVE OR UPDATE RESOURCE
app.post("/api/resources", requireAdmin, (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming.name || !incoming.category || !incoming.subcategory) {
      return res.status(400).json({ error: "Faltan campos obligatorios para guardar el recurso" });
    }

    const currentList = getResourcesFromDb();
    let updatedList: Resource[] = [];

    if (incoming.id) {
      // Editing existing resource
      const targetId = incoming.id;
      const index = currentList.findIndex((item) => item.id === targetId);
      
      if (index !== -1) {
        // Keep isCustom or metadata
        const existing = currentList[index];
        const updatedResource: Resource = {
          ...existing,
          ...incoming,
        };
        updatedList = [...currentList];
        updatedList[index] = updatedResource;
      } else {
        // If ID provided but not found, insert as custom
        const updatedResource: Resource = {
          ...incoming,
          isCustom: true,
        };
        updatedList = [updatedResource, ...currentList];
      }
    } else {
      // Create new custom resource
      const newResource: Resource = {
        ...incoming,
        id: `custom-${Date.now()}`,
        isCustom: true,
      };
      updatedList = [newResource, ...currentList];
    }

    saveResourcesToDb(updatedList);
    res.status(200).json(updatedList);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar la base de datos" });
  }
});

// SAVE A BULK OF RESOURCES (OVERWRITE OR APPEND)
app.post("/api/resources/bulk", requireAdmin, (req, res) => {
  try {
    const list = req.body;
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: "Los datos deben ser una lista (array) de recursos" });
    }

    // Deduplicate entries by ID
    const seen = new Set<string>();
    const deduplicatedList = list.filter(item => {
      if (!item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    saveResourcesToDb(deduplicatedList);

    // Keep src/data.ts synchronized for complete local fallback compatibility
    const srcDataFilePath = path.join(process.cwd(), "src", "data.ts");
    const fileContents = `import { Resource } from './types';\n\nexport const DEFAULT_RESOURCES: Resource[] = ${JSON.stringify(deduplicatedList, null, 2)};\n`;
    try {
      fs.writeFileSync(srcDataFilePath, fileContents, "utf8");
    } catch (err) {
      console.error("Could not write src/data.ts synchronization:", err);
    }

    res.status(200).json(deduplicatedList);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar la base de datos de forma masiva" });
  }
});

// DELETE RESOURCE BY ID
app.delete("/api/resources/:id", requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const currentList = getResourcesFromDb();
    const filteredList = currentList.filter((item) => item.id !== id);

    saveResourcesToDb(filteredList);
    res.status(200).json(filteredList);
  } catch (error) {
    res.status(500).json({ error: "No se pudo eliminar el recurso de la base de datos" });
  }
});

// RESET ENTIRE DATABASE TO ORIGINALS
app.post("/api/resources/reset", requireAdmin, (_req, res) => {
  try {
    saveResourcesToDb(DEFAULT_RESOURCES);
    res.status(200).json(DEFAULT_RESOURCES);
  } catch (error) {
    res.status(500).json({ error: "Fallo al restaurar la base de datos a sus valores iniciales" });
  }
});

// --- VITE INTERFACES SETUP ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
