"use client";

import { useEffect, useRef } from "react";
import type { GarageDashboardData, GarageServiceAvailability } from "@/features/garage/types";
import type { Vehicle } from "@/features/vehicle/types";
import type { VehicleAction } from "@/features/vehicle/components/remote-control-overview";
import { VehicleStatus } from "@/features/vehicle/components/vehicle-status";
import { ClimateSettings } from "@/features/vehicle/components/climate-settings";
import { SoftwareUpdateCard } from "@/features/updates/components/software-update-card";
import { ChargingReservationCard } from "@/features/charging/components/charging-reservation-card";

import { OtaSecurityLab } from "@/features/updates/components/ota-security-lab";
import { ServerVehicleDetails } from "./server-vehicle-details";

const titles = { details: "차량 정보", cooling: "공조 설정", heating: "난방 설정", doors: "문 잠금 해제", updates: "업데이트 정보", charging: "충전 정보" };

type Props = {
  action: VehicleAction | "details";
  vehicle: Vehicle;
  summary: GarageDashboardData["updatesByVehicleId"][string];
  eligibility: GarageDashboardData["charging"];
  availability: GarageServiceAvailability;
  onClose: () => void;
};

export function VehicleActionDialog({ action, vehicle, summary, eligibility, availability, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPointerDown = useRef(false);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; };
  }, []);

  function closeDialog() {
    dialogRef.current?.close();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="vehicle-dialog"
      aria-labelledby="vehicle-dialog-title"
      onCancel={(event) => { event.preventDefault(); closeDialog(); }}
      onPointerDown={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        backdropPointerDown.current = event.target === event.currentTarget &&
          (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
      }}
      onPointerCancel={() => { backdropPointerDown.current = false; }}
      onClick={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
        if (backdropPointerDown.current && event.target === event.currentTarget && outside) closeDialog();
        backdropPointerDown.current = false;
      }}
    >
      <div className="dialog-header"><div><p>{vehicle.modelName}</p><h2 id="vehicle-dialog-title">{titles[action]}</h2></div><button type="button" className="dialog-close" onClick={closeDialog} aria-label="팝업 닫기">×</button></div>
      <div className="dialog-content">
        {action === "details" && (vehicle.source === "api" ? <ServerVehicleDetails vehicleId={Number(vehicle.id)} /> : <><p className="dialog-description">{vehicle.trim}</p><VehicleStatus vehicle={vehicle} /></>)}
        {(action === "cooling" || action === "heating") && <ClimateSettings vehicle={vehicle} mode={action} />}
        {action === "doors" && <>
          <p className="dialog-description">{vehicle.connectionStatus === "connected" ? "현재" : "마지막 확인"} 도어 상태: {vehicle.doorStatus === "locked" ? "잠김" : vehicle.doorStatus === "unlocked" ? "잠금 해제" : "확인 불가"}</p>
          <p className="door-guidance">문 잠금 해제는 차량에 접근할 수 있게 하는 원격 제어입니다. 실행 전 선택한 차량을 확인하세요.</p>
          <button className="service-action dialog-action" type="button" disabled aria-describedby="door-execution-note">잠금 해제 요청</button>
          <p id="door-execution-note" className="action-note">{vehicle.connectionStatus !== "connected" ? "차량이 다시 연결된 후 사용할 수 있습니다." : vehicle.doorStatus === "unlocked" ? "이미 문 잠금이 해제되어 있습니다." : "원격 실행 요청 흐름은 다음 단계에서 연결합니다."}</p>
        </>}
        {action === "updates" && (vehicle.source === "api" ? <OtaSecurityLab key={vehicle.id} vehicleId={Number(vehicle.id)} vehicleName={vehicle.modelName} /> : <SoftwareUpdateCard summary={summary} vehicleName={vehicle.modelName} available={availability.updates} />)}
        {action === "charging" && vehicle.powertrain === "electric" && <ChargingReservationCard vehicle={vehicle} eligibility={eligibility} action={{ href: "/charging", available: availability.charging }} />}
      </div>
    </dialog>
  );
}
