import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Coins, RotateCw, TrendingUp, TrendingDown } from 'lucide-react';

// Spin cost and outcomes
const SPIN_COST = 10; // Cost per spin
const WHEEL_OUTCOMES = [
  { type: 'win', amount: 20, label: '+20', color: '#10B981' },    // 2x return
  { type: 'win', amount: 30, label: '+30', color: '#3B82F6' },    // 3x return
  { type: 'win', amount: 50, label: '+50', color: '#8B5CF6' },    // 5x return
  { type: 'win', amount: 100, label: '+100', color: '#F59E0B' },  // 10x return
  { type: 'lose', amount: 0, label: 'LOSE', color: '#EF4444' },   // Lose spin cost
  { type: 'lose', amount: 0, label: 'LOSE', color: '#F97316' },   // Lose spin cost
  { type: 'lose', amount: 0, label: 'LOSE', color: '#6B7280' },   // Lose spin cost
  { type: 'lose', amount: 0, label: 'LOSE', color: '#9CA3AF' },   // Lose spin cost
];

const COLORS = WHEEL_OUTCOMES.map(outcome => outcome.color);

interface SpinWheelProps {
  onRewardEarned?: (amount: number) => void;
  onCoinsLost?: (amount: number) => void;
}

const SpinWheel: React.FC<SpinWheelProps> = ({ onRewardEarned, onCoinsLost }) => {
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const { toast } = useToast();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastSpin, setLastSpin] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Initialize timer from localStorage on component mount
  useEffect(() => {
    const savedLastSpin = localStorage.getItem('spinWheelLastSpin');
    if (savedLastSpin) {
      const lastSpinTime = new Date(savedLastSpin);
      const timeDiff = Date.now() - lastSpinTime.getTime();
      const cooldownTime = 30 * 1000; // 30 seconds
      
      if (timeDiff < cooldownTime) {
        setLastSpin(lastSpinTime);
        setTimeLeft(Math.ceil((cooldownTime - timeDiff) / 1000));
      }
    }
  }, []);

  // Timer effect for countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (lastSpin && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Clear localStorage when timer reaches zero
            localStorage.removeItem('spinWheelLastSpin');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [lastSpin, timeLeft]);

  // Check if user can spin (has enough coins and no cooldown)
  const canSpin = () => {
    if (!profile) return false;
    if (profile.coin_balance < SPIN_COST) return false;
    return timeLeft === 0;
  };

  const getTimeUntilNextSpin = () => {
    if (timeLeft <= 0) return null;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSpin = async () => {
    if (!user || !profile || !canSpin() || isSpinning) return;

    setIsSpinning(true);
    const now = new Date();
    setLastSpin(now);
    setTimeLeft(30); // Start 30-second countdown
    localStorage.setItem('spinWheelLastSpin', now.toISOString());

    // Generate random result
    const outcomeIndex = Math.floor(Math.random() * WHEEL_OUTCOMES.length);
    const outcome = WHEEL_OUTCOMES[outcomeIndex];
    
    // Calculate rotation (multiple full rotations + final position)
    const baseRotation = 720 + (outcomeIndex * (360 / WHEEL_OUTCOMES.length));
    const newRotation = rotation + baseRotation;
    setRotation(newRotation);

    try {
      let newBalance: number;
      let transactionType: string;
      let transactionAmount: number;
      let description: string;

      if (outcome.type === 'win') {
        // User wins: deduct spin cost, add winnings
        newBalance = profile.coin_balance - SPIN_COST + outcome.amount;
        transactionType = 'earn';
        transactionAmount = outcome.amount;
        description = `Spin Wheel Win: +${outcome.amount} coins (Cost: ${SPIN_COST})`;
      } else {
        // User loses: deduct spin cost only
        newBalance = profile.coin_balance - SPIN_COST;
        transactionType = 'redeem';
        transactionAmount = SPIN_COST;
        description = `Spin Wheel Loss: -${SPIN_COST} coins`;
      }
      
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: transactionType,
          amount: transactionAmount,
          description: description,
          game_type: 'spin_wheel',
          balance_after: newBalance,
        });

      if (transactionError) throw transactionError;

      // Update profile balance
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ coin_balance: newBalance })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Wait for spin animation
      setTimeout(() => {
        setIsSpinning(false);
        
        if (outcome.type === 'win') {
          toast({
            title: "🎉 Congratulations!",
            description: `You won ${outcome.amount} coins! (Net: +${outcome.amount - SPIN_COST})`,
            variant: "default",
          });
          onRewardEarned?.(outcome.amount);
        } else {
          toast({
            title: "😔 Better luck next time!",
            description: `You lost ${SPIN_COST} coins. Try again!`,
            variant: "destructive",
          });
          onCoinsLost?.(SPIN_COST);
        }
        
        refreshProfile();
      }, 3000);

    } catch (error) {
      console.error('Error processing spin:', error);
      setIsSpinning(false);
      toast({
        title: "Error",
        description: "Failed to process spin. Please try again.",
        variant: "destructive",
      });
    }
  };



  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
          <RotateCw className="w-6 h-6 text-primary" />
          Spin the Wheel
        </CardTitle>
        <p className="text-muted-foreground">
          Cost: {SPIN_COST} coins per spin • 30s cooldown
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Wheel Container */}
        <div className="relative flex justify-center">
          <div className="relative w-64 h-64">
            {/* Wheel */}
            <div 
              className={`w-full h-full rounded-full border-4 border-border relative transition-transform duration-3000 ease-out ${
                isSpinning ? 'animate-spin' : ''
              }`}
              style={{ 
                transform: `rotate(${rotation}deg)`,
                background: `conic-gradient(${COLORS.map((color, i) => 
                  `${color} ${(i * 360) / WHEEL_OUTCOMES.length}deg ${((i + 1) * 360) / WHEEL_OUTCOMES.length}deg`
                ).join(', ')})`
              }}
            >
              {/* Outcome Labels */}
              {WHEEL_OUTCOMES.map((outcome, index) => {
                const angle = (index * 360) / WHEEL_OUTCOMES.length;
                const radians = (angle * Math.PI) / 180;
                const x = 50 + 35 * Math.cos(radians - Math.PI / 2);
                const y = 50 + 35 * Math.sin(radians - Math.PI / 2);
                
                return (
                  <div
                    key={index}
                    className="absolute flex items-center justify-center text-white font-bold text-sm"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                    }}
                  >
                    {outcome.label}
                  </div>
                );
              })}
            </div>
            
            {/* Center Circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-card rounded-full border-4 border-primary flex items-center justify-center">
                <Coins className="w-6 h-6 text-secondary" />
              </div>
            </div>
            
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
              <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-primary"></div>
            </div>
          </div>
        </div>

        {/* Spin Button */}
        <div className="text-center space-y-2">
          {profile && profile.coin_balance < SPIN_COST ? (
            <div className="space-y-2">
              <Button variant="outline" size="xl" disabled className="w-full">
                Insufficient Coins
              </Button>
              <p className="text-sm text-muted-foreground">
                You need at least {SPIN_COST} coins to spin
              </p>
            </div>
          ) : canSpin() ? (
            <Button
              variant="spin"
              size="xl"
              onClick={handleSpin}
              disabled={isSpinning || !user}
              className="w-full"
            >
              {isSpinning ? 'Spinning...' : `SPIN (${SPIN_COST} coins)`}
            </Button>
          ) : (
            <div className="space-y-2">
              <Button variant="outline" size="xl" disabled className="w-full">
                Next spin in: {getTimeUntilNextSpin()}
              </Button>
              <p className="text-sm text-muted-foreground">
                Wait 30 seconds between spins
              </p>
            </div>
          )}
        </div>

        {/* Current Balance & Game Info */}
        {profile && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Your Balance</p>
              <div className="flex items-center justify-center gap-2">
                <Coins className="w-5 h-5 text-secondary" />
                <span className="text-2xl font-bold text-secondary">
                  {profile.coin_balance.toLocaleString()}
                </span>
              </div>
            </div>
            
            {/* Game Statistics */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-success/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-success mx-auto mb-1" />
                <p className="text-sm font-semibold text-success">Win Rate</p>
                <p className="text-xs text-muted-foreground">50% chance</p>
              </div>
              <div className="p-3 bg-warning/10 rounded-lg">
                <TrendingDown className="w-5 h-5 text-warning mx-auto mb-1" />
                <p className="text-sm font-semibold text-warning">Max Win</p>
                <p className="text-xs text-muted-foreground">100 coins</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SpinWheel;