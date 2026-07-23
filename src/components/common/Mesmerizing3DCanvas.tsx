import React, { useEffect, useRef } from 'react';

interface Mesmerizing3DCanvasProps {
  density?: number;
  interactive?: boolean;
  colorTheme?: 'dark' | 'neon' | 'cyan';
  className?: string;
  style?: React.CSSProperties;
}

export const Mesmerizing3DCanvas: React.FC<Mesmerizing3DCanvasProps> = ({
  density = 60,
  interactive = true,
  colorTheme = 'neon',
  className = '',
  style = {}
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    // Mouse coordinates
    let mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      active: false
    };

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement.clientHeight || window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // 3D Particles
    const numParticles = density;
    const particles: Array<{
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      radius: number;
      color: string;
      baseAlpha: number;
    }> = [];

    const colors = colorTheme === 'dark'
      ? ['#38BDF8', '#818CF8', '#0EA5E9', '#93C5FD']
      : colorTheme === 'cyan'
      ? ['#00F2FE', '#4FACFE', '#00D2FF', '#38BDF8']
      : ['#F59E0B', '#38BDF8', '#A855F7', '#34D399', '#EC4899'];

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: (Math.random() - 0.5) * width * 1.5,
        y: (Math.random() - 0.5) * height * 1.5,
        z: Math.random() * 800 + 100,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        vz: (Math.random() - 0.5) * 1.2,
        radius: Math.random() * 2.5 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        baseAlpha: Math.random() * 0.5 + 0.4
      });
    }

    // 3D Wireframe Polyhedron Geometry Nodes
    const polyhedrons: Array<{
      cx: number;
      cy: number;
      cz: number;
      rotX: number;
      rotY: number;
      rotZ: number;
      rotVelX: number;
      rotVelY: number;
      size: number;
      type: 'cube' | 'octahedron';
      color: string;
    }> = [
      { cx: width * 0.15, cy: height * 0.25, cz: 400, rotX: 0, rotY: 0, rotZ: 0, rotVelX: 0.008, rotVelY: 0.012, size: 70, type: 'cube', color: 'rgba(56, 189, 248, 0.45)' },
      { cx: width * 0.82, cy: height * 0.35, cz: 500, rotX: 0, rotY: 0, rotZ: 0, rotVelX: 0.01, rotVelY: 0.007, size: 90, type: 'octahedron', color: 'rgba(245, 158, 11, 0.45)' },
      { cx: width * 0.5, cy: height * 0.75, cz: 350, rotX: 0, rotY: 0, rotZ: 0, rotVelX: -0.006, rotVelY: 0.014, size: 60, type: 'cube', color: 'rgba(168, 85, 247, 0.45)' },
      { cx: width * 0.88, cy: height * 0.8, cz: 600, rotX: 0, rotY: 0, rotZ: 0, rotVelX: 0.012, rotVelY: -0.009, size: 80, type: 'octahedron', color: 'rgba(52, 211, 153, 0.45)' }
    ];

    // Helper to project 3D point (x,y,z) onto 2D canvas with focal length
    const focalLength = 400;
    const project = (x: number, y: number, z: number) => {
      const scale = focalLength / (focalLength + z);
      return {
        x: width / 2 + x * scale,
        y: height / 2 + y * scale,
        scale
      };
    };

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      const mouseOffsetX = (mouse.x - width / 2) * 0.2;
      const mouseOffsetY = (mouse.y - height / 2) * 0.2;

      // 1. Draw 3D Wireframe Polyhedrons
      polyhedrons.forEach((poly) => {
        poly.rotX += poly.rotVelX;
        poly.rotY += poly.rotVelY;

        let vertices: Array<[number, number, number]> = [];
        let edges: Array<[number, number]> = [];

        if (poly.type === 'cube') {
          const s = poly.size;
          vertices = [
            [-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s],
            [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s]
          ];
          edges = [
            [0,1],[1,2],[2,3],[3,0],
            [4,5],[5,6],[6,7],[7,4],
            [0,4],[1,5],[2,6],[3,7]
          ];
        } else {
          // Octahedron
          const s = poly.size * 1.2;
          vertices = [
            [0, -s, 0], [s, 0, 0], [0, 0, s], [-s, 0, 0], [0, 0, -s], [0, s, 0]
          ];
          edges = [
            [0,1],[0,2],[0,3],[0,4],
            [5,1],[5,2],[5,3],[5,4],
            [1,2],[2,3],[3,4],[4,1]
          ];
        }

        // Rotate & project vertices
        const projectedVerts = vertices.map(([vx, vy, vz]) => {
          // Rotate X
          let y1 = vy * Math.cos(poly.rotX) - vz * Math.sin(poly.rotX);
          let z1 = vy * Math.sin(poly.rotX) + vz * Math.cos(poly.rotX);
          // Rotate Y
          let x2 = vx * Math.cos(poly.rotY) + z1 * Math.sin(poly.rotY);
          let z2 = -vx * Math.sin(poly.rotY) + z1 * Math.cos(poly.rotY);

          const worldX = x2 + (poly.cx - width / 2) + mouseOffsetX * 0.5;
          const worldY = y1 + (poly.cy - height / 2) + mouseOffsetY * 0.5;
          const worldZ = z2 + poly.cz;

          return project(worldX, worldY, worldZ);
        });

        // Draw edges
        ctx.strokeStyle = poly.color;
        ctx.lineWidth = 1.5;
        edges.forEach(([i, j]) => {
          const p1 = projectedVerts[i];
          const p2 = projectedVerts[j];
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        });

        // Draw glowing vertex nodes
        projectedVerts.forEach((p) => {
          ctx.fillStyle = poly.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3 * p.scale, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // 2. Render & Update 3D Particles
      const projectedParticles: Array<{ x: number; y: number; scale: number; color: string; alpha: number }> = [];

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        // Wrap around bounds
        if (p.x < -width) p.x = width;
        if (p.x > width) p.x = -width;
        if (p.y < -height) p.y = height;
        if (p.y > height) p.y = -height;
        if (p.z < 50) p.z = 850;
        if (p.z > 850) p.z = 50;

        const proj = project(p.x + mouseOffsetX, p.y + mouseOffsetY, p.z);
        const alpha = p.baseAlpha * proj.scale;

        projectedParticles.push({
          x: proj.x,
          y: proj.y,
          scale: proj.scale,
          color: p.color,
          alpha
        });

        // Draw particle dot
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.min(1, Math.max(0.1, alpha));
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, Math.max(1, p.radius * proj.scale), 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Constellation connection lines between nearby projected particles
      ctx.lineWidth = 0.6;
      for (let i = 0; i < projectedParticles.length; i++) {
        for (let j = i + 1; j < projectedParticles.length; j++) {
          const p1 = projectedParticles[i];
          const p2 = projectedParticles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            const lineAlpha = (1 - dist / 110) * 0.25 * Math.min(p1.alpha, p2.alpha);
            ctx.strokeStyle = p1.color;
            ctx.globalAlpha = lineAlpha;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [density, colorTheme]);

  return (
    <canvas
      ref={canvasRef}
      className={`mesmerizing-3d-canvas ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: interactive ? 'auto' : 'none',
        zIndex: 2,
        ...style
      }}
    />
  );
};
