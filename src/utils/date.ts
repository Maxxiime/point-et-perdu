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

export function formatDuree(debutISO: string, finISO: string) {
  const diff = new Date(finISO).getTime() - new Date(debutISO).getTime();
  const totalMin = Math.max(0, Math.floor(diff / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`;
  return `${m} min`;
}
