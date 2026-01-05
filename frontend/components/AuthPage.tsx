import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Mail, Lock, User as UserIcon, Sparkles, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const { login, register } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsLoggingIn(true);
    try {
      await login(loginEmail, loginPassword, rememberMe);
      toast.success("Welcome back, traveler!");
    } catch (error) {
      toast.error("Invalid credentials. The gates remain closed.");
    } finally {
      setIsLoggingIn(false);
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
    try {
      await register(registerName, registerEmail, registerPassword);
      toast.success("Account created! Verify your email to enter.");
      setActiveTab("login");
    } catch (error) {
      toast.error("Registration failed. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden min-h-screen">
      <div className="w-full max-w-md relative z-10">
        <Card className="bg-[#1A1A1A]/95 backdrop-blur-md border-[#5A4635]/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
          <CardHeader className="text-center pb-2">
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
            {/* Tab Switcher */}
            <div className="grid grid-cols-2 bg-[#2B2B2B] p-1 rounded-full mb-6 relative">
              <button
                onClick={() => setActiveTab("login")}
                className={`relative z-10 py-2 text-sm font-medium transition-colors duration-200 rounded-full ${activeTab === "login" ? "text-white bg-[#9D4EDD]" : "text-[#9B9380] hover:text-[#E8DCC8]"}`}
              >
                Login
              </button>
              <button
                onClick={() => setActiveTab("register")}
                className={`relative z-10 py-2 text-sm font-medium transition-colors duration-200 rounded-full ${activeTab === "register" ? "text-white bg-[#9D4EDD]" : "text-[#9B9380] hover:text-[#E8DCC8]"}`}
              >
                Register
              </button>
            </div>

            {activeTab === "login" ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
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
                        className="pl-10 bg-[#0F0F0F] border-[#5A4635] text-[#E8DCC8] focus:border-[#9D4EDD] focus:outline-none transition-all rounded-xl"
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
                        className="pl-10 pr-10 bg-[#0F0F0F] border-[#5A4635] text-[#E8DCC8] focus:border-[#9D4EDD] focus:outline-none transition-all rounded-xl"
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
                    className="w-full bg-[#9D4EDD] hover:bg-[#8A3DC2] text-white font-bold py-2 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(157,78,221,0.3)] hover:shadow-[0_0_25px_rgba(157,78,221,0.5)]"
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
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
                        className="pl-10 bg-[#0F0F0F] border-[#5A4635] text-[#E8DCC8] focus:border-[#9D4EDD] focus:outline-none transition-all rounded-xl"
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
                        className="pl-10 bg-[#0F0F0F] border-[#5A4635] text-[#E8DCC8] focus:border-[#9D4EDD] focus:outline-none transition-all rounded-xl"
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
                        className="pl-10 pr-10 bg-[#0F0F0F] border-[#5A4635] text-[#E8DCC8] focus:border-[#9D4EDD] focus:outline-none transition-all rounded-xl"
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
                        className="pl-10 bg-[#0F0F0F] border-[#5A4635] text-[#E8DCC8] focus:border-[#9D4EDD] focus:outline-none transition-all rounded-xl"
                        disabled={isRegistering}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#9D4EDD] hover:bg-[#8A3DC2] text-white font-bold py-2 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(157,78,221,0.3)] hover:shadow-[0_0_25px_rgba(157,78,221,0.5)]"
                    disabled={isRegistering}
                  >
                    {isRegistering ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
