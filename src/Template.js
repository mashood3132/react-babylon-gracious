/* Babylon JS is available as **npm** package.  
You can easily build a simple `React` Component around a `canvas` and Babylon JS
I have created a minimal example with React+ Babylon:
 */
import React, { Component } from "react";
import * as BABYLON from "babylonjs";
import { AdvancedDynamicTexture, Rectangle, TextBlock } from "babylonjs-gui";
import { FurMaterial } from "babylonjs-materials";
import * as Loader from "babylonjs-loaders";
import Stats from "stats-js";
import Player from "./Player";
const W = 87;
const S = 83;
const A = 65;
const D = 68;
const SPACE = 32;
const ENTER = 13;
const GROUND_SIZE = 30;
const VELOCITY = 10;
//cache of materials
var materialMap = new Map();
//fps stats
var statsFPS = new Stats();
statsFPS.domElement.style.cssText = "position:absolute;top:3px;left:3px;";
statsFPS.showPanel(0); // 0: fps,
// Keyboard events
var patches = [];

//memory stats
var statsMemory = new Stats();
statsMemory.showPanel(2); //2: mb, 1: ms, 3+: custom
statsMemory.domElement.style.cssText = "position:absolute;top:3px;left:84px;";

var scene;
var boxMesh;

var shadowGenerator; //shadows
var advancedTexture; //GUI
var animations; //GLTF animations

//Track of state
var lastClickedMesh = null;
var currentAnimation = 0;
/**
 * Example temnplate of using Babylon JS with React
 */
class BabylonScene extends Component {
  constructor(props) {
    super(props);
    this.state = {
      useWireFrame: false,
      shootEnable: false,
      shouldAnimate: false
    };
  }

  componentDidMount = () => {
    // start ENGINE
    this.engine = new BABYLON.Engine(this.canvas, true);

    //Create Scene
    scene = new BABYLON.Scene(this.engine);

    //create Physics Engine
    scene.enablePhysics(
      new BABYLON.Vector3(0, -9.8, 0),
      new BABYLON.AmmoJSPlugin()
    );

    //Add GUI
    advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("myUI");

    //--Light---
    this.addLight();

    //--Camera---
    this.addCamera();

    //--Meshes---
    this.addModels();

    //--Ground Normal---
    this.addGround();

    //-- SKY---
    //SkyBox from Panorama
    //this.addPhotoSphere("assets/skybox.jpeg");

    //Skybox from Cube texture
    this.addSkyBox("skybox/skybox");

    //--Ground From HeightMap---
    // this.createGroundFromHeightMap(
    //   "textures/earth.jpg",
    //   "./textures/worldHeightMap.jpg"
    // );

    this.addBorder();

    // Add Events
    window.addEventListener("resize", this.onWindowResize, false);

    // Render Loop
    this.engine.runRenderLoop(() => {
      scene.render();
    });

    var h1 = new BABYLON.HighlightLayer("hl", scene);
    scene.onPointerObservable.add(evt => {
      // Shoot new Ball

      if (
        this.state.shootEnable &&
        evt.type === BABYLON.PointerEventTypes.POINTERDOWN
      ) {
        let position = evt.pickInfo.ray.origin;
        let velocity = evt.pickInfo.ray.direction.scale(VELOCITY);
        this.shootBullet(position, velocity);
      }

      // Apply Impulse if Highlighted
      if (evt.pickInfo.hit && evt.pickInfo.pickedMesh !== undefined) {
        let mesh = evt.pickInfo.pickedMesh;
        if (mesh && mesh.name === "box") {
          if (lastClickedMesh) {
            h1.removeMesh(lastClickedMesh);
          }
          lastClickedMesh = mesh;
          h1.addMesh(lastClickedMesh, BABYLON.Color3.Green());

          mesh.applyImpulse(
            new BABYLON.Vector3(
              Math.random() * 7,
              Math.random() * 7,
              Math.random() * 7
            ),
            mesh.position
          );
        }
      }
    }, BABYLON.PointerEventTypes.POINTERDOWN);

    // Impact impostor
    var impact = BABYLON.Mesh.CreatePlane("impact", 1, scene);
    impact.material = new BABYLON.StandardMaterial("impactMat", scene);
    impact.material.diffuseTexture = new BABYLON.Texture(
      "textures/impact.png",
      scene
    );
    impact.material.diffuseTexture.hasAlpha = true;
    impact.position = new BABYLON.Vector3(0, 0, -0.1);

    //Wall
    var wall = BABYLON.Mesh.CreatePlane("wall", 20.0, scene);
    wall.material = new BABYLON.StandardMaterial("wallMat", scene);
    wall.material.emissiveColor = new BABYLON.Color3(0.5, 1, 0.5);

    //When pointer down event is raised
    scene.onPointerDown = function(evt, pickResult) {
      // if the click hits the ground object, we change the impact position
      if (pickResult.hit) {
        if (patches.length > 10) {
          patches.shift().dispose();
        }

        var newImapact = impact.createInstance("new");
        newImapact.position.x = pickResult.pickedPoint.x;
        newImapact.position.z = pickResult.pickedPoint.z;
        newImapact.position.y = pickResult.pickedPoint.y;
        patches.push(newImapact);
      }
    };

    //Animation
    scene.registerBeforeRender(() => {
      //Reset if out of bound
      scene.meshes.forEach(mesh => {
        if (mesh.name === "s" && mesh.position.y < 0) {
          mesh.position.y = 0;
          mesh.position.x = Math.random() * GROUND_SIZE - GROUND_SIZE / 2;
          mesh.position.z = Math.random() * GROUND_SIZE - GROUND_SIZE / 2;
          mesh.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
          mesh.physicsImpostor.setAngularVelocity(BABYLON.Vector3.Zero());
        }
      });

      if (boxMesh.position.y < 0 || boxMesh.position.y > 10) {
        boxMesh.position.y = 1;
        boxMesh.position.x = 0;
        boxMesh.position.z = 0;
        boxMesh.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
        boxMesh.physicsImpostor.setAngularVelocity(BABYLON.Vector3.Zero());
      }

      //update stats
      statsFPS.update();
      statsMemory.update();
    });

    //AddPlayer
    //let player = new Player();
    //player.loadModel("Robot.glb", scene);
    //player.addControls(scene);

    //this.addAction();

    //add stats for FPS and Memory usage
    document.body.appendChild(statsFPS.dom);
    document.body.appendChild(statsMemory.dom);
  };

