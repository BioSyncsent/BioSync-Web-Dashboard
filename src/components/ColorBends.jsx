import { useEffect, useRef } from "react";
import * as THREE from "three";
import "./ColorBends.css";

const vertexShader = `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uWarp;
uniform float uBandWidth;
uniform float uScale;
uniform float uParallax;
uniform vec2 uMouse;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(1.72, 1.18, -1.18, 1.72);

  for (int i = 0; i < 4; i++) {
    value += noise2(p) * amp;
    p = rot * p + vec2(13.17, 7.91);
    amp *= 0.48;
  }

  return value;
}

float turbulence(vec2 p) {
  float value = 0.0;
  float amp = 0.5;

  for (int i = 0; i < 4; i++) {
    float n = noise2(p);
    value += abs(n * 2.0 - 1.0) * amp;
    p = p * 2.12 + vec2(8.7, 17.3);
    amp *= 0.49;
  }

  return value;
}

float ridged(vec2 p) {
  float n = fbm(p);
  return 1.0 - abs(n * 2.0 - 1.0);
}

float topCurve(float x, float t) {
  float curve = 0.345
    + 0.105 * sin(x * 1.62 + t * 0.16)
    + 0.048 * sin(x * 3.55 - t * 0.11 + 0.7);

  curve -= 0.095 * exp(-pow((x + 0.02) * 1.45, 2.0));
  curve += 0.22 * smoothstep(0.18, 1.05, x);
  return curve;
}

float bottomCurve(float x, float t) {
  float curve = -0.405
    + 0.082 * sin(x * 1.72 - t * 0.14 + 1.8)
    + 0.038 * sin(x * 3.8 + t * 0.10);

  curve -= 0.045 * exp(-pow((x + 0.12) * 1.3, 2.0));
  curve += 0.145 * smoothstep(0.05, 1.05, x);
  return curve;
}

float filamentLayer(
  vec2 p,
  float distanceToFlow,
  float width,
  float t,
  float seed,
  float direction,
  float density
) {
  float nd = distanceToFlow / max(width, 0.001);
  vec2 q = vec2(p.x * 2.5 + seed, nd * 1.8);

  float warp1 = fbm(
    q + vec2(direction * t * 0.08, -t * 0.035)
  );

  float warp2 = turbulence(
    q * 1.7 + vec2(seed * 3.1, direction * t * 0.055)
  );

  float warpedDistance = nd
    + (warp1 - 0.5) * 0.72
    + (warp2 - 0.45) * 0.22;

  float coordinate = warpedDistance * density
    + p.x * 8.0
    - direction * t * 0.72
    + seed * 9.0;

  float filament = pow(1.0 - abs(sin(coordinate)), 12.0);

  float breakup = fbm(vec2(
    p.x * 7.5 - direction * t * 0.13 + seed * 4.0,
    warpedDistance * 4.5 + seed
  ));

  filament *= smoothstep(0.28, 0.74, breakup);

  float envelope = 1.0 - smoothstep(
    0.28, 1.28, abs(warpedDistance)
  );

  return filament * envelope;
}

float volumeField(
  vec2 p,
  float distanceToFlow,
  float width,
  float t,
  float seed,
  float direction
) {
  float nd = distanceToFlow / max(width, 0.001);

  float warp = fbm(vec2(
    p.x * 2.15 - direction * t * 0.055 + seed,
    p.y * 3.4 + direction * t * 0.025
  ));

  nd += (warp - 0.5) * 0.64;

  float envelope = 1.0 - smoothstep(0.18, 1.34, abs(nd));

  float material = fbm(vec2(
    p.x * 4.1 - direction * t * 0.15 + seed * 5.0,
    nd * 5.0 + t * 0.035
  ));

  float ridge = ridged(vec2(
    p.x * 5.8 - direction * t * 0.21,
    nd * 7.0 + seed * 3.0
  ));

  material = smoothstep(0.23, 0.79, material);
  return envelope * mix(material, ridge, 0.32);
}

float featherField(
  vec2 p,
  float distanceToFlow,
  float width,
  float t,
  float seed,
  float direction
) {
  float nd = abs(distanceToFlow) / max(width, 0.001);
  float outer = 1.0 - smoothstep(0.55, 2.15, nd);

  float n = turbulence(vec2(
    p.x * 7.5 - direction * t * 0.18 + seed,
    p.y * 10.0 + direction * t * 0.055
  ));

  float r = ridged(vec2(
    p.x * 12.0 - direction * t * 0.24,
    p.y * 17.0 + seed
  ));

  return outer * smoothstep(0.42, 0.76, n * 0.65 + r * 0.55);
}

float foldField(
  vec2 p,
  float distanceToFlow,
  float width,
  float t,
  float seed,
  float direction
) {
  float nd = distanceToFlow / max(width, 0.001);

  float distortion = fbm(vec2(
    p.x * 4.3 - direction * t * 0.14 + seed,
    nd * 3.8
  ));

  float foldPosition = -0.18 + (distortion - 0.5) * 0.34;
  float d = abs(nd - foldPosition);
  float fold = 1.0 - smoothstep(0.025, 0.12, d);

  float breakup = fbm(vec2(
    p.x * 8.0 - direction * t * 0.23,
    seed * 4.0 + p.y * 2.0
  ));

  fold *= smoothstep(0.24, 0.67, breakup);
  return fold;
}

float particleLayer(
  vec2 uv,
  float scale,
  float threshold,
  vec2 drift
) {
  vec2 g = uv * scale + drift;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float rnd = hash21(id);

  vec2 offset = vec2(
    hash21(id + 4.73),
    hash21(id + 8.19)
  ) - 0.5;

  float d = length(f - offset * 0.65);
  float dotParticle = 1.0 - smoothstep(0.015, 0.065, d);
  return dotParticle * step(threshold, rnd);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p = uv - 0.5;

  float aspect = uResolution.x / max(uResolution.y, 1.0);
  p.x *= aspect;
  p /= max(uScale, 0.001);
  p += uMouse * uParallax * 0.012;

  float t = uTime * max(uSpeed, 0.03) * 2.7;

  float topPath = topCurve(p.x, t);
  float bottomPath = bottomCurve(p.x, t);

  float topWarp = (
    fbm(vec2(
      p.x * 1.25 - t * 0.045,
      p.y * 1.6 + t * 0.018
    )) - 0.5
  ) * 0.13 * uWarp;

  float bottomWarp = (
    fbm(vec2(
      p.x * 1.28 + t * 0.043 + 11.0,
      p.y * 1.65 - t * 0.02
    )) - 0.5
  ) * 0.135 * uWarp;

  float topDistance = p.y - topPath - topWarp;
  float bottomDistance = p.y - bottomPath - bottomWarp;

  float widthScale = clamp(uBandWidth / 8.0, 0.75, 1.45);
  float topWidth = 0.205 * widthScale;
  float bottomWidth = 0.225 * widthScale;

  topWidth *= 0.82 + 0.32 * fbm(vec2(
    p.x * 1.6 - t * 0.035, 5.2
  ));

  bottomWidth *= 0.84 + 0.31 * fbm(vec2(
    p.x * 1.5 + t * 0.032, 12.7
  ));

  float topVolume1 = volumeField(
    p, topDistance, topWidth, t, 1.7, 1.0
  );
  float topVolume2 = volumeField(
    p, topDistance + topWidth * 0.31,
    topWidth * 0.88, t, 6.4, 0.72
  );
  float topVolume3 = volumeField(
    p, topDistance - topWidth * 0.38,
    topWidth * 0.72, t, 12.8, 1.25
  );

  float topFibres1 = filamentLayer(
    p, topDistance, topWidth, t, 2.1, 1.0, 44.0
  );
  float topFibres2 = filamentLayer(
    p, topDistance + topWidth * 0.22,
    topWidth * 0.93, t, 7.8, 0.73, 58.0
  );
  float topFibres3 = filamentLayer(
    p, topDistance - topWidth * 0.34,
    topWidth * 0.76, t, 14.2, 1.3, 71.0
  );

  float topFeather = featherField(
    p, topDistance, topWidth, t, 3.7, 1.0
  );
  float topFold1 = foldField(
    p, topDistance, topWidth, t, 2.0, 1.0
  );
  float topFold2 = foldField(
    p, topDistance + topWidth * 0.37,
    topWidth * 0.8, t, 9.0, 0.75
  );

  float bottomVolume1 = volumeField(
    p, bottomDistance, bottomWidth, t, 17.0, -1.0
  );
  float bottomVolume2 = volumeField(
    p, bottomDistance + bottomWidth * 0.30,
    bottomWidth * 0.88, t, 23.0, -0.72
  );
  float bottomVolume3 = volumeField(
    p, bottomDistance - bottomWidth * 0.36,
    bottomWidth * 0.73, t, 31.0, -1.28
  );

  float bottomFibres1 = filamentLayer(
    p, bottomDistance, bottomWidth, t, 18.0, -1.0, 45.0
  );
  float bottomFibres2 = filamentLayer(
    p, bottomDistance + bottomWidth * 0.23,
    bottomWidth * 0.94, t, 24.0, -0.76, 59.0
  );
  float bottomFibres3 = filamentLayer(
    p, bottomDistance - bottomWidth * 0.35,
    bottomWidth * 0.76, t, 32.0, -1.32, 73.0
  );

  float bottomFeather = featherField(
    p, bottomDistance, bottomWidth, t, 21.0, -1.0
  );
  float bottomFold1 = foldField(
    p, bottomDistance, bottomWidth, t, 19.0, -1.0
  );
  float bottomFold2 = foldField(
    p, bottomDistance + bottomWidth * 0.35,
    bottomWidth * 0.82, t, 27.0, -0.76
  );

  vec3 navy = vec3(0.0015, 0.004, 0.012);
  vec3 deepBlueTeal = vec3(0.006, 0.18, 0.24);
  vec3 deepTeal = vec3(0.008, 0.32, 0.38);
  vec3 teal = vec3(0.015, 0.52, 0.58);
  vec3 turquoise = vec3(0.02, 0.73, 0.78);
  vec3 electricCyan = vec3(0.08, 0.91, 0.94);
  vec3 aqua = vec3(0.46, 0.98, 0.98);

  vec3 color = navy;

  float topAmbient = 1.0 - smoothstep(
    topWidth * 0.75, topWidth * 2.65, abs(topDistance)
  );
  float bottomAmbient = 1.0 - smoothstep(
    bottomWidth * 0.75, bottomWidth * 2.65, abs(bottomDistance)
  );

  color += deepBlueTeal * topAmbient * 0.10 * uIntensity;
  color += deepBlueTeal * bottomAmbient * 0.105 * uIntensity;

  color += mix(deepTeal, turquoise, topVolume1)
    * topVolume1 * 0.47 * uIntensity;
  color += teal * topVolume2 * 0.25 * uIntensity;
  color += deepTeal * topVolume3 * 0.18 * uIntensity;

  color += mix(deepTeal, turquoise, bottomVolume1)
    * bottomVolume1 * 0.49 * uIntensity;
  color += teal * bottomVolume2 * 0.26 * uIntensity;
  color += deepTeal * bottomVolume3 * 0.19 * uIntensity;

  color += turquoise * topFibres1 * 0.38 * uIntensity;
  color += electricCyan * topFibres2 * 0.29 * uIntensity;
  color += aqua * topFibres3 * 0.18 * uIntensity;

  color += turquoise * bottomFibres1 * 0.40 * uIntensity;
  color += electricCyan * bottomFibres2 * 0.30 * uIntensity;
  color += aqua * bottomFibres3 * 0.18 * uIntensity;

  color += teal * topFeather * 0.22 * uIntensity;
  color += turquoise * topFeather * topFibres1 * 0.24 * uIntensity;
  color += teal * bottomFeather * 0.23 * uIntensity;
  color += turquoise * bottomFeather * bottomFibres1 * 0.25 * uIntensity;

  color += electricCyan * topFold1 * 0.58 * uIntensity;
  color += aqua * topFold1 * topFibres2 * 0.34 * uIntensity;
  color += turquoise * topFold2 * 0.33 * uIntensity;

  color += electricCyan * bottomFold1 * 0.61 * uIntensity;
  color += aqua * bottomFold1 * bottomFibres2 * 0.35 * uIntensity;
  color += turquoise * bottomFold2 * 0.34 * uIntensity;

  float nearTop = 1.0 - smoothstep(
    topWidth * 0.7, topWidth * 2.35, abs(topDistance)
  );
  float nearBottom = 1.0 - smoothstep(
    bottomWidth * 0.7, bottomWidth * 2.35, abs(bottomDistance)
  );

  float particlesA = particleLayer(
    uv, 185.0, 0.991, vec2(-t * 0.014, t * 0.003)
  );
  float particlesB = particleLayer(
    uv, 310.0, 0.996, vec2(t * 0.009, -t * 0.002)
  );

  float particleMask = max(nearTop, nearBottom);
  particleMask *= smoothstep(
    0.28, 0.72, fbm(uv * 6.0 + vec2(t * 0.03, 0.0))
  );

  color += electricCyan * particlesA * particleMask * 0.56;
  color += aqua * particlesB * particleMask * 0.36;

  vec2 heroSpace = vec2(p.x + 0.05, p.y + 0.015);
  float centerDark = 1.0 - smoothstep(
    0.18, 0.70, length(heroSpace * vec2(0.69, 1.32))
  );
  color = mix(color, navy, centerDark * 0.23);

  vec2 edgeUv = abs(uv - 0.5) * 2.0;
  float vignette = smoothstep(
    0.72, 1.30, length(edgeUv * vec2(0.78, 0.95))
  );
  color = mix(color, navy * 0.65, vignette * 0.28);

  color *= 1.20;
  color = color / (vec3(0.76) + color);
 // Darken the teal haze while preserving bright aurora details.
color = pow(color, vec3(1.65));
color = max(color - vec3(0.008, 0.025, 0.03), vec3(0.0));

  float brightness = dot(color, vec3(0.2126, 0.7152, 0.0722));
  vec3 cyanBias = color * vec3(0.86, 1.08, 1.11);
  color = mix(
    color,
    cyanBias,
    smoothstep(0.12, 0.72, brightness) * 0.42
  );
// Deep space navy.
vec3 spaceNavy = vec3(0.004, 0.008, 0.025);

// Preserve bright cyan aurora; replace dim haze with navy.
float auroraBrightness = max(color.r, max(color.g, color.b));
float auroraMask = smoothstep(0.08, 0.48, auroraBrightness);

vec3 finalColor = mix(spaceNavy, color, auroraMask);

gl_FragColor = vec4(finalColor, 1.0);
}
`;

