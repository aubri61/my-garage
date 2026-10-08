export type AvailableVehicle = { id: number; manufacturer: string; model: string; modelYear: number; pickupLocation: string; latitude: number; longitude: number };
export type RentalStatus = "REQUESTED" | "REJECTED" | "CONTRACT_PENDING" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type AccessGrant = { active: boolean; startsAt: string; endsAt: string; revokedAt: string | null; allowedOperation: "REQUEST_UNLOCK" };
export type UnlockRequest = { id: number; status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "CANCELLED"; requestedAt: string; pkiVerified: boolean };
export type Rental = {
  id: number; vehicleId: number; vehicleModel: string; ownerId: number; renterId: number; pickupLocation: string;
  startsAt: string; endsAt: string; status: RentalStatus; termsVersion: string; terms: string;
  ownerConsentedAt: string | null; renterConsentedAt: string | null; accessGrant: AccessGrant | null;
  lockState: "LOCKED" | "UNLOCKED"; unlockRequests: UnlockRequest[];
};
export type SharingSettings = { enabled: boolean; pickupLocation: string; latitude: number; longitude: number };
export const rentalLabels: Record<RentalStatus, string> = {
  REQUESTED: "승인 대기", REJECTED: "거절됨", CONTRACT_PENDING: "계약 동의 대기", CONFIRMED: "대여 시작 대기",
  ACTIVE: "대여 활성", COMPLETED: "대여 종료", CANCELLED: "취소됨",
};