  loadMaterial = texture => {
    if (materialMap.has(texture)) {
      return materialMap.get(texture);
    } else {
      let material = new BABYLON.StandardMaterial("cover", scene);
      material.diffuseTexture = new BABYLON.Texture(texture);
      materialMap.set(texture, material);
      return material;
    }
  };
  componentWillUnmount() {
    window.removeEventListener("resize", this.onWindowResize, false);
  }

  onWindowResize = event => {
    this.engine.resize();
  };

  addModel = modelUrl => {
    // Trees
    var loader = BABYLON.SceneLoader;
    //  for (let i = 0; i < 14; i++) {
    loader.ImportMesh(
      "",
      "./models/",
      modelUrl,
      scene,
      (newMeshes, particleSystems, skeletons, animationGroups) => {
        var dude = newMeshes[0];
        var skeleton = skeletons[0];
        animations = animationGroups;
        console.log(animations.length);

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

        shadowGenerator.addShadowCaster(dude);
      }
    );
    //}
  };
  playAnimation = (nextAnimation, repeat) => {
    if (currentAnimation !== nextAnimation) {
      if (animations[nextAnimation]) {
        animations[currentAnimation].stop();
        animations[nextAnimation].start(repeat);
        currentAnimation = nextAnimation;
      }
    }
  };