export default function ColorBends({
  speed = 0.2,
  transparent = false,
  scale = 1,
  warpStrength = 1,
  mouseInfluence = 0.5,
  parallax = 0.4,
  intensity = 1.6,
  bandWidth = 8,
}) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: transparent,
        antialias: false,
        powerPreference: "low-power",
      });
    } catch {
      // CSS provides a static background when WebGL is unavailable.
      return;
    }

    const motion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const target = new THREE.Vector2();
    const buffer = new THREE.Vector2();

    const uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uIntensity: { value: intensity },
      uWarp: { value: warpStrength },
      uBandWidth: { value: bandWidth },
      uScale: { value: scale },
      uParallax: { value: parallax },
      uMouse: { value: new THREE.Vector2() },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });

    scene.add(new THREE.Mesh(geometry, material));

    renderer.setClearColor(0x020610, 1);
    renderer.domElement.className = "color-bends-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    let frame = 0;
    let elapsed = 0;
    let previous = 0;
    let lastPaint = 0;
    let disposed = false;

    function paint() {
      renderer.render(scene, camera);
    }

    function resize() {
      const { width, height } = mount.getBoundingClientRect();

      const density = Math.min(
        window.devicePixelRatio || 1,
        1.25,
        Math.sqrt(1100000 / Math.max(1, width * height))
      );

      renderer.setPixelRatio(density);
      renderer.setSize(
        Math.max(1, width),
        Math.max(1, height),
        false
      );
      renderer.getDrawingBufferSize(buffer);
      uniforms.uResolution.value.copy(buffer);
      paint();
    }

    function tick(now) {
      if (disposed) return;

      if (previous) {
        elapsed += Math.min((now - previous) / 1000, 0.1);
      }

      previous = now;

      if (now - lastPaint >= 1000 / 30) {
        uniforms.uTime.value = elapsed;
        uniforms.uMouse.value.lerp(target, 0.06);
        paint();
        lastPaint = now;
      }

      frame = requestAnimationFrame(tick);
    }

    function syncAnimation() {
      cancelAnimationFrame(frame);
      previous = 0;

      if (!document.hidden && !motion.matches) {
        frame = requestAnimationFrame(tick);
      } else {
        target.set(0, 0);
        uniforms.uMouse.value.set(0, 0);
        paint();
      }
    }

    function pointer(event) {
      if (motion.matches) return;

      target.set(
        (event.clientX / window.innerWidth * 2 - 1) *
          mouseInfluence,
        (1 - event.clientY / window.innerHeight * 2) *
          mouseInfluence
      );
    }

    function leave() {
      target.set(0, 0);
    }

    function lost(event) {
      event.preventDefault();
      cancelAnimationFrame(frame);
    }

    function restored() {
      resize();
      syncAnimation();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    window.addEventListener("pointermove", pointer, {
      passive: true,
    });
    document.addEventListener("mouseleave", leave);
    document.addEventListener("visibilitychange", syncAnimation);
    motion.addEventListener("change", syncAnimation);
    renderer.domElement.addEventListener("webglcontextlost", lost);
    renderer.domElement.addEventListener(
      "webglcontextrestored",
      restored
    );

    resize();
    syncAnimation();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();

      window.removeEventListener("pointermove", pointer);
      document.removeEventListener("mouseleave", leave);
      document.removeEventListener(
        "visibilitychange",
        syncAnimation
      );
      motion.removeEventListener("change", syncAnimation);
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        lost
      );
      renderer.domElement.removeEventListener(
        "webglcontextrestored",
        restored
      );

      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [
    speed,
    transparent,
    scale,
    warpStrength,
    mouseInfluence,
    parallax,
    intensity,
    bandWidth,
  ]);

  return (
    <div
      ref={mountRef}
      className="color-bends"
      aria-hidden="true"
    />
  );
}