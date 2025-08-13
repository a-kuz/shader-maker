// @ts-expect-error - No type definitions available for anchor-pki
import autoCert from "anchor-pki/auto-cert/integrations/next";
import type { NextConfig } from "next";

const withAutoCert = autoCert({
  enabledEnv: "development",
});

const nextConfig: NextConfig = {
  
};

export default withAutoCert(nextConfig);
