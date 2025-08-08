import { Helmet } from "react-helmet-async";
import { useData } from "@/store/DataContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Admin() {
  const { estAdmin, loginAdmin, logoutAdmin, db, supprimerPartie, supprimerUtilisateur, renommerUtilisateur, reinitialiserStats, exporterJSON, importerJSON } = useData();
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
              <Button variant="destructive" onClick={()=>{
                if (window.confirm("Supprimer définitivement cette partie ? Cette action est irréversible.")) supprimerPartie(p.id);
              }}>Supprimer</Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Supprimer un utilisateur</h3>
        <ul className="space-y-1">
          {db?.utilisateurs.map(u => (
            <li key={u.id} className="flex items-center justify-between border rounded p-2">
              <span>{u.nom}</span>
              <Button variant="destructive" onClick={()=>{
                if (window.confirm(`Supprimer l’utilisateur « ${u.nom} » ? Il disparaîtra des listes. Les parties passées resteront inchangées.`)) supprimerUtilisateur(u.id);
              }}>Supprimer</Button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
