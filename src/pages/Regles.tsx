import { Helmet } from "react-helmet-async";

export default function Regles() {
  return (
    <section className="space-y-4">
      <Helmet>
        <title>Règles officielles – Pétanque facile</title>
        <meta name="description" content="Règles officielles de la pétanque française." />
      </Helmet>
      <h1 className="text-2xl font-bold">Règles officielles de la pétanque française</h1>
      <p>Résumé des principaux points du règlement de la Fédération Française de Pétanque et de Jeu Provençal&nbsp;:</p>
      <ul className="list-disc pl-6 space-y-2 text-sm">
        <li>Une partie se joue en 13 points (ou tout autre total convenu à l'avance).</li>
        <li>Les équipes sont composées de 3 joueurs (triplette, 2 boules chacun), 2 joueurs (doublette, 3 boules chacun) ou 1 joueur (tête-à-tête, 3 boules).</li>
        <li>Le cercle de lancement mesure entre 35 et 50&nbsp;cm de diamètre et les pieds doivent rester à l'intérieur lors du tir.</li>
        <li>Le but (cochonnet) est lancé entre 6 et 10&nbsp;mètres et doit rester à 1&nbsp;mètre de tout obstacle.</li>
        <li>Chaque équipe lance ensuite ses boules en essayant de se rapprocher le plus près possible du cochonnet.</li>
        <li>Lorsque les deux équipes ont joué toutes leurs boules, l'équipe la plus proche du cochonnet marque autant de points qu'elle a de boules mieux placées que la meilleure boule adverse.</li>
        <li>La première équipe à atteindre le total de points fixé remporte la partie.</li>
        <li>Si le cochonnet est déplacé hors des limites, la mène est nulle et doit être rejouée.</li>
        <li>Les boules doivent être en métal, peser entre 650 et 800&nbsp;g et mesurer entre 70,5 et 80&nbsp;mm de diamètre.</li>
        <li>Le comportement fair-play et le respect du temps de jeu (1 minute par boule) sont obligatoires.</li>
      </ul>
      <p className="text-sm">Pour le règlement complet, consultez le document officiel de la FFPJP&nbsp;:
        {' '}<a className="text-primary underline" href="https://www.ffpjp.org" target="_blank" rel="noopener noreferrer">ffpjp.org</a>.
      </p>
    </section>
  );
}
