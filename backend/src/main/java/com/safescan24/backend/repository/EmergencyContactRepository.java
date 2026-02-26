package com.safescan24.backend.repository;

import com.safescan24.backend.entity.EmergencyContact;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface EmergencyContactRepository extends JpaRepository<EmergencyContact, UUID> {
    List<EmergencyContact> findByUserIdOrderByDisplayOrderAsc(UUID userId);
    long countByUserIdAndVerifiedTrue(UUID userId);
}