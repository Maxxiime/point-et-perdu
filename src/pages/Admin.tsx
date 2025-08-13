import { Helmet } from "react-helmet-async";
import { useData } from "@/store/DataContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Admin() {
  const { estAdmin, loginAdmin, logoutAdmin, db, supprimerPartie, supprimerUtilisateur, renommerUtilisateur, reinitialiserStats, exporterJSON, importerJSON, supprimerPhoto } = useData();
  const [pwd, setPwd] = useState("");
  const [renomId, setRenomId] = useState("");
  const [renomNom, setRenomNom] = useState("");

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importerJSON(file);
  };

  if (!estAdmin) {
    return (
      <section className="space-y-4">
        <Helmet>
          <title>Admin – Pétanque facile</title>
          <meta name="description" content="Espace d'administration: export/import, gestion des utilisateurs et parties." />
        </Helmet>
        <div className="space-y-2">
          <label className="text-sm">Mot de passe</label>
          <input className="border rounded px-3 py-2 w-full bg-background" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} />
          <Button onClick={()=>{
            if (!loginAdmin(pwd)) alert("Mot de passe incorrect");
          }}>Entrer</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <Helmet>
        <title>Admin – Pétanque facile</title>
        <meta name="description" content="Espace d'administration: export/import, gestion des utilisateurs et parties." />
      </Helmet>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={logoutAdmin}>Se déconnecter</Button>
        <Button onClick={reinitialiserStats}>Réinitialiser les statistiques</Button>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={exporterJSON}>Exporter JSON</Button>
        <label className="inline-flex items-center gap-2 px-4 py-2 border rounded cursor-pointer">
          Importer JSON
          <input type="file" accept="application/json" className="hidden" onChange={onImport} />
        </label>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Renommer un utilisateur</h3>
        <select className="border rounded px-3 py-2 w-full bg-background" value={renomId} onChange={e=>setRenomId(e.target.value)}>
          <option value="">Choisir…</option>
          {db?.utilisateurs.map(u => <option key={u.id} value={u.id}>{u.nom}</option>)}
        </select>
        <input className="border rounded px-3 py-2 w-full bg-background" placeholder="Nouveau nom" value={renomNom} onChange={e=>setRenomNom(e.target.value)} />
        <Button onClick={()=>{
          if (!renomId || !renomNom.trim()) return;
          renommerUtilisateur(renomId, renomNom);
          setRenomId(""); setRenomNom("");
        }}>Valider</Button>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Supprimer une partie</h3>
        <ul className="space-y-1">
          {db?.parties.map(p => (
            <li key={p.id} className="flex items-center justify-between border rounded p-2">
              <span>{p.equipes[0].joueurs.map(id=>db?.utilisateurs.find(u=>u.id===id)?.nom).filter(Boolean).join(" & ")} vs {p.equipes[1].joueurs.map(id=>db?.utilisateurs.find(u=>u.id===id)?.nom).filter(Boolean).join(" & ")} – {p.etat}</span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Supprimer</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer la partie ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => supprimerPartie(p.id)}>
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Supprimer des photos</h3>
        {!db?.parties.some(p => p.photos.length) ? (
          <p className="text-sm text-muted-foreground">Aucune photo</p>
        ) : (
          <ul className="space-y-2">
            {db?.parties.filter(p => p.photos.length).map(p => (
              <li key={p.id} className="space-y-2 border rounded p-2">
                <div className="text-sm">
                  {p.equipes[0].joueurs.map(id=>db?.utilisateurs.find(u=>u.id===id)?.nom).filter(Boolean).join(" & ")} vs {p.equipes[1].joueurs.map(id=>db?.utilisateurs.find(u=>u.id===id)?.nom).filter(Boolean).join(" & ")}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {p.photos.map(ph => (
                    <div key={ph.id} className="relative">
                      <img src={ph.url} alt="Photo" className="w-full h-24 object-cover rounded" />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1"
                        onClick={() => supprimerPhoto(p.id, ph.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Supprimer un utilisateur</h3>
        <ul className="space-y-1">
          {db?.utilisateurs.map(u => (
            <li key={u.id} className="flex items-center justify-between border rounded p-2">
              <span>{u.nom}</span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Supprimer</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Supprimer l’utilisateur « {u.nom} » ?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Il disparaîtra des listes. Les parties passées resteront inchangées.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => supprimerUtilisateur(u.id)}>
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
