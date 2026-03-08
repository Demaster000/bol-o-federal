import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  drawDate: string;
  compact?: boolean;
}

const CountdownTimer = ({ drawDate, compact = false }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const calc = () => {
      // Sales close 5 hours before draw
      const closeTime = new Date(drawDate).getTime() - 5 * 60 * 60 * 1000;
      const diff = closeTime - Date.now();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        expired: false,
      };
    };
    setTimeLeft(calc());
    const timer = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(timer);
  }, [drawDate]);

  if (timeLeft.expired) {
    return (
      <div className="flex items-center gap-1.5 text-destructive">
        <Clock className="h-3 w-3" />
        <span className="text-[10px] font-bold">VENDAS ENCERRADAS</span>
      </div>
    );
  }

  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 1;

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${isUrgent ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`}>
        <Clock className="h-3 w-3" />
        <span className="text-[10px] font-bold">
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-2 ${isUrgent ? 'border-destructive/40 bg-destructive/10' : 'border-border bg-muted/50'}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Clock className={`h-3 w-3 ${isUrgent ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
        <span className={`text-[10px] font-bold ${isUrgent ? 'text-destructive' : 'text-muted-foreground'}`}>
          {isUrgent ? 'ÚLTIMOS MINUTOS!' : 'Encerra em'}
        </span>
      </div>
      <div className="flex gap-1.5">
        {timeLeft.days > 0 && (
          <div className="flex flex-col items-center bg-background/50 rounded px-1.5 py-1 min-w-[28px]">
            <span className="font-display font-bold text-xs text-foreground">{timeLeft.days}</span>
            <span className="text-[8px] text-muted-foreground">dia</span>
          </div>
        )}
        <div className="flex flex-col items-center bg-background/50 rounded px-1.5 py-1 min-w-[28px]">
          <span className="font-display font-bold text-xs text-foreground">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="text-[8px] text-muted-foreground">hrs</span>
        </div>
        <div className="flex flex-col items-center bg-background/50 rounded px-1.5 py-1 min-w-[28px]">
          <span className="font-display font-bold text-xs text-foreground">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="text-[8px] text-muted-foreground">min</span>
        </div>
        <div className="flex flex-col items-center bg-background/50 rounded px-1.5 py-1 min-w-[28px]">
          <span className="font-display font-bold text-xs text-foreground">{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="text-[8px] text-muted-foreground">seg</span>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
