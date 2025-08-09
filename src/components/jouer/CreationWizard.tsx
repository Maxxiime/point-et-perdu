import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useData } from "@/store/DataContext";
import { Equipe, FormatEquipes, ModeJeu } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

export default function CreationWizard() {
  const { db, creerUtilisateur, nouvellePartie } = useData();
  const [etape, setEtape] = useState(1);
  const [format, setFormat] = useState<FormatEquipes>("par_equipes");

  // Mode chacun pour soi: liste d'IDs utilisateurs
  const [soloJoueurs, setSoloJoueurs] = useState<string[]>([]);

  // Mode par équipes: liste dynamique d'équipes avec joueurs
  const [equipes, setEquipes] = useState<Equipe[]>([
    { id: "E1", nom: "Équipe 1", joueurs: [], scoreTotal: 0 },
    { id: "E2", nom: "Équipe 2", joueurs: [], scoreTotal: 0 },
  ]);

  const [mode, setMode] = useState<ModeJeu>({ type: "classique", ciblePoints: 13 });

  const utilisateurs = db?.utilisateurs || [];

  const [newPlayerOpen, setNewPlayerOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const newPlayerCb = useRef<((id: string) => void) | null>(null);

  const demanderNouveauJoueur = (cb: (id: string) => void) => {
    newPlayerCb.current = cb;
    setNewPlayerName("");
    setNewPlayerOpen(true);
  };

  const confirmerNouveauJoueur = () => {
    if (!newPlayerName.trim()) return;
    const u = creerUtilisateur(newPlayerName.trim());
    newPlayerCb.current?.(u.id);
    setNewPlayerOpen(false);
  };

  const canStart = useMemo(() => {
    if (format === "chacun_pour_soi") return soloJoueurs.filter(Boolean).length >= 2;
    // par équipes: au moins 2 équipes avec >=1 joueur
    const valides = equipes.filter(e => (e.joueurs.filter(Boolean).length >= 1));
    return valides.length >= 2;
  }, [format, soloJoueurs, equipes]);

  const ajouterSlotSolo = () => setSoloJoueurs([...soloJoueurs, ""]);
  const supprimerSolo = (idx: number) => setSoloJoueurs(soloJoueurs.filter((_, i) => i !== idx));
  const setSoloAt = (idx: number, value: string) => {
    if (value === "__nouveau__") {
      demanderNouveauJoueur((id) => {
        const next = [...soloJoueurs];
        next[idx] = id;
        setSoloJoueurs(next);
      });
    } else {
      const next = [...soloJoueurs];
      next[idx] = value;
      setSoloJoueurs(next);
    }
  };

  const ajouterEquipe = () => {
    const n = equipes.length + 1;
    setEquipes([...equipes, { id: `E${n}`, nom: `Équipe ${n}`, joueurs: [], scoreTotal: 0 }]);
  };
  const supprimerEquipe = (id: string) => setEquipes(equipes.filter(e => e.id !== id));
  const ajouterJoueurDansEquipe = (eId: string) => {
    setEquipes(equipes.map(e => e.id === eId ? { ...e, joueurs: [...e.joueurs, ""] } : e));
  };
  const supprimerJoueurDansEquipe = (eId: string, idx: number) => {
    setEquipes(equipes.map(e => e.id === eId ? { ...e, joueurs: e.joueurs.filter((_, i) => i !== idx) } : e));
  };
  const setJoueurEquipeAt = (eId: string, idx: number, value: string) => {
    if (value === "__nouveau__") {
      demanderNouveauJoueur((id) => {
        setEquipes(equipes.map(e => {
          if (e.id !== eId) return e;
          const js = [...e.joueurs];
          js[idx] = id;
          return { ...e, joueurs: js };
        }));
      });
    } else {
      setEquipes(equipes.map(e => {
        if (e.id !== eId) return e;
        const js = [...e.joueurs];
        js[idx] = value;
        return { ...e, joueurs: js };
      }));
    }
  };

  const demarrer = () => {
    let payloadEquipes: Equipe[] = [];
    if (format === "chacun_pour_soi") {
      payloadEquipes = soloJoueurs.filter(Boolean).map((uid, i) => ({
        id: `P${i + 1}`,
        nom: utilisateurs.find(u => u.id === uid)?.nom || `Joueur ${i + 1}`,
        joueurs: [uid],
        scoreTotal: 0,
      }));
    } else {
      payloadEquipes = equipes
        .map((e, i) => ({
          ...e,
          id: e.id || `E${i + 1}`,
          nom: (e.joueurs.map(id => utilisateurs.find(u => u.id === id)?.nom).filter(Boolean).join(" & ")) || e.nom,
          joueurs: e.joueurs.filter(Boolean),
          scoreTotal: 0,
        }))
        .filter(e => e.joueurs.length >= 1);
    }
    nouvellePartie({ formatEquipes: format, modeJeu: mode, equipes: payloadEquipes });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nouvelle partie</h1>

      {etape === 1 && (
        <div className="space-y-4">
          <h2 className="font-semibold">1) Format</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button key="solo" variant={format === 'chacun_pour_soi' ? 'default' : 'outline'} onClick={() => setFormat('chacun_pour_soi')}>Chacun pour soi</Button>
            <Button key="teams" variant={format === 'par_equipes' ? 'default' : 'outline'} onClick={() => setFormat('par_equipes')}>Par équipes</Button>
          </div>
          <div className="flex gap-2">
            <Button variant="default" onClick={() => setEtape(2)}>Suivant</Button>
          </div>
        </div>
      )}

      {etape === 2 && (
        <div className="space-y-4">
          <h2 className="font-semibold">2) Joueurs</h2>

          {format === 'chacun_pour_soi' ? (
            <div className="space-y-2">
              {soloJoueurs.map((uid, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={uid} onValueChange={(v) => setSoloAt(i, v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder={`Joueur ${i + 1}`} /></SelectTrigger>
                    <SelectContent className="z-50 bg-popover">
                      {utilisateurs.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.nom}</SelectItem>
                      ))}
                      <SelectItem value="__nouveau__">+ Nouveau</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="destructive" size="icon" onClick={() => supprimerSolo(i)} aria-label="Supprimer ce joueur"><X className="size-4" /></Button>
                </div>
              ))}
              <Button variant="secondary" onClick={ajouterSlotSolo}>+ Ajouter un joueur</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {equipes.map((e) => (
                <div key={e.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{e.nom}</div>
                    <Button variant="destructive" size="icon" onClick={() => supprimerEquipe(e.id)} aria-label="Supprimer cette équipe"><X className="size-4" /></Button>
                  </div>
                  <div className="space-y-2">
                    {e.joueurs.map((jid, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Select value={jid} onValueChange={(v) => setJoueurEquipeAt(e.id, idx, v)}>
                          <SelectTrigger className="w-full"><SelectValue placeholder={`Joueur ${idx + 1}`} /></SelectTrigger>
                          <SelectContent className="z-50 bg-popover">
                            {utilisateurs.map(u => (
                              <SelectItem key={u.id} value={u.id}>{u.nom}</SelectItem>
                            ))}
                            <SelectItem value="__nouveau__">+ Nouveau</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="destructive" size="icon" onClick={() => supprimerJoueurDansEquipe(e.id, idx)} aria-label="Supprimer ce joueur"><X className="size-4" /></Button>
                      </div>
                    ))}
                    <Button variant="secondary" onClick={() => ajouterJoueurDansEquipe(e.id)}>+ Ajouter un joueur</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={ajouterEquipe}>+ Ajouter une équipe</Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEtape(1)}>Retour</Button>
            <Button variant="default" onClick={() => setEtape(3)} disabled={!canStart}>Suivant</Button>
          </div>
        </div>
      )}

      {etape === 3 && (
        <div className="space-y-4">
          <h2 className="font-semibold">3) Mode de jeu</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button variant={mode.type==='classique'?"default":"outline"} onClick={()=>setMode({ type:'classique', ciblePoints:13 })}>Classique</Button>
            <Button variant={mode.type==='custom'?"default":"outline"} onClick={()=>setMode({ type:'custom', ciblePoints:13 })}>Custom</Button>
          </div>

          {mode.type==='custom' && (
            <div className="flex items-center gap-2">
              <label>Points cible</label>
              <input type="number" min={1} className="border rounded px-3 py-2 w-24 bg-background" value={mode.ciblePoints}
                onChange={e=>setMode({...mode, ciblePoints: Number(e.target.value)})} />
            </div>
          )}

          <div className="rounded-lg border p-3 text-sm text-muted-foreground">
            <div className="font-medium text-foreground mb-1">Résumé</div>
            <div>Format: {format === 'chacun_pour_soi' ? 'Chacun pour soi' : 'Par équipes'}</div>
            {format === 'chacun_pour_soi' ? (
              <div>Joueurs: {soloJoueurs.filter(Boolean).length}</div>
            ) : (
              <div>Équipes: {equipes.filter(e=>e.joueurs.filter(Boolean).length>=1).length}</div>
            )}
            <div>Mode: {mode.type} — {mode.ciblePoints} points</div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={()=>setEtape(2)}>Retour</Button>
            <Button variant="default" onClick={demarrer} disabled={!canStart}>Démarrer</Button>
          </div>
        </div>
      )}
      <Dialog open={newPlayerOpen} onOpenChange={setNewPlayerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau joueur</DialogTitle>
          </DialogHeader>
          <Input value={newPlayerName} onChange={e=>setNewPlayerName(e.target.value)} placeholder="Nom du joueur" />
          <DialogFooter>
            <Button variant="outline" onClick={()=>setNewPlayerOpen(false)}>Annuler</Button>
            <Button onClick={confirmerNouveauJoueur}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
