import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

const SpinWheel = ({ segments, onWin }) => {
    const canvasRef = useRef(null);
    const [spinning, setSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);

    const colors = useMemo(() => ['#FF4136', '#FFDC00', '#2ECC40', '#0074D9', '#B10DC9', '#FF851B'], []);

    const drawWheel = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = canvas.width / 2;

        const arc = (2 * Math.PI) / segments.length;

        segments.forEach((segment, i) => {
            ctx.beginPath();
            ctx.fillStyle = colors[i % colors.length];
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, i * arc, (i + 1) * arc);
            ctx.fill();
            ctx.save();

            // Text
            ctx.translate(centerX, centerY);
            ctx.rotate(i * arc + arc / 2);
            ctx.textAlign = "right";
            ctx.fillStyle = "white";
            ctx.font = "bold 14px Arial";
            ctx.fillText(segment, radius - 10, 5);
            ctx.restore();
        });
    }, [colors, segments]);

    useEffect(() => {
        drawWheel();
    }, [drawWheel]);

    const spin = () => {
        if (spinning) return;
        setSpinning(true);

        // Random rotation (between 5 and 10 full spins + random segment)
        const randomDegree = Math.floor(Math.random() * 360);
        const spins = 360 * 8; // 8 full rotations
        const totalDegrees = spins + randomDegree;

        setRotation(totalDegrees);

        // Calculate result
        // Note: This matches visual rotation to segment index math
        setTimeout(() => {
            setSpinning(false);
            const degree = totalDegrees % 360;
            const segmentArc = 360 / segments.length;
            // The pointer is at 0 degrees (right side default in canvas). 
            // Rotation is clockwise. We need to calculate which segment lands on the pointer.
            const index = Math.floor((360 - degree) / segmentArc) % segments.length;
            onWin(segments[index]);
        }, 5000); // 5s animation
    };

    return (
        <div className="flex flex-col items-center">
            <div className="relative overflow-hidden mb-6">
                {/* Pointer */}
                <div className="absolute top-1/2 right-0 -translate-y-1/2 z-10 w-0 h-0 
                        border-t-[10px] border-t-transparent
                        border-r-[20px] border-r-white 
                        border-b-[10px] border-b-transparent 
                        drop-shadow-md">
                </div>

                <div
                    style={{
                        transform: `rotate(${rotation}deg)`,
                        transition: spinning ? 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none'
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        width={300}
                        height={300}
                        className="rounded-full shadow-lg"
                    />
                </div>
            </div>

            <button
                onClick={spin}
                disabled={spinning}
                className={`px-8 py-3 rounded-full font-bold text-white text-lg
                    ${spinning ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-lg transform hover:scale-105 transition-all'}`}
            >
                {spinning ? 'Spinning...' : 'SPIN NOW!'}
            </button>
        </div>
    );
};

export default SpinWheel;
