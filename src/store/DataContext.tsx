import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BaseDonnees, Commentaire, Equipe, ID, Mene, ModeJeu, Partie, Utilisateur, FormatEquipes } from "@/types";

const STORAGE_KEY = "petanque_db_v1";
const SESSION_ADMIN_KEY = "petanque_admin_ok";
const ADMIN_PASSWORD = "q"; // Simple, stocké côté client par contrainte du périmètre

interface DataContextType {
  db: BaseDonnees | null;
  chargerInitial: () => Promise<void>;
  estAdmin: boolean;
  loginAdmin: (pwd: string) => boolean;
  logoutAdmin: () => void;
  // Utilisateurs
  creerUtilisateur: (nom: string) => Utilisateur;
  renommerUtilisateur: (id: ID, nom: string) => void;
  supprimerUtilisateur: (id: ID) => void;
  // Parties
  nouvellePartie: (payload: { formatEquipes: FormatEquipes; modeJeu: ModeJeu; equipes: Equipe[]; }) => Partie;
  ajouterMene: (partieId: ID, points: Record<ID, number>) => void;
  editerMene: (partieId: ID, numero: number, points: Record<ID, number>) => void;
  supprimerMene: (partieId: ID, numero: number) => void;
  rollbackVersMene: (partieId: ID, numero: number) => void;
  terminerPartie: (partieId: ID) => void;
  annulerPartie: (partieId: ID) => void;
  likerPartie: (partieId: ID) => void;
  commenterPartie: (partieId: ID, texte: string) => void;
  ajouterPhoto: (partieId: ID, dataUrl: string) => void;
  // Admin
  supprimerPartie: (partieId: ID) => void;
  reinitialiserStats: () => void;
  exporterJSON: () => void;
  importerJSON: (file: File) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

function uid(prefix = "id"): ID {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowISO() {
  return new Date().toISOString();
}

function sauver(db: BaseDonnees) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function charger(): BaseDonnees | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as BaseDonnees) : null;
}

