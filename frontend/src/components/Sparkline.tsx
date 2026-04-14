"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface SparklineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
    strokeWidth?: number;
}

export default function Sparkline({ 
    data, 
    width = 120, 
    height = 40, 
    color = "var(--brand)",
    strokeWidth = 2
}: SparklineProps) {
    if (!data || data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    // Create smoothed points
    const points = data
        .map((v, i) => {
            const x = (i / (data.length - 1)) * (width - 4) + 2;
            const y = height - ((v - min) / range) * (height - 8) - 4;
            return { x, y };
        });

    const pathData = `M ${points[0].x} ${points[0].y} ${points.map(p => `L ${p.x} ${p.y}`).join(" ")}`;
    const areaData = `${pathData} L ${points[points.length-1].x} ${height} L ${points[0].x} ${height} Z`;

    const uniqueId = `spark-grad-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <svg 
            width={width} 
            height={height} 
            viewBox={`0 0 ${width} ${height}`} 
            className="overflow-visible"
        >
            <defs>
                <linearGradient id={uniqueId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            
            <path
                d={areaData}
                fill={`url(#${uniqueId})`}
                className="transition-all duration-700"
            />
            
            <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                    filter: `drop-shadow(0 0 4px ${color}40)`
                }}
            />
        </svg>
    );
}
