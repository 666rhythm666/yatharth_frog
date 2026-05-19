import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameState, ThemeName } from '../types';
import { THEMES_DATA } from '../utils/gameData';
import { playJumpSound, playMunchSound, playGameOverSound, playHitSound } from '../utils/audio';

interface GameRendererProps {
  gameState: GameState;
  themeName: ThemeName;
  onScoreUpdate: (newScore: number) => void;
  onGameOver: (finalScore: number) => void;
}

export default function GameRenderer({
  gameState,
  themeName,
  onScoreUpdate,
  onGameOver
}: GameRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);

  const [activePowerUI, setActivePowerUI] = useState<{
    type: string;
    label: string;
    icon: string;
    timeLeft: number;
    colorHex: string;
    description: string;
  } | null>(null);

  // Refs for loop state to avoid state re-render latency
  const stateRef = useRef({
    gameState,
    themeName,
    score: 0,
    spawnTimer: 0,
    spawnInterval: 1.8,
    obstacleSpawnTimer: 2.2, // buffer at match start
    obstacleSpawnInterval: 3.8,
    frogVelocity: 0,
    munchTimer: 0,
    scrollFar: 0,
    scrollMid: 0,
    scrollNear: 0,
    scrollGnd: 0,
    cloudOffset: 0,
    isDying: false,
    dyingTimer: 0,
    activePower: null as string | null,
    powerTimer: 0
  });

  // Track state transitions inside refs
  useEffect(() => {
    stateRef.current.gameState = gameState;
    stateRef.current.themeName = themeName;
    if (gameState === 'playing' && stateRef.current.score === 0) {
      // Just restarted or started playing
      stateRef.current.score = 0;
      stateRef.current.spawnInterval = 1.8;
      stateRef.current.spawnTimer = 0.5; // Quick start
      stateRef.current.obstacleSpawnTimer = 2.2;
      stateRef.current.obstacleSpawnInterval = 3.8;
      stateRef.current.isDying = false;
      stateRef.current.dyingTimer = 0;
      stateRef.current.activePower = null;
      stateRef.current.powerTimer = 0;
      setActivePowerUI(null);
    }
  }, [gameState, themeName]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const bgCanvas = bgCanvasRef.current;
    const gameCanvas = gameCanvasRef.current;
    const pCanvas = particleCanvasRef.current;
    if (!bgCanvas || !gameCanvas || !pCanvas) return;

    const bgCtx = bgCanvas.getContext('2d');
    const pCtx = pCanvas.getContext('2d');
    if (!bgCtx || !pCtx) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    // --- THREE.JS INITIALIZATION ---
    const renderer = new THREE.WebGLRenderer({
      canvas: gameCanvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 200);
    camera.position.set(0, 0, 28);
    camera.lookAt(0, 0, 0);

    // Dynamic bounds calculation helper
    function getBounds() {
      const vFOV = THREE.MathUtils.degToRad(camera.fov);
      const h = 2 * Math.tan(vFOV / 2) * camera.position.z;
      return {
        halfW: (h * camera.aspect) / 2,
        halfH: h / 2
      };
    }

    function getGroundY() {
      return -getBounds().halfH + 0.55;
    }

    // --- GAME LIGHTS ---
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff6cc, 1.2);
    sunLight.position.set(5, 10, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 15;
    sunLight.shadow.camera.bottom = -15;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.35);
    fillLight.position.set(-5, -2, 5);
    scene.add(fillLight);

    function updateLights(tName: ThemeName) {
      const config = THEMES_DATA[tName];
      ambientLight.color.setHex(config.ambientCol);
      ambientLight.intensity = config.ambientInt;
      sunLight.color.setHex(config.sunCol);
      sunLight.intensity = config.sunInt;
    }

    // --- FROG MODEL ---
    let frogGroup = new THREE.Group();
    const redMat = new THREE.MeshLambertMaterial({ color: 0xff3b30 });
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const blackMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

    // Frog Main Body
    const bodyGeometry = new THREE.SphereGeometry(0.55, 10, 8);
    const bodyMesh = new THREE.Mesh(bodyGeometry, redMat);
    bodyMesh.scale.set(1, 0.75, 0.82);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    frogGroup.add(bodyMesh);

    // Frog Head
    const headGeometry = new THREE.SphereGeometry(0.42, 10, 8);
    const headMesh = new THREE.Mesh(headGeometry, redMat);
    headMesh.position.set(0.15, 0.3, 0);
    headMesh.scale.set(1.05, 0.85, 0.9);
    headMesh.castShadow = true;
    frogGroup.add(headMesh);

    // Frog Eyes
    [-0.22, 0.22].forEach((zOffset) => {
      // Eye White
      const eyeWhiteGeom = new THREE.SphereGeometry(0.18, 8, 6);
      const ewMesh = new THREE.Mesh(eyeWhiteGeom, whiteMat);
      ewMesh.position.set(0.32 + Math.abs(zOffset) * 0.1, 0.52, zOffset);
      ewMesh.scale.set(1, 1.1, 0.9);
      ewMesh.castShadow = true;
      frogGroup.add(ewMesh);

      // Eye Pupil
      const pupilGeom = new THREE.SphereGeometry(0.09, 6, 6);
      const epMesh = new THREE.Mesh(pupilGeom, blackMat);
      // Look slightly forward and to the camera side
      epMesh.position.set(0.42 + Math.abs(zOffset) * 0.1, 0.52, zOffset + (zOffset > 0 ? 0.12 : -0.12));
      frogGroup.add(epMesh);
    });

    function getFrogX() {
      const hw = getBounds().halfW;
      return -Math.max(1.8, Math.min(hw * 0.58, hw - 0.9));
    }
    const FROG_R = 0.45;
    frogGroup.position.set(getFrogX(), 0, 0);
    scene.add(frogGroup);

    function resetFrog() {
      frogGroup.position.set(getFrogX(), 0, 0);
      frogGroup.rotation.set(0, 0, 0);
      frogGroup.scale.set(1, 1, 1);
      stateRef.current.frogVelocity = 0;
    }

    // --- INSECTS ---
    type InsectType = 'Beetle' | 'Firefly' | 'Dragonfly' | 'Mosquito';
    const insects: THREE.Group[] = [];
    const insectPool: THREE.Group[] = [];
    const INSECT_R = 0.28;

    function createInsectModel(type: InsectType) {
      const group = new THREE.Group();
      
      let bodyColor = 0x4caf50; // default green
      let emissiveColor = 0x1b5e20;
      let glowColor = 0x81c784;
      let points = 1;

      if (type === 'Beetle') {
        bodyColor = 0x4caf50; // Green
        emissiveColor = 0x1b5e20;
        glowColor = 0x81c784;
        points = 1;
      } else if (type === 'Firefly') {
        bodyColor = 0xffa726; // Bright warm orange
        emissiveColor = 0xe65100;
        glowColor = 0xffeb3b;
        points = 2;
      } else if (type === 'Dragonfly') {
        bodyColor = 0xffca28; // Golden honey
        emissiveColor = 0xff6f00;
        glowColor = 0xffffff;
        points = 3;
      } else if (type === 'Mosquito') {
        bodyColor = 0xab47bc; // Magical purple
        emissiveColor = 0x4a148c;
        glowColor = 0xe040fb;
        points = 2;
      }

      const bodyMat = new THREE.MeshLambertMaterial({
        color: bodyColor,
        emissive: emissiveColor,
        emissiveIntensity: 0.7
      });

      const glowMat = new THREE.MeshLambertMaterial({
        color: glowColor,
        emissive: glowColor,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.7
      });

      // Main body / abdomen
      const abdGeom = new THREE.SphereGeometry(0.18, 8, 8);
      const abd = new THREE.Mesh(abdGeom, bodyMat);
      abd.scale.set(1.3, 0.9, 0.9);
      group.add(abd);

      if (type === 'Beetle') {
        // Heavy armor plate shell
        const shellGeom = new THREE.SphereGeometry(0.14, 8, 8);
        const shell = new THREE.Mesh(shellGeom, bodyMat);
        shell.position.set(0.04, 0.08, 0);
        shell.scale.set(1.2, 0.6, 1.4);
        group.add(shell);

        // Beetle spike/horn on forehead
        const hornGeom = new THREE.ConeGeometry(0.05, 0.16, 4);
        const hornMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const horn = new THREE.Mesh(hornGeom, hornMat);
        horn.rotation.z = -Math.PI / 3;
        horn.position.set(0.2, 0.05, 0);
        group.add(horn);
      } else if (type === 'Firefly') {
        // Glowing bulb tail
        const glowGeom = new THREE.SphereGeometry(0.14, 6, 6);
        const glow = new THREE.Mesh(glowGeom, glowMat);
        glow.position.set(-0.16, -0.06, 0);
        group.add(glow);
      } else if (type === 'Dragonfly') {
        // Elegant compound eyes
        const eyeGeom = new THREE.SphereGeometry(0.06, 6, 6);
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        [-1, 1].forEach((dir) => {
          const eyeMesh = new THREE.Mesh(eyeGeom, eyeMat);
          eyeMesh.position.set(0.18, 0.05, dir * 0.08);
          group.add(eyeMesh);
        });

        // Double wings (2 left and 2 right)
        const wingGeom = new THREE.SphereGeometry(0.22, 6, 6);
        const wingMat = new THREE.MeshLambertMaterial({
          color: 0xbbffff,
          transparent: true,
          opacity: 0.52,
          emissive: 0xbbffff,
          emissiveIntensity: 0.4
        });
        [-1, 1].forEach((dir) => {
          // Front wing mesh
          const fw = new THREE.Mesh(wingGeom, wingMat);
          fw.scale.set(0.2, 0.03, 1.2);
          fw.position.set(0.04, 0.14, dir * 0.3);
          fw.rotation.y = dir * 0.15;
          group.add(fw);

          // Back wing mesh
          const bw = new THREE.Mesh(wingGeom, wingMat);
          bw.scale.set(0.15, 0.03, 0.95);
          bw.position.set(-0.08, 0.11, dir * 0.23);
          bw.rotation.y = dir * -0.1;
          group.add(bw);
        });
      } else if (type === 'Mosquito') {
        // Long sharp needle proboscis (for blood-sucker aesthetic)
        const needleGeom = new THREE.ConeGeometry(0.02, 0.22, 4);
        const needleMat = new THREE.MeshLambertMaterial({ color: 0x221122 });
        const needle = new THREE.Mesh(needleGeom, needleMat);
        needle.rotation.z = -Math.PI / 2.5;
        needle.position.set(0.22, -0.05, 0);
        group.add(needle);

        // Buzzing high-frequency tiny wings
        const wingGeom = new THREE.SphereGeometry(0.14, 4, 4);
        const wingMat = new THREE.MeshLambertMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.45
        });
        [-1, 1].forEach((dir) => {
          const w = new THREE.Mesh(wingGeom, wingMat);
          w.scale.set(0.3, 0.04, 0.9);
          w.position.set(0.02, 0.12, dir * 0.16);
          group.add(w);
        });
      }

      group.userData = {
        type,
        points,
        speedMultiplier: type === 'Firefly' ? 1.45 : type === 'Dragonfly' ? 1.15 : type === 'Mosquito' ? 1.3 : 0.85,
        time: Math.random() * 10,
        alive: true,
        glowColorHex: type === 'Dragonfly' ? '#ffd700' : type === 'Firefly' ? '#ff9100' : type === 'Mosquito' ? '#df40af' : '#4caf50'
      };
      return group;
    }

    function spawnInsect() {
      const bounds = getBounds();
      const g = getGroundY();
      let ins: THREE.Group;

      // Rate: Beetle: 45%, Mosquito: 25%, Firefly: 20%, Dragonfly: 10%
      const randValue = Math.random();
      let type: InsectType;
      if (randValue < 0.45) {
        type = 'Beetle';
      } else if (randValue < 0.70) {
        type = 'Mosquito';
      } else if (randValue < 0.90) {
        type = 'Firefly';
      } else {
        type = 'Dragonfly';
      }

      // Check cache for existing matching insect type
      const poolIndex = insectPool.findIndex((item) => item.userData.type === type);
      if (poolIndex !== -1) {
        ins = insectPool.splice(poolIndex, 1)[0];
        ins.visible = true;
      } else {
        ins = createInsectModel(type);
        scene.add(ins);
      }

      const minY = g + 1.2;
      const maxY = bounds.halfH - 1.2;
      ins.position.set(bounds.halfW + 1.5, minY + Math.random() * (maxY - minY), 0);

      const baseSpeed = 5.2 + Math.random() * 2.8;
      ins.userData.speed = baseSpeed * ins.userData.speedMultiplier;
      ins.userData.alive = true;
      insects.push(ins);
    }

    function updateInsects(dt: number) {
      const bounds = getBounds();
      for (let i = insects.length - 1; i >= 0; i--) {
        const ins = insects[i];
        ins.userData.time += dt;

        // Specialized flight motion curves per insect species
        if (ins.userData.type === 'Mosquito') {
          // Buzzing zig-zag flight pattern
          ins.position.x -= ins.userData.speed * dt;
          ins.position.y += Math.sin(ins.userData.time * 12) * 0.08;
        } else if (ins.userData.type === 'Dragonfly') {
          // Fast hovering swoops
          ins.position.x -= ins.userData.speed * (0.8 + Math.sin(ins.userData.time * 4) * 0.4) * dt;
          ins.position.y += Math.cos(ins.userData.time * 3) * 0.02;
        } else {
          // Standard linear bobbing
          ins.position.x -= ins.userData.speed * dt;
          ins.position.y += Math.sin(ins.userData.time * 6) * 0.015;
        }

        // Animate wing flapping at extreme frequencies
        if (ins.userData.type === 'Dragonfly' || ins.userData.type === 'Mosquito') {
          const flpFreq = ins.userData.type === 'Mosquito' ? 36 : 20;
          ins.children.forEach((child) => {
            // Identify wings by looking for non-zero Z position and flat Y aspect scale
            if (child.position.y > 0.09 && child.scale.y < 0.05) {
              child.rotation.z = Math.sin(ins.userData.time * flpFreq) * 0.5;
            }
          });
        }

        // Firefly Magnetic Glow pull effect
        if (stateRef.current.activePower === 'Firefly' && ins.userData.alive) {
          const dist = ins.position.distanceTo(frogGroup.position);
          if (dist < 4.2) {
            ins.position.lerp(frogGroup.position, dt * 7.5);
          }
        }

        if (ins.position.x < -bounds.halfW - 2) {
          scene.remove(ins);
          insectPool.push(ins);
          ins.visible = false;
          insects.splice(i, 1);
        }
      }
    }

    function removeInsect(ins: THREE.Group) {
      scene.remove(ins);
      insectPool.push(ins);
      ins.visible = false;
      const index = insects.indexOf(ins);
      if (index !== -1) {
        insects.splice(index, 1);
      }
    }

    // --- OBSTACLES (FISH & BIRD) ---
    type ObstacleType = 'Fish' | 'Bird';
    const obstacles: THREE.Group[] = [];
    const obstaclePool: THREE.Group[] = [];
    const OBSTACLE_R = 0.35;

    function createObstacleModel(type: ObstacleType) {
      const group = new THREE.Group();

      if (type === 'Fish') {
        const fishMat = new THREE.MeshLambertMaterial({
          color: 0xff7e15, // Bright orange Koi
          emissive: 0x9e3c00,
          emissiveIntensity: 0.6
        });
        const bellyMat = new THREE.MeshLambertMaterial({
          color: 0xfffdd0, // Creamy belly
        });
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

        // Fish Body
        const bodyGeom = new THREE.SphereGeometry(0.28, 8, 8);
        const body = new THREE.Mesh(bodyGeom, fishMat);
        body.scale.set(1.6, 0.9, 0.75);
        group.add(body);

        // Belly Accent
        const bellyGeom = new THREE.SphereGeometry(0.2, 6, 6);
        const belly = new THREE.Mesh(bellyGeom, bellyMat);
        belly.position.set(0.05, -0.09, 0);
        belly.scale.set(1.2, 0.5, 0.82);
        group.add(belly);

        // Fish tail fin
        const tailGeom = new THREE.ConeGeometry(0.12, 0.35, 4);
        const tail = new THREE.Mesh(tailGeom, fishMat);
        tail.rotation.z = Math.PI / 2;
        tail.position.set(-0.48, 0, 0);
        tail.scale.set(1, 1, 0.15); // flat thin fin
        tail.name = 'tailFin';
        group.add(tail);

        // Eyes
        const eyeGeom = new THREE.SphereGeometry(0.05, 6, 6);
        [0.16, -0.16].forEach((zPos) => {
          const eye = new THREE.Mesh(eyeGeom, eyeMat);
          eye.position.set(0.25, 0.1, zPos);
          group.add(eye);
        });

        // Top dorsal fin
        const dorsalGeom = new THREE.BoxGeometry(0.12, 0.15, 0.02);
        const dorsal = new THREE.Mesh(dorsalGeom, fishMat);
        dorsal.position.set(-0.1, 0.28, 0);
        dorsal.rotation.z = -0.25;
        group.add(dorsal);

      } else {
        const birdMat = new THREE.MeshLambertMaterial({
          color: 0x22222d, // Slate charcoal
          emissive: 0x050510,
          emissiveIntensity: 0.3
        });
        const beakMat = new THREE.MeshLambertMaterial({ color: 0xffca28 }); // yellow beak

        // Aerodynamic Body
        const bodyGeom = new THREE.SphereGeometry(0.24, 8, 8);
        const body = new THREE.Mesh(bodyGeom, birdMat);
        body.scale.set(1.5, 0.8, 0.8);
        group.add(body);

        // Beak pointing forward (to the left)
        const beakGeom = new THREE.ConeGeometry(0.06, 0.22, 4);
        const beak = new THREE.Mesh(beakGeom, beakMat);
        beak.rotation.z = Math.PI / 2; // point left
        beak.position.set(-0.35, 0, 0);
        group.add(beak);

        // Main Wings (Left & Right)
        const wingGeom = new THREE.SphereGeometry(0.35, 6, 6);
        [-1, 1].forEach((dir) => {
          const wing = new THREE.Mesh(wingGeom, birdMat);
          wing.scale.set(0.4, 0.04, 1.3);
          wing.position.set(-0.02, 0.15, dir * 0.4);
          wing.name = dir === 1 ? 'rWing' : 'lWing';
          group.add(wing);
        });

        // Little Tail Feathers
        const fGeom = new THREE.BoxGeometry(0.18, 0.02, 0.18);
        const feathers = new THREE.Mesh(fGeom, birdMat);
        feathers.position.set(0.4, -0.05, 0);
        feathers.rotation.z = -0.15;
        group.add(feathers);
      }

      group.userData = {
        type,
        time: Math.random() * 10,
        alive: true,
        vx: 0,
        vy: 0
      };

      return group;
    }

    function spawnObstacle() {
      const bounds = getBounds();
      const g = getGroundY();
      let obs: THREE.Group;

      const type: ObstacleType = Math.random() < 0.5 ? 'Fish' : 'Bird';

      // Check cache pool first
      const poolIndex = obstaclePool.findIndex((item) => item.userData.type === type);
      if (poolIndex !== -1) {
        obs = obstaclePool.splice(poolIndex, 1)[0];
        obs.visible = true;
      } else {
        obs = createObstacleModel(type);
        scene.add(obs);
      }

      obs.userData.type = type;
      obs.userData.time = Math.random() * 10;
      obs.userData.alive = true;

      if (type === 'Fish') {
        // Fish jumps from the right side, tracing a high arc!
        // Start below ground or right at the ground Y level
        obs.position.set(bounds.halfW + 1.2, g - 0.2, 0);
        obs.userData.vx = -(5.4 + Math.random() * 2.2);
        obs.userData.vy = 12.0 + Math.random() * 3.5;
      } else {
        // Bird flies straight from sky
        obs.position.set(bounds.halfW + 1.2, g + 2.8 + Math.random() * 2.2, 0);
        obs.userData.vx = -(6.0 + Math.random() * 2.5);
        obs.userData.vy = 0; // flat with wave bobbing
      }

      obstacles.push(obs);
    }

    function updateObstacles(dt: number) {
      const bounds = getBounds();
      const g = getGroundY();

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.userData.time += dt;

        if (obs.userData.type === 'Fish') {
          // Fish gravity parabolic motion
          obs.position.x += obs.userData.vx * dt;
          obs.userData.vy += -15.5 * dt; // gravity
          obs.position.y += obs.userData.vy * dt;

          // Rotate head in motion direction
          const angle = Math.atan2(obs.userData.vy, obs.userData.vx);
          obs.rotation.z = angle;

          // Tail wiggling oscillation
          const tail = obs.getObjectByName('tailFin');
          if (tail) {
            tail.rotation.y = Math.sin(obs.userData.time * 26) * 0.45;
          }

          // If fish goes fully underground/under-water/under-sand after peak, remove it
          if (obs.position.y < g - 1.5 && obs.userData.vy < 0) {
            removeObstacle(obs);
          }
        } else {
          // Bird flight path - straight left with minor height wave bobbing
          obs.position.x += obs.userData.vx * dt;
          obs.position.y += Math.sin(obs.userData.time * 4) * 0.42 * dt;

          // Slight tilt
          obs.rotation.z = Math.sin(obs.userData.time * 4) * 0.05;

          // Flapping wings
          const lWing = obs.getObjectByName('lWing');
          const rWing = obs.getObjectByName('rWing');
          const flap = Math.sin(obs.userData.time * 18) * 0.58;
          if (lWing) lWing.rotation.x = flap;
          if (rWing) rWing.rotation.x = -flap;
        }

        // Out of screen bounds cleanup
        if (obs.position.x < -bounds.halfW - 2) {
          removeObstacle(obs);
        }
      }
    }

    function removeObstacle(obs: THREE.Group) {
      scene.remove(obs);
      obstaclePool.push(obs);
      obs.visible = false;
      const index = obstacles.indexOf(obs);
      if (index !== -1) {
        obstacles.splice(index, 1);
      }
    }

    // --- 2D CANVAS EFFECTS & BACKROUND ---
    // Background starfield
    interface Star {
      x: number;
      y: number;
      r: number;
      twinkle: number;
    }
    let stars: Star[] = [];

    function genStars(w: number, h: number) {
      stars = [];
      for (let i = 0; i < 150; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.65,
          r: Math.random() * 1.5 + 0.4,
          twinkle: Math.random() * Math.PI * 2
        });
      }
    }

    interface BgItem {
      x: number;
      seed: number;
    }
    const bgLayers: Record<'far' | 'mid' | 'near', BgItem[]> = {
      far: [],
      mid: [],
      near: []
    };

    function seededRand(seed: number) {
      const x = Math.sin(seed + 1) * 10000;
      return x - Math.floor(x);
    }

    function rebuildBackgrounds(w: number) {
      genStars(w, height);
      const span = w * 2.5;
      const counts = { far: 10, mid: 14, near: 18 };

      (['far', 'mid', 'near'] as const).forEach((key) => {
        bgLayers[key] = Array.from({ length: counts[key] }, (_, i) => ({
          x: (i / counts[key]) * span,
          seed: i * 149 + key.charCodeAt(0)
        }));
      });
    }

    // Clouds config
    const CLOUDS = Array.from({ length: 8 }, (_, i) => ({
      x: (i / 8) * 2.2,
      y: 0.08 + seededRand(i) * 0.16,
      w: 0.08 + seededRand(i + 12) * 0.08,
      h: 0.025 + seededRand(i + 24) * 0.018,
      alpha: 0.5 + seededRand(i + 36) * 0.4
    }));

    function drawSky() {
      const t = stateRef.current.themeName;
      const grad = bgCtx!.createLinearGradient(0, 0, 0, height);
      if (t === 'Pond') {
        grad.addColorStop(0, '#1a70ac');
        grad.addColorStop(0.35, '#55b2db');
        grad.addColorStop(0.7, '#a0e2f5');
        grad.addColorStop(1, '#b0eeb0');
      } else if (t === 'NightForest') {
        grad.addColorStop(0, '#01000f');
        grad.addColorStop(0.4, '#060022');
        grad.addColorStop(1, '#081232');
      } else {
        grad.addColorStop(0, '#ac3200');
        grad.addColorStop(0.25, '#d5600d');
        grad.addColorStop(0.6, '#f1b028');
        grad.addColorStop(1, '#ffd850');
      }
      bgCtx!.fillStyle = grad;
      bgCtx!.fillRect(0, 0, width, height);
    }

    function drawSunMoon() {
      const t = stateRef.current.themeName;
      bgCtx!.save();
      if (t === 'NightForest') {
        const mx = width * 0.8, my = height * 0.14, mr = height * 0.055;
        const mg = bgCtx!.createRadialGradient(mx, my, 0, mx, my, mr * 3);
        mg.addColorStop(0, 'rgba(195,210,255,0.2)');
        mg.addColorStop(1, 'rgba(195,210,255,0)');
        bgCtx!.fillStyle = mg;
        bgCtx!.beginPath();
        bgCtx!.arc(mx, my, mr * 3, 0, Math.PI * 2);
        bgCtx!.fill();

        bgCtx!.fillStyle = '#dde6ff';
        bgCtx!.beginPath();
        bgCtx!.arc(mx, my, mr, 0, Math.PI * 2);
        bgCtx!.fill();

        // Moon shadow craters details with low alpha
        bgCtx!.fillStyle = '#b8c6e2';
        bgCtx!.beginPath();
        bgCtx!.arc(mx - mr * 0.25, my - mr * 0.15, mr * 0.85, 0, Math.PI * 2);
        bgCtx!.fill();
      } else {
        const isDesert = t === 'Desert';
        const sx = width * (isDesert ? 0.72 : 0.78);
        const sy = height * (isDesert ? 0.12 : 0.15);
        const sr = height * (isDesert ? 0.075 : 0.055);

        const sg = bgCtx!.createRadialGradient(sx, sy, 0, sx, sy, sr * 5);
        sg.addColorStop(0, isDesert ? 'rgba(255,140,20,0.35)' : 'rgba(255,230,100,0.25)');
        sg.addColorStop(1, 'rgba(255,255,200,0)');

        bgCtx!.fillStyle = sg;
        bgCtx!.beginPath();
        bgCtx!.arc(sx, sy, sr * 5, 0, Math.PI * 2);
        bgCtx!.fill();

        bgCtx!.fillStyle = isDesert ? '#ffc040' : '#fff59d';
        bgCtx!.beginPath();
        bgCtx!.arc(sx, sy, sr, 0, Math.PI * 2);
        bgCtx!.fill();
      }
      bgCtx!.restore();
    }

    function drawStars(elapsed: number) {
      bgCtx!.save();
      stars.forEach((s) => {
        const tw = 0.5 + 0.5 * Math.sin(s.twinkle + elapsed * 2.5);
        bgCtx!.globalAlpha = tw;
        bgCtx!.fillStyle = '#eaf0ff';
        bgCtx!.beginPath();
        bgCtx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        bgCtx!.fill();
      });
      bgCtx!.restore();
    }

    function drawClouds() {
      const t = stateRef.current.themeName;
      const col = t === 'Desert' ? 'rgba(255,210,140,' : 'rgba(255,255,255,';
      CLOUDS.forEach((c) => {
        const cx = (((c.x + stateRef.current.cloudOffset * 0.00012) % 1.1) * width) - width * 0.05;
        const cy = c.y * height;
        const cw = c.w * width, ch = c.h * height;

        bgCtx!.save();
        bgCtx!.globalAlpha = c.alpha * (t === 'Desert' ? 0.55 : 0.75);
        bgCtx!.fillStyle = col + '1)';

        // Draw dynamic puffy clouds
        bgCtx!.beginPath();
        bgCtx!.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2);
        bgCtx!.fill();

        bgCtx!.beginPath();
        bgCtx!.ellipse(cx + cw * 0.45, cy - ch * 0.38, cw * 0.55, ch * 0.8, 0, 0, Math.PI * 2);
        bgCtx!.fill();

        bgCtx!.beginPath();
        bgCtx!.ellipse(cx - cw * 0.4, cy - ch * 0.22, cw * 0.48, ch * 0.7, 0, 0, Math.PI * 2);
        bgCtx!.fill();

        bgCtx!.restore();
      });
    }

    function drawFarLayer() {
      const t = stateRef.current.themeName;
      const span = width * 2.2;
      const yBase = height * (t === 'Desert' ? 0.74 : t === 'NightForest' ? 0.70 : 0.78);
      const col = t === 'Desert' ? '#af6222' : t === 'NightForest' ? '#140622' : '#448030';

      bgLayers.far.forEach((item) => {
        const xp = (((item.x - stateRef.current.scrollFar) % span) + span) % span - (width * 0.1);
        const sr = seededRand(item.seed);
        const w = width * (0.12 + sr * 0.1), h = height * (0.12 + seededRand(item.seed + 3) * 0.08);

        bgCtx!.fillStyle = col;
        bgCtx!.beginPath();
        if (t === 'Desert') {
          // Rounded sand dunes
          bgCtx!.moveTo(xp - w, yBase + 10);
          bgCtx!.bezierCurveTo(xp - w * 0.5, yBase + 10, xp - w * 0.25, yBase - h, xp, yBase - h);
          bgCtx!.bezierCurveTo(xp + w * 0.25, yBase - h, xp + w * 0.5, yBase + 10, xp + w, yBase + 10);
        } else {
          // Soft triangular background hills
          bgCtx!.moveTo(xp - w, yBase + 10);
          bgCtx!.quadraticCurveTo(xp, yBase - h, xp + w, yBase + 10);
        }
        bgCtx!.lineTo(xp + w, height + 10);
        bgCtx!.lineTo(xp - w, height + 10);
        bgCtx!.closePath();
        bgCtx!.fill();
      });

      bgCtx!.fillStyle = col;
      bgCtx!.fillRect(0, yBase + 8, width, height - yBase);
    }

    function drawMidLayer() {
      const t = stateRef.current.themeName;
      const span = width * 1.9;
      const yBase = height * (t === 'Desert' ? 0.80 : t === 'NightForest' ? 0.78 : 0.83);

      bgLayers.mid.forEach((item) => {
        const xp = (((item.x - stateRef.current.scrollMid) % span) + span) % span - (width * 0.05);
        const sr = seededRand(item.seed);
        const sr2 = seededRand(item.seed + 6);

        if (t === 'Pond') {
          // Pine tree layers
          const th = height * (0.08 + sr * 0.04);
          const tw = th * 0.45;
          bgCtx!.fillStyle = '#325822';
          bgCtx!.fillRect(xp - tw * 0.07, yBase - th * 0.25, tw * 0.14, th * 0.25);

          bgCtx!.fillStyle = `rgb(${30 + (sr * 20 | 0)}, ${80 + (sr2 * 25 | 0)}, ${20 + (sr * 15 | 0)})`;
          bgCtx!.beginPath();
          bgCtx!.moveTo(xp - tw, yBase);
          bgCtx!.lineTo(xp + tw, yBase);
          bgCtx!.lineTo(xp, yBase - th * 0.5);
          bgCtx!.fill();

          bgCtx!.beginPath();
          bgCtx!.moveTo(xp - tw * 0.75, yBase - th * 0.35);
          bgCtx!.lineTo(xp + tw * 0.75, yBase - th * 0.35);
          bgCtx!.lineTo(xp, yBase - th);
          bgCtx!.fill();
        } else if (t === 'NightForest') {
          // Dark forest structures
          const th = height * (0.09 + sr * 0.05);
          const tw = th * 0.4;
          bgCtx!.fillStyle = '#030a03';
          bgCtx!.fillRect(xp - tw * 0.07, yBase - th * 0.25, tw * 0.14, th * 0.25);

          bgCtx!.beginPath();
          bgCtx!.moveTo(xp - tw, yBase);
          bgCtx!.lineTo(xp + tw, yBase);
          bgCtx!.lineTo(xp, yBase - th * 0.55);
          bgCtx!.fill();

          bgCtx!.beginPath();
          bgCtx!.moveTo(xp - tw * 0.75, yBase - th * 0.4);
          bgCtx!.lineTo(xp + tw * 0.75, yBase - th * 0.4);
          bgCtx!.lineTo(xp, yBase - th);
          bgCtx!.fill();
        } else {
          // Beautiful desert rock stacks
          const dw = width * (0.07 + sr * 0.05);
          const dh = height * (0.05 + sr2 * 0.03);
          bgCtx!.fillStyle = `rgb(${190 + (sr * 25 | 0)}, ${115 + (sr2 * 15 | 0)}, ${40 + (sr * 15 | 0)})`;
          bgCtx!.beginPath();
          bgCtx!.moveTo(xp - dw, height);
          bgCtx!.bezierCurveTo(xp - dw * 0.5, yBase, xp - dw * 0.25, yBase - dh, xp, yBase - dh);
          bgCtx!.bezierCurveTo(xp + dw * 0.25, yBase - dh, xp + dw * 0.5, yBase, xp + dw, height);
          bgCtx!.closePath();
          bgCtx!.fill();
        }
      });

      const botCol = t === 'NightForest' ? '#071607' : t === 'Desert' ? '#b46c22' : '#305f22';
      bgCtx!.fillStyle = botCol;
      bgCtx!.fillRect(0, yBase + 2, width, height - yBase);
    }

    function drawNearLayer() {
      const t = stateRef.current.themeName;
      const span = width * 1.7;
      const yBase = height * 0.895;

      bgLayers.near.forEach((item) => {
        const xp = (((item.x - stateRef.current.scrollNear) % span) + span) % span - (width * 0.05);
        const sr = seededRand(item.seed);
        const sr2 = seededRand(item.seed + 4);

        if (t === 'Pond') {
          // Reed plants with spikes
          const rh = height * (0.06 + sr * 0.04);
          bgCtx!.strokeStyle = `rgb(${40 + (sr * 24 | 0)}, ${90 + (sr2 * 24 | 0)}, ${15 + (sr * 15 | 0)})`;
          bgCtx!.lineWidth = 2.5 + sr * 2;
          bgCtx!.beginPath();
          bgCtx!.moveTo(xp, yBase);
          bgCtx!.lineTo(xp + sr2 * 8 - 4, yBase - rh);
          bgCtx!.stroke();

          // Cattail flower
          bgCtx!.fillStyle = `rgb(${110 + (sr * 35 | 0)}, ${60 + (sr2 * 25 | 0)}, 20)`;
          bgCtx!.beginPath();
          bgCtx!.ellipse(xp + sr2 * 8 - 4, yBase - rh, 3, 7, 0.15, 0, Math.PI * 2);
          bgCtx!.fill();
        } else if (t === 'NightForest') {
          // Forest mushrooms
          const mh = height * (0.035 + sr * 0.015);
          bgCtx!.fillStyle = '#220805';
          bgCtx!.fillRect(xp - 1.5, yBase - mh, 3, mh);

          const mc = sr > 0.5 ? '#e95a3c' : '#bd3cf1';
          bgCtx!.fillStyle = mc;
          bgCtx!.beginPath();
          bgCtx!.ellipse(xp, yBase - mh, mh * 1.1, mh * 0.5, 0, Math.PI, 0);
          bgCtx!.fill();

          // Glowing spores on mushrooms
          bgCtx!.fillStyle = '#ffffff';
          bgCtx!.beginPath();
          bgCtx!.arc(xp - mh * 0.4, yBase - mh * 0.8, 1, 0, Math.PI * 2);
          bgCtx!.arc(xp + mh * 0.3, yBase - mh * 0.9, 1, 0, Math.PI * 2);
          bgCtx!.arc(xp, yBase - mh * 1.05, 1, 0, Math.PI * 2);
          bgCtx!.fill();
        } else {
          // Sharp green cacti
          const ch = height * (0.06 + sr * 0.04);
          const cw = 5 + sr2 * 3;
          bgCtx!.fillStyle = `rgb(${50 + (sr * 15 | 0)}, ${90 + (sr2 * 15 | 0)}, ${25 + (sr * 10 | 0)})`;
          bgCtx!.fillRect(xp - cw / 2, yBase - ch, cw, ch);

          // Cacti crown
          bgCtx!.beginPath();
          bgCtx!.arc(xp, yBase - ch, cw / 2, Math.PI, 0);
          bgCtx!.fill();

          // Side arm
          bgCtx!.fillRect(xp - cw, yBase - ch * 0.65, cw, 3);
          bgCtx!.fillRect(xp - cw, yBase - ch * 0.8, 3, ch * 0.2);
        }
      });
    }

    function drawGround(elapsed: number) {
      const t = stateRef.current.themeName;
      const gTop = height * 0.892;

      if (t === 'Pond') {
        const wg = bgCtx!.createLinearGradient(0, gTop, 0, height);
        wg.addColorStop(0, '#1c80d8');
        wg.addColorStop(1, '#092a60');
        bgCtx!.fillStyle = wg;
        bgCtx!.fillRect(0, gTop, width, height - gTop);

        // Splashing animated ripples/grass blades
        bgCtx!.fillStyle = '#4cb048';
        for (let i = 0; i < width; i += 5) {
          const gh = 5 + Math.sin(i * 0.08 + elapsed * 1.8) * 3;
          bgCtx!.fillRect(i, gTop - gh, 2.5, gh);
        }
      } else if (t === 'NightForest') {
        const gg = bgCtx!.createLinearGradient(0, gTop, 0, height);
        gg.addColorStop(0, '#0d1a0d');
        gg.addColorStop(1, '#030603');
        bgCtx!.fillStyle = gg;
        bgCtx!.fillRect(0, gTop, width, height - gTop);
      } else {
        const sg = bgCtx!.createLinearGradient(0, gTop, 0, height);
        sg.addColorStop(0, '#da9025');
        sg.addColorStop(1, '#90400b');
        bgCtx!.fillStyle = sg;
        bgCtx!.fillRect(0, gTop, width, height - gTop);
      }
    }

    // --- 2D OVERLAY PARTICLES ---
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      decay: number;
      size: number;
      color: string;
    }

    interface ScorePopup {
      x: number;
      y: number;
      vy: number;
      life: number;
      decay: number;
      text: string;
      color?: string;
    }

    const particles: Particle[] = [];
    const scorePopups: ScorePopup[] = [];

    interface TapRipple {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      life: number;
      color: string;
    }
    const tapRipples: TapRipple[] = [];

    function spawnTapRipple(rx: number, ry: number) {
      const state = stateRef.current;
      let clr = '#ffffff';
      if (state.activePower === 'Beetle') clr = '#4eff4a';
      else if (state.activePower === 'Mosquito') clr = '#df40af';
      else if (state.activePower === 'Firefly') clr = '#ff9100';
      else if (state.activePower === 'Dragonfly') clr = '#ffea00';

      tapRipples.push({
        x: rx,
        y: ry,
        radius: 4,
        maxRadius: 70,
        life: 1.0,
        color: clr
      });
    }

    function spawnMunchParticles(wx: number, wy: number) {
      const vec = new THREE.Vector3(wx, wy, 0);
      vec.project(camera);
      const sx = (vec.x * 0.5 + 0.5) * width;
      const sy = (-vec.y * 0.5 + 0.5) * height;
      const conf = THEMES_DATA[stateRef.current.themeName];

      for (let i = 0; i < 15; i++) {
        const ang = (Math.PI * 2 * i) / 15 + (Math.random() * 0.3 - 0.15);
        const speed = 100 + Math.random() * 120;
        particles.push({
          x: sx,
          y: sy,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          life: 1.0,
          decay: 2.2,
          size: 4 + Math.random() * 4,
          color: conf.particles[Math.floor(Math.random() * conf.particles.length)]
        });
      }
    }

    function spawnPointsPopup(wx: number, wy: number, points: number, typeLabel: string, colorHex: string) {
      const vec = new THREE.Vector3(wx, wy, 0);
      vec.project(camera);
      const sx = (vec.x * 0.5 + 0.5) * width;
      const sy = (-vec.y * 0.5 + 0.5) * height;

      scorePopups.push({
        x: sx,
        y: sy,
        vy: -105,
        life: 1.1,
        decay: 1.3,
        text: `+${points} ${typeLabel}!`,
        color: colorHex
      });
    }

    function spawnShieldBlast(wx: number, wy: number) {
      const vec = new THREE.Vector3(wx, wy, 0);
      vec.project(camera);
      const sx = (vec.x * 0.5 + 0.5) * width;
      const sy = (-vec.y * 0.5 + 0.5) * height;

      for (let i = 0; i < 28; i++) {
        const ang = Math.random() * Math.PI * 2;
        const speed = 120 + Math.random() * 220;
        particles.push({
          x: sx,
          y: sy,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          life: 1.0,
          decay: 1.4,
          size: 5 + Math.random() * 6,
          color: i % 2 === 0 ? '#4eff4a' : '#00ffd2'
        });
      }
    }

    function spawnDeathExplosion(wx: number, wy: number) {
      const vec = new THREE.Vector3(wx, wy, 0);
      vec.project(camera);
      const sx = (vec.x * 0.5 + 0.5) * width;
      const sy = (-vec.y * 0.5 + 0.5) * height;

      for (let i = 0; i < 35; i++) {
        const ang = Math.random() * Math.PI * 2;
        const speed = 70 + Math.random() * 160;
        particles.push({
          x: sx,
          y: sy,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          life: 1.0,
          decay: 1.15,
          size: 4 + Math.random() * 5,
          color: i % 3 === 0 ? '#ff3b30' : i % 3 === 1 ? '#ff9100' : '#ffea00'
        });
      }
    }

    function updateParticles(dt: number) {
      pCtx!.clearRect(0, 0, width, height);

      // Star bursts & munch sparkles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= p.decay * dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        pCtx!.save();
        pCtx!.globalAlpha = p.life;
        pCtx!.fillStyle = p.color;
        pCtx!.beginPath();
        pCtx!.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        pCtx!.fill();
        pCtx!.restore();
      }

      // Pop-ups (+1, +2, +3 with vibrant styling)
      for (let i = scorePopups.length - 1; i >= 0; i--) {
        const p = scorePopups[i];
        p.life -= p.decay * dt;
        if (p.life <= 0) {
          scorePopups.splice(i, 1);
          continue;
        }
        p.y += p.vy * dt;

        pCtx!.save();
        pCtx!.globalAlpha = p.life;
        pCtx!.fillStyle = p.color || '#fffbeb';
        
        // Beautiful stroke styling
        pCtx!.strokeStyle = '#000000';
        pCtx!.lineWidth = 4;
        pCtx!.font = '900 18px "Inter", system-ui, sans-serif';
        pCtx!.textAlign = 'center';
        pCtx!.strokeText(p.text, p.x, p.y);
        pCtx!.fillText(p.text, p.x, p.y);
        pCtx!.restore();
      }

      // Draw and update gorgeous expanding tap ripples
      for (let i = tapRipples.length - 1; i >= 0; i--) {
        const r = tapRipples[i];
        r.life -= dt * 2.5; // fades out in 0.4 seconds
        if (r.life <= 0) {
          tapRipples.splice(i, 1);
          continue;
        }
        r.radius += (r.maxRadius - r.radius) * dt * 9;

        // Draw smooth fuzzy ring
        pCtx!.save();
        pCtx!.globalAlpha = r.life * 0.65;
        pCtx!.strokeStyle = r.color;
        pCtx!.lineWidth = 3;
        pCtx!.shadowColor = r.color;
        pCtx!.shadowBlur = 10;
        pCtx!.beginPath();
        pCtx!.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        pCtx!.stroke();

        // Inner soft radial color fill
        pCtx!.globalAlpha = r.life * 0.15;
        pCtx!.fillStyle = r.color;
        pCtx!.beginPath();
        pCtx!.arc(r.x, r.y, r.radius * 0.35, 0, Math.PI * 2);
        pCtx!.fill();
        pCtx!.restore();
      }
    }

    // --- GAME PHYSICS LOOP HANDLERS ---
    const GRAVITY = -18.5;

    // Red frog jumping behavior
    function handleJump() {
      const isMosquito = stateRef.current.activePower === 'Mosquito';
      stateRef.current.frogVelocity = isMosquito ? 6.8 : 8.4;
      frogGroup.scale.set(0.82, 1.35, 0.82);
    }

    function triggerMunch() {
      stateRef.current.munchTimer = 0.25;
    }

    function checkCollisions() {
      const state = stateRef.current;
      for (let i = insects.length - 1; i >= 0; i--) {
        const ins = insects[i];
        if (frogGroup.position.distanceTo(ins.position) < FROG_R + INSECT_R) {
          const points = ins.userData.points || 1;
          const label = ins.userData.type || 'Beetle';
          const glowColorHex = ins.userData.glowColorHex || '#4caf50';

          // Play sound and trigger score
          playMunchSound();
          spawnMunchParticles(ins.position.x, ins.position.y);

          let earnedPoints = points;
          let isDouble = false;
          if (state.activePower === 'Dragonfly') {
            earnedPoints = points * 2;
            isDouble = true;
          }

          spawnPointsPopup(
            ins.position.x,
            ins.position.y,
            earnedPoints,
            isDouble ? `${label} x2` : label,
            glowColorHex
          );

          removeInsect(ins);
          triggerMunch();

          // Increment score
          state.score += earnedPoints;

          // Activate new insect power!
          state.activePower = label;
          state.powerTimer = label === 'Beetle' ? 14.0 : 8.5;

          // Dynamically scale intervals
          state.spawnInterval = Math.max(0.7, 1.8 - state.score * 0.015);
          onScoreUpdate(state.score);
        }
      }
    }

    function checkObstacleCollisions() {
      const state = stateRef.current;
      if (state.isDying) return;

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        if (frogGroup.position.distanceTo(obs.position) < FROG_R + OBSTACLE_R) {
          if (state.activePower === 'Beetle') {
            state.activePower = null;
            state.powerTimer = 0;
            setActivePowerUI(null);

            playHitSound();
            spawnShieldBlast(obs.position.x, obs.position.y);
            spawnPointsPopup(obs.position.x, obs.position.y, 0, 'DEFLECTED!', '#4eff4a');
            removeObstacle(obs);
          } else {
            state.isDying = true;
            state.dyingTimer = 1.25;
            state.frogVelocity = 4.8; // Despair hop
            playGameOverSound();
            spawnDeathExplosion(frogGroup.position.x, frogGroup.position.y);
          }
        }
      }
    }

    function checkDeath() {
      const gy = getGroundY();
      if (frogGroup.position.y - FROG_R <= gy) {
        frogGroup.position.y = gy + FROG_R;
        return true;
      }
      return false;
    }

    // Initialize environment elements on startup
    updateLights(stateRef.current.themeName);
    rebuildBackgrounds(width);

    // --- MAIN TICK LOOP ---
    let frameId = 0;
    let lastTime = performance.now();
    let prevGameState = 'idle';

    const animateLoop = (timeStr: number) => {
      frameId = requestAnimationFrame(animateLoop);
      const dt = Math.min((timeStr - lastTime) / 1000, 0.05);
      lastTime = timeStr;

      const state = stateRef.current;
      const isPlaying = state.gameState === 'playing';

      if (isPlaying && prevGameState !== 'playing') {
        redMat.color.setHex(0xff3b30); // Reset color
        frogGroup.position.set(getFrogX(), 0, 0);
        frogGroup.rotation.set(0, 0, 0);
        frogGroup.scale.set(1, 1, 1);
        state.frogVelocity = 0;
        state.isDying = false;
        state.dyingTimer = 0;

        state.spawnTimer = 0.5;
        state.obstacleSpawnTimer = 2.2;

        // Clean out active insects
        for (let i = insects.length - 1; i >= 0; i--) {
          const ins = insects[i];
          scene.remove(ins);
          insectPool.push(ins);
          ins.visible = false;
        }
        insects.length = 0;

        // Clean out active obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
          const obs = obstacles[i];
          scene.remove(obs);
          obstaclePool.push(obs);
          obs.visible = false;
        }
        obstacles.length = 0;
      }
      prevGameState = state.gameState;

      // Power Decrement or clear
      if (state.activePower) {
        state.powerTimer -= dt;
        if (state.powerTimer <= 0) {
          state.activePower = null;
          state.powerTimer = 0;
          setActivePowerUI(null);
        } else {
          let icon = '🛡️';
          let label = 'Beetle Shield';
          let colorHex = '#4caf50';
          let description = 'Protective Shield! Absorbs next floor crash.';
          if (state.activePower === 'Mosquito') {
            icon = '🦟';
            label = 'Anti-Gravity Wing';
            colorHex = '#df40af';
            description = '65% lighter! Float & soar seamlessly.';
          } else if (state.activePower === 'Firefly') {
            icon = '🧲';
            label = 'Magnetic Glow';
            colorHex = '#ff9100';
            description = 'Drawing flies under 4.2u radius towards you.';
          } else if (state.activePower === 'Dragonfly') {
            icon = '⚡';
            label = 'Gold Rush Multiplier';
            colorHex = '#ffd700';
            description = 'Dragonfly gold! 2x multiplier on all scores.';
          }
          setActivePowerUI({
            type: state.activePower,
            label,
            icon,
            timeLeft: state.powerTimer,
            colorHex,
            description
          });
        }
      } else if (activePowerUI) {
        setActivePowerUI(null);
      }

      // Background scroll speeds
      let speedMult = 1.0;
      if (state.isDying) {
        speedMult = 0.22; // Cinematic slow stop on failure
      }
      const scrollSpeed = isPlaying ? 180 * (1.8 / Math.max(0.7, state.spawnInterval)) * speedMult : 55;
      state.scrollFar += scrollSpeed * 0.16 * dt;
      state.scrollMid += scrollSpeed * 0.40 * dt;
      state.scrollNear += scrollSpeed * 0.70 * dt;
      state.scrollGnd += scrollSpeed * dt;
      state.cloudOffset += dt * 26 * speedMult;

      // Draw background 2D layer
      bgCtx!.clearRect(0, 0, width, height);
      drawSky();
      if (state.themeName === 'NightForest') {
        drawStars(timeStr / 1000);
      }
      drawSunMoon();
      if (state.themeName !== 'NightForest') {
        drawClouds();
      }
      drawFarLayer();
      drawMidLayer();
      drawNearLayer();
      drawGround(timeStr / 1000);

      // Handle running state
      if (isPlaying) {
        if (state.isDying) {
          // --- CINEMATIC SOFT DEATH SPIN FADE ---
          state.frogVelocity += GRAVITY * dt;
          frogGroup.position.y += state.frogVelocity * dt;

          // Slowly roll backward out of the screen
          frogGroup.position.x -= 3.5 * dt;

          // Wild tumble rotation
          frogGroup.rotation.z += 9.2 * dt;
          frogGroup.rotation.y += 6.0 * dt;

          // Shrink down slowly
          const shrinkFactor = Math.max(0.01, state.dyingTimer / 1.25);
          frogGroup.scale.set(shrinkFactor, shrinkFactor, shrinkFactor);

          // Slowly slide insects
          updateInsects(dt * 0.15);
          updateObstacles(dt * 0.15);

          state.dyingTimer -= dt;
          if (state.dyingTimer <= 0) {
            state.isDying = false;
            onGameOver(state.score);
          }
        } else {
          // --- ACTIVE PLAY PHYSICS ---
          let currentGravity = GRAVITY;
          if (state.activePower === 'Mosquito') {
            currentGravity = GRAVITY * 0.38; // 62% reduced gravity strength
          }
          state.frogVelocity += currentGravity * dt;
          frogGroup.position.y += state.frogVelocity * dt;
          frogGroup.rotation.z = THREE.MathUtils.clamp(state.frogVelocity * 0.045, -0.6, 0.55);

          // Dynamic frog color shifts per power element!
          if (state.activePower === 'Beetle') {
            redMat.color.setHex(0x4eff4a); // Vivid lime shield color
          } else if (state.activePower === 'Mosquito') {
            redMat.color.setHex(0xdf40af); // Glowing magical violet
          } else if (state.activePower === 'Firefly') {
            redMat.color.setHex(0xff9100); // Shimmering magma orange
          } else if (state.activePower === 'Dragonfly') {
            redMat.color.setHex(0xffea00); // Brilliant golden yellow
          } else {
            redMat.color.setHex(0xff3b30); // Vibrant crimson default
          }

          // Bounce scaling
          if (state.munchTimer > 0) {
            state.munchTimer -= dt;
            const progress = 1 - (state.munchTimer / 0.25);
            const s = 1.0 + 0.35 * Math.sin(progress * Math.PI);
            frogGroup.scale.set(s * 1.1, 1 / s, s);
          } else {
            frogGroup.scale.lerp(new THREE.Vector3(1, 1, 1), dt * 8);
          }

          // Spawn Insects
          state.spawnTimer -= dt;
          if (state.spawnTimer <= 0) {
            spawnInsect();
            state.spawnTimer = state.spawnInterval;
          }

          // Spawn Obstacles
          state.obstacleSpawnTimer -= dt;
          if (state.obstacleSpawnTimer <= 0) {
            spawnObstacle();
            // Get tighter spawn intervals as score grows
            const dynamicInt = Math.max(2.0, 4.0 - state.score * 0.035) + Math.random() * 1.6;
            state.obstacleSpawnTimer = dynamicInt;
          }

          // Update Position & Check Collisions
          updateInsects(dt);
          checkCollisions();

          // Update Obstacles & Check Collisions
          updateObstacles(dt);
          checkObstacleCollisions();

          // Check Ground Hit
          if (checkDeath()) {
            if (state.activePower === 'Beetle') {
              // Beetle Shield Protect & Auto high recover bounce!
              state.activePower = null;
              state.powerTimer = 0;
              setActivePowerUI(null);
              state.frogVelocity = 9.8; // Super high save bounce jump
              playJumpSound();
              spawnShieldBlast(frogGroup.position.x, frogGroup.position.y);
              spawnPointsPopup(frogGroup.position.x, frogGroup.position.y, 0, 'SHIELD SAVED!', '#4eff4a');
            } else {
              // Trigger cinematic death dance
              state.isDying = true;
              state.dyingTimer = 1.25;
              state.frogVelocity = 4.8; // Despair hop
              playGameOverSound();
              spawnDeathExplosion(frogGroup.position.x, frogGroup.position.y);
            }
          }
        }
      } else {
        // Game is idle (Start or Gameover views) - bob frog up & down gently
        frogGroup.position.x = getFrogX();
        frogGroup.position.y = Math.sin(timeStr / 300) * 0.35;
        frogGroup.rotation.z = Math.sin(timeStr / 500) * 0.08;
        frogGroup.scale.lerp(new THREE.Vector3(1, 1, 1), dt * 4);

        // Keep ambient scrolling of backgrounds & clouds
        stateRef.current.spawnTimer = 0;
      }

      // Update particle physics
      updateParticles(dt);

      // WebGL Draw
      renderer.render(scene, camera);
    };

    frameId = requestAnimationFrame(animateLoop);

    // --- HANDLE TAP EVENT ---
    const triggerJumpTap = (e: Event) => {
      let clientX = -1;
      let clientY = -1;

      if ('touches' in e && (e as TouchEvent).touches.length > 0) {
        clientX = (e as TouchEvent).touches[0].clientX;
        clientY = (e as TouchEvent).touches[0].clientY;
      } else if ('clientX' in (e as MouseEvent)) {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      if (clientX >= 0 && clientY >= 0) {
        const rect = container.getBoundingClientRect();
        const rx = clientX - rect.left;
        const ry = clientY - rect.top;
        spawnTapRipple(rx, ry);
      }

      if (stateRef.current.gameState === 'playing' && !stateRef.current.isDying) {
        handleJump();
        playJumpSound();
      }
    };

    container.addEventListener('touchstart', triggerJumpTap, { passive: true });
    container.addEventListener('mousedown', triggerJumpTap);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (stateRef.current.gameState === 'playing' && !stateRef.current.isDying) {
          handleJump();
          playJumpSound();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // --- RESIZE OBSERVER ---
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        width = entry.contentRect.width;
        height = entry.contentRect.height;

        bgCanvas.width = width;
        bgCanvas.height = height;
        pCanvas.width = width;
        pCanvas.height = height;

        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        rebuildBackgrounds(width);
      }
    });
    resizeObserver.observe(container);

    // --- MONITOR RE-THEME AND OTHER PROPS AT ENGINE DEP LEVEL ---
    const intervalId = setInterval(() => {
      if (stateRef.current.themeName !== themeName) {
        updateLights(stateRef.current.themeName);
      }
    }, 100);

    // Cleanups on Dismount
    return () => {
      clearInterval(intervalId);
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('touchstart', triggerJumpTap);
      container.removeEventListener('mousedown', triggerJumpTap);

      // Dispose of models/geometries/materials to prevent memory leaks!
      [bodyGeometry, headGeometry].forEach((g) => g.dispose());
      [redMat, whiteMat, blackMat].forEach((m) => m.dispose());
      renderer.dispose();
    };
  }, [onScoreUpdate, onGameOver, gameState, themeName]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 select-none touch-none overflow-hidden cursor-pointer"
      style={{ touchAction: 'none' }}
    >
      <canvas ref={bgCanvasRef} className="absolute inset-0 w-full h-full object-cover z-0" />
      <canvas ref={gameCanvasRef} className="absolute inset-0 w-full h-full object-cover z-10" />
      <canvas ref={particleCanvasRef} className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none" />

      {/* ACTIVE INSECT POWER HUD OVERLAY CARD */}
      {activePowerUI && (
        <div
          className="absolute top-24 left-4 right-4 z-40 bg-slate-900/90 border rounded-2xl p-3 shadow-xl flex items-center gap-3 backdrop-blur-md animate-[pulse_1.5s_infinite_ease-in-out] pointer-events-none text-white select-none box-border"
          style={{
            borderColor: `${activePowerUI.colorHex}55`,
            boxShadow: `0 8px 24px ${activePowerUI.colorHex}25`
          }}
        >
          <div
            className="text-2xl p-2 rounded-xl flex items-center justify-center font-mono leading-none flex-shrink-0"
            style={{ backgroundColor: `${activePowerUI.colorHex}20` }}
          >
            {activePowerUI.icon}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black tracking-wider uppercase leading-none" style={{ color: activePowerUI.colorHex }}>
                {activePowerUI.label}
              </span>
              <span className="text-[10px] font-mono font-semibold opacity-75 leading-none">
                {activePowerUI.timeLeft.toFixed(1)}s
              </span>
            </div>
            <p className="text-[10px] text-slate-300 mt-1 leading-tight truncate">{activePowerUI.description}</p>
            {/* Countdown bar indicator */}
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full rounded-full transition-all duration-75"
                style={{
                  width: `${(activePowerUI.timeLeft / (activePowerUI.type === 'Beetle' ? 14.0 : 8.5)) * 100}%`,
                  backgroundColor: activePowerUI.colorHex
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
