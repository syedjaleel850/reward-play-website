import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Gift, Smartphone, Receipt, ShoppingCart, Coins } from 'lucide-react';

const REDEMPTION_OPTIONS = [
  {
    id: 'mobile_recharge',
    title: 'Mobile Recharge',
    description: 'Recharge your mobile phone',
    icon: <Smartphone className="w-6 h-6" />,
    minCoins: 100,
    conversionRate: 0.1, // 10 coins = ₹1
  },
  {
    id: 'bill_payment',
    title: 'Bill Payment',
    description: 'Pay utility bills',
    icon: <Receipt className="w-6 h-6" />,
    minCoins: 200,
    conversionRate: 0.1,
  },
  {
    id: 'gift_card',
    title: 'Gift Cards',
    description: 'Various gift cards',
    icon: <ShoppingCart className="w-6 h-6" />,
    minCoins: 500,
    conversionRate: 0.1,
  },
];

const RedemptionCenter = () => {
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redemptionData, setRedemptionData] = useState({
    amount: '',
    target: '',
    details: '',
  });

  const calculateCoinsNeeded = (amount: number, conversionRate: number) => {
    return Math.ceil(amount / conversionRate);
  };

  const handleRedeem = async () => {
    if (!user || !profile || !selectedOption) return;

    const amount = parseFloat(redemptionData.amount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }

    const coinsNeeded = calculateCoinsNeeded(amount, selectedOption.conversionRate);
    
    if (profile.coin_balance < coinsNeeded) {
      toast({
        title: "Insufficient Coins",
        description: `You need ${coinsNeeded} coins but only have ${profile.coin_balance}.`,
        variant: "destructive",
      });
      return;
    }

    if (!redemptionData.target) {
      toast({
        title: "Missing Information",
        description: "Please provide the required target information.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const newBalance = profile.coin_balance - coinsNeeded;

      // Create redemption request
      const { error: redemptionError } = await supabase
        .from('redemptions')
        .insert({
          user_id: user.id,
          type: selectedOption.id,
          coins_spent: coinsNeeded,
          equivalent_value: amount,
          target_info: {
            target: redemptionData.target,
            details: redemptionData.details,
            amount: amount,
          },
          status: 'pending',
        });

      if (redemptionError) throw redemptionError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'redeem',
          amount: coinsNeeded,
          description: `${selectedOption.title} - ₹${amount}`,
          balance_after: newBalance,
        });

      if (transactionError) throw transactionError;

      // Update profile balance
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ coin_balance: newBalance })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      toast({
        title: "Redemption Successful!",
        description: `Your ${selectedOption.title} request has been submitted and will be processed within 24 hours.`,
        variant: "default",
      });

      setIsDialogOpen(false);
      setRedemptionData({ amount: '', target: '', details: '' });
      refreshProfile();

    } catch (error) {
      console.error('Error processing redemption:', error);
      toast({
        title: "Redemption Failed",
        description: "Failed to process your redemption. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTargetLabel = (optionId: string) => {
    switch (optionId) {
      case 'mobile_recharge':
        return 'Mobile Number';
      case 'bill_payment':
        return 'Account Number';
      case 'gift_card':
        return 'Email Address';
      default:
        return 'Target';
    }
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5" />
          Redeem Coins
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {REDEMPTION_OPTIONS.map((option) => {
            const canAfford = profile && profile.coin_balance >= option.minCoins;
            
            return (
              <Dialog key={option.id} open={isDialogOpen && selectedOption?.id === option.id} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      canAfford 
                        ? 'hover:border-primary hover:bg-muted/50 border-border' 
                        : 'opacity-50 cursor-not-allowed border-muted'
                    }`}
                    onClick={() => {
                      if (canAfford) {
                        setSelectedOption(option);
                        setIsDialogOpen(true);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${canAfford ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {option.icon}
                        </div>
                        <div>
                          <h4 className="font-semibold">{option.title}</h4>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge variant={canAfford ? "default" : "secondary"}>
                          Min {option.minCoins} coins
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {option.minCoins} coins = ₹{option.minCoins * option.conversionRate}
                        </p>
                      </div>
                    </div>
                  </div>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      {option.icon}
                      {option.title}
                    </DialogTitle>
                    <DialogDescription>
                      Enter the details for your {option.title.toLowerCase()} redemption.
                      Conversion rate: 10 coins = ₹1
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="grid w-full items-center gap-1.5">
                      <Label htmlFor="amount">Amount (₹)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Enter amount in rupees"
                        value={redemptionData.amount}
                        onChange={(e) => setRedemptionData(prev => ({ ...prev, amount: e.target.value }))}
                      />
                      {redemptionData.amount && (
                        <p className="text-sm text-muted-foreground">
                          Required coins: {calculateCoinsNeeded(parseFloat(redemptionData.amount) || 0, option.conversionRate)}
                        </p>
                      )}
                    </div>

                    <div className="grid w-full items-center gap-1.5">
                      <Label htmlFor="target">{getTargetLabel(option.id)}</Label>
                      <Input
                        id="target"
                        placeholder={`Enter your ${getTargetLabel(option.id).toLowerCase()}`}
                        value={redemptionData.target}
                        onChange={(e) => setRedemptionData(prev => ({ ...prev, target: e.target.value }))}
                      />
                    </div>

                    <div className="grid w-full items-center gap-1.5">
                      <Label htmlFor="details">Additional Details (Optional)</Label>
                      <Input
                        id="details"
                        placeholder="Any additional information"
                        value={redemptionData.details}
                        onChange={(e) => setRedemptionData(prev => ({ ...prev, details: e.target.value }))}
                      />
                    </div>

                    {profile && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Your Balance:</span>
                          <div className="flex items-center gap-1">
                            <Coins className="w-4 h-4 text-secondary" />
                            <span className="font-bold">{profile.coin_balance}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handleRedeem}
                      disabled={loading}
                      variant="success"
                      className="w-full"
                    >
                      {loading ? 'Processing...' : 'Confirm Redemption'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>

        {profile && profile.coin_balance < REDEMPTION_OPTIONS[0].minCoins && (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              You need at least {REDEMPTION_OPTIONS[0].minCoins} coins to start redeeming rewards.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Keep playing games to earn more coins!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RedemptionCenter;