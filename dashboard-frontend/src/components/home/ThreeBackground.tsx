import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

const ParticleSwarm = () => {
  const ref = useRef<THREE.Points>(null!);
  const count = 3000;

  const [originalPositions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
        // Random spherical distribution
        const r = 25 * Math.cbrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);

        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);

        // Mix blues, purples, and cyans
        color.setHSL(0.6 + Math.random() * 0.15, 0.8, 0.6);
        col[i * 3] = color.r;
        col[i * 3 + 1] = color.g;
        col[i * 3 + 2] = color.b;
    }
    return [pos, col];
  }, [count]);

  const positions = useMemo(() => new Float32Array(originalPositions), [originalPositions]);

  // Track mouse directly from window since canvas pointerEvents is none
  const mouse = useRef(new THREE.Vector2(-9999, -9999));
  const scrollY = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    const handleScroll = () => {
      scrollY.current = window.scrollY;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useFrame((state, delta) => {
    if (!ref.current) return;

    // 4D Antigravity Scroll Physics (Smoothed & Constrained)
    const targetZ = 12 - (scrollY.current * 0.006); // Move gently forward
    const targetY = scrollY.current * 0.002;        // Pan slightly downwards
    
    state.camera.position.z += (targetZ - state.camera.position.z) * 0.08;
    state.camera.position.y += (targetY - state.camera.position.y) * 0.08;

    const scrollTwist = scrollY.current * 0.0005;   // Very slow vortex twist
    ref.current.rotation.z += (scrollTwist - ref.current.rotation.z) * 0.08;
    const targetRotX = scrollY.current * 0.0002;
    ref.current.rotation.x += (targetRotX - ref.current.rotation.x) * 0.08;

    ref.current.rotation.y += delta * 0.05;

    const geom = ref.current.geometry;
    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;

    // Calculate 3D mouse position on Z=0 plane
    const vector = new THREE.Vector3(mouse.current.x, mouse.current.y, 0.5);
    vector.unproject(state.camera);
    const dir = vector.sub(state.camera.position).normalize();
    const distance = -state.camera.position.z / dir.z;
    const mouse3D = state.camera.position.clone().add(dir.multiplyScalar(distance));

    // Convert mouse world pos to the local space of the rotating points object
    ref.current.worldToLocal(mouse3D);

    const radiusSq = 35.0; // Repulsion radius squared

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      const ox = originalPositions[ix];
      const oy = originalPositions[iy];
      const oz = originalPositions[iz];

      const cx = posArray[ix];
      const cy = posArray[iy];
      const cz = posArray[iz];

      // Distance to mouse pointer
      const dx = cx - mouse3D.x;
      const dy = cy - mouse3D.y;
      const dz = cz - mouse3D.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < radiusSq) {
        // Strong repulsion force pushing particles outwards from cursor
        const force = (radiusSq - distSq) / radiusSq;
        posArray[ix] += dx * force * 0.15;
        posArray[iy] += dy * force * 0.15;
        posArray[iz] += dz * force * 0.15;
      }

      // Smoothly spring back to original structural positions continuously
      posArray[ix] += (ox - posArray[ix]) * 0.08;
      posArray[iy] += (oy - posArray[iy]) * 0.08;
      posArray[iz] += (oz - posArray[iz]) * 0.08;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const ThreeBackground: React.FC = () => {
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', 
      zIndex: 0, 
      pointerEvents: 'none',
      background: 'radial-gradient(ellipse at center, #1b193f 0%, #0b0f19 100%)'
    }}>
      <Canvas camera={{ position: [0, 0, 12], fov: 60 }}>
        <fog attach="fog" args={['#0b0f19', 10, 25]} />
        <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
          <ParticleSwarm />
        </Float>
      </Canvas>
    </div>
  );
};

export default ThreeBackground;
