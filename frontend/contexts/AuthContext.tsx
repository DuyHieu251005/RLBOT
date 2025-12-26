import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase, getSupabaseToken } from "../supabaseClient";
import { logger } from "../utils/logger";
import { User as SupabaseUser } from "@supabase/supabase-js";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Convert Supabase user to our User format
  const convertSupabaseUser = (supabaseUser: SupabaseUser): User => {
    // Try multiple sources for display name
    const displayName =
      supabaseUser.user_metadata?.full_name ||  // Some OAuth providers use full_name
      supabaseUser.user_metadata?.name ||       // Our signup uses name
      supabaseUser.user_metadata?.display_name || // Another common field
      supabaseUser.email?.split("@")[0] ||      // Fallback to email prefix
      "User";

    return {
      id: supabaseUser.id,
      email: supabaseUser.email || "",
      name: displayName,
    };
  };

  // Initialize auth state from Supabase session
  useEffect(() => {
    // Check active session
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const userData = convertSupabaseUser(session.user);
          setUser(userData);
          setIsAuthenticated(true);
          logger.log("✅ Supabase session restored:", userData.email);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        logger.error("❌ Error initializing auth:", error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.log("🔔 Supabase auth event:", event);

      if (session?.user) {
        const userData = convertSupabaseUser(session.user);
        setUser(userData);
        setIsAuthenticated(true);
        logger.log("✅ User authenticated:", userData.email);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        logger.log("🔓 User logged out");
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (
    email: string,
    password: string,
    rememberMe: boolean = true,
  ): Promise<boolean> => {
    try {
      logger.log("🔐 Attempting Supabase login for:", email);

      // Store remember me preference for storage configuration
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
      } else {
        sessionStorage.setItem("rememberMe", "false");
        localStorage.removeItem("rememberMe");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error("❌ Supabase login error:", error.message);
        return false;
      }

      if (data.user) {
        const userData = convertSupabaseUser(data.user);
        setUser(userData);
        setIsAuthenticated(true);
        logger.log("✅ Login successful:", userData.email);
        return true;
      }

      return false;
    } catch (error) {
      logger.error("❌ Login error:", error);
      return false;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
  ): Promise<boolean> => {
    try {
      logger.log("📝 Attempting Supabase registration for:", email);

      // Always remember registration
      localStorage.setItem("rememberMe", "true");

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (error) {
        logger.error("❌ Supabase registration error:", error.message);
        return false;
      }

      if (data.user) {
        // Check if email confirmation is required
        if (data.session) {
          // User is logged in immediately (email confirmation disabled)
          const userData = convertSupabaseUser(data.user);
          setUser(userData);
          setIsAuthenticated(true);
          logger.log(
            "✅ Registration successful (auto-login):",
            userData.email,
          );
        } else {
          // Email confirmation required
          logger.log(
            "📧 Registration successful. Please check your email to confirm.",
          );
        }
        return true;
      }

      return false;
    } catch (error) {
      logger.error("❌ Register error:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      logger.log("🔓 Logging out...");

      const { error } = await supabase.auth.signOut();

      if (error) {
        logger.error("❌ Logout error:", error);
      }

      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("rememberMe");
      logger.log("✅ Logged out successfully");
    } catch (error) {
      logger.error("❌ Logout error:", error);
    }
  };

  const value = {
    isAuthenticated,
    user,
    login,
    register,
    logout,
  };

  // Show loading state while checking session
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#2B2B2B]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#9D4EDD] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#E8DCC8] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
