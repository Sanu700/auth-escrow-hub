import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navigate } from 'react-router-dom';
import { Users, Package, Shield, CreditCard } from 'lucide-react';

const Index = () => {
  const { user, profile, loading, signOut } = useAuth();

  // Redirect authenticated users to their respective dashboards
  if (user && profile && !loading) {
    if (profile.user_type === 'vendor') {
      return <Navigate to="/vendor-dashboard" replace />;
    } else if (profile.user_type === 'supplier') {
      return <Navigate to="/supplier-dashboard" replace />;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">VendorConnect</h1>
              <p className="text-sm text-muted-foreground">Connect vendors with suppliers seamlessly</p>
            </div>
            <div className="flex gap-4">
              {user ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Welcome, {profile?.username || user.email}
                  </span>
                  <Button onClick={signOut} variant="outline">
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button asChild>
                  <a href="/auth">Get Started</a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-5xl font-bold text-foreground mb-6">
            Transform Your Business Connections
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Connect vendors with trusted suppliers through our secure platform. Book services, 
            manage payments with escrow protection, and grow your business network.
          </p>
          {!user && (
            <div className="flex justify-center gap-4">
              <Button size="lg" asChild>
                <a href="/auth">Join as Vendor</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/auth">Join as Supplier</a>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Platform Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card>
              <CardHeader className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
                <CardTitle>Vendor Network</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Connect with verified vendors looking for reliable suppliers and services
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-primary" />
                <CardTitle>Service Booking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Easy booking system for services with real-time status tracking
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
                <CardTitle>Escrow Protection</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Secure payments held in escrow until service completion
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-primary" />
                <CardTitle>Secure Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Multiple payment options with industry-standard security
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h4 className="text-2xl font-semibold mb-6 text-center">For Vendors</h4>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Badge variant="secondary" className="text-lg font-bold min-w-[2rem] h-8 flex items-center justify-center">1</Badge>
                  <div>
                    <h5 className="font-semibold">Create Your Account</h5>
                    <p className="text-muted-foreground">Sign up as a vendor and complete your profile</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Badge variant="secondary" className="text-lg font-bold min-w-[2rem] h-8 flex items-center justify-center">2</Badge>
                  <div>
                    <h5 className="font-semibold">Browse Suppliers</h5>
                    <p className="text-muted-foreground">Find verified suppliers that match your needs</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Badge variant="secondary" className="text-lg font-bold min-w-[2rem] h-8 flex items-center justify-center">3</Badge>
                  <div>
                    <h5 className="font-semibold">Book Services</h5>
                    <p className="text-muted-foreground">Request services and set terms with escrow protection</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-2xl font-semibold mb-6 text-center">For Suppliers</h4>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Badge variant="secondary" className="text-lg font-bold min-w-[2rem] h-8 flex items-center justify-center">1</Badge>
                  <div>
                    <h5 className="font-semibold">Join the Platform</h5>
                    <p className="text-muted-foreground">Register as a supplier and showcase your services</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Badge variant="secondary" className="text-lg font-bold min-w-[2rem] h-8 flex items-center justify-center">2</Badge>
                  <div>
                    <h5 className="font-semibold">Receive Requests</h5>
                    <p className="text-muted-foreground">Get booking requests from verified vendors</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Badge variant="secondary" className="text-lg font-bold min-w-[2rem] h-8 flex items-center justify-center">3</Badge>
                  <div>
                    <h5 className="font-semibold">Deliver & Get Paid</h5>
                    <p className="text-muted-foreground">Complete services and receive secure payments</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            © 2024 VendorConnect. Connecting businesses, securing transactions.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
