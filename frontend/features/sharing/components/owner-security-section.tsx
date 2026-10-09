"use client";
import { useId, useState } from "react";
import type { VehicleResponse } from "@/services/types";
import { OtaSecurityLab } from "@/features/updates/components/ota-security-lab";
import { vehicleName } from "../presentation";
export function OwnerSecuritySection({ vehicles }: { vehicles: VehicleResponse[] }) {
  const selectId = useId();
  const [open, setOpen] = useState(false);
  const [id, setId] = useState("");
  const selected = vehicles.find(vehicle => String(vehicle.id) === id);
  return <section className="sharing-section security-section"><h2>보안 기능</h2><p className="section-description">차량 소유자를 위한 소프트웨어 보안 검증 기능입니다. 일반 대여·차량 등록과 별도로 이용할 수 있습니다.</p>
    <details className="sharing-panel" onToggle={event => setOpen(event.currentTarget.open)}><summary>차량 소프트웨어 보안 검증</summary>{open && <><div className="form-field"><label htmlFor={selectId}>검증할 차량</label><select id={selectId} value={id} onChange={event => setId(event.target.value)}><option value="">차량을 선택해주세요</option>{vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicleName(vehicle.manufacturer, vehicle.model)} · {vehicle.modelYear}년</option>)}</select></div>{vehicles.length === 0 && <p>차량 등록 후 이용할 수 있습니다.</p>}{selected && <OtaSecurityLab key={selected.id} vehicleId={selected.id} vehicleName={vehicleName(selected.manufacturer, selected.model)} />}</>}</details>
  </section>;
}
