import React, { useEffect, useRef } from "react";

interface Point {
  x: number;
  y: number;
}

interface Line {
  label: string;
  startPoint: Point;
  endPoint: Point;
}

interface Arc {
  label: string;
  center: Point;
  radius: number;
  startAngle: number;
  endAngle: number;
}

interface ContourProps {
  width: number;
  height: number;
  margin: number;
  nodes: Point[];
  edges: Line[];
  arcs: Arc[];
  selectedLabels?: String;
}

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function calculateBoundingBox(lines: Line[], arcs: Arc[]): BoundingBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  lines.forEach((line) => {
    const { startPoint, endPoint } = line;
    minX = Math.min(minX, startPoint.x, endPoint.x);
    minY = Math.min(minY, startPoint.y, endPoint.y);
    maxX = Math.max(maxX, startPoint.x, endPoint.x);
    maxY = Math.max(maxY, startPoint.y, endPoint.y);
  });

  arcs.forEach((arc) => {
    const { center, radius } = arc;
    const arcBoundingBox = {
      minX: center.x - radius,
      minY: center.y - radius,
      maxX: center.x + radius,
      maxY: center.y + radius,
    };

    minX = Math.min(minX, arcBoundingBox.minX);
    minY = Math.min(minY, arcBoundingBox.minY);
    maxX = Math.max(maxX, arcBoundingBox.maxX);
    maxY = Math.max(maxY, arcBoundingBox.maxY);
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
  };
}

export default function Contour(props: ContourProps) {
  const svgElementRef = useRef<SVGSVGElement>(null);

  const { width, height, margin, nodes, edges, arcs, selectedLabels } = props;
  const [highlighted, setHighlighted] = React.useState(new Set([]))
  const { minX, minY, maxX, maxY } = calculateBoundingBox(edges, arcs);

  const scaleX = width / (maxX - minX);
  const scaleY = height / (maxY - minY);
  const scale = Math.min(scaleX, scaleY);

  // useEffect(() => {
  //   const svg = svgElementRef.current;

  //   if (!svg) return;

  //   // Clear the SVG by removing all child elements
  //   while (svg.firstChild) {
  //     svg.removeChild(svg.firstChild);
  //   }

  //   svg.setAttribute("width", "100%");
  //   svg.setAttribute("height", "100%");
  //   svg.setAttribute("viewBox", `0 0 ${width + 2 * margin} ${height + 2 * margin}`);

  //   edges.forEach((edge) => {
  //     const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  //     const text = document.createElementNS("http://www.w3.org/2000/svg", "text");

  //     const { startPoint, endPoint, label } = edge;
  //     const startX = (startPoint.x - minX) * scale + margin;
  //     const startY = (startPoint.y - minY) * scale + margin;
  //     const endX = (endPoint.x - minX) * scale + margin;
  //     const endY = (endPoint.y - minY) * scale + margin;

  //     const textCenterX = (startX + endX) / 2;
  //     const textCenterY = (startY + endY) / 2;

  //     if (selectedLabels && selectedLabels.includes(label)) {
  //       path.setAttribute("style", "stroke: red; stroke-width: 3;")
  //     }
  //     path.setAttribute("d", `M ${startX} ${startY} L ${endX} ${endY}`);
  //     path.setAttribute("fill", "none");
  //     path.setAttribute("stroke", "black");

  //     text.setAttribute("x", `${textCenterX}`);
  //     text.setAttribute("y", `${textCenterY}`);
  //     text.setAttribute("dy", "0.35em");
  //     text.setAttribute("text-anchor", "middle");
  //     text.setAttribute("font-size", "5");
  //     text.textContent = label;

  //     svg.appendChild(path);
  //     svg.appendChild(text);
  //   });

  //   arcs.forEach((arc) => {
  //     const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  //     const text = document.createElementNS("http://www.w3.org/2000/svg", "text");

  //     const { center, radius, startAngle, endAngle, label } = arc;
  //     const arcX = (center.x - minX) * scale + margin;
  //     const arcY = (center.y - minY) * scale + margin;

  //     // Convert angles to degrees
  //     const startAngleDeg = (startAngle * 180) / Math.PI;
  //     const endAngleDeg = (endAngle * 180) / Math.PI;

  //     if (selectedLabels && selectedLabels.includes(label)) {
  //       path.setAttribute("style", "stroke: red; stroke-width: 3;")
  //     }

  //     const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";

  //     path.setAttribute("d", `M ${arcX + radius * scale * Math.cos(startAngle)} ${arcY + radius * scale * Math.sin(startAngle)} A ${radius * scale} ${radius * scale} 0 ${largeArcFlag} 1 ${arcX + radius * scale * Math.cos(endAngle)} ${arcY + radius * scale * Math.sin(endAngle)}`);
  //     path.setAttribute("fill", "none");
  //     path.setAttribute("stroke", "black");

  //     text.setAttribute("x", `${arcX + radius * scale * Math.cos((startAngle + endAngle) / 2)}`);
  //     text.setAttribute("y", `${arcY + radius * scale * Math.sin((startAngle + endAngle) / 2)}`);
  //     text.setAttribute("dy", "0.35em");
  //     text.setAttribute("text-anchor", "middle");
  //     text.setAttribute("font-size", "5");
  //     text.textContent = label;

  //     svg.appendChild(path);
  //     svg.appendChild(text);
  //   });
  // }, [width, height, margin, edges, arcs, minX, minY, scale]);


  // {edges.map((edge) =>
  // <path
  //   d = {`M ${startX} ${startY} L ${endX} ${endY}`}
  //   key={edge.label}
  //   stroke={"black"}
  // />
  // )}
  return (
    <svg viewBox={`0 0 ${width + 2 * margin} ${height + 2 * margin}`} fill="black" style={{backgroundColor:"white"}} xmlns="http://www.w3.org/2000/svg" >
      {edges.map((edge) => {
      const startX = (edge.startPoint.x - minX) * scale + margin;
      const startY = (edge.startPoint.y - minY) * scale + margin;
      const endX = (edge.endPoint.x - minX) * scale + margin;
      const endY = (edge.endPoint.y - minY) * scale + margin;

      const textCenterX = (startX + endX) / 2;
      const textCenterY = (startY + endY) / 2;

      return (
        <>
        <path
          d = {`M ${startX} ${startY} L ${endX} ${endY}`}
          key={edge.label}
          stroke={highlighted.has(edge.label) ? "red" : "black"}
          strokeWidth={"2"}
          onMouseEnter={() => {
            console.log("alskdjalk")
            setHighlighted(prev => {
            const newSet = new Set([...prev])
            newSet.add(edge.label)
            return newSet
          })}
          }
          onMouseLeave={() => setHighlighted(prev => {
            const newSet = new Set([...prev])
            newSet.delete(edge.label)
            return newSet
          })}
        />
        <text x={`${textCenterX}`} y={`${textCenterY}`} font-family="Arial" font-size="10" fill={highlighted.has(edge.label) ? "red" : "black"}>{edge.label}</text>
        </>
      )
    }
      )}
  </svg>
  )
}
