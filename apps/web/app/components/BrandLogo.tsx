import Image from "next/image";
import { appBrand } from "@/lib/brand";

type BrandLogoProps = {
  size?: "compact" | "full";
};

export function BrandLogo({ size = "compact" }: BrandLogoProps) {
  return (
    <div className={`brand-logo brand-logo-${size}`}>
      <Image src={appBrand.logoPath} alt={`${appBrand.companyName} logo`} width={size === "full" ? 320 : 220} height={size === "full" ? 98 : 67} priority />
    </div>
  );
}
