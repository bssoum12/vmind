'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface SourcingPipeline3DProps {
  onStageChange?: (stage: 'crawler' | 'enricher' | 'pool' | null) => void;
}

export const SourcingPipeline3D: React.FC<SourcingPipeline3DProps> = ({ onStageChange }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeStage, setActiveStage] = useState<'crawler' | 'enricher' | 'pool' | null>(null);
  const onStageChangeRef = useRef(onStageChange);

  useEffect(() => {
    onStageChangeRef.current = onStageChange;
  }, [onStageChange]);

  useEffect(() => {
    if (!mountRef.current || typeof window === 'undefined') return;

    const container = mountRef.current;
    const width = container.clientWidth || 750;
    const height = 230;

    // 1. Scene, Isometric Perspective Camera & Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 2.1, 5.8);
    camera.lookAt(0, -0.05, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // 2. Lighting Setup (Cyber Cyan / Emerald / Sky Blue)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0x00e5c8, 2.5);
    mainLight.position.set(3, 5, 4);
    scene.add(mainLight);

    const leftLight = new THREE.PointLight(0x00e5c8, 2.5, 10);
    leftLight.position.set(-3.2, 2, 2);
    scene.add(leftLight);

    const rightLight = new THREE.PointLight(0x38bdf8, 2.5, 10);
    rightLight.position.set(3.2, 2, 2);
    scene.add(rightLight);

    // 3. Glowing Cyber Conveyor Rails (Extended Width)
    const railGeo = new THREE.CylinderGeometry(0.02, 0.02, 7.6, 16);
    const railMat = new THREE.MeshBasicMaterial({
      color: 0x00e5c8,
      transparent: true,
      opacity: 0.4,
    });

    const railFront = new THREE.Mesh(railGeo, railMat);
    railFront.rotation.z = Math.PI / 2;
    railFront.position.set(0, -0.45, 0.4);
    scene.add(railFront);

    const railBack = new THREE.Mesh(railGeo, railMat);
    railBack.rotation.z = Math.PI / 2;
    railBack.position.set(0, -0.45, -0.4);
    scene.add(railBack);

    // Cross-ties for the cyber rail
    const tieGroup = new THREE.Group();
    const tieGeos: THREE.BufferGeometry[] = [];
    const tieMat = new THREE.MeshBasicMaterial({
      color: 0x0f2744,
      transparent: true,
      opacity: 0.6,
    });
    for (let x = -3.4; x <= 3.4; x += 0.4) {
      const tieGeo = new THREE.BoxGeometry(0.04, 0.015, 0.85);
      tieGeos.push(tieGeo);
      const tie = new THREE.Mesh(tieGeo, tieMat);
      tie.position.set(x, -0.46, 0);
      tieGroup.add(tie);
    }
    scene.add(tieGroup);

    // -------------------------------------------------------------
    // 4. OBJECT 1: 3D CYBER RADAR WEB CRAWLER (Left, x = -2.6)
    // -------------------------------------------------------------
    const crawlerGroup = new THREE.Group();
    crawlerGroup.position.set(-2.6, 0, 0);
    crawlerGroup.userData = { id: 'crawler' };

    // Drone Central Sphere Core
    const coreGeo = new THREE.SphereGeometry(0.38, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x071a2e,
      emissive: 0x00e5c8,
      emissiveIntensity: 0.35,
      metalness: 0.85,
      roughness: 0.2,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    crawlerGroup.add(coreMesh);

    // Rotating Outer Sensor Ring (Gimbal)
    const ringGeo = new THREE.TorusGeometry(0.55, 0.025, 16, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00e5c8,
      emissive: 0x00e5c8,
      emissiveIntensity: 0.9,
      roughness: 0.1,
    });
    const sensorRing = new THREE.Mesh(ringGeo, ringMat);
    crawlerGroup.add(sensorRing);

    // Secondary tilted gimbal ring
    const innerRingGeo = new THREE.TorusGeometry(0.46, 0.02, 16, 48);
    const innerRingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.6,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = Math.PI / 3;
    crawlerGroup.add(innerRing);

    // Front Optical Sensor Eye (Targeting Lens)
    const eyeGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.1, 32);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x00ffa0,
      emissive: 0x00ffa0,
      emissiveIntensity: 1.2,
      roughness: 0.1,
    });
    const eyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
    eyeMesh.rotation.x = Math.PI / 2;
    eyeMesh.position.set(0, 0, 0.34);
    crawlerGroup.add(eyeMesh);

    // Eye Lens Glare Ring
    const glareGeo = new THREE.RingGeometry(0.08, 0.12, 24);
    const glareMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const glareMesh = new THREE.Mesh(glareGeo, glareMat);
    glareMesh.position.set(0, 0, 0.395);
    crawlerGroup.add(glareMesh);

    // 4 Quad-Antennae Probes (Web Spider / Crawler metaphor)
    const probeMat = new THREE.MeshStandardMaterial({
      color: 0x0c2744,
      metalness: 0.9,
      roughness: 0.3,
    });
    const probeGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.5, 12);
    const probeCoords = [
      { x: -0.32, y: -0.22, rotZ: Math.PI / 4 },
      { x: 0.32, y: -0.22, rotZ: -Math.PI / 4 },
      { x: -0.32, y: 0.22, rotZ: -Math.PI / 4 },
      { x: 0.32, y: 0.22, rotZ: Math.PI / 4 },
    ];
    probeCoords.forEach(c => {
      const probe = new THREE.Mesh(probeGeo, probeMat);
      probe.position.set(c.x, c.y, 0);
      probe.rotation.z = c.rotZ;
      crawlerGroup.add(probe);

      // Probe neon tip
      const tipGeo = new THREE.SphereGeometry(0.035, 12, 12);
      const tipMat = new THREE.MeshBasicMaterial({ color: 0x00e5c8 });
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.set(c.x * 1.5, c.y * 1.5, 0);
      crawlerGroup.add(tip);
    });

    // Downward Cyber Radar Cone (Emitting scan cone toward the ground)
    const radarConeGeo = new THREE.ConeGeometry(0.55, 0.8, 24, 1, true);
    const radarConeMat = new THREE.MeshBasicMaterial({
      color: 0x00e5c8,
      transparent: true,
      opacity: 0.18,
      wireframe: true,
      side: THREE.DoubleSide,
    });
    const radarCone = new THREE.Mesh(radarConeGeo, radarConeMat);
    radarCone.rotation.x = Math.PI;
    radarCone.position.set(0, -0.4, 0);
    crawlerGroup.add(radarCone);

    // Invisible Hit Box for easy hover detection
    const crawlerHitBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 2.0, 1.2),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    crawlerHitBox.userData = { id: 'crawler' };
    crawlerGroup.add(crawlerHitBox);

    scene.add(crawlerGroup);

    // -------------------------------------------------------------
    // 5. OBJECT 2: 3D HOLOGRAPHIC ENRICHMENT & VERIFICATION GATEWAY (Center, x = 0)
    // -------------------------------------------------------------
    const enricherGroup = new THREE.Group();
    enricherGroup.position.set(0, 0, 0);
    enricherGroup.userData = { id: 'enricher' };

    // Arch Gate Left & Right Pillars
    const pillarGeo = new THREE.BoxGeometry(0.12, 1.4, 0.25);
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x071527,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x00e5c8,
      emissiveIntensity: 0.3,
    });
    const leftPillar = new THREE.Mesh(pillarGeo, archMat);
    leftPillar.position.set(-0.65, 0.1, 0);
    enricherGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, archMat);
    rightPillar.position.set(0.65, 0.1, 0);
    enricherGroup.add(rightPillar);

    // Arch Top Crossbar
    const topBarGeo = new THREE.BoxGeometry(1.42, 0.14, 0.25);
    const topBar = new THREE.Mesh(topBarGeo, archMat);
    topBar.position.set(0, 0.82, 0);
    enricherGroup.add(topBar);

    // GLSL Vertical Laser Scanning Curtain (Enrichment Scanner)
    const laserCurtainGeo = new THREE.PlaneGeometry(1.18, 1.3);
    const laserCurtainMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;

        void main() {
          // Sweeping horizontal scanline
          float scanY = sin(uTime * 3.5) * 0.45 + 0.5;
          float dist = abs(vUv.y - scanY);
          float beam = smoothstep(0.08, 0.0, dist);

          // Grid scan effect
          float grid = sin(vUv.x * 35.0) * 0.1 + sin(vUv.y * 30.0) * 0.1;

          vec3 cyan = vec3(0.0, 0.9, 0.78);
          vec3 skyBlue = vec3(0.22, 0.74, 0.97);
          vec3 color = mix(cyan, skyBlue, beam);

          float alpha = (beam * 0.85) + (grid * 0.25) + 0.12;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const laserCurtain = new THREE.Mesh(laserCurtainGeo, laserCurtainMat);
    laserCurtain.position.set(0, 0.15, 0);
    enricherGroup.add(laserCurtain);

    // Floating Contact Badge with "@" (Email & Phone Verified)
    const badgeShape = new THREE.BoxGeometry(0.58, 0.42, 0.04);
    const badgeMat = new THREE.MeshStandardMaterial({
      color: 0x0a223e,
      emissive: 0x00e5c8,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.8,
    });
    const badgeMesh = new THREE.Mesh(badgeShape, badgeMat);
    badgeMesh.position.set(0, 0.15, 0.12);
    enricherGroup.add(badgeMesh);

    // Badge Neon Edge
    const badgeEdgeGeo = new THREE.EdgesGeometry(badgeShape);
    const badgeEdgeMat = new THREE.LineBasicMaterial({ color: 0x00e5c8, linewidth: 2 });
    const badgeEdge = new THREE.LineSegments(badgeEdgeGeo, badgeEdgeMat);
    badgeMesh.add(badgeEdge);

    // Checkmark Ring on Badge
    const checkRingGeo = new THREE.TorusGeometry(0.12, 0.02, 16, 24);
    const checkRingMat = new THREE.MeshStandardMaterial({
      color: 0x00ffa0,
      emissive: 0x00ffa0,
      emissiveIntensity: 1.0,
      roughness: 0.1,
    });
    const checkRing = new THREE.Mesh(checkRingGeo, checkRingMat);
    checkRing.position.set(-0.13, 0.02, 0.035);
    badgeMesh.add(checkRing);

    // Mini Checkmark V inside ring
    const checkPart1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.07, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    checkPart1.rotation.z = -Math.PI / 4;
    checkPart1.position.set(-0.15, 0.01, 0.04);
    badgeMesh.add(checkPart1);

    const checkPart2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    checkPart2.rotation.z = Math.PI / 3.5;
    checkPart2.position.set(-0.09, 0.03, 0.04);
    badgeMesh.add(checkPart2);

    // Data verification lines on the right of badge
    const badgeLine1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.03, 0.01),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    badgeLine1.position.set(0.1, 0.07, 0.03);
    badgeMesh.add(badgeLine1);

    const badgeLine2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.025, 0.01),
      new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
    );
    badgeLine2.position.set(0.08, -0.03, 0.03);
    badgeMesh.add(badgeLine2);

    // Invisible Hit Box for easy hover detection
    const enricherHitBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 2.2, 1.2),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    enricherHitBox.userData = { id: 'enricher' };
    enricherGroup.add(enricherHitBox);

    scene.add(enricherGroup);

    // -------------------------------------------------------------
    // 6. OBJECT 3: 3D CENTRAL LEAD POOL VAULT / DISPATCH HUB (Right, x = 2.6)
    // -------------------------------------------------------------
    const poolGroup = new THREE.Group();
    poolGroup.position.set(2.6, 0, 0);
    poolGroup.userData = { id: 'pool' };

    // Hexagonal Reservoir Vault Body (Canister Base & Cap)
    const tankGeo = new THREE.CylinderGeometry(0.48, 0.52, 0.85, 6);
    const tankMat = new THREE.MeshStandardMaterial({
      color: 0x091d36,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.25,
      metalness: 0.9,
      roughness: 0.2,
      transparent: true,
      opacity: 0.88,
    });
    const tankMesh = new THREE.Mesh(tankGeo, tankMat);
    poolGroup.add(tankMesh);

    // Glowing Neon Edges for Hexagonal Canister
    const tankEdgeGeo = new THREE.EdgesGeometry(tankGeo);
    const tankEdgeMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
    const tankEdge = new THREE.LineSegments(tankEdgeGeo, tankEdgeMat);
    poolGroup.add(tankEdge);

    // Reservoir Top Cap
    const capGeo = new THREE.CylinderGeometry(0.36, 0.48, 0.15, 6);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x06111f,
      emissive: 0x00e5c8,
      emissiveIntensity: 0.4,
      metalness: 0.95,
      roughness: 0.1,
    });
    const capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.position.set(0, 0.48, 0);
    poolGroup.add(capMesh);

    // Reservoir Bottom Base Pedestal
    const baseGeo = new THREE.CylinderGeometry(0.54, 0.6, 0.12, 6);
    const baseMesh = new THREE.Mesh(baseGeo, capMat);
    baseMesh.position.set(0, -0.46, 0);
    poolGroup.add(baseMesh);

    // Internal Floating Lead Tokens / Discs (Stocked Leads)
    const tokenMat = new THREE.MeshStandardMaterial({
      color: 0x00e5a0,
      emissive: 0x00e5a0,
      emissiveIntensity: 0.7,
      roughness: 0.2,
    });
    const tokenGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.04, 24);

    const token1 = new THREE.Mesh(tokenGeo, tokenMat);
    token1.position.set(0, -0.18, 0);
    poolGroup.add(token1);

    const token2 = new THREE.Mesh(tokenGeo, tokenMat);
    token2.position.set(0, -0.04, 0);
    poolGroup.add(token2);

    const token3 = new THREE.Mesh(tokenGeo, tokenMat);
    token3.position.set(0, 0.1, 0);
    poolGroup.add(token3);

    // Outer Dispatch Conduit Pipes (Linking to Target Prospect Agents)
    const conduitGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 12);
    const conduitMat = new THREE.MeshStandardMaterial({
      color: 0x00e5c8,
      emissive: 0x00e5c8,
      emissiveIntensity: 0.8,
    });

    const conduitLeft = new THREE.Mesh(conduitGeo, conduitMat);
    conduitLeft.rotation.z = Math.PI / 2.8;
    conduitLeft.position.set(0.48, 0.15, 0.1);
    poolGroup.add(conduitLeft);

    const conduitRight = new THREE.Mesh(conduitGeo, conduitMat);
    conduitRight.rotation.z = -Math.PI / 2.8;
    conduitRight.position.set(-0.48, 0.15, 0.1);
    poolGroup.add(conduitRight);

    // Invisible Hit Box for easy hover detection
    const poolHitBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 2.0, 1.2),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    poolHitBox.userData = { id: 'pool' };
    poolGroup.add(poolHitBox);

    scene.add(poolGroup);

    // -------------------------------------------------------------
    // 7. GLSL Energy Stream Particles (Moving Left to Right)
    // -------------------------------------------------------------
    const particleCount = 42;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 7.6;
      particlePositions[i * 3 + 1] = -0.45 + (Math.random() - 0.5) * 0.1;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
      particleSpeeds[i] = 0.025 + Math.random() * 0.035;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00e5c8,
      size: 0.06,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // -------------------------------------------------------------
    // 8. Interaction: Raycasting & Parallax Mouse Tilt
    // -------------------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Parallax smooth camera tilt
      camera.position.x = mouse.x * 0.4;
      camera.position.y = 2.2 + mouse.y * 0.25;
      camera.lookAt(0, -0.1, 0);
    };

    const onMouseLeave = () => {
      mouse.set(-999, -999);
      setActiveStage(null);
      onStageChangeRef.current?.(null);
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);

    // -------------------------------------------------------------
    // 9. Render & Animation Loop
    // -------------------------------------------------------------
    const startTime = performance.now();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTime) * 0.001;

      // Update shader uniform
      laserCurtainMat.uniforms.uTime.value = elapsed;

      // 1. Crawler Drone (Left) Floating & Sensor Rotation
      crawlerGroup.position.y = Math.sin(elapsed * 2.2) * 0.08;
      crawlerGroup.rotation.y = Math.sin(elapsed * 1.5) * 0.15;
      sensorRing.rotation.z = elapsed * 1.8;
      sensorRing.rotation.x = Math.sin(elapsed * 1.2) * 0.3;
      innerRing.rotation.y = -elapsed * 1.4;
      radarCone.scale.set(
        1 + Math.sin(elapsed * 4.0) * 0.08,
        1 + Math.sin(elapsed * 4.0) * 0.08,
        1 + Math.sin(elapsed * 4.0) * 0.08
      );

      // 2. Gateway (Center) Pulse & Badge Float
      enricherGroup.position.y = Math.sin(elapsed * 1.8 + 1.0) * 0.03;
      badgeMesh.position.y = 0.15 + Math.sin(elapsed * 2.5) * 0.05;
      badgeMesh.rotation.y = Math.sin(elapsed * 1.8) * 0.12;

      // 3. Central Lead Pool (Right) Rotation & Lead Tokens Bob
      poolGroup.position.y = Math.sin(elapsed * 2.0 + 2.0) * 0.06;
      poolGroup.rotation.y = elapsed * 0.4;
      token1.position.y = -0.18 + Math.sin(elapsed * 2.8) * 0.025;
      token2.position.y = -0.04 + Math.sin(elapsed * 2.8 + 1.0) * 0.025;
      token3.position.y = 0.1 + Math.sin(elapsed * 2.8 + 2.0) * 0.025;

      // 4. Energy Particles (Left to Right)
      const positions = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += particleSpeeds[i];
        if (positions[i * 3] > 3.8) {
          positions[i * 3] = -3.8;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      // 5. Raycast Detection on Hitboxes with screen-space geometric zone fallback
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(
        [crawlerHitBox, enricherHitBox, poolHitBox],
        false
      );

      let detectedStage: 'crawler' | 'enricher' | 'pool' | null = null;

      if (intersects.length > 0) {
        detectedStage = intersects[0].object.userData.id as 'crawler' | 'enricher' | 'pool';
      } else if (Math.abs(mouse.y) <= 0.85 && Math.abs(mouse.x) <= 0.95 && mouse.x > -900) {
        // High-precision zone fallback
        if (mouse.x < -0.38) {
          detectedStage = 'crawler';
        } else if (mouse.x > 0.38) {
          detectedStage = 'pool';
        } else {
          detectedStage = 'enricher';
        }
      }

      if (detectedStage) {
        setActiveStage(prev => {
          if (prev !== detectedStage) {
            onStageChangeRef.current?.(detectedStage);
          }
          return detectedStage;
        });
        container.style.cursor = 'pointer';

        // Scale up hovered group smoothly
        crawlerGroup.scale.lerp(new THREE.Vector3(detectedStage === 'crawler' ? 1.12 : 1, detectedStage === 'crawler' ? 1.12 : 1, detectedStage === 'crawler' ? 1.12 : 1), 0.15);
        enricherGroup.scale.lerp(new THREE.Vector3(detectedStage === 'enricher' ? 1.08 : 1, detectedStage === 'enricher' ? 1.08 : 1, detectedStage === 'enricher' ? 1.08 : 1), 0.15);
        poolGroup.scale.lerp(new THREE.Vector3(detectedStage === 'pool' ? 1.12 : 1, detectedStage === 'pool' ? 1.12 : 1, detectedStage === 'pool' ? 1.12 : 1), 0.15);
      } else {
        setActiveStage(prev => {
          if (prev !== null) {
            onStageChangeRef.current?.(null);
          }
          return null;
        });
        container.style.cursor = 'default';
        crawlerGroup.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        enricherGroup.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        poolGroup.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }

      renderer.render(scene, camera);
    };

    animate();

    // 10. Resize
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };

    window.addEventListener('resize', onResize);

    // 11. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);

      // Dispose Geometries
      coreGeo.dispose();
      ringGeo.dispose();
      innerRingGeo.dispose();
      eyeGeo.dispose();
      glareGeo.dispose();
      probeGeo.dispose();
      radarConeGeo.dispose();
      crawlerHitBox.geometry.dispose();

      pillarGeo.dispose();
      topBarGeo.dispose();
      laserCurtainGeo.dispose();
      badgeShape.dispose();
      badgeEdgeGeo.dispose();
      checkRingGeo.dispose();
      enricherHitBox.geometry.dispose();

      tankGeo.dispose();
      tankEdgeGeo.dispose();
      capGeo.dispose();
      baseGeo.dispose();
      tokenGeo.dispose();
      conduitGeo.dispose();
      poolHitBox.geometry.dispose();

      railGeo.dispose();
      particleGeo.dispose();
      tieGeos.forEach(g => g.dispose());

      // Dispose Materials
      coreMat.dispose();
      ringMat.dispose();
      innerRingMat.dispose();
      eyeMat.dispose();
      glareMat.dispose();
      probeMat.dispose();
      radarConeMat.dispose();

      archMat.dispose();
      laserCurtainMat.dispose();
      badgeMat.dispose();
      badgeEdgeMat.dispose();
      checkRingMat.dispose();

      tankMat.dispose();
      tankEdgeMat.dispose();
      capMat.dispose();
      tokenMat.dispose();
      conduitMat.dispose();

      railMat.dispose();
      tieMat.dispose();
      particleMat.dispose();

      try {
        renderer.forceContextLoss();
      } catch (e) {
        // ignore
      }
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '230px',
        borderRadius: '14px',
        background: 'radial-gradient(ellipse at 50% 120%, rgba(0, 229, 200, 0.08) 0%, rgba(4, 12, 24, 0.6) 80%)',
        border: '1px solid rgba(0, 229, 200, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 24px rgba(0, 229, 200, 0.02)',
        overflow: 'hidden',
      }}
    >
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Dynamic Hover Explanation Pill */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '20px',
          background: 'rgba(6, 17, 31, 0.94)',
          border:
            activeStage === 'crawler'
              ? '1px solid #00E5C8'
              : activeStage === 'enricher'
                ? '1px solid #00FFA0'
                : activeStage === 'pool'
                  ? '1px solid #38BDF8'
                  : '1px solid transparent',
          boxShadow: activeStage
            ? '0 6px 24px rgba(0, 0, 0, 0.7), 0 0 16px rgba(0, 229, 200, 0.2)'
            : 'none',
          backdropFilter: 'blur(16px)',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#F0F4F8',
          opacity: activeStage ? 1 : 0,
          pointerEvents: 'none',
          userSelect: 'none',
          transform: `translateX(-50%) translateY(${activeStage ? '0px' : '6px'})`,
          transition: 'opacity 0.25s ease, transform 0.25s ease, border-color 0.25s ease',
          zIndex: 10,
          maxWidth: 'calc(100% - 32px)',
          boxSizing: 'border-box',
          textAlign: 'center',
        }}
      >
        {activeStage === 'crawler' && (
          <>
            <span style={{ fontSize: '0.95rem' }}>🛰️</span>
            <span>
              <strong style={{ color: '#00E5C8' }}>Radar Web :</strong> Exploration et extraction ciblée de décideurs B2B
            </span>
          </>
        )}
        {activeStage === 'enricher' && (
          <>
            <span style={{ fontSize: '0.95rem' }}>⚡</span>
            <span>
              <strong style={{ color: '#00FFA0' }}>Enrichissement IA :</strong> Détection et certification des emails pros et coordonnées
            </span>
          </>
        )}
        {activeStage === 'pool' && (
          <>
            <span style={{ fontSize: '0.95rem' }}>🗄️</span>
            <span>
              <strong style={{ color: '#38BDF8' }}>Réservoir Central :</strong> Stockage des leads qualifiés et transmission aux agents cibles
            </span>
          </>
        )}
      </div>
    </div>
  );
};
