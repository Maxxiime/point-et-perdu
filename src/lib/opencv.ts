// src/lib/opencv.ts
// Lazy-load OpenCV.js (WASM build) in the browser.
// No npm dependency; it fetches from the official CDN at runtime.
let cvPromise: Promise<any> | null = null;

export function loadOpenCV(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("OpenCV loader can only run in the browser."));
  }
  if (cvPromise) return cvPromise;

  cvPromise = new Promise((resolve, reject) => {
    // If already present on window, resolve immediately
    if ((window as any).cv && (window as any).cv.Mat) {
      resolve((window as any).cv);
      return;
    }

    const script = document.createElement("script");
    // Use the 4.x bundle hosted by OpenCV; keep it generic to get a recent minor.
    script.src = "https://docs.opencv.org/4.x/opencv.js";
    script.async = true;
    script.onload = async () => {
      const cv = (window as any).cv;
      // Wait for wasm to be ready if needed
      if (!cv || typeof cv['onRuntimeInitialized'] === "undefined") {
        reject(new Error("Failed to load OpenCV.js"));
        return;
      }
      cv['onRuntimeInitialized'] = () => {
        resolve(cv);
      };
    };
    script.onerror = () => reject(new Error("Failed to fetch opencv.js"));
    document.head.appendChild(script);
  });
  return cvPromise;
}
