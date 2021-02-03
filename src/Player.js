import * as BABYLON from "babylonjs";
import * as Loader from "babylonjs-loaders";

//keyCode
const W = 87;
const S = 83;
const A = 65;
const D = 68;
const SPACE = 32;
const ENTER = 13;
var currentAnimation = 0;
const dance = 0;
const death = 1;
const stay = 2;
const jump = 3;
const parker = 11;
const no = 4;
const yes = 13;
const fight = 5;
const run = 6;
const walk = 10;
const sit = 7;
const thumbsUp = 9;
const salute = 12;
var inputMap = {};
export default class Player {
  /**
   * Load Model fro Player
   */
  loadModel = (modelUrl, scene) => {
    // Trees
    var loader = BABYLON.SceneLoader;
    //  for (let i = 0; i < 14; i++) {
    loader.ImportMesh(
      "",
      "./models/",
      modelUrl,
      scene,
      (newMeshes, particleSystems, skeletons, animationGroups) => {
        this.playerMesh = newMeshes[0];
        var skeleton = skeletons[0];
        this.animations = animationGroups;
        console.log(this.animations.length);

        // dude.position.x = i * 3;
        // dude.position.z = (i % 2) * 5;
        //robo.position.x= i%5

        //dude.position.y = 10;
        // dude.physicsImpostor = new BABYLON.PhysicsImpostor(
        //   boxMesh,
        //   BABYLON.PhysicsImpostor.BoxImpostor,
        //   { mass: 5, friction: 1, restitution: 0.5 },
        //   scene
        // );

        // shadowGenerator.addShadowCaster(dude);
      }
    );
    //}
  };

  addControls = scene => {
    scene.actionManager = new BABYLON.ActionManager(scene);
    scene.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnKeyDownTrigger,
        function(evt) {
          inputMap[evt.sourceEvent.key] = evt.sourceEvent.type === "keydown";
        }
      )
    );
    scene.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnKeyUpTrigger,
        function(evt) {
          inputMap[evt.sourceEvent.key] = evt.sourceEvent.type === "keydown";
        }
      )
    );
    // Game/Render loop
    scene.onBeforeRenderObservable.add(() => {
      if (inputMap["w"] || inputMap["ArrowUp"]) {
        this.playerMesh.position.z += 0.1;
        this.playAnimation(run, true);
      }
      if (inputMap["a"] || inputMap["ArrowLeft"]) {
        this.playerMesh.position.x -= 0.1;
      }
      if (inputMap["s"] || inputMap["ArrowDown"]) {
        this.playerMesh.position.z -= 0.1;
        this.playAnimation(stay, false);
      }
      if (inputMap["d"] || inputMap["ArrowRight"]) {
        this.playerMesh.position.x += 0.1;
      }
    });
  };

  /**
   * Play Animation
   */
  playAnimation = (nextAnimation, repeat) => {
    if (currentAnimation !== nextAnimation) {
      if (this.animations && this.animations[nextAnimation]) {
        this.animations[currentAnimation].stop();
        this.animations[nextAnimation].start(repeat);
      }
    }
  };
}
