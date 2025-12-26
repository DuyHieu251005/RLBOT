import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, User as UserIcon, Sparkles } from "lucide-react";

export function AuthPage() {
  const { login, register } = useAuth();

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginEmail || !loginPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoggingIn(true);
    const success = await login(loginEmail, loginPassword, rememberMe);
    setIsLoggingIn(false);

    if (success) {
      toast.success("Logged in successfully!");
    } else {
      toast.error("Invalid email or password");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerName || !registerEmail || !registerPassword || !registerConfirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (registerPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsRegistering(true);
    const success = await register(registerName, registerEmail, registerPassword);
    setIsRegistering(false);

    if (success) {
      toast.success("Account created successfully!");
    } else {
      toast.error("Email already registered");
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-[#9D4EDD] rounded-full blur-[120px] opacity-20"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#5A4635] rounded-full blur-[120px] opacity-15"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 bg-[#1F1F1F] border-[#5A4635] shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-[#2A1B35] border-2 border-[#9D4EDD] flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-[#9D4EDD]" />
            </div>
          </div>
          <CardTitle className="text-2xl text-[#E8DCC8] weathered-text tracking-wider" style={{ fontFamily: 'Merriweather, serif' }}>
            Welcome to RLbot
          </CardTitle>
          <CardDescription className="text-[#9B9380]" style={{ fontFamily: 'Noto Serif, serif' }}>
            Your Personal AI Assistant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#2B2B2B]">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-[#9D4EDD] data-[state=active]:text-white text-[#9B9380]"
              >
                Login
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="data-[state=active]:bg-[#9D4EDD] data-[state=active]:text-white text-[#9B9380]"
              >
                Register
              </TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-[#E8DCC8]">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9380]" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10 bg-[#0F0F0F] border-[#5A4635] text-[#E8DCC8] focus:border-[#9D4EDD]"
                      disabled={isLoggingIn}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-[#E8DCC8]">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9380]" />
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 pr-10 bg-[#0F0F0F] border-[#5A4635] text-[#E8DCC8] focus:border-[#9D4EDD]"
                      disabled={isLoggingIn}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9380] hover:text-[#E8DCC8]"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-[#5A4635] data-[state=checked]:bg-[#9D4EDD] data-[state=checked]:text-white"
                  />
                  <Label
                    htmlFor="remember-me"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-[#9B9380]"
                  >
                    Remember me
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#9D4EDD] hover:bg-[#8A3DC2] text-white font-bold py-2 rounded-sm transition-all duration-300 shadow-[0_0_15px_rgba(157,78,221,0.3)] hover:shadow-[0_0_25px_rgba(157,78,221,0.5)]"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name" className="text-[#E8DCC8]">Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9380]" />
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Your name"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      className="pl-10 bg-[#0F0F0F] border-[#5A4635] text-[#E8DCC8] focus:border-[#9D4EDD]"
                      disabled={isRegistering}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-[#E8DCC8]">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9380]" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="your@email.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="pl-10 bg-[#0F0F0F] border-[#5A4635] text-[#E8DCC8] focus:border-[#9D4EDD]"
                      disabled={isRegistering}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-[#E8DCC8]">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9380]" />
                    <Input
                      id="register-password"
                      type={showRegisterPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="pl-10 pr-10 bg-[#0F0F0F] border-[#5A4635] text-[#E8DCC8] focus:border-[#9D4EDD]"
                      disabled={isRegistering}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9380] hover:text-[#E8DCC8]"
                    >
                      {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password" className="text-[#E8DCC8]">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9380]" />
                    <Input
                      id="register-confirm-password"
                      type={showRegisterPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      className="pl-10 bg-[#0F0F0F] border-[#5A4635] text-[#E8DCC8] focus:border-[#9D4EDD]"
                      disabled={isRegistering}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#9D4EDD] hover:bg-[#C77DFF] text-white"
                  disabled={isRegistering}
                >
                  {isRegistering ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
