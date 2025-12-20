// --- SIMPLE NOISE (CPU) ---
if (typeof SimpleNoise === 'undefined') {
    window.SimpleNoise = class {
        constructor(seed = Math.random()) {
            this.grad3 = [
                [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
                [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
                [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
            ];
            this.p = [];
            this.perm = [];
            for (let i = 0; i < 256; i++) { this.p[i] = Math.floor(this.seed(seed * i) * 256); }
            for (let i = 0; i < 512; i++) { this.perm[i] = this.p[i & 255]; }
        }
        seed(s) { let x = Math.sin(s) * 10000; return x - Math.floor(x); }
        dot(g, x, y, z) { return g[0] * x + g[1] * y + g[2] * z; }
        mix(a, b, t) { return (1 - t) * a + t * b; }
        fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
        noise(x, y, z) {
            let X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
            x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
            let u = this.fade(x), v = this.fade(y), w = this.fade(z);
            let A = this.perm[X] + Y, AA = this.perm[A] + Z, AB = this.perm[A + 1] + Z,
                B = this.perm[X + 1] + Y, BA = this.perm[B] + Z, BB = this.perm[B + 1] + Z;
            return this.mix(this.mix(this.mix(this.dot(this.grad3[this.perm[AA] % 12], x, y, z),
                this.dot(this.grad3[this.perm[BA] % 12], x - 1, y, z), u),
                this.mix(this.dot(this.grad3[this.perm[AB] % 12], x, y - 1, z),
                    this.dot(this.grad3[this.perm[BB] % 12], x - 1, y - 1, z), u), v),
                this.mix(this.mix(this.dot(this.grad3[this.perm[AA + 1] % 12], x, y, z - 1),
                    this.dot(this.grad3[this.perm[BA + 1] % 12], x - 1, y, z - 1), u),
                    this.mix(this.dot(this.grad3[this.perm[AB + 1] % 12], x, y - 1, z - 1),
                        this.dot(this.grad3[this.perm[BB + 1] % 12], x - 1, y - 1, z - 1), u), v), w);
        }
    };
}

class PlanetGenerator {
    constructor() {
        this.shaders = {
            standard: this.getStandardShader(),
            lava: this.getLavaShader(),
            ice: this.getIceShader()
        };
    }

    calculateHeight(x, y, z, seed) {
        // Ridged Multi-Fractal (Matches shader logic closely)
        if (!this.noiseGen || this.lastSeed !== seed) {
            this.noiseGen = new SimpleNoise(seed || 12345);
            this.lastSeed = seed;
        }

        let val = 0.0;
        let amp = 0.5;
        let freq = 1.0;

        for (let i = 0; i < 4; i++) {
            let nx = x * 4.0 * freq + (seed || 12345) * 7.1;
            let ny = y * 4.0 * freq + (seed || 12345) * 7.1;
            let nz = z * 4.0 * freq + (seed || 12345) * 7.1;

            let n = this.noiseGen.noise(nx, ny, nz);
            n = 1.0 - Math.abs(n);
            n = n * n;
            val += n * amp;
            freq *= 2.0;
            amp *= 0.5;
        }

        // Displacement Logic
        const seaLevel = 0.35;
        let disp = -0.3;
        if (val > seaLevel) {
            disp = (val - seaLevel) * 12.0;
        }
        return disp;
    }

    // --- HYPER-REAL TERRAIN SHADER (Revised Stable) ---
    getStandardShader() {
        // STABLE NOISE FUNCTIONS (relying on CPU displacement now mostly)
        const noiseCommon = `
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
            vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
            vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }
            float cnoise(vec3 P) {
                vec3 Pi0 = floor(P); vec3 Pi1 = Pi0 + vec3(1.0);
                Pi0 = mod289(Pi0); Pi1 = mod289(Pi1);
                vec3 Pf0 = fract(P); vec3 Pf1 = Pf0 - vec3(1.0);
                vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x); vec4 iy = vec4(Pi0.y, Pi0.y, Pi1.y, Pi1.y);
                vec4 iz0 = Pi0.zzzz; vec4 iz1 = Pi1.zzzz;
                vec4 ixy = permute(permute(ix) + iy);
                vec4 ixy0 = permute(ixy + iz0); vec4 ixy1 = permute(ixy + iz1);
                vec4 gx0 = ixy0 * (1.0 / 7.0); vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
                gx0 = fract(gx0); vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
                vec4 sz0 = step(gz0, vec4(0.0));
                gx0 -= sz0 * (step(0.0, gx0) - 0.5); gy0 -= sz0 * (step(0.0, gy0) - 0.5);
                vec4 gx1 = ixy1 * (1.0 / 7.0); vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
                gx1 = fract(gx1); vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
                vec4 sz1 = step(gz1, vec4(0.0));
                gx1 -= sz1 * (step(0.0, gx1) - 0.5); gy1 -= sz1 * (step(0.0, gy1) - 0.5);
                vec3 g000 = vec3(gx0.x,gy0.x,gz0.x); vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
                vec3 g010 = vec3(gx0.z,gy0.z,gz0.z); vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
                vec3 g001 = vec3(gx1.x,gy1.x,gz1.x); vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
                vec3 g011 = vec3(gx1.z,gy1.z,gz1.z); vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
                vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
                g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
                vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
                g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
                vec3 fade_xyz = fade(Pf0);
                // Optimized manual interpolation
                float n000 = dot(g000, Pf0); float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
                float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z)); float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
                float n001 = dot(g001, vec3(Pf0.xy, Pf1.z)); float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
                float n011 = dot(g011, vec3(Pf0.x, Pf1.yz)); float n111 = dot(g111, Pf1);
                vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
                vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
                float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
                return 2.2 * n_xyz;
            }
        `;

        return {
            vShader: `
                // --- VERTEX SHADER ---
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec3 vViewPosition;
                varying vec2 vUv;
                varying float vHeight; 
                
                uniform float seed;
                
                ${noiseCommon}

                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal); 
                    vPosition = position; // Already displaced on CPU
                    
                    // Height is implicit in radius
                    float dist = length(position);
                    vHeight = dist - 50.0;

                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vViewPosition = -mvPosition.xyz;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fShader: `
                // --- FRAGMENT SHADER ---
                uniform float seed;
                uniform vec3 colorWater;
                uniform vec3 colorSand;
                uniform vec3 colorGrass;
                uniform vec3 colorRock;
                uniform vec3 colorSnow;
                uniform vec3 sunDirection;
                
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec3 vViewPosition;
                varying float vHeight; 
                
                ${noiseCommon}

                void main() {
                    vec3 posNorm = normalize(vPosition);
                    vec3 viewDir = normalize(vViewPosition);
                    
                    float dist = length(vPosition);
                    float h = dist - 50.0; // Displacement (-0.3 to 12.0)

                    vec3 albedo;
                    float roughness = 1.0;
                    float specularFactor = 0.0;
                    
                    if (h <= 0.0) { // Ocean
                        float depth = (0.0 - h) * 3.0; // Assume h goes down to -0.3
                        vec3 deep = vec3(0.01, 0.02, 0.1); 
                        vec3 shallow = vec3(0.0, 0.1, 0.3); // Darker cyan
                        albedo = mix(shallow, deep, clamp(depth, 0.0, 1.0));
                        roughness = 0.05; 
                        specularFactor = 1.8; 
                    } 
                    else if (h < 0.5) { // Sand
                        albedo = colorSand * 0.6; roughness = 0.8;
                    } 
                    else if (h < 4.0) { // Grass
                        float scale = 4.0;
                        vec3 coord = posNorm * scale + vec3(seed * 7.1);
                        float n = cnoise(coord * 20.0);
                        albedo = mix(colorGrass * 0.4, vec3(0.05, 0.15, 0.05), n * 0.5 + 0.5);
                        roughness = 0.9;
                    } 
                    else if (h < 7.0) { // Rock
                        float scale = 4.0;
                        vec3 coord = posNorm * scale + vec3(seed * 7.1);
                        float strata = abs(cnoise(coord * vec3(1.0, 30.0, 1.0)));
                        albedo = mix(vec3(0.15), vec3(0.05), strata); 
                        roughness = 1.0;
                    } 
                    else { // Snow
                        albedo = colorSnow;
                        specularFactor = 0.5; 
                    }

                    // Lighting
                    vec3 N = normalize(vNormal);
                    vec3 L = normalize(vec3(1,1,1));
                    if (length(sunDirection) > 0.1) L = normalize(sunDirection);
                    
                    float NdotL = max(dot(N, L), 0.0);
                    
                    vec3 H = normalize(L + viewDir);
                    float NdotH = max(dot(N, H), 0.0);
                    float spec = pow(NdotH, 64.0) * specularFactor;

                    // Rim
                    float fresnel = pow(1.0 - max(dot(viewDir, N), 0.0), 3.0);
                    vec3 rimColor = vec3(0.2, 0.5, 1.0) * fresnel * 0.3;

                    vec3 ambient = vec3(0.002) * albedo; 
                    vec3 diffuse = albedo * NdotL;
                    
                    vec3 finalColor = ambient + diffuse + vec3(spec) + rimColor;

                    // Tone map
                    finalColor = finalColor / (finalColor + vec3(1.0));
                    finalColor = pow(finalColor, vec3(1.0/2.2));

                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `
        };
    }

    getLavaShader() {
        return {
            vShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fShader: `
                uniform float seed;
                uniform float time;
                varying vec3 vNormal;
                varying vec3 vPosition;
                void main() {
                    // Minimal fallback
                    gl_FragColor = vec4(0.8, 0.2, 0.0, 1.0);
                }
            `
        };
    }

    getIceShader() {
        return {
            vShader: `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fShader: `void main() { gl_FragColor = vec4(0.8, 0.9, 1.0, 1.0); }`
        };
    }

    getGasShader() {
        return {
            vShader: `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fShader: `void main() { gl_FragColor = vec4(0.8, 0.6, 0.4, 1.0); }`
        };
    }

    createPlanet(seed, type = 'planet') {
        const rng = (s) => {
            let x = Math.sin(s++) * 10000;
            return x - Math.floor(x);
        };
        const r = rng(seed);

        let shaderData;
        let uniforms = {
            seed: { value: seed },
            time: { value: 0 },
            sunDirection: { value: new THREE.Vector3(1, 0.5, 1) }
        };

        if (type === 'lava' || type === 'volcanic') {
            shaderData = this.shaders.lava;
        } else if (type === 'ice' || type === 'frozen') {
            shaderData = this.shaders.ice;
        } else if (type === 'gas' || type === 'giant') {
            shaderData = this.shaders.gas;
            uniforms.color1 = { value: new THREE.Color().setHSL(r, 0.6, 0.4) };
            uniforms.color2 = { value: new THREE.Color().setHSL((r + 0.3) % 1, 0.5, 0.6) };
            uniforms.color3 = { value: new THREE.Color().setHSL((r + 0.6) % 1, 0.4, 0.3) };
        } else if (type === 'moon') {
            shaderData = this.shaders.standard;
            uniforms.colorWater = { value: new THREE.Color(0x333333) };
            uniforms.colorSand = { value: new THREE.Color(0x555555) };
            uniforms.colorGrass = { value: new THREE.Color(0x777777) };
            uniforms.colorRock = { value: new THREE.Color(0x999999) };
            uniforms.colorSnow = { value: new THREE.Color(0xcccccc) };
        } else {
            shaderData = this.shaders.standard;
            uniforms.colorWater = { value: new THREE.Color(0x0055ff).multiplyScalar(0.5 + r * 0.5) };
            uniforms.colorSand = { value: new THREE.Color(0xd2b48c) };
            uniforms.colorGrass = { value: new THREE.Color(0x228b22).multiplyScalar(0.8 + rng(seed + 1) * 0.4) };
            uniforms.colorRock = { value: new THREE.Color(0x555555) };
            uniforms.colorSnow = { value: new THREE.Color(0xffffff) };
        }

        // Planet Mesh - Higher resolution for displacement
        const geometry = new THREE.SphereGeometry(50, 256, 256);

        // --- CPU DISPLACEMENT ---
        if (type === 'planet' || type === 'moon') {
            const posAttr = geometry.attributes.position;
            const count = posAttr.count;
            for (let i = 0; i < count; i++) {
                const x = posAttr.getX(i);
                const y = posAttr.getY(i);
                const z = posAttr.getZ(i);

                // Normalized Coords
                const nx = x / 50; const ny = y / 50; const nz = z / 50;

                const disp = this.calculateHeight(nx, ny, nz, seed);

                // Displace
                posAttr.setX(i, x + nx * disp);
                posAttr.setY(i, y + ny * disp);
                posAttr.setZ(i, z + nz * disp);
            }
            geometry.computeVertexNormals();
        }

        const material = new THREE.ShaderMaterial({
            vertexShader: shaderData.vShader,
            fragmentShader: shaderData.fShader,
            uniforms: uniforms
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { isPlanet: true, uniforms: uniforms };

        return mesh;
    }
}
window.PlanetGenerator = PlanetGenerator;

// Expose helper globally for game logic
window.getTerrainHeight = (x, y, z, seed) => {
    const noise = new SimpleNoise(seed || 12345);

    // REPLICATE calculateHeight logic matches class method:
    let amp = 0.5;
    let freq = 1.0;
    let val = 0.0;

    for (let i = 0; i < 4; i++) {
        let nx = x * 4.0 * freq + (seed || 12345) * 7.1;
        let ny = y * 4.0 * freq + (seed || 12345) * 7.1;
        let nz = z * 4.0 * freq + (seed || 12345) * 7.1;

        let n = noise.noise(nx, ny, nz);
        n = 1.0 - Math.abs(n);
        n = n * n;
        val += n * amp;
        freq *= 2.0;
        amp *= 0.5;
    }

    const seaLevel = 0.35;
    let disp = -0.3;
    if (val > seaLevel) {
        disp = (val - seaLevel) * 12.0;
    }
    return disp;
};
