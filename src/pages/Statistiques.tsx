import { Helmet } from "react-helmet-async";
import { useMemo } from "react";
import { useData } from "@/store/DataContext";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Statistiques() {
  const { db } = useData();

  const topVictoires = useMemo(() => {
    const wins = new Map<string, number>();
    const users = new Map((db?.utilisateurs || []).map(u => [u.id, u.nom]));
    db?.parties
      .filter(p => p.etat === "terminee" && p.vainqueur)
      .forEach(p => {
        const equipe = p.equipes[p.vainqueur === "A" ? 0 : 1].joueurs;
        const key = equipe.slice().sort().join("-");
        wins.set(key, (wins.get(key) || 0) + 1);
      });
    return Array.from(wins.entries())
      .map(([ids, value]) => {
        const name = ids
          .split("-")
          .map(id => users.get(id) || "Inconnu")
          .join(" & ");
        return { name, value };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [db]);

  const topPointsParMene = useMemo(() => {
    const maxes = new Map<string, number>();
    db?.parties.forEach(p => {
      p.menes.forEach(m => {
        p.equipes.forEach(eq => {
          const pts = (m.points as Record<string, number>)[eq.id] || 0;
          eq.joueurs.forEach(id => {
            maxes.set(id, Math.max(maxes.get(id) || 0, pts));
          });
        });
      });
    });
    const users = new Map((db?.utilisateurs || []).map(u => [u.id, u.nom]));
    return Array.from(maxes.entries())
      .map(([id, value]) => ({ name: users.get(id) || "Inconnu", value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [db]);

  return (
    <section className="space-y-6">
      <Helmet>
        <title>Statistiques – Pétanque facile</title>
        <meta name="description" content="Classements des victoires et des meilleurs scores." />
      </Helmet>
      <div>
        <h2 className="text-lg font-semibold mb-2">Top 10 victoires (équipes/joueurs)</h2>
        {topVictoires.length > 0 && (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topVictoires}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} width={20} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--chart-1))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Top 10 points marqués sur une mène</h2>
        {topPointsParMene.length > 0 && (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPointsParMene}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} width={20} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--chart-3))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
