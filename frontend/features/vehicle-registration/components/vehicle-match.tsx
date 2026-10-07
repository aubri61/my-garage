import Image from "next/image";
import type { VehicleCandidate } from "@/features/vehicle-registration/types";
export function VehicleMatch({ candidate }: { candidate: VehicleCandidate }) {
  return <section className="registration-vehicle" aria-label="조회된 차량">
    <Image src={candidate.vehicle.image.src} alt={candidate.vehicle.image.alt} width={480} height={320} sizes="(max-width: 700px) 80vw, 360px" />
    <h2>{candidate.vehicle.modelName}</h2><p>{candidate.vehicle.trim}</p>
    <dl><div><dt>동력 유형</dt><dd>{candidate.vehicle.powertrain === "electric" ? "전기차" : "가솔린"}</dd></div><div><dt>차대번호 (VIN)</dt><dd className="vin-value">{candidate.vin}</dd></div></dl>
  </section>;
}