  /**
   * Add Lights
   */
  addLight = () => {
    //---------- LIGHT---------------------
    //Create a basic light, aiming 0,1,0 - meaning, to the sky.
    new BABYLON.HemisphericLight(
      "light1",
      new BABYLON.Vector3(0, 10, 0),
      scene
    );

    var light = new BABYLON.PointLight(
      "light1",
      new BABYLON.Vector3(0, 10, 0),
      scene
    );
    light.intensity = 0.7;
    var lightImpostor = BABYLON.Mesh.CreateSphere("sphere1", 16, 1, scene);
    var lightImpostorMat = new BABYLON.StandardMaterial("mat", scene);
    lightImpostor.material = lightImpostorMat;
    lightImpostorMat.emissiveColor = BABYLON.Color3.Yellow();
    lightImpostorMat.linkEmissiveWithDiffuse = true;
    lightImpostor.parent = light;
    // Shadow
    shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
    shadowGenerator.setDarkness(0.5);
    shadowGenerator.usePoissonSampling = true;

    var lensFlareSystem = new BABYLON.LensFlareSystem(
      "lensFlareSystem",
      light,
      scene
    );

    new BABYLON.LensFlare(
      0.2,
      0,
      new BABYLON.Color3(1, 1, 1),
      "shader/lensflare0.png",
      lensFlareSystem
    );
    new BABYLON.LensFlare(
      0.5,
      0.2,
      new BABYLON.Color3(0.5, 0.5, 1),
      "shader/lensflare3.png",
      lensFlareSystem
    );
    new BABYLON.LensFlare(
      0.2,
      1.0,
      new BABYLON.Color3(1, 1, 1),
      "shader/lensflare3.png",
      lensFlareSystem
    );
    new BABYLON.LensFlare(
      0.4,
      0.4,
      new BABYLON.Color3(1, 0.5, 1),
      "shader/lensflare2.png",
      lensFlareSystem
    );
    new BABYLON.LensFlare(
      0.1,
      0.6,
      new BABYLON.Color3(1, 1, 1),
      "shader/lensflare0.png",
      lensFlareSystem
    );
    new BABYLON.LensFlare(
      0.3,
      0.8,
      new BABYLON.Color3(1, 1, 1),
      "shader/lensflare0.png",
      lensFlareSystem
    );
  };

  /**
   * Add Camera
   */
  addCamera = () => {
    // ---------------ArcRotateCamera or Orbit Control----------
    var camera = new BABYLON.ArcRotateCamera(
      "Camera",
      Math.PI / 2,
      Math.PI / 4,
      4,
      BABYLON.Vector3.Zero(),
      scene
    );
    camera.inertia = 0;
    camera.angularSensibilityX = 250;
    camera.angularSensibilityY = 250;

    // This attaches the camera to the canvas
    camera.attachControl(this.canvas, true);
    camera.setPosition(new BABYLON.Vector3(5, 5, 5));
  };

  /**
   *  Create a built-in "ground" shape.
   */
  addGround = () => {
    //Create ground from Box
    var groundMesh = BABYLON.MeshBuilder.CreateBox(
      "ground",
      { height: 0.3, width: GROUND_SIZE, depth: GROUND_SIZE, subdivisions: 16 },
      scene
    );

    //Ground Material
    var groundMaterial = new BABYLON.StandardMaterial("grass0", scene);
    groundMaterial.diffuseTexture = new BABYLON.Texture(
      "./assets/ground.jpeg",
      scene
    );
    // groundMesh.material = groundMaterial;

    //Add Bumps
    this.applyBumpTexture(groundMesh, "./textures/concrete/");

    //Add Grass
    //this.addGrass(groundMesh);

    //Shadow
    groundMesh.receiveShadows = true;

    //Ground Physics
    groundMesh.physicsImpostor = new BABYLON.PhysicsImpostor(
      groundMesh,
      BABYLON.PhysicsImpostor.BoxImpostor,
      { mass: 0, friction: 1.5, restitution: 0.7 },
      scene
    );
  };

  /**
   * Use HeightMap
   */
  createGroundFromHeightMap = (texture, hrightMap) => {
    // Ground
    var groundMaterial = new BABYLON.StandardMaterial("ground", scene);
    groundMaterial.diffuseTexture = new BABYLON.Texture(texture, scene);

    var groundMesh = BABYLON.MeshBuilder.CreateGroundFromHeightMap(
      "gdhm",
      hrightMap,
      {
        width: GROUND_SIZE,
        height: GROUND_SIZE,
        subdivisions: 40,
        maxHeight: 5
      },
      scene
    );
    groundMesh.material = groundMaterial;

    //Shadow
    groundMesh.receiveShadows = true;
  };

