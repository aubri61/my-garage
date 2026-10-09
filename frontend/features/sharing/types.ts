export type AvailableVehicle = { id: number; manufacturer: string; model: string; modelYear: number; pickupLocation: string; pickupDetail?: string | null; pickupInstructions?: string | null; latitude: number; longitude: number; ownerName?: string; available?: boolean | null; hourlyPriceWon?: number | null };
export type RentalStatus = "REQUESTED" | "REJECTED" | "CONTRACT_PENDING" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type AccessGrant = { active: boolean; startsAt: string; endsAt: string; revokedAt: string | null; allowedOperation: "REQUEST_UNLOCK" };
export type UnlockRequest = { id: number; status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "CANCELLED"; requestedAt: string; pkiVerified: boolean };
export type Rental = {
  id: number; vehicleId: number; vehicleModel: string; ownerId: number; renterId: number; pickupLocation: string; pickupDetail?: string | null; pickupInstructions?: string | null;
  startsAt: string; endsAt: string; status: RentalStatus; termsVersion: string; terms: string;
  ownerConsentedAt: string | null; renterConsentedAt: string | null; accessGrant: AccessGrant | null;
  ownerName?: string; renterName?: string; lockState: "LOCKED" | "UNLOCKED"; unlockRequests: UnlockRequest[];
};
export type SharingSettings = { enabled: boolean; pickupLocation: string; pickupDetail?: string | null; pickupInstructions?: string | null; latitude: number; longitude: number };
export const rentalLabels: Record<RentalStatus, string> = {
  REQUESTED: "승인 대기", REJECTED: "거절됨", CONTRACT_PENDING: "계약 동의 필요", CONFIRMED: "승인 완료 · 이용 시작 전",
  ACTIVE: "이용 중", COMPLETED: "대여 종료", CANCELLED: "취소됨",
};
