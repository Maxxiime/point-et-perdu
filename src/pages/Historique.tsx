import { Helmet } from "react-helmet-async";
import { useMemo, useState } from "react";
import { useData } from "@/store/DataContext";
import { formatFrLong } from "@/utils/date";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Historique() {
  const { db } = useData();
  const [filtreEtat, setFiltreEtat] = useState<string>("Toutes");
  const [recherche, setRecherche] = useState("");

  const parties = useMemo(() => {
    const list = db?.parties ?? [];
    let r = list;
    if (filtreEtat !== "Toutes") {
      const map: Record<string, string> = { Terminées: "terminee", "En cours": "en_cours", Annulées: "annulee" };
      r = r.filter(p => p.etat === map[filtreEtat]);
    }
    if (recherche.trim()) {
      const q = recherche.toLowerCase();
      r = r.filter(p => {
        const noms = [
          ...p.equipes[0].joueurs.map(id => db?.utilisateurs.find(u=>u.id===id)?.nom || ""),
          ...p.equipes[1].joueurs.map(id => db?.utilisateurs.find(u=>u.id===id)?.nom || ""),
        ].join(" ").toLowerCase();
        return noms.includes(q);
      });
    }
    return [...r].sort((a,b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());
  }, [db, filtreEtat, recherche]);

  return (
    <section className="space-y-4">
      <Helmet>
        <title>Historique – Pétanque facile</title>
        <meta name="description" content="Consultez toutes vos parties de pétanque avec détails et filtres." />
      </Helmet>
      <div className="flex items-center gap-2">
        <Select value={filtreEtat} onValueChange={setFiltreEtat}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filtrer" /></SelectTrigger>
          <SelectContent className="z-50 bg-popover">
            <SelectItem value="Toutes">Toutes</SelectItem>
            <SelectItem value="Terminées">Terminées</SelectItem>
            <SelectItem value="En cours">En cours</SelectItem>
            <SelectItem value="Annulées">Annulées</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Recherche par joueur" value={recherche} onChange={e=>setRecherche(e.target.value)} />
      </div>

      {!parties.length ? (
        <p className="text-muted-foreground">Aucune partie en cours</p>
      ) : (
        <ul className="space-y-2">
          {parties.map(p => (
            <li key={p.id} className="border rounded-lg p-3 bg-card">
              <Link to={`/partie/${p.id}`} className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-muted-foreground">{formatFrLong(p.dateISO)}</div>
                  <div className="font-semibold">{p.equipes[0].joueurs.map(id=>db?.utilisateurs.find(u=>u.id===id)?.nom).filter(Boolean).join(" & ")} {p.equipes[0].scoreTotal} – {p.equipes[1].scoreTotal} {p.equipes[1].joueurs.map(id=>db?.utilisateurs.find(u=>u.id===id)?.nom).filter(Boolean).join(" & ")}</div>
                  <div className="text-xs text-muted-foreground capitalize">{p.modeJeu.type.replace('_',' ')}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-secondary">
                  {{ en_cours: "En cours", terminee: "Terminée", annulee: "Annulée" }[p.etat]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
