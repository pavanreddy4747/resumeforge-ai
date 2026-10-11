import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * Renders Google's own Sign-In button via Google Identity Services (GIS).
 * Loads the GIS script lazily so the app doesn't pay for it when the feature
 * isn't configured. Silently renders nothing if VITE_GOOGLE_CLIENT_ID is unset,
 * so the rest of the login/register pages keep working without Google set up.
 */
export default function GoogleSignInButton({ onError }) {
  const { loginWithGoogle } = useAuth();
  const buttonRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;

    function renderButton() {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            await loginWithGoogle(response.credential);
          } catch (err) {
            onError?.(err.response?.data?.message || "Google sign-in failed");
          }
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
      });
    }

    if (window.google) {
      renderButton();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.body.appendChild(script);

    return () => {
      // Leave the script cached for subsequent mounts; GIS handles re-init fine.
    };
  }, [clientId, loginWithGoogle, onError]);

  if (!clientId) return null;

  return (
    <div className="flex flex-col items-center gap-3 my-4">
      <div className="flex items-center w-full gap-3 text-xs text-slate-400">
        <div className="h-px bg-slate-200 flex-1" />
        OR
        <div className="h-px bg-slate-200 flex-1" />
      </div>
      <div ref={buttonRef} />
    </div>
  );
}
