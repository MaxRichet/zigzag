// Télécharge Switzer (variable) depuis Fontshare si elle manque.
// La licence ITF FFL autorise l'auto-hébergement mais interdit de redistribuer la police
// via un dépôt public : le fichier est donc ignoré par git et récupéré avant dev/build.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const FILE = "app/fonts/Switzer-Variable.woff2";

if (!existsSync(FILE)) {
  const css = await (await fetch("https://api.fontshare.com/v2/css?f[]=switzer@1")).text();
  const url = css.match(/url\('([^']+\.woff2)'\)/)?.[1];
  if (!url) throw new Error("Switzer : URL woff2 introuvable dans la réponse Fontshare");
  const res = await fetch(url.startsWith("//") ? `https:${url}` : url);
  if (!res.ok) throw new Error(`Switzer : téléchargement impossible (${res.status})`);
  mkdirSync("app/fonts", { recursive: true });
  writeFileSync(FILE, Buffer.from(await res.arrayBuffer()));
  console.log(`Switzer téléchargée dans ${FILE}`);
}
