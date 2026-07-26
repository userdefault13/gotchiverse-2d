import { Scene } from 'types/phaser';

let scene: Scene; // change to global
interface SceneControllerInterface {
  setScene: (sceneObj: Scene) => void;
}

function setScene(sceneObj: Scene) {
  scene = sceneObj;
  // Colyseus client historically looked up players via globalThis.scene.
  // Keep this shim so key movement works even if a stale bundle still does that.
  try {
    (globalThis as unknown as { scene?: Scene }).scene = sceneObj;
  } catch {
    /* ignore */
  }
}

const SceneController: SceneControllerInterface = {
  setScene,
};

export { scene };

export default SceneController;
