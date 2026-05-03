/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { DataFlowGraph, D3Node, D3Link } from '../types';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface D3FlowChartProps {
  data: DataFlowGraph;
  onNodeClick?: (node: D3Node) => void;
}

// More vibrant, neon-like colors for dark mode
const NEON_COLORS = [
  "#4cc9f0", // vivid cyan
  "#f72585", // vivid magenta
  "#7209b7", // deep violet
  "#3a0ca3", // dark blue
  "#4361ee", // bright blue
  "#4d908e", // teal
  "#57cc99", // mint
  "#f3722c", // orange
  "#f8961e", // yellow-orange
  "#f9c74f", // yellow
];

const D3FlowChart: React.FC<D3FlowChartProps> = ({ data, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [sim, setSim] = useState<d3.Simulation<D3Node, D3Link> | null>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Dynamically get dimensions from container or SVG
    const width = svgRef.current.clientWidth || 800;
    // Use clientHeight if available to respect responsive containers, default to 600 if 0
    const height = svgRef.current.clientHeight || 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    const g = svg.append("g"); // Create container group for zoom

    // Define arrow markers for directed links
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25) // Offset to sit at the edge of nodes
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#64748b");

    const simulation = d3.forceSimulation<D3Node, D3Link>(data.nodes)
      .force("link", d3.forceLink<D3Node, D3Link>(data.links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX().strength(0.08))
      .force("y", d3.forceY().strength(0.08));
    
    setSim(simulation);

    const link = g.append("g")
      .selectAll("g")
      .data(data.links)
      .join("g");

    const linkLine = link.append("line")
      .attr("stroke", "#475569") // slate-600
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d: any) => Math.max(3, Math.sqrt(d.value || 1) * 3)) // Increased thickness
      .attr("marker-end", "url(#arrowhead)");

    const linkLabelGroup = link.append("g")
      .attr("class", "link-label-group");

    linkLabelGroup.append("rect")
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("fill", "#0f172a") // slate-900
      .attr("stroke", "#1e293b") // slate-800
      .attr("stroke-width", 1)
      .attr("width", 40)
      .attr("height", 16)
      .attr("x", -20)
      .attr("y", -8);

    linkLabelGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("fill", "#94a3b8")
      .attr("font-size", "9px")
      .attr("font-family", "JetBrains Mono, monospace")
      .text((d: any) => d.value > 1 ? `flow:${d.value}` : "sync");

    const nodeGroup = g.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .style("cursor", "pointer")
      .on("click", (event, d: any) => {
        if (onNodeClick) {
            event.stopPropagation();
            onNodeClick(d);
        }
      });

    const isDatabase = (d: any) => {
      const label = (d.label || '').toLowerCase();
      return label.includes('db') || label.includes('database') || label.includes('sql') || label.includes('data') || label.includes('store');
    };

    nodeGroup.each(function(d: any) {
      const el = d3.select(this);
      if (isDatabase(d)) {
        // Draw cylinder for database nodes
        el.append("path")
          .attr("d", "M -12 -14 A 12 5 0 1 1 12 -14 L 12 10 A 12 5 0 1 1 -12 10 L -12 -14 M -12 -14 A 12 5 0 1 0 12 -14")
          .attr("fill", NEON_COLORS[d.group % NEON_COLORS.length])
          .attr("stroke", "#0f172a")
          .attr("stroke-width", 2)
          .attr("opacity", 0.9);
      } else {
        el.append("circle")
          .attr("r", (d: any) => d.id === 'root' ? 16 : 10)
          .attr("fill", (d: any) => NEON_COLORS[d.group % NEON_COLORS.length])
          .attr("stroke", "#0f172a")
          .attr("stroke-width", 2)
          .attr("class", "transition-all duration-300 ease-in-out hover:r-[12px] hover:stroke-white/50");
      }
    });

    nodeGroup.append("text")
      .text((d: any) => d.label)
      .attr("x", 20)
      .attr("y", 5)
      .attr("fill", "#e2e8f0") // slate-200
      .attr("font-size", "12px")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-weight", "500")
      .style("text-shadow", "0 2px 4px rgba(0,0,0,0.9)")
      .style("pointer-events", "none"); // Let clicks go through to the group/circle

    // Add simple drag behavior
    const drag = d3.drag<SVGGElement, D3Node>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeGroup.call(drag as any); 

    // Add Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    simulation.on("tick", () => {
      linkLine
        .attr("x1", (d: any) => (d.source as D3Node).x!)
        .attr("y1", (d: any) => (d.source as D3Node).y!)
        .attr("x2", (d: any) => (d.target as D3Node).x!)
        .attr("y2", (d: any) => (d.target as D3Node).y!);

      linkLabelGroup
        .attr("transform", (d: any) => {
          const x = ((d.source as D3Node).x! + (d.target as D3Node).x!) / 2;
          const y = ((d.source as D3Node).y! + (d.target as D3Node).y!) / 2;
          return `translate(${x},${y})`;
        });

      nodeGroup
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Add window resize listener to re-center/re-simulate if needed
    // For simplicity in this version, we rely on initial render, 
    // but in production you might want a resize observer.

    return () => {
      simulation.stop();
    };
  }, [data, onNodeClick]);

  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  return (
    <div className="w-full h-full bg-slate-950 rounded-3xl overflow-hidden shadow-2xl shadow-black/30 border border-white/5 relative group">
      <svg 
        ref={svgRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ background: 'radial-gradient(circle at center, rgba(30, 41, 59, 0.2) 0%, rgba(2, 6, 23, 1) 100%)' }}
      />
      
      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
         <button onClick={handleZoomIn} className="p-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 rounded-lg backdrop-blur-md border border-white/10 transition-colors" title="Zoom In">
             <ZoomIn className="w-4 h-4" />
         </button>
         <button onClick={handleZoomOut} className="p-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 rounded-lg backdrop-blur-md border border-white/10 transition-colors" title="Zoom Out">
             <ZoomOut className="w-4 h-4" />
         </button>
         <button onClick={handleResetZoom} className="p-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 rounded-lg backdrop-blur-md border border-white/10 transition-colors" title="Reset View">
             <Maximize className="w-4 h-4" />
         </button>
      </div>

      <div className="absolute bottom-4 left-4 bg-slate-900/80 text-slate-500 text-[10px] font-medium px-3 py-1.5 rounded-full backdrop-blur-md border border-white/5 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity font-mono hidden sm:block">
        Drag to move • Scroll to Zoom • Click nodes
      </div>
    </div>
  );
};

export default D3FlowChart;
