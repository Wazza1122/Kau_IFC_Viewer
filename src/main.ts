import * as THREE from "three";
import * as OBC from "@thatopen/components";
import "./style.css";

const statusEl = document.getElementById("status") as HTMLDivElement;
const infoEl = document.getElementById("info") as HTMLDivElement;
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;

const container = document.getElementById("container") as HTMLDivElement;

function setStatus(msg: string) {
  statusEl.textContent = msg;
}

function escapeHtml(v: unknown) {
  return String(v).replace(/[&<>"']/g, (m) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[m] ?? m;
  });
}

// ---- ThatOpen world ----
const components = new OBC.Components();

const worlds = components.get(OBC.Worlds);
const world = worlds.create<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBC.SimpleRenderer>();

world.scene = new OBC.SimpleScene(components);
world.scene.setup();
world.scene.three.background = new THREE.Color(0xffffff);

world.renderer = new OBC.SimpleRenderer(components, container);

world.camera = new OBC.OrthoPerspectiveCamera(components);
await world.camera.controls.setLookAt(60, 25, 35, 0, 0, 0);

components.init();

// ---- IFC Loader ----
const ifcLoader = components.get(OBC.IfcLoader);
await ifcLoader.setup({
  autoSetWasm: false,
  wasm: {
    path: "https://unpkg.com/web-ifc@0.0.72/",
    absolute: true,
  },
});

setStatus("Ready. Load an IFC.");
infoEl.textContent = "Double-click any element after loading.";

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  setStatus("Loading IFC…");
  infoEl.textContent = "Loading…";

  // Clear scene objects except lights/camera internals
  const keep: THREE.Object3D[] = [];
  world.scene.three.children.forEach((c) => keep.push(c));
  // (Simple clear: recreate scene)
  world.scene.three.clear();
  world.scene.three.background = new THREE.Color(0xffffff);

  const buf = new Uint8Array(await file.arrayBuffer());
  const model = await ifcLoader.load(buf, false, file.name);

  world.scene.three.add(model);
  await world.camera.controls.setLookAt(60, 25, 35, 0, 0, 0);

  setStatus("Loaded ✅ Double-click to pick.");
  infoEl.textContent = "Double-click any element in the model.";
});

resetBtn.addEventListener("click", async () => {
  await world.camera.controls.setLookAt(60, 25, 35, 0, 0, 0);
  setStatus("View reset.");
});

// ---- Picking (double click) ----
const raycasters = components.get(OBC.Raycasters);
const caster = raycasters.get(world);

container.addEventListener("dblclick", async () => {
  try {
    const hit = (await caster.castRay()) as any;
    if (!hit) return;

    // hit has localId and modelID-like info depending on build
    const localId = hit.localId ?? hit.id ?? "-";
    const modelId = hit.fragments?.modelId ?? hit.modelId ?? "-";

    infoEl.innerHTML =
      "<div><b>Model:</b> " + escapeHtml(modelId) + "</div>" +
      "<div><b>Local ID:</b> " + escapeHtml(localId) + "</div>";

  } catch {
    // ignore
  }
});
