# Pétanque facile

Pétanque facile is an application for managing pétanque games built with Vite, React, TypeScript, shadcn-ui and Tailwind CSS.

## Development

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

## Optional native image analysis

The API can analyze photos to determine which boule is closest to the jack. A
pure JavaScript version is bundled, but you can enable a faster native
implementation using [opencv4nodejs](https://www.npmjs.com/package/opencv4nodejs).

1. Install OpenCV on your system (Ubuntu example):
   ```bash
   sudo apt-get update && sudo apt-get install -y build-essential cmake libopencv-dev
   ```
2. Install the Node binding (using the prebuilt `@u4` distribution to avoid
   compiling OpenCV locally):
   ```bash
   npm install opencv4nodejs@npm:@u4/opencv4nodejs
   ```
3. Start the API server:
   ```bash
   npm run server
   ```
4. Send a photo to be analyzed:
   ```bash
   curl -F "photo=@/path/to/image.jpg" http://localhost:3001/api/analyze
   ```

If `opencv4nodejs` is not installed, the server falls back to the bundled
WebAssembly implementation, which is slower but still functional.
