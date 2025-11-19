import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { FirebaseError } from "firebase/app";
import { toast } from "@/hooks/use-toast";
import { db, auth } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import {
  Loader2,
  Apple,
  Mail,
  UserPlus,
  LogIn,
  LogOut,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

type ProviderHint = "google.com" | "apple.com" | "password" | null;

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false" {...props}>
      <path
        d="M17.64 9.2045c0-.638-.0571-1.251-.1636-1.836H9v3.472h4.844c-.2091 1.127-.844 2.081-1.797 2.72v2.256h2.904c1.7009-1.566 2.688-3.874 2.688-6.612z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.904-2.256C11.2 14.19 10.2 14.6 9 14.6c-2.31 0-4.268-1.56-4.971-3.654H1.028v2.3C2.508 16.44 5.522 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M4.029 10.946C3.85 10.413 3.75 9.842 3.75 9.25c0-.592.1-1.163.279-1.696V5.254H1.028C.372 6.506 0 7.944 0 9.5s.372 2.994 1.028 4.246l3.001-2.8z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.6c1.318 0 2.506.454 3.438 1.345l2.578-2.579C13.465.892 11.43 0 9 0 5.522 0 2.508 1.56 1.028 4.254l3.001 2.3C4.732 5.16 6.69 3.6 9 3.6z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function Login() {
  const {
    loginWithGoogle,
    loginWithApple,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    user,
    selectedProfileId,
    setSelectedProfileId,
  } = useAuth();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const isLoading =
    loadingEmail || loadingGoogle || loadingApple || loadingReset;
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [suggestedProvider, setSuggestedProvider] =
    useState<ProviderHint>(null);

  const mapAuthError = (err: unknown): string => {
    const code = (err as FirebaseError)?.code || "unknown";
    switch (code) {
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/missing-password":
        return "Please enter your password.";
      case "auth/weak-password":
        return "Password is too weak. Use at least 6 characters.";
      case "auth/user-disabled":
        return "This account has been disabled. Contact support.";
      case "auth/user-not-found":
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "Invalid email or password. Please try again.";
      case "auth/email-already-in-use":
        return "An account with this email already exists. Use the sign-in options shown below.";
      case "auth/account-exists-with-different-credential":
        return "This email is already linked to another sign-in method. Use the recommended option below.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a moment and try again.";
      case "auth/popup-closed-by-user":
        return "The sign-in popup was closed before completing. Try again.";
      case "auth/cancelled-popup-request":
      case "auth/popup-blocked":
        return "Unable to open sign-in popup. Check your browser settings.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      default:
        return "Authentication failed. Please try again.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signin") {
      await withLoading(setLoadingEmail, async () => {
        await signInWithEmail(email, password);
        // Grant sample access based solely on demo email (no password check)
        const lowerEmail = email.toLowerCase();
        if (
          lowerEmail === "workerfacts@gmail.com" ||
          lowerEmail === "rgagne@usph.com"
        ) {
          localStorage.setItem("sampleAccess", "1");
        } else {
          localStorage.removeItem("sampleAccess");
        }
      });
    } else {
      // Never grant sample access on sign up
      localStorage.removeItem("sampleAccess");
      await withLoading(setLoadingEmail, () =>
        signUpWithEmail(email, password),
      );
    }
  };

  const postLoginRedirect = async () => {
    try {
      if (redirect && !redirect.startsWith("/register")) {
        navigate(redirect);
        return;
      }
      const uid = auth.currentUser?.uid || user?.uid;
      if (!uid) {
        navigate("/profiles");
        return;
      }
      const q = query(
        collection(db, "evaluatorProfiles"),
        where("ownerId", "==", uid),
      );
      const snap = await getDocs(q);
      const ids: string[] = [];
      snap.forEach((d) => ids.push(d.id));

      if (ids.length === 0) {
        navigate("/register");
        return;
      }

      // At least one profile exists: take user to selector
      navigate("/profiles");
    } catch {
      navigate("/profiles");
    }
  };

  const withLoading = async (
    setSpecificLoading: React.Dispatch<React.SetStateAction<boolean>>,
    fn: () => Promise<void>,
  ) => {
    setError(null);
    setSuggestedProvider(null);
    setSpecificLoading(true);
    try {
      await fn();
      await postLoginRedirect();
    } catch (e: any) {
      let msg = mapAuthError(e);
      // Try to provide tailored guidance if the email exists with a different provider
      try {
        const code = (e as FirebaseError)?.code;
        let conflictEmail = email;
        if (
          code === "auth/account-exists-with-different-credential" &&
          (e as any)?.customData?.email
        ) {
          conflictEmail = (e as any).customData.email;
        }
        if (
          conflictEmail &&
          (code === "auth/email-already-in-use" ||
            code === "auth/account-exists-with-different-credential")
        ) {
          const methods = await fetchSignInMethodsForEmail(auth, conflictEmail);
          if (methods.includes("google.com")) {
            setSuggestedProvider("google.com");
            msg =
              "This email is registered with Google. Click 'Continue with Google' to sign in.";
          } else if (methods.includes("apple.com")) {
            setSuggestedProvider("apple.com");
            msg =
              "This email is registered with Apple. Click 'Continue with Apple' to sign in.";
          } else if (methods.includes("password")) {
            setSuggestedProvider("password");
            setMode("signin");
            msg =
              "This email already has a password. Please sign in with email and password.";
          }
        }
      } catch {
        // Ignore provider suggestion failures
      }

      setError(msg);
      toast({
        title: "Sign-in error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSpecificLoading(false);
    }
  };

  const withLoadingNoRedirect = async (
    setSpecificLoading: React.Dispatch<React.SetStateAction<boolean>>,
    fn: () => Promise<void>,
    successMessage?: string,
  ) => {
    setError(null);
    setSpecificLoading(true);
    try {
      await fn();
      if (successMessage) {
        toast({ title: successMessage });
      }
    } catch (e: any) {
      const msg = mapAuthError(e);
      setError(msg);
      toast({
        title: "Request error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSpecificLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            Sign {mode === "signin" ? "in" : "up"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 border border-red-200 rounded-md p-2">
              {error}
            </div>
          )}

          {suggestedProvider && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              Recommended action:
              <div className="mt-2 flex gap-2">
                {suggestedProvider === "google.com" && (
                  <Button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      localStorage.removeItem("sampleAccess");
                      return withLoading(setLoadingGoogle, loginWithGoogle);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loadingGoogle ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <GoogleIcon className="h-4 w-4" />
                    )}
                    <span className="ml-2">Continue with Google</span>
                  </Button>
                )}
                {suggestedProvider === "apple.com" && (
                  <Button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      localStorage.removeItem("sampleAccess");
                      return withLoading(setLoadingApple, loginWithApple);
                    }}
                    className="bg-black hover:bg-black/90 text-white"
                  >
                    {loadingApple ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Apple />
                    )}
                    <span className="ml-2">Continue with Apple</span>
                  </Button>
                )}
                {suggestedProvider === "password" && (
                  <span>Switch to sign in and enter your password below.</span>
                )}
              </div>
            </div>
          )}

          <Button
            type="button"
            disabled={isLoading}
            onClick={() => {
              localStorage.removeItem("sampleAccess");
              return withLoading(setLoadingGoogle, loginWithGoogle);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loadingGoogle ? (
              <Loader2 className="animate-spin" />
            ) : (
              <GoogleIcon className="h-4 w-4" />
            )}{" "}
            Continue with Google
          </Button>

          <Button
            type="button"
            disabled={isLoading}
            onClick={() => {
              localStorage.removeItem("sampleAccess");
              return withLoading(setLoadingApple, loginWithApple);
            }}
            className="w-full bg-black hover:bg-black/90 text-white"
          >
            {loadingApple ? <Loader2 className="animate-spin" /> : <Apple />}{" "}
            Continue with Apple
          </Button>

          <form className="grid gap-2 pt-2" onSubmit={handleSubmit}>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-gray-500"></span>
              <button
                type="button"
                className="text-sm text-blue-600 hover:underline"
                disabled={isLoading}
                onClick={async () => {
                  if (!email) {
                    toast({
                      title: "Enter your email",
                      description:
                        "Add your account email to get a reset link.",
                      variant: "destructive",
                    });
                    return;
                  }
                  await withLoadingNoRedirect(
                    setLoadingReset,
                    () => resetPassword(email),
                    "Password reset email sent",
                  );
                }}
              >
                {loadingReset ? (
                  <span className="inline-flex items-center">
                    <Loader2 className="animate-spin h-4 w-4 mr-1" /> Sending...
                  </span>
                ) : (
                  "Forgot password?"
                )}
              </button>
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 text-white hover:bg-blue-600"
            >
              {loadingEmail ? (
                <Loader2 className="animate-spin" />
              ) : mode === "signin" ? (
                <LogIn />
              ) : (
                <UserPlus />
              )}{" "}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
            <button
              type="button"
              className="text-sm text-blue-600 hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin"
                ? "Need an account? Sign up"
                : "Have an account? Sign in"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
