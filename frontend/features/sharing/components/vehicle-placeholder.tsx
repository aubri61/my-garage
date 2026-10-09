"use client";
import Image from "next/image";
import { useState } from "react";
import { ServiceIcon } from "@/components/ui/service-icon";
import { vehicleCategory } from "@/features/vehicle-registration/catalog";
export function VehiclePlaceholder({ manufacturer = "", model = "" }: { manufacturer?: string; model?: string }) {
  const category = vehicleCategory(manufacturer, model);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const sources = [category?.imageUrl, category?.imageKey ? `/images/vehicles/${category.imageKey}-cutout.png` : null].filter((src): src is string => !!src);
  const source = sources.find(src => !failedSources.includes(src));
  return <div className="sharing-vehicle-placeholder">{source ? <><Image src={source} width={600} height={360} alt={category?.imageAlt ?? `${model} 차량 참고 이미지`} sizes="(max-width: 760px) 90vw, 400px" onError={() => setFailedSources(previous => [...previous, source])} /><span className="vehicle-image-note">차종 참고 이미지</span></> : <><ServiceIcon name="vehicle" /><span>차량 사진 준비 중</span></>}</div>;
}
