import "./style.css";

import * as THREE from "three";
import { Components } from "@thatopen/components";
import { FragmentsManager } from "@thatopen/fragments";

const app = document.getElementById("app") as HTMLDivElement;

app.innerHTML = `
  <div class="topbar">Architecture and Design College — King Abdulaziz University</div>
  <div class="toolbar">
    <div class="label">Load IFC</div>
    <input id="fileInput" type="file" accept=".ifc" />
    <button id="resetBtn" class="btn" type="button">Reset View</button>
    <button id="clearBtn" class="btn" type="button">Clear Model</button>
    <div id="status" class="status">Ready.</div>
  </div>
  <div id="viewerWrap">
    <div id="viewer"></div>
  </div>
`;

const statusEl = document.getElementById("status") as HTMLDivElement;
const viewerEl = document.getElementById("viewer") as HTMLDivElement;
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;
const clearBtn = document.getElementById("clearBtn") as HTMLButtonElement;

function setStatus(msg: string) {
  statusEl.textContent = msg;
}

// --- ThatOpen Components setup ---
const components = new Components();

// Scene
const sceneComponent = components.scene;
sceneComponent.setup();
const scene = sceneComponent.get();

// Renderer
const rendererComponent = components.renderer;
rendererComponent.setup(viewerEl);
const renderer = rendererComponent.get();

// Camera
const cameraComponent = components.camera;
cameraComponent.setup(renderer);
const camera = cameraComponent.get();

// Controls
const raycastersComponent = components.raycasters;
raycastersComponent.setup(renderer);

// Lights
const lightsComponent = components.lights;
lightsComponent.setup();
lightsComponent.get().addDefaultLights(scene);

// Grid (this is your plane)
const grid = new THREE.GridHelper(200, 50);
scene.add(grid);

// Background white
renderer.setClearColor(0xffffff, 1);

// Fragments manager
const fragments = new FragmentsManager(components);

// Animation loop
components.init();
rendererComponent.setAnimationLoop(() => {
  components.update();
  renderer.render(scene, camera);
});

setStatus("Viewer ready. Choose an IFC file.");

// --- Load IFC ---
let loadedGroups: THREE.Object3D[] = [];

async function loadIfcFile(file: File) {
  setStatus("Loading IFC…");

  // Convert file to ArrayBuffer
  const buffer = await file.arrayBuffer();

  // Load fragments
  const group = await fragments.load(buffer);

  if (!group) throw new Error("Fragments loader returned null.");

  scene.add(group);
  loadedGroups.push(group);

  // Fit view roughly
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  box.getSize(size);

  const center = new THREE.Vector3();
  box.getCenter(center);

  camera.position.set(center.x + size.x, center.y + size.y, center.z + size.z);
  camera.lookAt(center);

  setStatus("Loaded ✅");
}

function clearModel() {
  for (const g of loadedGroups) {
    scene.remove(g);
  }
  loadedGroups = [];
  setStatus("Model cleared.");
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  try {
    await loadIfcFile(file);
  } catch (e: any) {
    console.error(e);
    setStatus("Load failed ❌");
    alert("IFC load failed:\n" + (e?.message || String(e)));
  }
});

resetBtn.addEventListener("click", () => {
  camera.position.set(10, 10, 10);
  camera.lookAt(0, 0, 0);
  setStatus("View reset.");
});

clearBtn.addEventListener("click", () => {
  clearModel();
});
