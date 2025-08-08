import { Helmet } from "react-helmet-async";
import { useMemo } from "react";
import { useData } from "@/store/DataContext";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Statistiques() {
  const { db } = useData();

  const topVictoires = useMemo(() => {
    const map = new Map<string, number>();
    db?.parties.filter(p => p.etat === "terminee").forEach(p => {
      if (!p.vainqueur) return;
      const vainqueurs = p.equipes[p.vainqueur === "A" ? 0 : 1].joueurs;
      vainqueurs.forEach(id => map.set(id, (map.get(id) || 0) + 1));
    });
    const data = (db?.utilisateurs || []).map(u => ({ name: u.nom, value: map.get(u.id) || 0 }));
    return data.sort((a,b)=>b.value - a.value).slice(0,10);
  }, [db]);

  const moyennePointsParMene = useMemo(() => {
    // total points / nb mènes par joueur
    const totals = new Map<string, { points: number; menes: number }>();
    db?.parties.forEach(p => {
      p.menes.forEach(m => {
        p.equipes[0].joueurs.forEach(id => {
          const cur = totals.get(id) || { points: 0, menes: 0 };
          totals.set(id, { points: cur.points + m.points.A, menes: cur.menes + 1 });
        });
        p.equipes[1].joueurs.forEach(id => {
          const cur = totals.get(id) || { points: 0, menes: 0 };
          totals.set(id, { points: cur.points + m.points.B, menes: cur.menes + 1 });
        });
      });
    });
    const data = (db?.utilisateurs || []).map(u => {
      const t = totals.get(u.id) || { points: 0, menes: 0 };
      const avg = t.menes >= 5 ? +(t.points / t.menes).toFixed(2) : 0;
      return { name: u.nom, value: avg };
    }).filter(d => d.value > 0).sort((a,b)=>b.value - a.value).slice(0,10);
    return data;
  }, [db]);

  return (
    <section className="space-y-6">
      <Helmet>
        <title>Statistiques – Pétanque facile</title>
        <meta name="description" content="Classements des victoires et moyennes de points par mène." />
      </Helmet>
      <div>
        <h2 className="text-lg font-semibold mb-2">Top victoires</h2>
        {!topVictoires.length ? (
          <p className="text-muted-foreground">Aucune statistique disponible (jouez une partie !)</p>
        ) : (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topVictoires}>
                <XAxis dataKey="name" hide />
                <YAxis allowDecimals={false} width={20} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Top moyenne de points par mène</h2>
        {!moyennePointsParMene.length ? (
          <p className="text-muted-foreground">Aucune statistique disponible (jouez une partie !)</p>
        ) : (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moyennePointsParMene}>
                <XAxis dataKey="name" hide />
                <YAxis width={20} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
