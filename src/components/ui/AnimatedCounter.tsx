import { useEffect, useState } from 'react';

interface AnimatedCounterProps {
    value: string;
    duration?: number;
}

export function AnimatedCounter({ value, duration = 1500 }: AnimatedCounterProps) {
    const [count, setCount] = useState(0);

    // Extract numeric value
    const valStr = String(value);
    const numericValue = parseFloat(valStr.replace(/[^0-9.]/g, '')) || 0;
    const isPercentage = valStr.includes('%');
    const isCurrency = valStr.includes('$') || valStr.includes('€');

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            // Easing function (easeOutExpo)
            const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            setCount(easedProgress * numericValue);

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrame);
    }, [numericValue, duration]);

    const formatValue = (num: number) => {
        if (isPercentage) {
            return `${num.toFixed(1)}%`;
        }
        if (isCurrency) {
            return `€${Math.round(num).toLocaleString()}`;
        }
        return Math.round(num).toLocaleString();
    };

    return <span>{formatValue(count)}</span>;
}
