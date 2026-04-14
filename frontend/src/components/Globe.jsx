import { useRef, useState, useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture, OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

const RADIUS = 2.2

export const COUNTRIES = [
  { id: "italy",    name: "Italien",  flag: "🇮🇹", lat: 42.5,  lng: 12.5,   color: "#FF4D4D" },
  { id: "france",   name: "Frankrig", flag: "🇫🇷", lat: 46.6,  lng: 2.2,    color: "#5B9BD5" },
  { id: "denmark",  name: "Danmark",  flag: "🇩🇰", lat: 55.7,  lng: 9.5,    color: "#FF6B6B" },
  { id: "japan",    name: "Japan",    flag: "🇯🇵", lat: 36.2,  lng: 138.2,  color: "#FF4D6A" },
  { id: "mexico",   name: "Mexico",   flag: "🇲🇽", lat: 23.6,  lng: -102.5, color: "#4DCB8A" },
  { id: "india",    name: "Indien",   flag: "🇮🇳", lat: 20.6,  lng: 79.0,   color: "#FFB347" },
  { id: "morocco",  name: "Marokko",  flag: "🇲🇦", lat: 31.8,  lng: -7.1,   color: "#E85D5D" },
  { id: "thailand", name: "Thailand", flag: "🇹🇭", lat: 15.9,  lng: 100.9,  color: "#47A0FF" },
]

function latLngToVector3(lat, lng, radius) {
  const phi   = (90 - lat)  * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius  * Math.cos(phi),
    radius  * Math.sin(phi) * Math.sin(theta)
  )
}

function Stars() {
  const positions = useMemo(() => {
    const count = 2200
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r     = 80 + Math.random() * 140
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.cos(phi)
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    return arr
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.16} color="#b8d4ff" transparent opacity={0.7} sizeAttenuation />
    </points>
  )
}

function Atmosphere() {
  return (
    <>
      <mesh scale={[1.065, 1.065, 1.065]}>
        <sphereGeometry args={[RADIUS, 64, 64]} />
        <meshBasicMaterial color="#1a5fd4" transparent opacity={0.10} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh scale={[1.115, 1.115, 1.115]}>
        <sphereGeometry args={[RADIUS, 32, 32]} />
        <meshBasicMaterial color="#0d3a8a" transparent opacity={0.05} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </>
  )
}

function CountryMarker({ country, onClick }) {
  const groupRef  = useRef()
  const pulseRef  = useRef()
  const dotRef    = useRef()
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(true)
  const visibleRef = useRef(true)
  const clickTime  = useRef(0)

  const pos = useMemo(
    () => latLngToVector3(country.lat, country.lng, RADIUS + 0.02),
    [country.lat, country.lng]
  )

  // Quaternion that orients the flat XY geometries to face outward from the sphere
  const quat = useMemo(() => {
    const normal = pos.clone().normalize()
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal
    )
  }, [pos])

  const color = useMemo(() => new THREE.Color(country.color), [country.color])

  // Pre-allocate vectors to avoid GC pressure in the render loop
  const tempVec = useMemo(() => new THREE.Vector3(), [])
  const camDirVec = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime()

    // Hide label + fade marker when on the far side of the globe
    if (groupRef.current) {
      groupRef.current.getWorldPosition(tempVec)
      camDirVec.copy(camera.position).normalize()
      tempVec.normalize()
      const isVisible = camDirVec.dot(tempVec) > 0.05
      if (visibleRef.current !== isVisible) {
        visibleRef.current = isVisible
        setVisible(isVisible)
      }
    }

    // Pulse ring animation
    if (pulseRef.current) {
      const s = 1 + 0.85 * Math.abs(Math.sin(t * 1.4))
      pulseRef.current.scale.setScalar(s)
      pulseRef.current.material.opacity = 0.5 * (1 - Math.abs(Math.sin(t * 1.4)))
    }

    // Dot breathing + click pop
    if (dotRef.current) {
      const elapsed = Date.now() - clickTime.current
      let scale = 1 + 0.12 * Math.sin(t * 2.5)
      if (hovered) scale *= 1.5
      if (elapsed < 300) scale *= 1 + 0.8 * (1 - elapsed / 300)
      dotRef.current.scale.setScalar(scale)
    }
  })

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    clickTime.current = Date.now()
    onClick(country)
  }, [country, onClick])

  const handlePointerOver = useCallback((e) => {
    e.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }, [])

  const handlePointerOut = useCallback((e) => {
    e.stopPropagation()
    setHovered(false)
    document.body.style.cursor = 'auto'
  }, [])

  return (
    <group
      ref={groupRef}
      position={pos}
      quaternion={quat}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Invisible larger hit area for easier clicking */}
      <mesh>
        <circleGeometry args={[0.09, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Outer pulse ring */}
      <mesh ref={pulseRef}>
        <ringGeometry args={[0.05, 0.072, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Static ring */}
      <mesh>
        <ringGeometry args={[0.032, 0.048, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered ? 0.95 : 0.65}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Center dot */}
      <mesh ref={dotRef}>
        <circleGeometry args={[0.022, 16]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>

      {/* Country name label — only visible on camera-facing hemisphere */}
      {visible && (
        <Html
          position={[0, 0, 0.04]}
          center
          style={{ pointerEvents: 'none', whiteSpace: 'nowrap', userSelect: 'none' }}
        >
          <div className="globe-label" style={{ borderColor: `${country.color}33` }}>
            <span className="globe-label-flag">{country.flag}</span>
            {country.name}
          </div>
        </Html>
      )}
    </group>
  )
}

export default function Globe({ onCountryClick }) {
  const rotGroupRef = useRef()
  const [autoRotate, setAutoRotate] = useState(true)

  const colorMap = useTexture('/textures/world.200407.3x5400x2700.jpg')

  useFrame((_, delta) => {
    if (autoRotate && rotGroupRef.current) {
      rotGroupRef.current.rotation.y += delta * 0.07
    }
  })

  const handleStart = useCallback(() => setAutoRotate(false), [])

  return (
    <>
      <ambientLight intensity={2.2} />

      <Stars />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        rotateSpeed={1.2}
        enableDamping
        dampingFactor={0.12}
        onStart={handleStart}
        makeDefault
      />

      <group ref={rotGroupRef}>
        <mesh>
          <sphereGeometry args={[RADIUS, 128, 128]} />
          <meshStandardMaterial
            map={colorMap}
            roughness={0.78}
            metalness={0.02}
          />
        </mesh>

        {COUNTRIES.map(c => (
          <CountryMarker key={c.id} country={c} onClick={onCountryClick} />
        ))}
      </group>

      <Atmosphere />
    </>
  )
}
