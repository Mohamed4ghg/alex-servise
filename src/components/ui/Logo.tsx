import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <div className={cn("flex items-center select-none", className)}>
      <Image
        src="/images/logo.png"
        alt="Alex Service"
        width={99}
        height={5}
        priority
        className="h-auto w-auto"
      />
    </div>
  );
}