import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useData } from "@/store/DataContext";
import { Equipe, FormatEquipes, ModeJeu, Partie, TypeModeJeu } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function placesParFormat(format: FormatEquipes) {
  return format === "tete-a-tete" ? 1 : format === "doublette" ? 2 : 3;
}

export default function CreationWizard() {
  const { db, creerUtilisateur, nouvellePartie } = useData();
  const [etape, setEtape] = useState(1);
  const [format, setFormat] = useState<FormatEquipes>("doublette");
  const [equipes, setEquipes] = useState<[Equipe, Equipe]>([
    { id: "A", nom: "Équipe A", joueurs: [], scoreTotal: 0 },
    { id: "B", nom: "Équipe B", joueurs: [], scoreTotal: 0 },
  ]);
  const [mode, setMode] = useState<ModeJeu>({ type: "classique", ciblePoints: 13, briseEgalite: "mene_decisive" });

  const nbPlaces = useMemo(()=> placesParFormat(format), [format]);
  const utilisateurs = db?.utilisateurs || [];

  const canStart = useMemo(()=>
    equipes[0].joueurs.length === nbPlaces && equipes[1].joueurs.length === nbPlaces
  ,[equipes, nbPlaces]);

  const addOuSelect = (eIdx: 0|1, pos: number, value: string) => {
    if (value === "__nouveau__") {
      const nom = prompt("Nom du joueur ?");
      if (!nom) return;
      const u = creerUtilisateur(nom);
      const next = [...equipes] as [Equipe, Equipe];
      const jou = [...next[eIdx].joueurs];
      jou[pos] = u.id;
      next[eIdx] = { ...next[eIdx], joueurs: jou };
      setEquipes(next);
    } else {
      const next = [...equipes] as [Equipe, Equipe];
      const jou = [...next[eIdx].joueurs];
      jou[pos] = value;
      next[eIdx] = { ...next[eIdx], joueurs: jou };
      setEquipes(next);
    }
  };

  const inverser = () => setEquipes([equipes[1], equipes[0]]);

  const demarrer = () => {
    const p = nouvellePartie({ formatEquipes: format, modeJeu: mode, equipes });
    alert("Partie démarrée !");
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nouvelle partie</h1>

      {etape === 1 && (
        <div className="space-y-4">
          <h2 className="font-semibold">1) Format d’équipes</h2>
          <div className="grid grid-cols-3 gap-2">
            {(["tete-a-tete","doublette","triplette"] as FormatEquipes[]).map(f => (
              <Button key={f} variant={format===f?"default":"outline"} onClick={()=>setFormat(f)}>
                {f === "tete-a-tete" ? "Tête-à-tête" : f === "doublette" ? "Doublette" : "Triplette"}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="default" onClick={()=>setEtape(2)} disabled={!format}>Suivant</Button>
          </div>
        </div>
      )}

      {etape === 2 && (
        <div className="space-y-4">
          <h2 className="font-semibold">2) Joueurs</h2>
          <div className="grid grid-cols-2 gap-4">
            {[0,1].map((eIdx) => (
              <div key={eIdx} className="border rounded-lg p-3">
                <div className="font-medium mb-2">{eIdx===0?"Équipe A":"Équipe B"}</div>
                {Array.from({ length: nbPlaces }).map((_, i) => (
                  <div key={i} className="mb-2">
                    <Select onValueChange={(v)=>addOuSelect(eIdx as 0|1, i, v)}>
                      <SelectTrigger className="w-full"><SelectValue placeholder={`Joueur ${i+1}`} /></SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        {utilisateurs.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.nom}</SelectItem>
                        ))}
                        <SelectItem value="__nouveau__">+ Nouveau</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={inverser}>Inverser équipes</Button>
            <Button variant="outline" onClick={()=>setEtape(1)}>Remplacer</Button>
            <Button variant="default" onClick={()=>setEtape(3)} disabled={!canStart}>Suivant</Button>
          </div>
        </div>
      )}

      {etape === 3 && (
        <div className="space-y-4">
          <h2 className="font-semibold">3) Mode de jeu</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button variant={mode.type==='classique'?"default":"outline"} onClick={()=>setMode({ type:'classique', ciblePoints:13, briseEgalite:'mene_decisive' })}>Classique</Button>
            <Button variant={mode.type==='chrono'?"default":"outline"} onClick={()=>setMode({ type:'chrono', dureeLimiteMin:45, briseEgalite:'mene_decisive' })}>Chronométré</Button>
            <Button variant={mode.type==='menes_fixes'?"default":"outline"} onClick={()=>setMode({ type:'menes_fixes', nombreDeMenes:10, briseEgalite:'mene_decisive' })}>Mènes fixes</Button>
            <Button variant={mode.type==='amical'?"default":"outline"} onClick={()=>setMode({ type:'amical' })}>Amical</Button>
          </div>

          {mode.type==='classique' && (
            <div className="flex items-center gap-2">
              <label>Points cible</label>
              <input type="number" min={7} max={13} className="border rounded px-3 py-2 w-24 bg-background" value={mode.ciblePoints ?? 13}
              onChange={e=>setMode({...mode, ciblePoints: Number(e.target.value)})} />
            </div>
          )}
          {mode.type==='chrono' && (
            <div className="flex items-center gap-2">
              <label>Durée (min)</label>
              <input type="number" min={5} max={120} className="border rounded px-3 py-2 w-24 bg-background" value={mode.dureeLimiteMin ?? 45}
              onChange={e=>setMode({...mode, dureeLimiteMin: Number(e.target.value)})} />
              <select className="border rounded px-3 py-2 bg-background" value={mode.briseEgalite}
                onChange={e=>setMode({...mode, briseEgalite: e.target.value as any})}>
                <option value="mene_decisive">Mène décisive</option>
                <option value="egalite">Égalité acceptée</option>
              </select>
            </div>
          )}
          {mode.type==='menes_fixes' && (
            <div className="flex items-center gap-2">
              <label>Nombre de mènes</label>
              <input type="number" min={5} max={20} className="border rounded px-3 py-2 w-24 bg-background" value={mode.nombreDeMenes ?? 10}
              onChange={e=>setMode({...mode, nombreDeMenes: Number(e.target.value)})} />
              <select className="border rounded px-3 py-2 bg-background" value={mode.briseEgalite}
                onChange={e=>setMode({...mode, briseEgalite: e.target.value as any})}>
                <option value="mene_decisive">Mène décisive</option>
                <option value="egalite">Égalité acceptée</option>
              </select>
            </div>
          )}

          <div className="rounded-lg border p-3 text-sm text-muted-foreground">
            <div className="font-medium text-foreground mb-1">Résumé</div>
            <div>Format: {format}</div>
            <div>Équipe A: {equipes[0].joueurs.length} joueur(s) – Équipe B: {equipes[1].joueurs.length} joueur(s)</div>
            <div>Mode: {mode.type}</div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={()=>setEtape(2)}>Retour</Button>
            <Button variant="default" onClick={demarrer} disabled={!canStart}>Démarrer</Button>
          </div>
        </div>
      )}
    </div>
  );
}
