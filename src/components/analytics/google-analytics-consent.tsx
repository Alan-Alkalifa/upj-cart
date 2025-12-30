"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useState, useEffect } from "react";

export function GoogleAnalyticsConsent() {
  const [hasConsent, setHasConsent] = useState(false);
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  useEffect(() => {
    const checkConsent = () => {
      const consent = localStorage.getItem("cookie-consent");
      setHasConsent(consent === "true");
    };

    checkConsent();
    window.addEventListener("cookie-consent-change", checkConsent);
    return () => window.removeEventListener("cookie-consent-change", checkConsent);
  }, []);

  if (!hasConsent || !gaId) return null;

  return <GoogleAnalytics gaId={gaId} />;
}