package com.mygarage.backend.sharing;
import org.springframework.data.jpa.repository.JpaRepository;
public interface SecurityAuditRepository extends JpaRepository<SecurityAuditLog, Long> {}
