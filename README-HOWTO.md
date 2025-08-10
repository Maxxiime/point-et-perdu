# Photo Analyzer for Pétanque (client-side, OpenCV.js)

## Fichiers ajoutés
- `src/lib/opencv.ts` — charge OpenCV.js dans le navigateur
- `src/lib/petanque/analyze.ts` — logique d'analyse (détection cercles + classement)
- `src/components/PhotoAnalyzer.tsx` — composant React prêt à intégrer

## Intégration rapide
```tsx
// Dans la page où vous voulez l'outil : 
import PhotoAnalyzer from "@/components/PhotoAnalyzer";

export default function Page() {
  return <PhotoAnalyzer />;
}
```

> Aucun package npm requis (OpenCV.js est chargé depuis le CDN).

## Option serveur (facultatif)
Si vous préférez une API Node (opencv4nodejs), dites-le-moi — je vous fournirai `server/api/analyze.js` + mise à jour `server.js`.
