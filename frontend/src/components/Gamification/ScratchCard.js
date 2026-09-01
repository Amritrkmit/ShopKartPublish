import React, { useState, useRef, useEffect } from 'react';
import { Crown, Sparkles } from 'lucide-react';

const ScratchCard = ({ amount, onComplete }) => {
    const [isScratched, setIsScratched] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const canvasRef = useRef(null);
    const isDrawing = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Fill with a nice metallic gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#D1D5DB');
        gradient.addColorStop(0.5, '#9CA3AF');
        gradient.addColorStop(1, '#6B7280');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add some noise/texture
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 1000; i++) {
            ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
        }

        // Text overlay
        ctx.fillStyle = '#4B5563';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SCRATCH HERE', canvas.width / 2, canvas.height / 2 + 6);
    }, []);

    const getPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const scratch = (e) => {
        if (!isDrawing.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const { x, y } = getPos(e);

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();

        checkScratched();
    };

    const checkScratched = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        let transparentPixels = 0;

        for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] === 0) transparentPixels++;
        }

        const percentage = (transparentPixels / (pixels.length / 4)) * 100;
        if (percentage > 50 && !revealed) {
            setRevealed(true);
            setTimeout(() => {
                setIsScratched(true);
                if (onComplete) onComplete();
            }, 500);
        }
    };

    return (
        <div className="relative w-64 h-40 bg-white rounded-xl shadow-2xl overflow-hidden border-4 border-orange-400 select-none">
            {/* Revealed Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-100 p-4 transform transition-transform duration-500">
                <div className="bg-white p-3 rounded-full shadow-inner mb-2 animate-bounce">
                    <Crown className="text-orange-500 w-10 h-10 fill-current" />
                </div>
                <p className="text-gray-600 text-xs font-bold uppercase tracking-wider">You Won</p>
                <h3 className="text-3xl font-black text-orange-600 flex items-center gap-1">
                    {amount} <span className="text-lg">Coins</span>
                </h3>
                <div className="flex gap-1 mt-1">
                    <Sparkles size={12} className="text-yellow-500 animate-pulse" />
                    <span className="text-[10px] text-orange-700 font-bold">SUPERCOINS ADDED!</span>
                </div>
            </div>

            {/* Scratch Layer */}
            <canvas
                ref={canvasRef}
                width={256}
                height={160}
                className={`absolute inset-0 cursor-crosshair transition-opacity duration-500 ${isScratched ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                onMouseDown={() => (isDrawing.current = true)}
                onMouseUp={() => (isDrawing.current = false)}
                onMouseMove={scratch}
                onTouchStart={() => (isDrawing.current = true)}
                onTouchEnd={() => (isDrawing.current = false)}
                onTouchMove={scratch}
            />
        </div>
    );
};

export default ScratchCard;
