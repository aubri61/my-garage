import type { Rental } from "./types";

export function rentalNotification(rental: Rental, userId: number) {
  const mode = rental.ownerId === userId ? "owner" : "renter";
  const owner = mode === "owner";
  const latest = [...rental.unlockRequests].sort((a, b) => b.id - a.id)[0];
  let title = owner ? "차량 렌탈 신청이 왔어요" : "차량 렌탈 신청을 보냈어요";
  if (rental.status === "REJECTED") title = "차량 렌탈 신청이 거절되었어요";
  if (rental.status === "CANCELLED") title = "차량 렌탈 예약이 취소되었어요";
  if (rental.status === "CONTRACT_PENDING") title = (owner ? rental.ownerConsentedAt : rental.renterConsentedAt) ? "상대방의 계약 동의를 기다리고 있어요" : "예약 승인이 완료됐어요. 계약에 동의해주세요";
  if (rental.status === "CONFIRMED") title = "차량 렌탈 예약이 확정되었어요";
  if (rental.status === "ACTIVE") title = "차량 대여 기간이 시작되었어요";
  if (latest?.status === "PENDING") title = owner ? "차량 문 열기 요청이 왔어요" : "차량 문 열기 승인을 기다리고 있어요";
  if (latest?.status === "APPROVED") title = "차량 문 열기 요청이 승인되었어요";
  if (latest?.status === "REJECTED") title = "차량 문 열기 요청이 거절되었어요";
  if (latest?.status === "APPROVED" && rental.lockState === "LOCKED") title = "차량이 다시 잠겼어요";
  if (rental.accessGrant?.revokedAt) title = "디지털 접근 권한이 회수되었어요";
  if (rental.status === "COMPLETED") title = "차량 대여가 종료되었어요";
  const key = [rental.id, rental.status, rental.ownerConsentedAt, rental.renterConsentedAt, rental.accessGrant?.revokedAt, rental.lockState, latest?.id, latest?.status].join(":");
  return { rental, mode, title, key };
}
