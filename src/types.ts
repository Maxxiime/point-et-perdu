// Types principaux de l'application Pétanque
export type ID = string;

export type EtatPartie = "en_cours" | "terminee" | "annulee";
export type FormatEquipes = "tete-a-tete" | "doublette" | "triplette";
export type TypeModeJeu = "classique" | "chrono" | "menes_fixes" | "amical";
export type BriseEgalite = "mene_decisive" | "egalite";

export interface Utilisateur {
  id: ID;
  nom: string;
  victoires: number;
}

export interface Equipe {
  id: "A" | "B";
  nom: string;
  joueurs: ID[]; // ids utilisateurs
  scoreTotal: number;
}

export interface Mene {
  numero: number;
  points: { A: number; B: number };
}

export interface Commentaire {
  id: ID;
  texte: string;
  dateISO: string;
}

export interface Photo {
  id: ID;
  url: string; // data URL ou URL publique
  dateISO: string;
}

export interface ModeJeu {
  type: TypeModeJeu;
  ciblePoints?: number | null; // classique
  dureeLimiteMin?: number | null; // chrono
  nombreDeMenes?: number | null; // menes_fixes
  briseEgalite?: BriseEgalite;
}

export interface Partie {
  id: ID;
  dateISO: string;
  etat: EtatPartie;
  formatEquipes: FormatEquipes;
  modeJeu: ModeJeu;
  equipes: [Equipe, Equipe];
  menes: Mene[];
  vainqueur: "A" | "B" | null;
  likes: number;
  commentaires: Commentaire[];
  photos: Photo[];
  // Champs runtime (non exportés si besoin)
  chronoExpireAt?: string | null; // ISO si chrono
  enTieBreak?: boolean; // pour mène décisive
}

export interface BaseDonnees {
  utilisateurs: Utilisateur[];
  parties: Partie[];
}
