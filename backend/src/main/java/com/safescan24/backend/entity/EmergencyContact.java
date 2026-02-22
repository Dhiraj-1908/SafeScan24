package com.safescan24.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "emergency_contacts")
@Data
@NoArgsConstructor
public class EmergencyContact {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "qr_slug_id", nullable = false)
    private UUID qrSlugId;

    @Column(nullable = false)
    private String name;

    private String phone;

    private String relationship;

    @Column(nullable = false)
    private boolean verified = false;

    @Column(name = "display_order")
    private int displayOrder = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}