import Image from "next/image";
import { ServiceIcon } from "@/components/ui/service-icon";
import { vehicleCategory } from "@/features/vehicle-registration/catalog";

export function VehiclePlaceholder({ manufacturer = "", model = "" }: { manufacturer?: string; model?: string }) {
  const category = vehicleCategory(manufacturer, model);
  return <div className="sharing-vehicle-placeholder">{category?.imageUrl ? <><Image src={category.imageUrl} width={600} height={360} alt={`${category.displayName} 참고 이미지`} sizes="(max-width: 760px) 90vw, 400px" /><span className="vehicle-image-note">차종 참고 이미지</span></> : <><ServiceIcon name="vehicle" /><span>차량 사진 준비 중</span></>}</div>;
}
