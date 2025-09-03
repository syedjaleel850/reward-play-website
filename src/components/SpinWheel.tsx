import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Coins, RotateCw } from 'lucide-react';

const WHEEL_REWARDS = [10, 25, 50, 100, 200, 500];
const COLORS = ['#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#F97316'];

interface SpinWheelProps {
  onRewardEarned?: (amount: number) => void;
}

const SpinWheel: React.FC<SpinWheelProps> = ({ onRewardEarned }) => {
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const { toast } = useToast();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastSpin, setLastSpin] = useState<Date | null>(null);

  // Check if user can spin (cooldown mechanism)
  const canSpin = () => {
    if (!lastSpin) return true;
    const timeDiff = Date.now() - lastSpin.getTime();
    const cooldownTime = 5 * 60 * 1000; // 5 minutes
    return timeDiff >= cooldownTime;
  };

  const getNextSpinTime = () => {
    if (!lastSpin) return null;
    const nextSpin = new Date(lastSpin.getTime() + (5 * 60 * 1000));
    return nextSpin;
  };

  const handleSpin = async () => {
    if (!user || !profile || !canSpin() || isSpinning) return;

    setIsSpinning(true);
    setLastSpin(new Date());

    // Generate random result
    const rewardIndex = Math.floor(Math.random() * WHEEL_REWARDS.length);
    const reward = WHEEL_REWARDS[rewardIndex];
    
    // Calculate rotation (multiple full rotations + final position)
    const baseRotation = 720 + (rewardIndex * (360 / WHEEL_REWARDS.length));
    const newRotation = rotation + baseRotation;
    setRotation(newRotation);

    try {
      // Add coin transaction
      const newBalance = profile.coin_balance + reward;
      
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'earn',
          amount: reward,
          description: 'Spin Wheel Reward',
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
        toast({
          title: "🎉 Congratulations!",
          description: `You won ${reward} coins!`,
          variant: "default",
        });
        
        refreshProfile();
        onRewardEarned?.(reward);
      }, 3000);

    } catch (error) {
      console.error('Error processing spin reward:', error);
      setIsSpinning(false);
      toast({
        title: "Error",
        description: "Failed to process reward. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getTimeUntilNextSpin = () => {
    const nextSpin = getNextSpinTime();
    if (!nextSpin) return null;
    
    const timeDiff = nextSpin.getTime() - Date.now();
    if (timeDiff <= 0) return null;
    
    const minutes = Math.floor(timeDiff / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
          <RotateCw className="w-6 h-6 text-primary" />
          Spin the Wheel
        </CardTitle>
        <p className="text-muted-foreground">
          Spin every 5 minutes to win coins!
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
                  `${color} ${(i * 360) / WHEEL_REWARDS.length}deg ${((i + 1) * 360) / WHEEL_REWARDS.length}deg`
                ).join(', ')})`
              }}
            >
              {/* Reward Labels */}
              {WHEEL_REWARDS.map((reward, index) => {
                const angle = (index * 360) / WHEEL_REWARDS.length;
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
                    {reward}
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
          {canSpin() ? (
            <Button
              variant="spin"
              size="xl"
              onClick={handleSpin}
              disabled={isSpinning || !user}
              className="w-full"
            >
              {isSpinning ? 'Spinning...' : 'SPIN TO WIN!'}
            </Button>
          ) : (
            <div className="space-y-2">
              <Button variant="outline" size="xl" disabled className="w-full">
                Next spin in: {getTimeUntilNextSpin()}
              </Button>
              <p className="text-sm text-muted-foreground">
                Come back in a few minutes for another spin!
              </p>
            </div>
          )}
        </div>

        {/* Current Balance */}
        {profile && (
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Your Balance</p>
            <div className="flex items-center justify-center gap-2">
              <Coins className="w-5 h-5 text-secondary" />
              <span className="text-2xl font-bold text-secondary">
                {profile.coin_balance.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SpinWheel;