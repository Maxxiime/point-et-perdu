# API Node (optionnelle) pour l'analyse d'image

## Installation
```bash
npm i express multer opencv4nodejs@npm:@u4/opencv4nodejs
# Assurez-vous d'avoir OpenCV installé sur votre machine (libs + headers) si la
# distribution précompilée ne couvre pas votre plateforme.
```

## Lancer en standalone
```bash
node server/opencv-analyze.mjs
# POST une image: 
curl -F "photo=@/chemin/vers/photo.jpg" http://localhost:8787/api/analyze
```

## Intégration à votre `server.js`
```js
// server.js
import express from "express";
import { router as analyzerRouter } from "./server/opencv-analyze.mjs";
const app = express();
app.use(analyzerRouter);
app.listen(8787);
```
