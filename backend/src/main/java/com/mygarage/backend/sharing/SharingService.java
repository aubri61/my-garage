package com.mygarage.backend.sharing;

import com.mygarage.backend.user.UserRepository;
import com.mygarage.backend.sharing.pki.*;
import com.mygarage.backend.vehicle.*;
import com.mygarage.backend.vehicle.dto.VehicleResponse;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static org.springframework.http.HttpStatus.*;
import static com.mygarage.backend.sharing.SharingDtos.*;

@Service
@Transactional
public class SharingService {
    private final VehicleRepository vehicles;
    private final UserRepository users;
    private final RentalRepository rentals;
    private final DigitalAccessGrantRepository grants;
    private final RemoteUnlockRepository unlocks;
    private final SecurityAuditRepository audit;
    private final ApplicationEventPublisher events;
    private final EntityManager entities;
    private final Clock clock;
    private final PkiVerifier pki;
    private final UnlockChallengeRepository challenges;
    public SharingService(VehicleRepository vehicles, UserRepository users, RentalRepository rentals,
            DigitalAccessGrantRepository grants, RemoteUnlockRepository unlocks, SecurityAuditRepository audit,
            ApplicationEventPublisher events, EntityManager entities, Clock clock, PkiVerifier pki, UnlockChallengeRepository challenges) {
        this.vehicles=vehicles; this.users=users; this.rentals=rentals; this.grants=grants;
        this.unlocks=unlocks; this.audit=audit; this.events=events; this.entities=entities; this.clock=clock; this.pki=pki; this.challenges=challenges;
    }
    @Transactional(readOnly=true)
    public List<AvailableVehicle> available(String email) { return available(email, null, null); }
    @Transactional(readOnly=true)
    public List<AvailableVehicle> available(String email, Instant start, Instant end) {
        if ((start == null) != (end == null)) throw failure(BAD_REQUEST, "INVALID_PERIOD", "시작과 종료 시각을 함께 입력해주세요.");
        if (start != null) validatePeriod(start, end);
        var blocked = start == null ? Set.<Long>of() : Set.copyOf(rentals.unavailableVehicles(email, start, end,
                Set.of(Rental.Status.CONTRACT_PENDING, Rental.Status.CONFIRMED, Rental.Status.ACTIVE), Rental.Status.REQUESTED));
        return vehicles.findPublicForRenter(email).stream().map(v -> AvailableVehicle.from(v, start == null ? null : !blocked.contains(v.getId()))).toList();
    }
    @Transactional(readOnly=true)
    public AvailableVehicle publicDetail(String email, Long id) {
        var v=vehicles.findById(id).filter(vehicle -> vehicle.isSharingEnabled() && !vehicle.getOwner().getEmail().equals(email))
                .orElseThrow(VehicleNotFoundException::new);
        return AvailableVehicle.from(v);
    }
    public VehicleResponse sharing(String email, Long vehicleId, SharingRequest request) {
        Vehicle v=lockVehicle(vehicleId);
        owner(v, email);
        v.configureSharing(request.enabled(), request.pickupLocation(), request.latitude(), request.longitude());
        audit.save(new SecurityAuditLog(email, "SHARING_CHANGED", null));
        events.publishEvent(new NotificationService.VehicleChange(email));
        events.publishEvent(new NotificationService.InventoryChange());
        return VehicleResponse.from(v);
    }
    public RentalView request(String email, RentalRequest input) {
        Vehicle v=lockVehicle(input.vehicleId());
        if (!v.isSharingEnabled()) throw failure(CONFLICT, "NOT_SHARED", "공유가 중단된 차량입니다.");
        if (v.getOwner().getEmail().equals(email)) throw failure(BAD_REQUEST, "OWN_VEHICLE", "본인 차량은 대여할 수 없습니다.");
        validatePeriod(input.startsAt(), input.endsAt());
        for (Rental other : rentals.findAllByVehicleId(v.getId())) {
            if (!overlaps(other, input.startsAt(), input.endsAt())) continue;
            if (reserved(other.getStatus()) || (other.getStatus() == Rental.Status.REQUESTED && other.getRenter().getEmail().equals(email)))
                throw failure(CONFLICT, "RENTAL_CONFLICT", "예약 또는 동일 사용자의 요청과 시간이 겹칩니다.");
        }
        var renter=users.findByEmail(email).orElseThrow(() -> failure(UNAUTHORIZED, "UNAUTHORIZED", "로그인이 필요합니다."));
        Rental rental=rentals.save(new Rental(v, renter, input.startsAt(), input.endsAt()));
        changed(rental, email, "RENTAL_REQUESTED");
        return view(rental);
    }
    public List<RentalView> list(String email) {
        // Stable lock order prevents deadlocks when a user participates in several vehicles.
        var ids=rentals.findForParticipant(email).stream().map(r -> r.getId()).toList();
        var vehicleIds=ids.stream().map(id -> rentals.findById(id).orElseThrow().getVehicle().getId()).distinct().sorted().toList();
        vehicleIds.forEach(this::lockVehicle);
        return ids.stream().map(id -> {
            var r=rentals.findById(id).orElseThrow(); entities.refresh(r); reconcile(r); return view(r);
        }).toList();
    }
    public RentalView detail(String email, Long id) {
        Rental r=lockedRental(id); participant(r, email); reconcile(r); return view(r);
    }
    public RentalView decide(String email, Long id, boolean approve) {
        Rental r=lockedRental(id); owner(r.getVehicle(), email); reconcile(r);
        require(r.getStatus() == Rental.Status.REQUESTED, "대여 신청은 한 번만 처리할 수 있습니다.");
        if (approve) {
            require(r.getEndsAt().isAfter(clock.instant()), "이미 종료된 대여 요청입니다.");
            require(r.getVehicle().isSharingEnabled(), "공유가 중단된 차량입니다.");
            for (Rental other : rentals.findAllByVehicleId(r.getVehicle().getId())) {
                // Refresh after the vehicle lock; approvals on this vehicle are serialized.
                entities.refresh(other);
                if (!other.getId().equals(r.getId()) && reserved(other.getStatus()) && overlaps(other, r.getStartsAt(), r.getEndsAt()))
                    throw failure(CONFLICT, "RENTAL_CONFLICT", "승인된 예약과 시간이 겹칩니다.");
            }
            r.setStatus(Rental.Status.CONTRACT_PENDING);
        } else r.setStatus(Rental.Status.REJECTED);
        changed(r, email, approve ? "RENTAL_APPROVED" : "RENTAL_REJECTED"); return view(r);
    }
    public RentalView consent(String email, Long id) {
        Rental r=lockedRental(id); participant(r, email); reconcile(r);
        require(r.getStatus() == Rental.Status.CONTRACT_PENDING || r.getStatus() == Rental.Status.CONFIRMED || r.getStatus() == Rental.Status.ACTIVE,
                "현재 상태에서는 계약에 동의할 수 없습니다.");
        boolean isOwner=r.getVehicle().getOwner().getEmail().equals(email);
        if ((isOwner ? r.getOwnerConsentedAt() : r.getRenterConsentedAt()) != null) return view(r);
        if (isOwner) r.consentOwner(clock.instant()); else r.consentRenter(clock.instant());
        if (r.getOwnerConsentedAt() != null && r.getRenterConsentedAt() != null) {
            r.setStatus(Rental.Status.CONFIRMED);
            grants.save(new DigitalAccessGrant(r));
        }
        changed(r, email, "CONSENT_RECORDED"); reconcile(r); return view(r);
    }
    public RentalView revoke(String email, Long id, boolean complete) {
        Rental r=lockedRental(id); owner(r.getVehicle(), email); reconcile(r);
        if (complete && r.getStatus() == Rental.Status.COMPLETED) return view(r);
        var grant=grants.findByRentalId(id).orElseThrow(() -> failure(CONFLICT, "NO_GRANT", "발급된 접근 권한이 없습니다."));
        if (grant.getRevokedAt() != null && !complete) return view(r);
        if (grant.getRevokedAt() == null) grant.revoke(clock.instant());
        cancelPending(r, RemoteUnlockRequest.Status.CANCELLED);
        r.getVehicle().setLockState(Vehicle.LockState.LOCKED);
        if (complete) r.setStatus(Rental.Status.COMPLETED);
        changed(r, email, complete ? "RENTAL_COMPLETED" : "GRANT_REVOKED"); return view(r);
    }
    public record ChallengeView(Long id, String payload, Instant expiresAt) {}
    public ChallengeView challenge(String email, Long id) {
        Rental r=lockedRental(id); renter(r,email); reconcile(r); validGrant(r);
        var outstanding=challenges.findFirstByRentalIdAndUsedAtIsNullAndExpiresAtAfterOrderByIdDesc(id,clock.instant());
        if (outstanding.isPresent()) {
            var c=outstanding.get(); return new ChallengeView(c.getId(),c.payload(),c.getExpiresAt());
        }
        byte[] nonce=new byte[32]; new java.security.SecureRandom().nextBytes(nonce);
        var challenge=challenges.save(new UnlockChallenge(r.getId(),r.getRenter().getId(),r.getVehicle().getId(),
                java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(nonce),clock.instant().plusSeconds(120)));
        return new ChallengeView(challenge.getId(),challenge.payload(),challenge.getExpiresAt());
    }
    public RentalView requestUnlock(String email, Long id) { return requestUnlock(email,id,null); }
    public RentalView requestUnlock(String email, Long id, PkiVerifier.Proof proof) {
        Rental r=lockedRental(id); renter(r, email); reconcile(r); validGrant(r);
        if (unlocks.findAllByRentalIdOrderByIdDesc(id).stream().anyMatch(u -> u.getStatus() == RemoteUnlockRequest.Status.PENDING))
            throw failure(CONFLICT, "UNLOCK_PENDING", "처리 대기 중인 잠금 해제 요청이 있습니다.");
        if (proof == null && pki.required()) throw failure(FORBIDDEN,"PKI_REQUIRED","서명된 기기 접근 요청이 필요합니다.");
        if (proof != null) {
            var challenge=challenges.findById(proof.challengeId()).orElseThrow(() -> failure(FORBIDDEN,"CHALLENGE_INVALID","접근 챌린지를 찾을 수 없습니다."));
            if (!challenge.getRentalId().equals(r.getId()) || !challenge.getUserId().equals(r.getRenter().getId())
                    || !challenge.getVehicleId().equals(r.getVehicle().getId()) || challenge.getUsedAt() != null
                    || !clock.instant().isBefore(challenge.getExpiresAt()))
                throw failure(FORBIDDEN,"CHALLENGE_INVALID","접근 챌린지가 만료·사용되었거나 대상이 다릅니다.");
            pki.verify(proof,challenge,email,clock.instant());
            challenge.consume(clock.instant());
            changed(r,email,"PKI_VERIFIED");
        }
        var unlock=new RemoteUnlockRequest(r); unlock.setProof(proof);
        unlocks.save(unlock); changed(r, email, "UNLOCK_REQUESTED"); return view(r);
    }
    public RentalView decideUnlock(String email, Long id, boolean approve) {
        var request=unlocks.findById(id).orElseThrow(() -> failure(NOT_FOUND, "NOT_FOUND", "요청을 찾을 수 없습니다."));
        Rental r=lockedRental(request.getRental().getId()); owner(r.getVehicle(), email); entities.refresh(request); reconcile(r);
        // Always recheck the grant, including for previously approved requests.
        validGrant(r);
        if (request.getStatus() == (approve ? RemoteUnlockRequest.Status.APPROVED : RemoteUnlockRequest.Status.REJECTED)) return view(r);
        require(request.getStatus() == RemoteUnlockRequest.Status.PENDING, "이미 처리되거나 만료된 요청입니다.");
        if (approve) {
            if (request.proof() == null && pki.required()) throw failure(FORBIDDEN,"PKI_REQUIRED","이 요청에는 기기 서명 검증이 없습니다.");
            if (request.proof() != null) {
                var challenge=challenges.findById(request.getChallengeId()).orElseThrow(() -> failure(FORBIDDEN,"CHALLENGE_INVALID","접근 증명이 없습니다."));
                pki.verify(request.proof(),challenge,r.getRenter().getEmail(),clock.instant());
            }
        }
        request.process(approve ? RemoteUnlockRequest.Status.APPROVED : RemoteUnlockRequest.Status.REJECTED, clock.instant());
        if (approve) r.getVehicle().setLockState(Vehicle.LockState.UNLOCKED);
        changed(r, email, approve ? "UNLOCK_APPROVED" : "UNLOCK_REJECTED"); return view(r);
    }
    public VehicleResponse lock(String email, Long id) {
        Vehicle v=lockVehicle(id); owner(v, email); v.setLockState(Vehicle.LockState.LOCKED);
        audit.save(new SecurityAuditLog(email, "VEHICLE_LOCKED", null));
        for (var r : rentals.findAllByVehicleId(id)) if (r.getStatus() == Rental.Status.ACTIVE)
            events.publishEvent(new NotificationService.Change(Set.of(email, r.getRenter().getEmail()), "VEHICLE_LOCKED", r.getId()));
        return VehicleResponse.from(v);
    }
    private void reconcile(Rental r) {
        Instant now=clock.instant();
        if ((r.getStatus() == Rental.Status.CONFIRMED || r.getStatus() == Rental.Status.ACTIVE || r.getStatus() == Rental.Status.CONTRACT_PENDING)
                && !now.isBefore(r.getEndsAt())) {
            r.setStatus(Rental.Status.COMPLETED);
            grants.findByRentalId(r.getId()).ifPresent(g -> { if (g.getRevokedAt() == null) g.revoke(now); });
            cancelPending(r, RemoteUnlockRequest.Status.EXPIRED);
            boolean anotherActive=rentals.findAllByVehicleId(r.getVehicle().getId()).stream().anyMatch(other ->
                    !other.getId().equals(r.getId()) && other.getStatus() == Rental.Status.ACTIVE
                    && !now.isBefore(other.getStartsAt()) && now.isBefore(other.getEndsAt()));
            if (!anotherActive) r.getVehicle().setLockState(Vehicle.LockState.LOCKED);
            changed(r, "system", "RENTAL_COMPLETED");
        } else if (r.getStatus() == Rental.Status.CONFIRMED && !now.isBefore(r.getStartsAt())) {
            r.setStatus(Rental.Status.ACTIVE); changed(r, "system", "GRANT_ACTIVE");
        }
    }
    private void cancelPending(Rental r, RemoteUnlockRequest.Status status) {
        for (var u : unlocks.findAllByRentalIdOrderByIdDesc(r.getId())) if (u.getStatus() == RemoteUnlockRequest.Status.PENDING) {
            u.process(status,clock.instant());
        }
    }
    private void validGrant(Rental r) {
        if (grants.findByRentalId(r.getId()).filter(g -> g.active(clock.instant())).isEmpty())
            throw failure(FORBIDDEN, "ACCESS_DENIED", "접근 권한이 없거나 아직 시작되지 않았거나 만료·회수되었습니다.");
    }
    private Vehicle lockVehicle(Long id) {
        Vehicle v=vehicles.lockById(id).orElseThrow(VehicleNotFoundException::new);
        entities.refresh(v); return v;
    }
    private Rental lockedRental(Long id) {
        entities.flush();
        Rental r=rentals.findById(id).orElseThrow(() -> failure(NOT_FOUND, "NOT_FOUND", "대여를 찾을 수 없습니다."));
        lockVehicle(r.getVehicle().getId()); entities.refresh(r); return r;
    }
    private void participant(Rental r, String email) {
        if (!r.getRenter().getEmail().equals(email) && !r.getVehicle().getOwner().getEmail().equals(email))
            throw failure(NOT_FOUND, "NOT_FOUND", "대여를 찾을 수 없습니다.");
    }
    private void owner(Vehicle v, String email) { if (!v.getOwner().getEmail().equals(email)) throw new VehicleNotFoundException(); }
    private void renter(Rental r, String email) { if (!r.getRenter().getEmail().equals(email)) throw failure(NOT_FOUND, "NOT_FOUND", "대여를 찾을 수 없습니다."); }
    private void validatePeriod(Instant start, Instant end) {
        Instant now=clock.instant();
        if (!start.isBefore(end) || !end.isAfter(now) || start.isBefore(now.minusSeconds(60))
                || end.isAfter(start.plusSeconds(30L*24*3600)))
            throw failure(BAD_REQUEST, "INVALID_PERIOD", "현재 또는 미래의 시작과 30일 이내의 종료 시각을 선택해주세요.");
    }
    private boolean reserved(Rental.Status status) { return Set.of(Rental.Status.CONTRACT_PENDING, Rental.Status.CONFIRMED, Rental.Status.ACTIVE).contains(status); }
    private boolean overlaps(Rental r, Instant start, Instant end) { return r.getStartsAt().isBefore(end) && start.isBefore(r.getEndsAt()); }
    private void require(boolean condition, String message) { if (!condition) throw failure(CONFLICT, "INVALID_STATE", message); }
    private SharingException failure(org.springframework.http.HttpStatus status, String code, String message) { return new SharingException(status, code, message); }
    private void changed(Rental r, String actor, String action) {
        audit.save(new SecurityAuditLog(actor, action, r.getId()));
        events.publishEvent(new NotificationService.Change(Set.of(r.getVehicle().getOwner().getEmail(), r.getRenter().getEmail()), action, r.getId()));
        if (Set.of("RENTAL_REQUESTED", "RENTAL_APPROVED", "RENTAL_REJECTED", "RENTAL_COMPLETED").contains(action))
            events.publishEvent(new NotificationService.InventoryChange());
    }
    private RentalView view(Rental r) {
        var grant=grants.findByRentalId(r.getId()).map(g -> new GrantView(g.active(clock.instant()), g.getStartsAt(), g.getEndsAt(), g.getRevokedAt(), g.getAllowedOperation())).orElse(null);
        return new RentalView(r.getId(), r.getVehicle().getId(), r.getVehicle().getManufacturer()+" "+r.getVehicle().getModel(),
                r.getVehicle().getOwner().getId(), r.getRenter().getId(), r.getPickupLocation(), r.getStartsAt(), r.getEndsAt(), r.getStatus(),
                r.getTermsVersion(), r.getTerms(), r.getOwnerConsentedAt(), r.getRenterConsentedAt(), grant, r.getVehicle().getLockState(),
                unlocks.findAllByRentalIdOrderByIdDesc(r.getId()).stream().map(u -> new UnlockView(u.getId(),u.getStatus(),u.getRequestedAt(),u.getChallengeId() != null)).toList(), r.getVehicle().getOwner().getName(), r.getRenter().getName());
    }
}
