import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import SpinWheel from '@/components/SpinWheel';
import TransactionHistory from '@/components/TransactionHistory';
import RedemptionCenter from '@/components/RedemptionCenter';
import { Coins, Gamepad2, Gift, User, LogOut, Trophy } from 'lucide-react';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();

  const handleSignOut = async () => {
    await signOut();
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1">
                <Coins className="w-6 h-6 text-secondary" />
                <Gamepad2 className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                RewardVault
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-muted/50 px-3 py-2 rounded-lg">
                <Coins className="w-5 h-5 text-secondary" />
                <span className="font-bold text-secondary">
                  {profile.coin_balance.toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {profile.display_name || profile.email}
                </span>
              </div>
              
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {profile.display_name || 'Player'}! 🎮
          </h2>
          <p className="text-muted-foreground text-lg">
            Ready to play some games and earn rewards?
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-secondary border-secondary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary-foreground/80 text-sm font-medium">
                    Total Coins
                  </p>
                  <p className="text-3xl font-bold text-secondary-foreground">
                    {profile.coin_balance.toLocaleString()}
                  </p>
                </div>
                <Coins className="w-8 h-8 text-secondary-foreground/80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-primary border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary-foreground/80 text-sm font-medium">
                    Games Played
                  </p>
                  <p className="text-3xl font-bold text-primary-foreground">
                    Coming Soon
                  </p>
                </div>
                <Gamepad2 className="w-8 h-8 text-primary-foreground/80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-success border-accent/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-success-foreground/80 text-sm font-medium">
                    Rewards Claimed
                  </p>
                  <p className="text-3xl font-bold text-success-foreground">
                    Coming Soon
                  </p>
                </div>
                <Trophy className="w-8 h-8 text-success-foreground/80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Games Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <Gamepad2 className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-bold">Games</h3>
            </div>
            
            <SpinWheel 
              onRewardEarned={(amount) => {
                // Optional: Add any additional logic when coins are earned
                console.log(`User earned ${amount} coins from spin wheel`);
              }}
              onCoinsLost={(amount) => {
                // Optional: Add any additional logic when coins are lost
                console.log(`User lost ${amount} coins from spin wheel`);
              }}
            />
          </div>

          {/* Activity Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <Gift className="w-6 h-6 text-accent" />
              <h3 className="text-2xl font-bold">Rewards & Activity</h3>
            </div>
            
            <RedemptionCenter />
            <TransactionHistory />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;