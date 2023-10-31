import * as THREE from 'three';
import * as ZapparThree from '@zappar/zappar-threejs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
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

const model = new URL('../assets/waywin.glb', import.meta.url).href;

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

//====================UI frame begin=================================//
const topLogo = new URL("../assets/logo.png", import.meta.url).href;
const bottomText = new URL("../assets/bottom.png", import.meta.url).href;

const loader = new THREE.TextureLoader(manager);

const texture = loader.load(topLogo);
const fire = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true })
);
fire.scale.set(0.3, 0.17, 1);
fire.position.set(0, 0.44, -1);
scene.add(fire);

const bottom = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(),
    new THREE.MeshBasicMaterial({ map: loader.load(bottomText), transparent: true })
);
bottom.scale.set(.6, .4, .2);
bottom.position.set(0, -0.33, -1);
scene.add(bottom);
//========================UI Frame end===============================//

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

let hasPlaced = false;
const placeButton = document.getElementById('tap-to-place') || document.createElement('div');
placeButton.addEventListener('click', () => {
  hasPlaced = true;
  mymodel.visible = true;
  placeButton.remove();
});

// Get a reference to the 'Snapshot' button so we can attach a 'click' listener
const snapButton = document.getElementById('image') || document.createElement('div');

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
const canvas = document.querySelector('canvas') || document.createElement('canvas');
const videoBtn = document.getElementById('video') || document.createElement('div');
let isRecording = false;
ZapparVideoRecorder.createCanvasVideoRecorder(canvas, {
}).then((recorder) => {
  videoBtn.addEventListener('click', () => {
    if(!isRecording) {
      isRecording = true;
      recorder.start();
    }
    else {
      isRecording = false;
      recorder.stop();
    }
  });

  recorder.onComplete.bind(async (res) => {
    ZapparSharing({
      data: await res.asDataURL(),
    });
  });
});

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

  // Draw the ThreeJS scene in the usual way, but using the Zappar camera
  renderer.render(scene, camera);
}

// Start things off
render();