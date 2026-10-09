"use client";

import { useState } from "react";
import Link from "next/link";
import type { VehicleResponse } from "@/services/types";
import { rentalLabels, type Rental } from "../types";
import { rentalVehicleName, personName } from "../presentation";
import { PickupMap } from "./pickup-map";
import { LoadingSkeleton } from "@/components/platform/platform-ui";

export function OwnerOperations({ vehicles, rentals, pending, failed }: { vehicles: VehicleResponse[]; rentals: Rental[]; pending: boolean; failed: boolean }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const schedule = rentals.filter(rental => ["CONTRACT_PENDING", "CONFIRMED", "ACTIVE"].includes(rental.status)).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const requests = rentals.flatMap(rental => rental.unlockRequests.filter(request => request.status === "PENDING"));
  const pickups = vehicles.flatMap(vehicle => vehicle.pickupLatitude != null && vehicle.pickupLongitude != null && vehicle.pickupLocation ? [{ id: vehicle.id, manufacturer: vehicle.manufacturer, model: vehicle.model, modelYear: vehicle.modelYear, pickupLocation: vehicle.pickupLocation, latitude: vehicle.pickupLatitude, longitude: vehicle.pickupLongitude }] : []);
  return <section className="host-operations">
    <div className="sharing-panel host-timeline"><div className="sharing-title"><div><h2>예약 일정</h2><p className="field-hint">계약 및 이용 기간을 확인하세요.</p></div><Link className="platform-pill" href="/bookings?mode=owner">전체 보기</Link></div>
      {pending ? <LoadingSkeleton /> : failed ? <p role="status" className="field-hint">일정을 불러오지 못했습니다. 위 조회 오류를 확인해주세요.</p> : schedule.length ? <ol>{schedule.slice(0, 5).map(rental => <li key={rental.id}><span className="timeline-dot" aria-hidden="true" /><Link href={`/contracts/${rental.id}`}><strong>{rentalVehicleName(rental.vehicleModel)}</strong><span>{personName(rental.renterName)} · {new Date(rental.startsAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} ~ {new Date(rental.endsAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span></Link><span className="sharing-status">{rentalLabels[rental.status]}</span></li>)}</ol> : <div className="host-inline-empty"><p>예정된 대여 일정이 없습니다.</p><span>양측 계약 동의가 완료되면 예약이 확정됩니다.</span></div>}
    </div>
    <div className="sharing-panel host-access-panel"><div className="sharing-title"><h2>디지털 접근 관리</h2><span className="platform-badge">소유자 승인</span></div>
      {pending ? <LoadingSkeleton /> : failed ? <p role="status" className="field-hint">접근 현황을 불러오지 못했습니다.</p> : <><div className="host-access-summary"><div><span>해제 승인 대기</span><strong>{requests.length}<small>건</small></strong></div><div><span>활성 접근 권한</span><strong>{rentals.filter(rental => rental.accessGrant?.active).length}<small>건</small></strong></div></div>{pickups.length > 0 && <div className="host-pickup-map"><PickupMap vehicles={pickups} selectedId={selectedId} onSelect={setSelectedId} /><p className="field-hint">등록된 픽업 위치 · 실시간 차량 위치가 아닙니다.</p></div>}<Link href="/digital-key?mode=owner" className="platform-button">접근 요청 및 가상 잠금 관리 →</Link></>}
      <p className="sharing-disclosure">잠금 상태는 DB 시뮬레이션입니다. 실제 차량 명령을 전송하지 않습니다.</p>
    </div>
  </section>;
}
