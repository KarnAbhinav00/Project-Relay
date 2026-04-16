"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const CREATURES = [
  { id: "tiger", pos: [1.1, -0.75, 0.2], color: "#f29b38", eye: "#101317" },
  { id: "lion", pos: [2.15, 0.15, -0.6], color: "#e6bb62", eye: "#101317" },
  { id: "sheep", pos: [3.05, -0.35, 0.35], color: "#f2f5fb", eye: "#101317" },
  { id: "giraffe", pos: [3.85, 0.65, -0.95], color: "#e7c36f", eye: "#101317" },
];

function Creature({ config, mouse, passwordFocused, peekId }) {
  const groupRef = useRef();
  const headRef = useRef();
  const leftPupilRef = useRef();
  const rightPupilRef = useRef();
  const eyeLeftRef = useRef();
  const eyeRightRef = useRef();

  const blinkSeed = useMemo(() => Math.random() * Math.PI * 2, []);
  const breatheSeed = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state, delta) => {
    if (!groupRef.current || !headRef.current) return;

    const t = state.clock.elapsedTime;
    const breathing = 1 + Math.sin(t * 1.6 + breatheSeed) * 0.03;
    const idleY = Math.sin(t * 0.95 + breatheSeed) * 0.07;

    groupRef.current.position.y = config.pos[1] + idleY;
    groupRef.current.scale.setScalar(breathing);

    const isTurningAway = passwordFocused && peekId !== config.id;
    const inverseYaw = THREE.MathUtils.clamp(-mouse.x * 0.95, -1.05, 1.05);
    const targetY = isTurningAway ? inverseYaw : mouse.x * 0.45;
    const targetX = isTurningAway ? 0.08 : -mouse.y * 0.25;

    headRef.current.rotation.y = THREE.MathUtils.damp(headRef.current.rotation.y, targetY, 5, delta);
    headRef.current.rotation.x = THREE.MathUtils.damp(headRef.current.rotation.x, targetX, 5, delta);

    const blinkOpen = 1 - Math.max(0, Math.sin(t * 2.4 + blinkSeed + Math.sin(t * 0.35) * 1.8)) * 0.92;
    const blinkScale = THREE.MathUtils.clamp(blinkOpen, 0.06, 1);

    if (eyeLeftRef.current && eyeRightRef.current) {
      eyeLeftRef.current.scale.y = blinkScale;
      eyeRightRef.current.scale.y = blinkScale;
    }

    const px = isTurningAway ? 0 : mouse.x * 0.03;
    const py = isTurningAway ? 0 : -mouse.y * 0.02;

    if (leftPupilRef.current && rightPupilRef.current) {
      leftPupilRef.current.position.x = -0.12 + px;
      rightPupilRef.current.position.x = 0.12 + px;
      leftPupilRef.current.position.y = 0.04 + py;
      rightPupilRef.current.position.y = 0.04 + py;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.35}>
      <group ref={groupRef} position={config.pos}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.52, 42, 42]} />
          <meshStandardMaterial color={config.color} roughness={0.4} metalness={0.2} />
        </mesh>
        {config.id === "lion" && (
          <mesh scale={[1.2, 1.2, 1.1]}>
            <sphereGeometry args={[0.42, 30, 30]} />
            <meshStandardMaterial color="#8a5f2c" roughness={0.55} metalness={0.1} />
          </mesh>
        )}
        {config.id === "sheep" && (
          <mesh position={[0, 0.08, 0]}>
            <sphereGeometry args={[0.62, 30, 30]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} metalness={0.02} />
          </mesh>
        )}
        {config.id === "giraffe" && (
          <mesh position={[0, 0.42, 0.02]} scale={[0.6, 1.35, 0.6]}>
            <sphereGeometry args={[0.28, 24, 24]} />
            <meshStandardMaterial color="#d9b260" roughness={0.45} metalness={0.08} />
          </mesh>
        )}

        <group ref={headRef} position={[0, 0.12, 0.33]}>
          <mesh castShadow>
            <sphereGeometry args={[0.31, 32, 32]} />
            <meshStandardMaterial color="#e7edf8" roughness={0.24} metalness={0.3} />
          </mesh>

          <group ref={eyeLeftRef} position={[-0.12, 0.04, 0.255]}>
            <mesh>
              <sphereGeometry args={[0.06, 24, 24]} />
              <meshStandardMaterial color={config.eye} roughness={0.2} />
            </mesh>
          </group>

          <group ref={eyeRightRef} position={[0.12, 0.04, 0.255]}>
            <mesh>
              <sphereGeometry args={[0.06, 24, 24]} />
              <meshStandardMaterial color={config.eye} roughness={0.2} />
            </mesh>
          </group>

          <mesh ref={leftPupilRef} position={[-0.12, 0.04, 0.31]}>
            <sphereGeometry args={[0.024, 18, 18]} />
            <meshStandardMaterial color="#101317" roughness={0.1} />
          </mesh>

          <mesh ref={rightPupilRef} position={[0.12, 0.04, 0.31]}>
            <sphereGeometry args={[0.024, 18, 18]} />
            <meshStandardMaterial color="#101317" roughness={0.1} />
          </mesh>

          <mesh position={[0, -0.11, 0.26]}>
            <torusGeometry args={[0.08, 0.012, 8, 24, Math.PI]} />
            <meshStandardMaterial color="#151a22" roughness={0.3} />
          </mesh>
          {config.id === "giraffe" && (
            <>
              <mesh position={[-0.08, 0.22, 0.03]}>
                <cylinderGeometry args={[0.02, 0.02, 0.12, 12]} />
                <meshStandardMaterial color="#6b4f2a" />
              </mesh>
              <mesh position={[0.08, 0.22, 0.03]}>
                <cylinderGeometry args={[0.02, 0.02, 0.12, 12]} />
                <meshStandardMaterial color="#6b4f2a" />
              </mesh>
            </>
          )}
        </group>
      </group>
    </Float>
  );
}

export default function CreatureScene({ mouse, passwordFocused, peekId }) {
  return (
    <div className="absolute inset-0">
      <Canvas shadows camera={{ position: [0, 0.4, 5.2], fov: 45 }} dpr={[1, 1.6]}>
        <color attach="background" args={["#232a33"]} />
        <fog attach="fog" args={["#232a33", 4.8, 12]} />

        <ambientLight intensity={0.62} color="#8db8ff" />
        <pointLight position={[-4, 3, 3]} intensity={45} color="#35d07f" />
        <pointLight position={[3.2, 2.4, 2.7]} intensity={42} color="#3299ff" />
        <spotLight
          castShadow
          position={[0, 5, 2.4]}
          angle={0.5}
          penumbra={0.6}
          intensity={32}
          color="#ffd447"
        />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.2, -1.65, 0]} receiveShadow>
          <circleGeometry args={[8, 80]} />
          <meshStandardMaterial color="#1d232b" roughness={0.82} metalness={0.18} />
        </mesh>

        {CREATURES.map((creature) => (
          <Creature
            key={creature.id}
            config={creature}
            mouse={mouse}
            passwordFocused={passwordFocused}
            peekId={peekId}
          />
        ))}
      </Canvas>
    </div>
  );
}