  addBorder = () => {
    var materialBorder = new BABYLON.StandardMaterial("texture2", scene);
    materialBorder.alpha = 0.3;

    let borderPx = BABYLON.MeshBuilder.CreateBox(
      "ground",
      {
        height: GROUND_SIZE / 2,
        width: 0.5,
        depth: GROUND_SIZE - 0.3,
        subdivisions: 16
      },
      scene
    );
    borderPx.position.x = GROUND_SIZE / 2;
    borderPx.position.y = GROUND_SIZE / 4 + 0.3;
    borderPx.material = materialBorder;
    //borderPx.isPickable = false;
    borderPx.physicsImpostor = new BABYLON.PhysicsImpostor(
      borderPx,
      BABYLON.PhysicsImpostor.BoxImpostor,
      { mass: 0, friction: 1.5, restitution: 0.7 },
      scene
    );

    let borderNx = borderPx.createInstance("Nx");
    borderNx.position.x = -GROUND_SIZE / 2;
    borderNx.position.y = GROUND_SIZE / 4 + 0.3;
    //borderNx.isPickable = false;
    borderNx.physicsImpostor = new BABYLON.PhysicsImpostor(
      borderNx,
      BABYLON.PhysicsImpostor.BoxImpostor,
      { mass: 0, friction: 1.5, restitution: 0.7 },
      scene
    );

    let borderPz = BABYLON.MeshBuilder.CreateBox(
      "ground",
      {
        height: GROUND_SIZE / 2,
        width: GROUND_SIZE,
        depth: 0.5,
        subdivisions: 16
      },
      scene
    );
    // borderPz.isPickable = false;
    borderPz.position.z = GROUND_SIZE / 2;
    borderPz.position.y = GROUND_SIZE / 4 + 0.3;
    borderPz.physicsImpostor = new BABYLON.PhysicsImpostor(
      borderPz,
      BABYLON.PhysicsImpostor.BoxImpostor,
      { mass: 0, friction: 1.5, restitution: 0.7 },
      scene
    );
    borderPz.material = materialBorder;

    let borderNz = borderPz.createInstance("Nz");
    borderNz.position.z = -GROUND_SIZE / 2;
    borderNz.position.y = GROUND_SIZE / 4 + 0.3;
    //borderNz.isPickable = false;
    borderNz.physicsImpostor = new BABYLON.PhysicsImpostor(
      borderNz,
      BABYLON.PhysicsImpostor.BoxImpostor,
      { mass: 0, friction: 1.5, restitution: 0.7 },
      scene
    );
  };
  /**
   * Create a s spherical Sky from Panorama texture
   */
  addPhotoSphere = panoramaImage => {
    //Add SkyBox from URL
    var photoSphere = BABYLON.Mesh.CreateSphere("skyBox", 16.0, 50.0, scene);
    var skyboxMaterial = new BABYLON.StandardMaterial("smat", scene);
    skyboxMaterial.emissiveTexture = new BABYLON.Texture(
      panoramaImage,
      scene,
      1,
      0
    );
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.emissiveTexture.uOffset = -Math.PI / 2; // left-right
    skyboxMaterial.emissiveTexture.uOffset = 0.1; // up-down
    skyboxMaterial.backFaceCulling = false;
    photoSphere.material = skyboxMaterial;
  };

  addSkyBox = skyBoxURL => {
    // Skybox
    var skybox = BABYLON.Mesh.CreateBox("skyBox", 800.0, scene);
    var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(
      skyBoxURL,
      scene
    );
    skyboxMaterial.reflectionTexture.coordinatesMode =
      BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.disableLighting = true;
    skybox.material = skyboxMaterial;
  };

  /**
   * Add Models
   */
  addModels = () => {
    // Add BOX
    boxMesh = BABYLON.MeshBuilder.CreateBox(
      "box",
      { height: 1, width: 1, depth: 1 },
      scene
    );
    boxMesh.position.y = 1;

    var woodMaterial = new BABYLON.StandardMaterial("wood", scene);
    woodMaterial.diffuseTexture = new BABYLON.Texture(
      "./assets/portal_cube.png",
      scene
    );
    boxMesh.material = woodMaterial;

    boxMesh.physicsImpostor = new BABYLON.PhysicsImpostor(
      boxMesh,
      BABYLON.PhysicsImpostor.BoxImpostor,
      { mass: 5, friction: 1, restitution: 0.5 },
      scene
    );

    shadowGenerator.addShadowCaster(boxMesh);

    this.addLabelToMesh(boxMesh, "Hello");
  };