function recalculerScoresEtEtat(partie: Partie): Partie {
  // Recalcule les totaux pour chaque équipe (N équipes supportées)
  const scores = new Map<ID, number>();
  for (const eq of partie.equipes) scores.set(eq.id, 0);
  for (const m of partie.menes) {
    for (const eq of partie.equipes) {
      const pts = (m.points as Record<ID, number>)[eq.id] ?? 0;
      scores.set(eq.id, (scores.get(eq.id) || 0) + (pts || 0));
    }
  }
  partie.equipes = partie.equipes.map(eq => ({ ...eq, scoreTotal: scores.get(eq.id) || 0 }));

  const { type, ciblePoints = 13, nombreDeMenes, briseEgalite } = partie.modeJeu;

  const leadersEtMax = () => {
    let max = -Infinity;
    let leaders: ID[] = [];
    for (const eq of partie.equipes) {
      const s = eq.scoreTotal;
      if (s > max) { max = s; leaders = [eq.id]; }
      else if (s === max) { leaders.push(eq.id); }
    }
    return { leaders, max };
  };

  const terminer = (vainqueurId: ID | null) => {
    partie.etat = "terminee";
    partie.vainqueur = vainqueurId;
    partie.enTieBreak = false;
  };

  if (type === "classique") {
    const { leaders, max } = leadersEtMax();
    const anyReached = partie.equipes.some(eq => eq.scoreTotal >= (ciblePoints ?? 13));
    if (anyReached && leaders.length === 1 && max >= (ciblePoints ?? 13)) terminer(leaders[0]);
  } else if (type === "menes_fixes") {
    if (partie.menes.length >= (nombreDeMenes ?? 0)) {
      const { leaders } = leadersEtMax();
      if (leaders.length === 1) terminer(leaders[0]);
      else {
        if (briseEgalite === "egalite") terminer(null);
        else partie.enTieBreak = true; // mène décisive
      }
    }
    if (partie.enTieBreak) {
      const { leaders } = leadersEtMax();
      if (leaders.length === 1) terminer(leaders[0]);
    }
  } else if (type === "chrono") {
    if (partie.chronoExpireAt) {
      const now = Date.now();
      const expire = new Date(partie.chronoExpireAt).getTime();
      if (now >= expire) {
        // Terminer à la fin de la mène courante
        if (partie.menes.length > 0) {
          const { leaders } = leadersEtMax();
          if (leaders.length === 1) terminer(leaders[0]);
          else if (briseEgalite === "egalite") terminer(null);
          else partie.enTieBreak = true;
        }
      }
    }
    if (partie.enTieBreak) {
      const { leaders } = leadersEtMax();
      if (leaders.length === 1) terminer(leaders[0]);
    }
  } else if (type === "amical") {
    // Fin manuelle uniquement
  }

  return partie;
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<BaseDonnees | null>(null);
  const [estAdmin, setEstAdmin] = useState<boolean>(sessionStorage.getItem(SESSION_ADMIN_KEY) === "1");

  useEffect(() => {
    const local = charger();
    if (local) setDb(local);
    else {
      // Charger depuis le JSON public
      (async () => {
        const res = await fetch("/data/data.json", { cache: "no-store" });
        const data = (await res.json()) as BaseDonnees;
        setDb(data);
        sauver(data);
      })();
    }
  }, []);

  const loginAdmin = (pwd: string) => {
    const ok = pwd === ADMIN_PASSWORD;
    if (ok) {
      setEstAdmin(true);
      sessionStorage.setItem(SESSION_ADMIN_KEY, "1");
    }
    return ok;
  };
  const logoutAdmin = () => {
    setEstAdmin(false);
    sessionStorage.removeItem(SESSION_ADMIN_KEY);
  };

  const sync = (next: BaseDonnees) => {
    setDb(next);
    sauver(next);
  };

  // Actions Utilisateurs
  const creerUtilisateur = (nom: string): Utilisateur => {
    if (!db) throw new Error("DB non prête");
    const user: Utilisateur = { id: uid("u"), nom: nom.trim(), victoires: 0 };
    const next = { ...db, utilisateurs: [...db.utilisateurs, user] };
    sync(next);
    return user;
  };
  const renommerUtilisateur = (id: ID, nom: string) => {
    if (!db) return;
    const next = { ...db, utilisateurs: db.utilisateurs.map(u => u.id === id ? { ...u, nom: nom.trim() } : u) };
    sync(next);
  };
  const supprimerUtilisateur = (id: ID) => {
    if (!db) return;
    const next = { ...db, utilisateurs: db.utilisateurs.filter(u => u.id !== id) };
    sync(next);
  };

  // Parties
  const nouvellePartie: DataContextType["nouvellePartie"] = (payload) => {
    if (!db) throw new Error("DB non prête");
    const partie: Partie = {
      id: uid("g"),
      dateISO: nowISO(),
      etat: "en_cours",
      formatEquipes: payload.formatEquipes,
      modeJeu: payload.modeJeu,
      equipes: payload.equipes,
      menes: [],
      vainqueur: null,
      likes: 0,
      commentaires: [],
      photos: [],
      chronoExpireAt: payload.modeJeu.type === "chrono" && payload.modeJeu.dureeLimiteMin ?
        new Date(Date.now() + payload.modeJeu.dureeLimiteMin * 60000).toISOString() : null,
      enTieBreak: false,
    };
    const next = { ...db, parties: [partie, ...db.parties] };
    sync(next);
    return partie;
  };

  const avecPartie = (partieId: ID, fn: (p: Partie) => void) => {
    if (!db) return;
    const next = { ...db };
    const idx = next.parties.findIndex(p => p.id === partieId);
    if (idx === -1) return;
    const p = { ...next.parties[idx] };
    fn(p);
    next.parties[idx] = recalculerScoresEtEtat(p);
    sync(next);
  };

  const ajouterMene = (partieId: ID, points: Record<ID, number>) => {
    avecPartie(partieId, (p) => {
      if (p.etat !== "en_cours") return;
      const numero = p.menes.length + 1;
      p.menes = [...p.menes, { numero, points }];
    });
  };
  const editerMene = (partieId: ID, numero: number, points: Record<ID, number>) => {
    avecPartie(partieId, (p) => {
      p.menes = p.menes.map(m => m.numero === numero ? { ...m, points } : m);
    });
  };
  const supprimerMene = (partieId: ID, numero: number) => {
    avecPartie(partieId, (p) => {
      p.menes = p.menes.filter(m => m.numero !== numero).map((m, i) => ({ ...m, numero: i + 1 }));
    });
  };
  const rollbackVersMene = (partieId: ID, numero: number) => {
    avecPartie(partieId, (p) => {
      p.menes = p.menes.filter(m => m.numero <= numero);
    });
  };
  const terminerPartie = (partieId: ID) => {
    avecPartie(partieId, (p) => {
      p.etat = "terminee";
      // vainqueur recalculé par recalculerScoresEtEtat
    });
  };
  const annulerPartie = (partieId: ID) => {
    avecPartie(partieId, (p) => { p.etat = "annulee"; });
  };
  const likerPartie = (partieId: ID) => {
    avecPartie(partieId, (p) => { p.likes += 1; });
  };
  const commenterPartie = (partieId: ID, texte: string) => {
    avecPartie(partieId, (p) => {
      const c: Commentaire = { id: uid("c"), texte: texte.trim(), dateISO: nowISO() };
      p.commentaires = [c, ...p.commentaires];
    });
  };
  const ajouterPhoto = (partieId: ID, dataUrl: string) => {
    avecPartie(partieId, (p) => {
      const ph = { id: uid("p"), url: dataUrl, dateISO: nowISO() };
      p.photos = [ph, ...p.photos];
    });
  };

  // Admin
  const supprimerPartie = (partieId: ID) => {
    if (!db) return;
    const next = { ...db, parties: db.parties.filter(p => p.id !== partieId) };
    sync(next);
  };

  const reinitialiserStats = () => {
    if (!db) return;
    // Recomputations simples des victoires à partir des parties terminées
    const counts: Record<ID, number> = {};
    for (const u of db.utilisateurs) counts[u.id] = 0;
    for (const p of db.parties) {
      if (p.etat === "terminee" && p.vainqueur) {
        const eq = p.equipes.find(e => e.id === p.vainqueur);
        const vainqueurs = eq?.joueurs || [];
        for (const uid of vainqueurs) counts[uid] = (counts[uid] || 0) + 1;
      }
    }
    const next = {
      ...db,
      utilisateurs: db.utilisateurs.map(u => ({ ...u, victoires: counts[u.id] || 0 }))
    };
    sync(next);
  };

  const exporterJSON = () => {
    if (!db) return;
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `petanque_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importerJSON = async (file: File) => {
    const text = await file.text();
    const imported = JSON.parse(text) as BaseDonnees;
    sync(imported);
  };

  const value = useMemo<DataContextType>(() => ({
    db,
    chargerInitial: async () => {},
    estAdmin,
    loginAdmin,
    logoutAdmin,
    creerUtilisateur,
    renommerUtilisateur,
    supprimerUtilisateur,
    nouvellePartie,
    ajouterMene,
    editerMene,
    supprimerMene,
    rollbackVersMene,
    terminerPartie,
    annulerPartie,
    likerPartie,
    commenterPartie,
    ajouterPhoto,
    supprimerPartie,
    reinitialiserStats,
    exporterJSON,
    importerJSON,
  }), [db, estAdmin]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData doit être utilisé dans un DataProvider");
  return ctx;
}
