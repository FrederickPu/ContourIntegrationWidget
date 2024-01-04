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

  const { width, height, margin, nodes, edges, arcs, selectedLabels } = props;
  const [highlighted, setHighlighted] = React.useState(new Set([]))
  const { minX, minY, maxX, maxY } = calculateBoundingBox(edges, arcs);

  const scaleX = width / (maxX - minX);
  const scaleY = height / (maxY - minY);
  const scale = Math.min(scaleX, scaleY);

  return (
    <svg viewBox={`0 0 ${width + 2 * margin} ${height + 2 * margin}`} fill="black" xmlns="http://www.w3.org/2000/svg" style={{backgroundColor : "white"}} >
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
              d={`M ${startX} ${startY} L ${endX} ${endY}`}
              key={edge.label}
              stroke={highlighted.has(edge.label) ? "red" : "black"}
              strokeWidth={"2"}
              onMouseEnter={() => {
                setHighlighted(prev => {
                  const newSet = new Set([...prev])
                  newSet.add(edge.label)
                  return newSet
                })
              }
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
      {arcs.map((arc) => {
        const arcX = (arc.center.x - minX) * scale + margin;
        const arcY = (arc.center.y - minY) * scale + margin;
        const radius = arc.radius * scale;
        const startAngle = arc.startAngle * (Math.PI / 180);
        const endAngle = arc.endAngle * (Math.PI / 180);
        const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";

        return (
          <>
            <path
              d={`M ${arcX + radius * Math.cos(startAngle)} ${arcY + radius * Math.sin(startAngle)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${arcX + radius * Math.cos(endAngle)} ${arcY + radius * Math.sin(endAngle)}`}
              key={arc.label}
              fill={"none"}
              stroke={highlighted.has(arc.label) ? "red" : "black"}
              strokeWidth={"2"}
              onMouseOver={() => {
                setHighlighted(prev => {
                  const newSet = new Set([...prev])
                  newSet.add(arc.label)
                  return newSet
                })
              }
              }
              onMouseOut={() => setHighlighted(prev => {
                const newSet = new Set([...prev])
                newSet.delete(arc.label)
                return newSet
              })}
            />
            <text x={`${arcX + (radius*1.2)* Math.cos((startAngle + endAngle) / 2)}`} y={`${arcY + (radius*1.2) * Math.sin((startAngle + endAngle) / 2)}`}
              font-family="Arial" font-size="10" fill={highlighted.has(arc.label) ? "red" : "black"} >{arc.label}</text>
          </>
        )
      })
      }
    </svg>
  )
}
