import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function formatFrLong(iso: string) {
  const d = new Date(iso);
  const formatted = format(d, "eeee d MMMM yyyy 'à' HH'h'mm", { locale: fr });
  return formatted.replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase()).replace("À", "à");
}

export function formatCountdown(msLeft: number) {
  if (msLeft < 0) return "00:00";
  const totalSec = Math.floor(msLeft / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2,'0');
  const s = (totalSec % 60).toString().padStart(2,'0');
  return `${m}:${s}`;
}
