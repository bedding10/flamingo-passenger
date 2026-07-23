import * as THREE from "three";
import type { ExpoWebGLRenderingContext } from "expo-gl";

/**
 * expo-gl gives us a real WebGL rendering context but no DOM <canvas>.
 * three.js' WebGLRenderer only *needs* a canvas-like object for a small
 * amount of bookkeeping (reported size, inline style, add/removeEventListener)
 * -- it never touches the DOM as long as a `context` is supplied directly.
 * This stub stands in for that canvas so we can construct THREE.WebGLRenderer
 * without expo-three.
 */
function createStubCanvas(gl: ExpoWebGLRenderingContext): HTMLCanvasElement {
  const stub = {
    width: gl.drawingBufferWidth,
    height: gl.drawingBufferHeight,
    clientWidth: gl.drawingBufferWidth,
    clientHeight: gl.drawingBufferHeight,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    getContext: () => gl,
  };
  return stub as unknown as HTMLCanvasElement;
}

/**
 * Creates a THREE.WebGLRenderer bound to an expo-gl context.
 * Caller is responsible for calling `renderer.dispose()` on cleanup and
 * for calling `endExpoGLFrame(gl)` after every `renderer.render(...)`.
 */
export function createExpoGLRenderer(
  gl: ExpoWebGLRenderingContext,
): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas: createStubCanvas(gl),
    context: gl as unknown as WebGLRenderingContext,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

/**
 * expo-gl is double-buffered: three.js renders into an off-screen buffer,
 * and this call flips it to the visible screen. Must run once per frame,
 * right after renderer.render(scene, camera).
 */
export function endExpoGLFrame(gl: ExpoWebGLRenderingContext): void {
  gl.endFrameEXP();
}
