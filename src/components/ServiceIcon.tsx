import {
  Building2,
  Fence,
  House,
  PanelsTopLeft,
  Sparkles,
  SquareDashedBottom,
  Warehouse,
  Waves,
} from "lucide-react";
import type { ServiceIcon as ServiceIconName } from "../data/services";

const ICONS = {
  home: House,
  roof: PanelsTopLeft,
  driveway: SquareDashedBottom,
  windows: Sparkles,
  gutters: Waves,
  deck: Building2,
  fence: Fence,
  commercial: Warehouse,
} satisfies Record<ServiceIconName, typeof House>;

export default function ServiceIcon({
  name,
  className = "h-7 w-7",
}: {
  name: ServiceIconName;
  className?: string;
}) {
  const Icon = ICONS[name];
  return <Icon className={className} aria-hidden="true" />;
}
