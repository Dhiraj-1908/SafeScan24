package com.safescan24.backend.repository;

import com.safescan24.backend.entity.QrSlug;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;
import java.util.UUID;

public interface QrSlugRepository extends JpaRepository<QrSlug, UUID> {
    Optional<QrSlug> findBySlug(String slug);

    @Query(value = "SELECT MAX(slug::bigint) FROM qr_slugs WHERE slug ~ '^[0-9]+$'", nativeQuery = true)
    Optional<Long> findMaxNumericSlug();
}
