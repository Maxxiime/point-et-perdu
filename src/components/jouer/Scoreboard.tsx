import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useData } from "@/store/DataContext";
import { Partie } from "@/types";
import { formatCountdown, formatFrLong } from "@/utils/date";
import { Pencil, Trash2, ImagePlus, Heart, MessageSquare } from "lucide-react";

export default function Scoreboard({ partie }: { partie: Partie }) {
  const { db, ajouterMene, editerMene, supprimerMene, rollbackVersMene, terminerPartie, annulerPartie, likerPartie, commenterPartie, ajouterPhoto } = useData();
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [comment, setComment] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const expireAt = partie.chronoExpireAt ? new Date(partie.chronoExpireAt).getTime() : null;
  const countdown = useMemo(()=> expireAt ? formatCountdown(expireAt - Date.now()) : null, [expireAt, partie.menes.length]);

  const validerMene = () => {
    ajouterMene(partie.id, a, b);
    setA(0); setB(0);
  };

  const onEdit = (mNo: number) => {
    const nvA = Number(prompt(`Points A (mène ${mNo})`, String(partie.menes.find(m=>m.numero===mNo)?.points.A ?? 0)));
    const nvB = Number(prompt(`Points B (mène ${mNo})`, String(partie.menes.find(m=>m.numero===mNo)?.points.B ?? 0)));
    editerMene(partie.id, mNo, nvA, nvB);
  };

  const onDelete = (mNo: number) => {
    if (!window.confirm(`Supprimer la mène n°${mNo} ?`)) return;
    supprimerMene(partie.id, mNo);
  };

  const onRollback = () => {
    const n = Number(prompt("Revenir à la mène n° ?"));
    if (!n) return;
    rollbackVersMene(partie.id, n);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{formatFrLong(partie.dateISO)}</div>
        {countdown && <div className="text-sm font-mono">⏱ {countdown}</div>}
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl p-4 bg-gradient-to-b from-[hsl(var(--card))] to-[hsl(var(--secondary))] border">
          <div className="text-xs uppercase text-muted-foreground mb-1">{(partie.equipes[0].joueurs.map(id=>db?.utilisateurs.find(u=>u.id===id)?.nom).filter(Boolean).join(" & ")) || partie.equipes[0].nom}</div>
          <div className="text-5xl font-bold">{partie.equipes[0].scoreTotal}</div>
        </div>
        <div className="rounded-xl p-4 bg-gradient-to-b from-[hsl(var(--card))] to-[hsl(var(--secondary))] border">
          <div className="text-xs uppercase text-muted-foreground mb-1">{(partie.equipes[1].joueurs.map(id=>db?.utilisateurs.find(u=>u.id===id)?.nom).filter(Boolean).join(" & ")) || partie.equipes[1].nom}</div>
          <div className="text-5xl font-bold">{partie.equipes[1].scoreTotal}</div>
        </div>
      </div>

      {partie.etat === 'en_cours' && (
        <div className="border rounded-xl p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm">Points A (0–6)</label>
              <input type="number" min={0} max={6} value={a} onChange={e=>setA(Number(e.target.value))} className="mt-1 w-full border rounded px-3 py-2 bg-background" />
            </div>
            <div>
              <label className="text-sm">Points B (0–6)</label>
              <input type="number" min={0} max={6} value={b} onChange={e=>setB(Number(e.target.value))} className="mt-1 w-full border rounded px-3 py-2 bg-background" />
            </div>
          </div>
          <Button className="w-full" onClick={validerMene}>Valider la mène</Button>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onRollback}>Corriger une mène</Button>
            {partie.modeJeu.type === 'amical' && (
              <Button variant="outline" className="flex-1" onClick={onTerminer}>Terminer la partie</Button>
            )}
            <Button variant="outline" className="flex-1" onClick={onAnnuler}>Annuler la partie</Button>
          </div>
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
        <h3 className="font-semibold">Mènes</h3>
        {!partie.menes.length ? (
          <p className="text-muted-foreground">Aucune mène</p>
        ) : (
          <ul className="space-y-1">
            {partie.menes.map(m => (
              <li key={m.numero} className="flex items-center justify-between border rounded p-2">
                <span>n°{m.numero} — A {m.points.A} / B {m.points.B}</span>
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
              <img key={ph.id} src={ph.url} alt="Photo de la partie de pétanque" className="w-full h-24 object-cover rounded" loading="lazy" />
            ))}
          </div>
        </div>
      )}

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
          <div className="text-sm text-muted-foreground">Vainqueur: {partie.vainqueur ?? 'égalité'}</div>
        </div>
      )}
    </div>
  );
}
