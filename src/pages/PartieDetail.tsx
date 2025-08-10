import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { useData } from "@/store/DataContext";
import Scoreboard from "@/components/jouer/Scoreboard";
import PhotoAnalyzer from "@/components/PhotoAnalyzer";

export default function PartieDetail() {
  const { id } = useParams();
  const { db } = useData();
  const partie = db?.parties.find(p => p.id === id);
  if (!partie) return <p className="text-muted-foreground">Partie introuvable</p>;
  return (
    <section className="space-y-4">
      <Helmet>
        <title>Détail partie – Pétanque facile</title>
        <meta name="description" content="Détails complets de la partie de pétanque." />
      </Helmet>
      <Scoreboard partie={partie} />
    </section>
    <PhotoAnalyzer />
  );
}