  addGrass = ground => {
    var grassMaterial = new FurMaterial("furD", scene);
    grassMaterial.furAngle = 0;
    grassMaterial.furSpeed = 1;
    grassMaterial.diffuseTexture = new BABYLON.Texture(
      "https://upload.wikimedia.org/wikipedia/commons/8/8a/Leopard_fur.JPG",
      scene
    );
    grassMaterial.furColor = new BABYLON.Color3(1, 1, 1);
    grassMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
    grassMaterial.furLength = 0.2; // Represents the maximum length of the fur, which is then adjusted randomly. Default value is 1.
    grassMaterial.furAngle = Math.PI / 6; // Represents the angle the fur lies on the mesh from 0 to Math.PI/2. The default angle of 0 gives fur sticking straight up and PI/2 lies along the mesh.
    grassMaterial.furDensity = 20;
    grassMaterial.furSpacing = 6;
    ground.material = grassMaterial;
    var quality = 10; // Average quality

    // Create shells
    FurMaterial.FurifyMesh(ground, quality);
  };
  /**
   * Shoot  a ball in direction  of ray
   */
  shootBullet = (position, velocity) => {
    var ballMesh = BABYLON.Mesh.CreateSphere("s", 8, 2, scene);
    ballMesh.position = position;
    ballMesh.material = this.loadMaterial("./textures/ball.png");
    ballMesh.position.copyFrom(position);
    //PHysics
    ballMesh.physicsImpostor = new BABYLON.PhysicsImpostor(
      ballMesh,
      BABYLON.PhysicsImpostor.SphereImpostor,
      { mass: 0.5, restitution: 2.2 },
      scene
    );
    ballMesh.physicsImpostor.setLinearVelocity(velocity);
    shadowGenerator.addShadowCaster(ballMesh);

    // var fire = scene.beginAnimation(akm, 0, 5, false);
    // shoot.play();
  };

  /**
   * Texture Experiment
   */
  applyBumpTexture = (mesh, texture) => {
    //Base Texture
    let bumpMaterial = new BABYLON.StandardMaterial("kosh", scene);
    bumpMaterial.diffuseTexture = new BABYLON.Texture(
      texture + "base.jpg",
      scene
    );

    //Bumps
    bumpMaterial.bumpTexture = new BABYLON.Texture(
      texture + "normal.jpg",
      scene
    );
    bumpMaterial.bumpTexture.level = 5.0;

    // brickMaterial.lightmapTexture = new BABYLON.Texture(
    //    texture+ "ambientOcclusion.jpg",
    //   scene,
    //   0,
    //   0
    // );

    //myMaterial.specularTexture = new BABYLON.Texture("PATH TO IMAGE", scene);
    //myMaterial.emissiveTexture = new BABYLON.Texture("PATH TO IMAGE", scene);

    //Ambient
    bumpMaterial.ambientTexture = new BABYLON.Texture(
      texture + "ambientOcclusion.jpg",
      scene,
      0,
      0
    );

    //Metallic ness
    bumpMaterial.roughness = 1;
    bumpMaterial.metallic = 0;

    //Color
    bumpMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);

    //Both Side
    bumpMaterial.backFaceCulling = false;

    //Transperency of Texture
    bumpMaterial.diffuseTexture.hasAlpha = true;

    //Opacity
    // brickMaterial.alpha = 0.5;

    //WireFrame
    //brickMaterial.wireframe = true;

    bumpMaterial.diffuseTexture.uScale = 5;
    bumpMaterial.diffuseTexture.vScale = 5;

    mesh.material = bumpMaterial;
  };

  addLabelToMesh = (mesh, text) => {
    var rect1 = new Rectangle();
    rect1.width = "70px";
    rect1.height = "27px";
    rect1.cornerRadius = 20;
    rect1.color = "black";
    rect1.thickness = 1;
    rect1.background = "white";
    advancedTexture.addControl(rect1);

    var label = new TextBlock();
    label.text = text;
    label.fontSize = "15px";
    rect1.addControl(label);

    rect1.linkWithMesh(mesh);
    rect1.linkOffsetY = -50;
  };

  render() {
    return (
      <canvas
        style={{ width: window.innerWidth, height: window.innerHeight }}
        ref={canvas => {
          this.canvas = canvas;
        }}
      />
    );
  }
}
export default BabylonScene;
