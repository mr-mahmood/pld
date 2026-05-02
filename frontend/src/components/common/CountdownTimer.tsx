import { useState, useEffect } from "react";

interface CountDownProps {
    initialSeconds: number;
    endTimeText: string;
    onUpdate?: (secondsLeft: number) => void;
}

function CountdownTimer({ initialSeconds, endTimeText, onUpdate }: CountDownProps) {
    const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
    useEffect(() => {
        if (secondsLeft <= 0) {
            if (onUpdate) onUpdate(0);
            return;
        }
        const timerId = setInterval(() => {
            setSecondsLeft(prev => {
                const newVal = prev - 1;
                if (onUpdate) onUpdate(newVal);
                return newVal;
            });
        }, 1000);
        return () => clearInterval(timerId);
    }, [secondsLeft, onUpdate]);
    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };
    return (
        <div>
            {secondsLeft !== 0 ? (
                <p className="text-center text-danger">
                    زمان باقی‌مانده: {formatTime(secondsLeft)}
                </p>
            ) : (
                <p className="text-center text-danger">{endTimeText}</p>
            )}
        </div>
    );
}
export default CountdownTimer;
