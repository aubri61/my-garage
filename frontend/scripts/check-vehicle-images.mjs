import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = path.join(root, "features/vehicle-registration/vehicle-media.json");
const entries = JSON.parse(fs.readFileSync(manifest, "utf8"));
for (const entry of entries) {
  if (entry.imageFile && !/^[a-z0-9][a-z0-9_-]*\.(webp|png|jpe?g)$/i.test(entry.imageFile)) throw new Error(`Invalid local image filename for ${entry.key}`);
  const file = path.join(root, "public/images/vehicles/catalog", entry.imageFile);
  entry.imageReady = !!entry.imageFile && fs.existsSync(file) && fs.statSync(file).isFile() && fs.statSync(file).size > 0;
}
const updated = `${JSON.stringify(entries, null, 2)}\n`;
if (fs.readFileSync(manifest, "utf8") !== updated) fs.writeFileSync(manifest, updated);
console.log(`Vehicle images: ${entries.filter(entry => entry.imageReady).length}/${entries.length} uploaded; missing images use existing photos or placeholders.`);
