/**
 * LeakTrace Provenance Graph Renderer
 *
 * Renders the provenance graph on a canvas element with:
 * - Directed edges (solid for observed, dashed for inferred)
 * - Force-directed layout
 * - Animated edge drawing
 * - Node labels
 */

export class ProvenanceGraph {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.nodes = [];
    this.edges = [];
    this.positions = {};
    this.animationFrame = null;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas.parentElement);
    this.resize();
  }

  resize() {
    const parent = this.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = parent.clientWidth * dpr;
    this.canvas.height = parent.clientHeight * dpr;
    this.canvas.style.width = `${parent.clientWidth}px`;
    this.canvas.style.height = `${parent.clientHeight}px`;
    this.ctx.scale(dpr, dpr);
    this.w = parent.clientWidth;
    this.h = parent.clientHeight;
    if (this.nodes.length > 0) this.draw();
  }

  /**
   * Set graph data and render.
   * @param {Array<{id: string}>} nodes
   * @param {Array<{s: string, t: string, inferred: boolean}>} edges
   * @param {Array<{id: string, p: number}>} suspects - for coloring
   */
  setData(nodes, edges, suspects = []) {
    this.nodes = nodes;
    this.edges = edges;
    this.suspects = suspects;
    this.layout();
    this.animate();
  }

  layout() {
    // Simple circular layout with the exposure node at the right
    const cx = this.w / 2;
    const cy = this.h / 2;
    const radius = Math.min(this.w, this.h) * 0.32;

    // Find the exposure node (it's the target of the most edges with no outgoing)
    const outDeg = {};
    const inDeg = {};
    for (const e of this.edges) {
      outDeg[e.s] = (outDeg[e.s] || 0) + 1;
      inDeg[e.t] = (inDeg[e.t] || 0) + 1;
    }

    // Place nodes in a circle
    const nodeIds = this.nodes.map(n => n.id);
    const angleStep = (2 * Math.PI) / Math.max(nodeIds.length, 1);

    nodeIds.forEach((id, i) => {
      const angle = -Math.PI / 2 + i * angleStep;
      this.positions[id] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });

    // Simple force-directed refinement (few iterations)
    for (let iter = 0; iter < 50; iter++) {
      const forces = {};
      for (const id of nodeIds) {
        forces[id] = { x: 0, y: 0 };
      }

      // Repulsion between all nodes
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const a = this.positions[nodeIds[i]];
          const b = this.positions[nodeIds[j]];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 5000 / (dist * dist);
          forces[nodeIds[i]].x += (dx / dist) * force;
          forces[nodeIds[i]].y += (dy / dist) * force;
          forces[nodeIds[j]].x -= (dx / dist) * force;
          forces[nodeIds[j]].y -= (dy / dist) * force;
        }
      }

      // Attraction along edges
      for (const e of this.edges) {
        if (!this.positions[e.s] || !this.positions[e.t]) continue;
        const a = this.positions[e.s];
        const b = this.positions[e.t];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 120) * 0.01;
        forces[e.s].x += (dx / dist) * force;
        forces[e.s].y += (dy / dist) * force;
        forces[e.t].x -= (dx / dist) * force;
        forces[e.t].y -= (dy / dist) * force;
      }

      // Center gravity
      for (const id of nodeIds) {
        forces[id].x += (cx - this.positions[id].x) * 0.005;
        forces[id].y += (cy - this.positions[id].y) * 0.005;
      }

      // Apply forces
      for (const id of nodeIds) {
        this.positions[id].x += forces[id].x * 0.3;
        this.positions[id].y += forces[id].y * 0.3;
        // Clamp to bounds
        this.positions[id].x = Math.max(60, Math.min(this.w - 60, this.positions[id].x));
        this.positions[id].y = Math.max(40, Math.min(this.h - 40, this.positions[id].y));
      }
    }
  }

  animate() {
    let progress = 0;
    const step = () => {
      progress = Math.min(1, progress + 0.03);
      this.draw(progress);
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(step);
      }
    };
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    step();
  }

  draw(progress = 1) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    // Build suspect probability map
    const probMap = {};
    for (const s of this.suspects) {
      probMap[s.id] = s.p;
    }

    // Draw edges
    const edgesToDraw = Math.ceil(this.edges.length * progress);
    for (let i = 0; i < edgesToDraw; i++) {
      const e = this.edges[i];
      const from = this.positions[e.s];
      const to = this.positions[e.t];
      if (!from || !to) continue;

      ctx.beginPath();
      ctx.strokeStyle = e.inferred
        ? "rgba(245, 158, 11, 0.5)"
        : "rgba(99, 102, 241, 0.6)";
      ctx.lineWidth = e.inferred ? 1.5 : 2;

      if (e.inferred) {
        ctx.setLineDash([6, 4]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow head
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const arrowLen = 10;
      const nodeRadius = 22;
      const ax = to.x - nodeRadius * Math.cos(angle);
      const ay = to.y - nodeRadius * Math.sin(angle);

      ctx.beginPath();
      ctx.fillStyle = e.inferred
        ? "rgba(245, 158, 11, 0.6)"
        : "rgba(99, 102, 241, 0.7)";
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - arrowLen * Math.cos(angle - 0.35),
        ay - arrowLen * Math.sin(angle - 0.35)
      );
      ctx.lineTo(
        ax - arrowLen * Math.cos(angle + 0.35),
        ay - arrowLen * Math.sin(angle + 0.35)
      );
      ctx.closePath();
      ctx.fill();
    }

    // Draw nodes
    for (const node of this.nodes) {
      const pos = this.positions[node.id];
      if (!pos) continue;

      const prob = probMap[node.id] || 0;
      const isExposure = node.id === "public_bucket";
      const nodeRadius = 22;

      // Node glow
      if (prob > 0.3) {
        const gradient = ctx.createRadialGradient(pos.x, pos.y, nodeRadius, pos.x, pos.y, nodeRadius + 15);
        gradient.addColorStop(0, `rgba(244, 63, 94, ${prob * 0.3})`);
        gradient.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeRadius + 15, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);

      if (isExposure) {
        ctx.fillStyle = "rgba(244, 63, 94, 0.15)";
        ctx.strokeStyle = "#f43f5e";
      } else if (prob > 0.3) {
        ctx.fillStyle = "rgba(244, 63, 94, 0.12)";
        ctx.strokeStyle = "#f43f5e";
      } else if (prob > 0) {
        ctx.fillStyle = "rgba(99, 102, 241, 0.12)";
        ctx.strokeStyle = "#6366f1";
      } else {
        ctx.fillStyle = "rgba(30, 41, 59, 0.8)";
        ctx.strokeStyle = "#475569";
      }

      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // Node label
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "500 11px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Abbreviate long names
      let label = node.id;
      if (label.length > 12) {
        label = label.substring(0, 10) + "…";
      }
      ctx.fillText(label, pos.x, pos.y);

      // Probability badge
      if (prob > 0 && !isExposure) {
        const badgeText = `${(prob * 100).toFixed(0)}%`;
        ctx.font = "600 9px 'JetBrains Mono', monospace";
        const badgeW = ctx.measureText(badgeText).width + 8;
        const bx = pos.x + nodeRadius - 4;
        const by = pos.y - nodeRadius + 2;

        ctx.beginPath();
        ctx.roundRect(bx - badgeW / 2, by - 8, badgeW, 16, 4);
        ctx.fillStyle = prob > 0.3 ? "rgba(244, 63, 94, 0.9)" : "rgba(99, 102, 241, 0.8)";
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeText, bx, by);
      }
    }
  }

  clear() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.nodes = [];
    this.edges = [];
    this.positions = {};
  }

  destroy() {
    this.clear();
    this.resizeObserver.disconnect();
  }
}
