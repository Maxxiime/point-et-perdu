import { useMemo, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useData } from "@/store/DataContext";
import { Partie } from "@/types";
import { formatFrLong } from "@/utils/date";
import { Pencil, Trash2, ImagePlus, Heart, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertFooter, AlertDialogHeader as AlertHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function Scoreboard({ partie }: { partie: Partie }) {
  const { db, ajouterMene, editerMene, supprimerMene, terminerPartie, annulerPartie, likerPartie, commenterPartie, ajouterPhoto } = useData();
  const [newPoints, setNewPoints] = useState<Record<string, string>>(() => Object.fromEntries(partie.equipes.map(e => [e.id, ""])));
  const [editingMene, setEditingMene] = useState<number | null>(null);
  const [editPoints, setEditPoints] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Reset inputs when teams change or after validation
    setNewPoints(Object.fromEntries(partie.equipes.map(e => [e.id, ""])));
  }, [partie.equipes.length]);


  const validerMene = () => {
    const pts = Object.fromEntries(Object.entries(newPoints).map(([id, val]) => [id, Number(val) || 0]));
    ajouterMene(partie.id, pts);
    setNewPoints(Object.fromEntries(partie.equipes.map(e => [e.id, ""])));
  };

  const onEdit = (mNo: number) => {
    const m = partie.menes.find(m=>m.numero===mNo);
    const base: Record<string, number> = Object.fromEntries(partie.equipes.map(e => [e.id, m?.points?.[e.id] ?? 0]));
    setEditPoints(base);
    setEditingMene(mNo);
  };

  const onDelete = (mNo: number) => {
    if (!window.confirm(`Supprimer la mène n°${mNo} ?`)) return;
    supprimerMene(partie.id, mNo);
  };

  const onTerminer = () => {
    terminerPartie(partie.id);
  };
  const onAnnuler = () => {
    annulerPartie(partie.id);
  };
  const onLike = () => likerPartie(partie.id);
  const onComment = () => {
    if (!comment.trim()) return;
    commenterPartie(partie.id, comment);
    setComment("");
  };
  const onPhoto = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      ajouterPhoto(partie.id, String(reader.result));
    };
    reader.readAsDataURL(f);
    e.currentTarget.value = "";
  };

  const nomVainqueur = useMemo(() => {
    if (!partie.vainqueur) return null;
    const eq = partie.equipes.find(e => e.id === partie.vainqueur);
    if (!eq) return partie.vainqueur;
    const noms = eq.joueurs.map(id => db?.utilisateurs.find(u => u.id === id)?.nom).filter(Boolean).join(" & ");
    return noms || eq.nom;
  }, [partie.vainqueur, partie.equipes, db?.utilisateurs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{formatFrLong(partie.dateISO)}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-center">
        {partie.equipes.map((eq) => (
          <div key={eq.id} className="rounded-xl p-4 bg-gradient-to-b from-[hsl(var(--card))] to-[hsl(var(--secondary))] border">
            <div className="text-xs uppercase text-muted-foreground mb-1">{(eq.joueurs.map(id=>db?.utilisateurs.find(u=>u.id===id)?.nom).filter(Boolean).join(" & ")) || eq.nom}</div>
            <div className="text-5xl font-bold">{eq.scoreTotal}</div>
          </div>
        ))}
      </div>

      {partie.etat === 'en_cours' && (
        <div className="border rounded-xl p-3 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {partie.equipes.map((eq) => (
              <div key={eq.id}>
                <label className="text-sm">{(eq.joueurs.map(id=>db?.utilisateurs.find(u=>u.id===id)?.nom).filter(Boolean).join(" & ")) || eq.nom}</label>
                <input type="number" min={0} value={newPoints[eq.id] ?? ""} onChange={e=>setNewPoints(p=>({ ...p, [eq.id]: e.target.value }))} className="mt-1 w-full border rounded px-3 py-2 bg-background" />
              </div>
            ))}
          </div>
          <Button className="w-full" onClick={validerMene}>Valider la mène</Button>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onPhoto} className="flex items-center gap-2"><ImagePlus className="size-4" /> + Photo</Button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
          <Button variant="outline" onClick={onLike} className="flex items-center gap-2"><Heart className="size-4" /> Like ({partie.likes})</Button>
        </div>
        <div className="flex items-center gap-2">
          <input className="flex-1 border rounded px-3 py-2 bg-background" placeholder="Commenter" value={comment} onChange={e=>setComment(e.target.value)} />
          <Button onClick={onComment} className="flex items-center gap-2"><MessageSquare className="size-4" /> Commenter</Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Mènes</h3>
        </div>
        {!partie.menes.length ? (
          <p className="text-muted-foreground">Aucune mène</p>
        ) : (
          <ul className="space-y-1">
            {partie.menes.map(m => (
              <li key={m.numero} className="flex items-center justify-between border rounded p-2">
                  <span>
                    n°{m.numero} — {partie.equipes.map(eq => `${(eq.joueurs.map(id=>db?.utilisateurs.find(u=>u.id===id)?.nom).filter(Boolean).join(" & ")) || eq.nom} ${m.points[eq.id] ?? 0}`).join(" | ")}
                  </span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={()=>onEdit(m.numero)}><Pencil className="size-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={()=>onDelete(m.numero)}><Trash2 className="size-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!!partie.photos.length && (
        <div className="space-y-2">
          <h3 className="font-semibold">Photos</h3>
          <div className="grid grid-cols-3 gap-2">
            {partie.photos.map(ph => (
              <button
                key={ph.id}
                type="button"
                onClick={() => setViewPhoto(ph.url)}
                className="w-full h-24 rounded overflow-hidden p-0 border-0 bg-transparent"
              >
                <img
                  src={ph.url}
                  alt="Photo de la partie de pétanque"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <Dialog open={viewPhoto !== null} onOpenChange={o => { if (!o) setViewPhoto(null); }}>
        <DialogContent className="max-w-fit p-0">
          {viewPhoto && (
            <img
              src={viewPhoto}
              alt="Photo de la partie de pétanque"
              className="max-w-[90vw] max-h-[90vh]"
            />
          )}
        </DialogContent>
      </Dialog>

      {!!partie.commentaires.length && (
        <div className="space-y-2">
          <h3 className="font-semibold">Commentaires</h3>
          <ul className="space-y-1">
            {partie.commentaires.map(c => (
              <li key={c.id} className="border rounded p-2 text-sm">
                <div className="text-muted-foreground text-xs">{formatFrLong(c.dateISO)}</div>
                <div>{c.texte}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {partie.etat === 'terminee' && (
        <div className="rounded-lg border p-3 text-center bg-secondary">
          <div className="font-semibold">Partie terminée</div>
          <div className="text-sm text-muted-foreground">Vainqueur: {nomVainqueur ?? 'égalité'}</div>
        </div>
      )}

      <Dialog open={editingMene !== null} onOpenChange={(o)=>{ if(!o) setEditingMene(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la mène n°{editingMene ?? ""}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {partie.equipes.map(eq => (
              <div key={eq.id}>
                <label className="text-sm">{(eq.joueurs.map(id=>db?.utilisateurs.find(u=>u.id===id)?.nom).filter(Boolean).join(" & ")) || eq.nom}</label>
                <input
                  type="number"
                  min={0}
                  value={editPoints[eq.id] ?? 0}
                  onChange={e => setEditPoints(p=>({ ...p, [eq.id]: Number(e.target.value) }))}
                  className="mt-1 w-full border rounded px-3 py-2 bg-background"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button onClick={() => { if (editingMene!=null) { editerMene(partie.id, editingMene, editPoints); setEditingMene(null); } }}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {partie.etat === 'en_cours' && (
        <div className="sticky bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3">
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="flex-1" variant="destructive">Terminer la partie</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertHeader>
                  <AlertDialogTitle>Terminer la partie ?</AlertDialogTitle>
                  <AlertDialogDescription>Cette action va clôturer la partie en cours.</AlertDialogDescription>
                </AlertHeader>
                <AlertFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={onTerminer}>Oui, terminer</AlertDialogAction>
                </AlertFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="flex-1" variant="destructive">Annuler la partie</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertHeader>
                  <AlertDialogTitle>Annuler la partie ?</AlertDialogTitle>
                  <AlertDialogDescription>Cette action est définitive et supprimera la partie en cours.</AlertDialogDescription>
                </AlertHeader>
                <AlertFooter>
                  <AlertDialogCancel>Retour</AlertDialogCancel>
                  <AlertDialogAction onClick={onAnnuler}>Oui, annuler</AlertDialogAction>
                </AlertFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}

