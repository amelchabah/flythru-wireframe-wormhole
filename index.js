import * as THREE from "three";
import spline from "./spline.js";
import { EffectComposer } from "jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "jsm/postprocessing/UnrealBloomPass.js";
import getStarfield from "./getStarfield.js";

let w = window.innerWidth;
let h = window.innerHeight;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.3);
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 5;
scene.add(camera);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 100);
bloomPass.threshold = 0.002;
bloomPass.strength = 3.5;
bloomPass.radius = 0;
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

const stars = getStarfield();
scene.add(stars);

const tubeGeo = new THREE.TubeGeometry(spline, 222, 0.65, 16, true);
const tubeColor = 0xffffff;
const edges = new THREE.EdgesGeometry(tubeGeo, 0.2);
const lineMat = new THREE.LineBasicMaterial({ color: tubeColor });
const tubeLines = new THREE.LineSegments(edges, lineMat);
scene.add(tubeLines);

const boxGroup = new THREE.Group();
scene.add(boxGroup);

// const numBoxes = 6;
const size = 0.6;
const boxGeo = new THREE.BoxGeometry(size, size, size);
const tubeLength = tubeGeo.parameters.path.getLength();
// const spacing = tubeLength / (numBoxes - 1);

const numBoxes = 6; // Assure-toi que c'est bien défini
const spacing = tubeLength / numBoxes; // Ajustement pour 6 cubes bien répartis

for (let i = 0; i < numBoxes; i++) {
  const p = (i + 1) / numBoxes; // Changer de 0 à 1 pour commencer par le bon cube
  const pos = tubeGeo.parameters.path.getPointAt(p);

  const color = new THREE.Color().setHSL(0.7 + p, 1, 0.5);
  const boxMat = new THREE.MeshBasicMaterial({ color });
  const box = new THREE.Mesh(boxGeo, boxMat);

  box.name = `box-${i + 1}`; // ID de 1 à 6
  box.userData.id = i + 1; // Correction ici aussi
  
  box.position.copy(pos);
  boxGroup.add(box);
}



const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function checkIntersections() {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(boxGroup.children);
  if (intersects.length > 0) {
    const box = intersects[0].object;
    showPopup(box.userData.id);
    stopCamera();
  }
}

function showPopup(id) {
  let popup = document.getElementById("popup");
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "popup";
    popup.style.position = "fixed";
    popup.style.top = "10px";
    popup.style.left = "10px";
    popup.style.background = "rgba(0, 0, 0, 0.7)";
    popup.style.color = "white";
    popup.style.padding = "10px";
    popup.style.borderRadius = "5px";
    popup.style.cursor = "pointer";
    popup.addEventListener("click", closePopup);
    document.body.appendChild(popup);
  }
  popup.innerText = `Cube ID: ${id}\n(Clique pour fermer)`;
}

function closePopup() {
  const popup = document.getElementById("popup");
  if (popup) {
    popup.remove();
    resumeCamera();
  }
}

let cameraSpeed = 0.5;
let isCameraStopped = false;
let lastCameraPosition = new THREE.Vector3();
let lastLookAt = new THREE.Vector3();

function updateCamera(t) {
  if (!isCameraStopped) {
    const time = t * cameraSpeed;
    const looptime = 20 * 1000;
    const p = (time % looptime) / looptime;
    const pos = tubeGeo.parameters.path.getPointAt(p);
    const lookAt = tubeGeo.parameters.path.getPointAt((p + 0.03) % 1);
    
    camera.position.copy(pos);
    camera.lookAt(lookAt);
    
    lastCameraPosition.copy(pos);
    lastLookAt.copy(lookAt);
  }
}
function stopCamera() {
  if (!isCameraStopped) {
    isCameraStopped = true;
    // Diminuer la vitesse progressivement
    cameraSpeed *= 0.95; // 0.95 représente une réduction de 5% à chaque frame
    if (cameraSpeed < 0.01) { // Se fixer un seuil pour arrêter la caméra
      cameraSpeed = 0;
    }
  }
}


function resumeCamera() {
  if (isCameraStopped) {
    isCameraStopped = false;
    cameraSpeed = 0.5; // Reprise immédiate à la bonne vitesse
  }
}


function animate(t = 0) {
  requestAnimationFrame(animate);
  updateCamera(t);
  composer.render(scene, camera);
}
animate();

window.addEventListener("mousemove", onMouseMove);
window.addEventListener("click", checkIntersections);

window.addEventListener("click", (event) => {
  const intersects = raycaster.intersectObjects(boxGroup.children, true);
  if (intersects.length > 0) {
    console.log(`Cube touché : ${intersects[0].object.name}`);
    stopCamera();
  }
});
