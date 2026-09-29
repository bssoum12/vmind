'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface ProspectPipeline3DProps {
  onStageChange?: (stage: 'card' | 'scanner' | 'mail' | null) => void;
}

export const ProspectPipeline3D: React.FC<ProspectPipeline3DProps> = ({ onStageChange }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeStage, setActiveStage] = useState<'card' | 'scanner' | 'mail' | null>(null);
  const onStageChangeRef = useRef(onStageChange);

  useEffect(() => {
    onStageChangeRef.current = onStageChange;
  }, [onStageChange]);

  useEffect(() => {
    if (!mountRef.current || typeof window === 'undefined') return;

    const container = mountRef.current;
    const width = container.clientWidth || 750;
    const height = 230;

    // 1. Scene, Isometric Camera, High-Performance WebGLRenderer
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

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0x00e5c8, 2.5);
    mainLight.position.set(3, 5, 4);
    scene.add(mainLight);

    const accentLight = new THREE.PointLight(0x00ffa0, 2.5, 10);
    accentLight.position.set(-3.2, 2, 2);
    scene.add(accentLight);

    const mailLight = new THREE.PointLight(0x38bdf8, 2.5, 10);
    mailLight.position.set(3.2, 2, 2);
    scene.add(mailLight);

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
    for (let x = -3.4; x <= 3.4; x += 0.4) {
      const tieGeo = new THREE.BoxGeometry(0.04, 0.015, 0.85);
      const tieMat = new THREE.MeshBasicMaterial({
        color: 0x0f2744,
        transparent: true,
        opacity: 0.6,
      });
      const tie = new THREE.Mesh(tieGeo, tieMat);
      tie.position.set(x, -0.46, 0);
      tieGroup.add(tie);
    }
    scene.add(tieGroup);

    // -------------------------------------------------------------
    // 4. OBJECT 1: 3D CONTACT LEAD CARD (Left, x = -2.6)
    // -------------------------------------------------------------
    const cardGroup = new THREE.Group();
    cardGroup.position.set(-2.6, 0, 0);
    cardGroup.userData = { id: 'card' };

    // Main Card Body (Credit/Business card proportions)
    const cardShape = new THREE.BoxGeometry(0.85, 1.15, 0.04);
    const cardMat = new THREE.MeshStandardMaterial({
      color: 0x06111f,
      emissive: 0x00e5a0,
      emissiveIntensity: 0.15,
      roughness: 0.3,
      metalness: 0.7,
    });
    const cardBody = new THREE.Mesh(cardShape, cardMat);
    cardGroup.add(cardBody);

    // Glowing Cyan/Emerald Border
    const cardEdgeGeo = new THREE.EdgesGeometry(cardShape);
    const cardEdgeMat = new THREE.LineBasicMaterial({ color: 0x00e5a0, linewidth: 2 });
    const cardEdge = new THREE.LineSegments(cardEdgeGeo, cardEdgeMat);
    cardGroup.add(cardEdge);

    // Embossed Avatar Circle on Card
    const avatarGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.05, 32);
    const avatarMat = new THREE.MeshStandardMaterial({
      color: 0x00e5a0,
      emissive: 0x00e5a0,
      emissiveIntensity: 0.5,
    });
    const avatarMesh = new THREE.Mesh(avatarGeo, avatarMat);
    avatarMesh.rotation.x = Math.PI / 2;
    avatarMesh.position.set(-0.2, 0.3, 0.025);
    cardGroup.add(avatarMesh);

    // Embossed Profile Lines (Representing Name & Company)
    const line1Geo = new THREE.BoxGeometry(0.35, 0.05, 0.045);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    const line1 = new THREE.Mesh(line1Geo, lineMat);
    line1.position.set(0.12, 0.34, 0.02);
    cardGroup.add(line1);

    const line2Geo = new THREE.BoxGeometry(0.25, 0.035, 0.045);
    const line2Mat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
    const line2 = new THREE.Mesh(line2Geo, line2Mat);
    line2.position.set(0.07, 0.24, 0.02);
    cardGroup.add(line2);

    // Two lower data bars
    const line3 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.035, 0.045), line2Mat);
    line3.position.set(0, 0.02, 0.02);
    cardGroup.add(line3);

    const line4 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.035, 0.045), line2Mat);
    line4.position.set(-0.075, -0.12, 0.02);
    cardGroup.add(line4);

    // Secondary card underneath for "deck" effect
    const cardDeck = new THREE.Mesh(
      cardShape,
      new THREE.MeshBasicMaterial({ color: 0x0a1c30, transparent: true, opacity: 0.6 })
    );
    cardDeck.position.set(0.08, -0.06, -0.05);
    cardGroup.add(cardDeck);

    // Invisible Hit Box for easy hover detection (transparent: true, opacity: 0 ensures Raycasting works)
    const cardHitBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 2.0, 1.0),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    cardHitBox.userData = { id: 'card' };
    cardGroup.add(cardHitBox);

    scene.add(cardGroup);

    // -------------------------------------------------------------
    // 5. OBJECT 2: 3D HOLOGRAPHIC AI SCANNER GATEWAY (Center, x = 0)
    // -------------------------------------------------------------
    const scannerGroup = new THREE.Group();
    scannerGroup.position.set(0, 0, 0);
    scannerGroup.userData = { id: 'scanner' };

    // Arch Gate Left Pillar
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
    scannerGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, archMat);
    rightPillar.position.set(0.65, 0.1, 0);
    scannerGroup.add(rightPillar);

    // Arch Top Crossbar
    const topBarGeo = new THREE.BoxGeometry(1.42, 0.14, 0.25);
    const topBar = new THREE.Mesh(topBarGeo, archMat);
    topBar.position.set(0, 0.82, 0);
    scannerGroup.add(topBar);

    // GLSL Vertical Laser Scanning Curtain
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
          float grid = sin(vUv.x * 40.0) * 0.1 + sin(vUv.y * 30.0) * 0.1;

          vec3 cyan = vec3(0.0, 0.9, 0.78);
          vec3 green = vec3(0.0, 1.0, 0.5);
          vec3 color = mix(cyan, green, beam);

          float alpha = (beam * 0.8) + (grid * 0.2) + 0.1;
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
    scannerGroup.add(laserCurtain);

    // Floating Holographic Checkmark Ring (Qualifié / Scanné)
    const checkRingGeo = new THREE.TorusGeometry(0.28, 0.03, 16, 32);
    const checkRingMat = new THREE.MeshStandardMaterial({
      color: 0x00e5a0,
      emissive: 0x00e5a0,
      emissiveIntensity: 1.0,
      roughness: 0.1,
    });
    const checkRing = new THREE.Mesh(checkRingGeo, checkRingMat);
    checkRing.position.set(0, 0.15, 0.12);
    scannerGroup.add(checkRing);

    // Checkmark mark (Two small cylinders creating a V)
    const checkPart1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.14, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    checkPart1.rotation.z = -Math.PI / 4;
    checkPart1.position.set(-0.05, 0.12, 0.13);
    scannerGroup.add(checkPart1);

    const checkPart2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.25, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    checkPart2.rotation.z = Math.PI / 3.5;
    checkPart2.position.set(0.07, 0.16, 0.13);
    scannerGroup.add(checkPart2);

    // Invisible Hit Box for easy hover detection (transparent: true, opacity: 0 ensures Raycasting works)
    const scannerHitBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 2.2, 1.2),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    scannerHitBox.userData = { id: 'scanner' };
    scannerGroup.add(scannerHitBox);

    scene.add(scannerGroup);

    // -------------------------------------------------------------
    // 6. OBJECT 3: 3D CYBER EMAIL ENVELOPE (Right, x = 2.6)
    // -------------------------------------------------------------
    const mailGroup = new THREE.Group();
    mailGroup.position.set(2.6, 0, 0);
    mailGroup.userData = { id: 'mail' };

    // Envelope Body
    const envShape = new THREE.BoxGeometry(1.2, 0.8, 0.06);
    const envMat = new THREE.MeshStandardMaterial({
      color: 0x0a223e,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.2,
      roughness: 0.2,
      metalness: 0.8,
    });
    const envBody = new THREE.Mesh(envShape, envMat);
    mailGroup.add(envBody);

    // Glowing edges for envelope
    const envEdgeGeo = new THREE.EdgesGeometry(envShape);
    const envEdgeMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
    const envEdge = new THREE.LineSegments(envEdgeGeo, envEdgeMat);
    mailGroup.add(envEdge);

    // Envelope Flap Triangles (Geometric fold)
    const flapGeo = new THREE.ConeGeometry(0.58, 0.38, 3);
    const flapMat = new THREE.MeshStandardMaterial({
      color: 0x0e3056,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.35,
    });
    const flap = new THREE.Mesh(flapGeo, flapMat);
    flap.rotation.z = Math.PI;
    flap.position.set(0, 0.16, 0.04);
    flap.scale.set(1, 1, 0.05);
    mailGroup.add(flap);

    // Animated Emerging Letter Sheet (Sliding out of the envelope)
    const letterGeo = new THREE.BoxGeometry(0.95, 0.65, 0.02);
    const letterMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.4,
      roughness: 0.1,
    });
    const letter = new THREE.Mesh(letterGeo, letterMat);
    letter.position.set(0, 0.25, -0.02);
    mailGroup.add(letter);

    // Letter text lines
    const text1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.03, 0.025),
      new THREE.MeshBasicMaterial({ color: 0x00e5c8 })
    );
    text1.position.set(0, 0.4, -0.005);
    mailGroup.add(text1);

    const text2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.025, 0.025),
      new THREE.MeshBasicMaterial({ color: 0x64748b })
    );
    text2.position.set(-0.1, 0.32, -0.005);
    mailGroup.add(text2);

    // Invisible Hit Box for easy hover detection (transparent: true, opacity: 0 ensures Raycasting works)
    const mailHitBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 2.0, 1.0),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    mailHitBox.userData = { id: 'mail' };
    mailGroup.add(mailHitBox);

    scene.add(mailGroup);

    // -------------------------------------------------------------
    // 7. GLSL Energy Stream Particles (Moving Left to Right)
    // -------------------------------------------------------------
    const particleCount = 40;
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
    const interactables = [cardGroup, scannerGroup, mailGroup];

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

      // Gentle floating bob for Card (Left)
      cardGroup.position.y = Math.sin(elapsed * 2.0) * 0.08;
      cardGroup.rotation.y = -0.25 + Math.sin(elapsed * 1.5) * 0.08;
      cardGroup.rotation.x = 0.1;

      // Pulse for Scanner (Center)
      scannerGroup.position.y = Math.sin(elapsed * 1.8 + 1.0) * 0.03;
      checkRing.rotation.z = elapsed * 0.8;

      // Gentle floating bob & tilt for Mail (Right)
      mailGroup.position.y = Math.sin(elapsed * 2.2 + 2.0) * 0.08;
      mailGroup.rotation.y = 0.25 + Math.sin(elapsed * 1.6) * 0.08;
      mailGroup.rotation.x = 0.1;
      letter.position.y = 0.25 + Math.sin(elapsed * 3.0) * 0.05;

      // Animate flowing energy particles (Left to Right across widened rails)
      const positions = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += particleSpeeds[i];
        if (positions[i * 3] > 3.8) {
          positions[i * 3] = -3.8;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Raycast detection on hitboxes with screen-space zone fallback
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(
        [cardHitBox, scannerHitBox, mailHitBox],
        false
      );

      let detectedStage: 'card' | 'scanner' | 'mail' | null = null;

      if (intersects.length > 0) {
        detectedStage = intersects[0].object.userData.id as 'card' | 'scanner' | 'mail';
      } else if (Math.abs(mouse.y) <= 0.85 && Math.abs(mouse.x) <= 0.95 && mouse.x > -900) {
        // High-precision geometric zone fallback across the 3 widened objects
        if (mouse.x < -0.38) {
          detectedStage = 'card';
        } else if (mouse.x > 0.38) {
          detectedStage = 'mail';
        } else {
          detectedStage = 'scanner';
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

        // Scale up hovered group
        cardGroup.scale.lerp(new THREE.Vector3(detectedStage === 'card' ? 1.12 : 1, detectedStage === 'card' ? 1.12 : 1, detectedStage === 'card' ? 1.12 : 1), 0.15);
        scannerGroup.scale.lerp(new THREE.Vector3(detectedStage === 'scanner' ? 1.08 : 1, detectedStage === 'scanner' ? 1.08 : 1, detectedStage === 'scanner' ? 1.08 : 1), 0.15);
        mailGroup.scale.lerp(new THREE.Vector3(detectedStage === 'mail' ? 1.12 : 1, detectedStage === 'mail' ? 1.12 : 1, detectedStage === 'mail' ? 1.12 : 1), 0.15);
      } else {
        setActiveStage(prev => {
          if (prev !== null) {
            onStageChangeRef.current?.(null);
          }
          return null;
        });
        container.style.cursor = 'default';
        cardGroup.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        scannerGroup.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        mailGroup.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
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

      cardShape.dispose();
      cardMat.dispose();
      cardEdgeGeo.dispose();
      cardEdgeMat.dispose();
      cardHitBox.geometry.dispose();
      avatarGeo.dispose();
      avatarMat.dispose();
      pillarGeo.dispose();
      archMat.dispose();
      scannerHitBox.geometry.dispose();
      topBarGeo.dispose();
      laserCurtainGeo.dispose();
      laserCurtainMat.dispose();
      checkRingGeo.dispose();
      checkRingMat.dispose();
      envShape.dispose();
      envMat.dispose();
      envEdgeGeo.dispose();
      envEdgeMat.dispose();
      mailHitBox.geometry.dispose();
      flapGeo.dispose();
      flapMat.dispose();
      letterGeo.dispose();
      letterMat.dispose();
      railGeo.dispose();
      railMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();

      try {
        renderer.forceContextLoss();
      } catch (e) {
        // ignore if already lost
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
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '20px',
          background: 'rgba(6, 17, 31, 0.94)',
          border:
            activeStage === 'card'
              ? '1px solid #00E5A0'
              : activeStage === 'scanner'
                ? '1px solid #00E5C8'
                : activeStage === 'mail'
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
          whiteSpace: 'nowrap',
        }}
      >
        {activeStage === 'card' && (
          <>
            <span style={{ fontSize: '0.95rem' }}></span>
            <span>
              <strong style={{ color: '#00E5A0' }}>Fiche Contact :</strong> Vos prospects (fichiers CSV, Excel, XML..., URL web ou Sourcing IA) entrent dans le pipeline
            </span>
          </>
        )}
        {activeStage === 'scanner' && (
          <>
            <span style={{ fontSize: '0.95rem' }}></span>
            <span>
              <strong style={{ color: '#00E5C8' }}>Scanner IA :</strong> Analyse du profil et calcul de la correspondance avec votre client idéal
            </span>
          </>
        )}
        {activeStage === 'mail' && (
          <>
            <span style={{ fontSize: '0.95rem' }}></span>
            <span>
              <strong style={{ color: '#38BDF8' }}>Email Personnalisé :</strong> Rédaction sur-mesure et expédition automatisée
            </span>
          </>
        )}
      </div>
    </div>
  );
};
