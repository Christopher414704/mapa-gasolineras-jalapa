import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import webpush from "web-push";

const ruta = path.resolve(".env");
if (!fs.existsSync(ruta)) throw new Error("Crea apps/api/.env a partir de .env.example antes de configurar avisos.");
if (process.env.PUSH_VAPID_PUBLIC_KEY && process.env.PUSH_VAPID_PRIVATE_KEY) {
  console.log("Las claves VAPID locales ya están configuradas.");
} else if (process.env.PUSH_VAPID_PUBLIC_KEY || process.env.PUSH_VAPID_PRIVATE_KEY) {
  throw new Error("Completa el par VAPID existente; no se generaron claves nuevas.");
} else {
  const { publicKey, privateKey } = webpush.generateVAPIDKeys();
  const contenido = fs.readFileSync(ruta, "utf8");
  const actualizar = (nombre, valor) => {
    const patron = new RegExp(`^${nombre}=.*$`, "m");
    return patron.test(contenido) ? null : `${nombre}=${valor}`;
  };
  let nuevo = contenido;
  for (const [nombre, valor] of [["PUSH_VAPID_PUBLIC_KEY", publicKey], ["PUSH_VAPID_PRIVATE_KEY", privateKey]]) {
    const linea = actualizar(nombre, valor);
    nuevo = linea ? `${nuevo.trimEnd()}\n${linea}\n` : nuevo.replace(new RegExp(`^${nombre}=.*$`, "m"), `${nombre}=${valor}`);
  }
  if (!/^PUSH_VAPID_SUBJECT=/m.test(nuevo)) nuevo += "PUSH_VAPID_SUBJECT=mailto:admin@leprices.gt\n";
  fs.writeFileSync(ruta, nuevo, { mode: 0o600 });
  console.log("Claves VAPID generadas en apps/api/.env (archivo excluido de Git).");
}
