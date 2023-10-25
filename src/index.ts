import * as THREE from 'three';
import * as ZapparThree from '@zappar/zappar-threejs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
const model = new URL('../assets/BULLFINAL.glb', import.meta.url).href;
import ZapparSharing from '@zappar/sharing';
import * as ZapparVideoRecorder from '@zappar/video-recorder';
import './index.css';
if (ZapparThree.browserIncompatible()) {
  // The browserIncompatibleUI() function shows a full-page dialog that informs the user
  // they're using an unsupported browser, and provides a button to 'copy' the current page
  // URL so they can 'paste' it into the address bar of a compatible alternative.
  ZapparThree.browserIncompatibleUI();

  // If the browser is not compatible, we can avoid setting up the rest of the page
  // so we throw an exception here.
  throw new Error('Unsupported browser');
}

// ZapparThree provides a LoadingManager that shows a progress bar while
// the assets are downloaded. You can use this if it's helpful, or use
// your own loading UI - it's up to you :-)
const manager = new ZapparThree.LoadingManager();

// Construct our ThreeJS renderer and scene as usual
const renderer = new THREE.WebGLRenderer({ antialias: true });
const scene = new THREE.Scene();
document.body.appendChild(renderer.domElement);

// As with a normal ThreeJS scene, resize the canvas if the window resizes
renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Create a Zappar camera that we'll use instead of a ThreeJS camera
const camera = new ZapparThree.Camera();

// In order to use camera and motion data, we need to ask the users for permission
// The Zappar library comes with some UI to help with that, so let's use it
ZapparThree.permissionRequestUI().then((granted) => {
  // If the user granted us the permissions we need then we can start the camera
  // Otherwise let's them know that it's necessary with Zappar's permission denied UI
  if (granted) camera.start();
  else ZapparThree.permissionDeniedUI();
});

// The Zappar component needs to know our WebGL context, so set it like this:
ZapparThree.glContextSet(renderer.getContext());

// Set the background of our scene to be the camera background texture
// that's provided by the Zappar camera
scene.background = camera.backgroundTexture;

// Create an InstantWorldTracker and wrap it in an InstantWorldAnchorGroup for us
// to put our ThreeJS content into
const instantTracker = new ZapparThree.InstantWorldTracker();
const instantTrackerGroup = new ZapparThree.InstantWorldAnchorGroup(camera, instantTracker);

// Add our instant tracker group into the ThreeJS scene
scene.add(instantTrackerGroup);

// Load a 3D model to place within our group (using ThreeJS's GLTF loader)
// Pass our loading manager in to ensure the progress bar works correctly
const gltfLoader = new GLTFLoader(manager);
let mixer : any;
let mymodel : any;
gltfLoader.load(model, (gltf) => {
  // Now the model has been loaded, we can add it to our instant_tracker_group
  mymodel = gltf.scene;
  instantTrackerGroup.add(gltf.scene);
  gltf.scene.visible = false;
  gltf.scene.scale.set(30, 30, 30);
  gltf.scene.position.set(0, 0, 0);
  console.log(gltf.scene);
  mixer = new THREE.AnimationMixer(gltf.scene);
  let action = mixer.clipAction(gltf.animations[0]);
  action.play();
}, undefined, () => {
  console.log('An error ocurred loading the GLTF model');
});

// Let's add some lighting, first a directional light above the model pointing down
const directionalLight = new THREE.DirectionalLight('white', 0.8);
directionalLight.position.set(0, 0, 1000);
directionalLight.lookAt(0, 0, 0);
instantTrackerGroup.add(directionalLight);

// And then a little ambient light to brighten the model up a bit
const ambientLight = new THREE.AmbientLight('white', 0.4);
instantTrackerGroup.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 0.8);
pointLight.position.set(0, 100, 200);
instantTrackerGroup.add(pointLight);

const spotLight = new THREE.SpotLight(0xffffff, 0.8); // Adjust color and intensity
spotLight.position.set(0, 25, 500); // Set the position
spotLight.target.position.set(0, -0.5, 0); // Set the target
instantTrackerGroup.add(spotLight);

// When the experience loads we'll let the user choose a place in their room for
// the content to appear using setAnchorPoseFromCameraOffset (see below)
// The user can confirm the location by tapping on the screen
let hasPlaced = false;
const placeButton = document.getElementById('tap-to-place') || document.createElement('div');
placeButton.addEventListener('click', () => {
  hasPlaced = true;
  mymodel.visible = true;
  placeButton.remove();
});

// Get a reference to the 'Snapshot' button so we can attach a 'click' listener
const snapButton = document.getElementById('snapshot') || document.createElement('div');

snapButton.addEventListener("click", () => {

  // Create an image from the canvas
  const planeGeometry = new THREE.PlaneGeometry(2, 2);
  const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
  scene.add(planeMesh);

  // Temporarily set the camera to focus on the planeMesh
  const originalCameraPosition = camera.position.clone();
  camera.position.set(
    planeMesh.position.x,
    planeMesh.position.y,
    planeMesh.position.z + 5
  );

  camera.lookAt(planeMesh.position);

  // Render the scene
  renderer.render(scene, camera);

  // Capture the rendered image from the main renderer
  // const screenshotImage = new Image();
  const dataURL = renderer.domElement.toDataURL("image/png");

    // Take snapshot
  ZapparSharing({
    data: dataURL,
  });

  // Reset the camera and visibility of the planeMesh
  camera.position.copy(originalCameraPosition);
  camera.lookAt(0, 0, 0);
});

// video capture
const vidButton = document.getElementById('videocapture') || document.createElement('div');
const stopButton = document.getElementById('stopcapture') || document.createElement('div');

const canvas = document.querySelector('canvas') || document.createElement('canvas');

ZapparVideoRecorder.createCanvasVideoRecorder(canvas, {
}).then((recorder) => {
  vidButton.addEventListener('click', () => {
    recorder.start();
  });

  stopButton.addEventListener('click', () => {
    recorder.stop();
  });

  recorder.onComplete.bind(async (res) => {
    ZapparSharing({
      data: await res.asDataURL(),
    });
  });
});

// const sprites: THREE.Sprite[] = [];
// let currentFrame = 0;
// const totalFrames = 50;

// // Load sprite images and create sprite objects
// for (let i = 0; i < totalFrames; i++) {
//   const textureLoader = new THREE.TextureLoader();
//   const texture = textureLoader.load(`assets/flowers/frame_${i}_delay-0.04s.gif`);
//   const spriteMaterial = new THREE.SpriteMaterial({ map: texture });

//   const sprite = new THREE.Sprite(spriteMaterial);
//   sprite.scale.set(2, 2, 1); // Scale the sprite to cover the canvas
//   scene.add(sprite);
//   sprites.push(sprite);
// }

// Use a function to render our scene as usual
function render(): void {
  if (!hasPlaced) {
    // If the user hasn't chosen a place in their room yet, update the instant tracker
    // to be directly in front of the user
    instantTrackerGroup.setAnchorPoseFromCameraOffset(0, 0, -5);
  }

  // The Zappar camera must have updateFrame called every frame
  camera.updateFrame(renderer);

  if(mixer) mixer.update(0.01);
  
  // Call render() again next frame
  requestAnimationFrame(render);

  // Rotate and update the sprites
  // const axis = new THREE.Vector3(0, 0, 1);
  // const angle = 0.02;
  // sprites[currentFrame].rotateOnAxis(axis, angle);

  // Draw the ThreeJS scene in the usual way, but using the Zappar camera
  renderer.render(scene, camera);

  // Update the current frame
  // currentFrame = (currentFrame + 1) % totalFrames;
}

// Start things off
render();