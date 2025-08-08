import { Helmet } from "react-helmet-async";
import CreationWizard from "@/components/jouer/CreationWizard";
import Scoreboard from "@/components/jouer/Scoreboard";
import { useData } from "@/store/DataContext";

export default function Index() {
  const { db } = useData();
  const partieEnCours = db?.parties.find(p => p.etat === "en_cours");

  return (
    <section className="space-y-4">
      <Helmet>
        <title>Jouer – Pétanque facile</title>
        <meta name="description" content="Démarrez une nouvelle partie de pétanque et suivez le score en direct." />
      </Helmet>
      {!partieEnCours ? (
        <CreationWizard />
      ) : (
        <Scoreboard partie={partieEnCours} />
      )}
    </section>
  );
}
