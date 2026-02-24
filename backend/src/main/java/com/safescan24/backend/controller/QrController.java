package com.safescan24.backend.controller;

import com.safescan24.backend.entity.EmergencyContact;
import com.safescan24.backend.entity.User;
import com.safescan24.backend.repository.EmergencyContactRepository;
import com.safescan24.backend.repository.QrSlugRepository;
import com.safescan24.backend.repository.UserRepository;
import com.safescan24.backend.websocket.SignalHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/qr")
@RequiredArgsConstructor
public class QrController {

    private final QrSlugRepository slugRepo;
    private final UserRepository userRepo;
    private final EmergencyContactRepository contactRepo;
    private final SignalHandler signalHandler;

    @GetMapping("/{slug}")
    public ResponseEntity<?> getQrStatus(@PathVariable String slug) {
        return slugRepo.findBySlug(slug)
            .map(qr -> {
                if (!qr.isClaimed())
                    return ResponseEntity.ok(Map.of("status", "unclaimed"));

                UUID ownerId = qr.getClaimedBy();
                User owner = userRepo.findById(ownerId).orElse(null);
                if (owner == null)
                    return ResponseEntity.ok(Map.of("status", "invalid"));

                boolean online = signalHandler.isOnline(ownerId.toString());

                // Contacts are now per-user, not per-QR
                List<EmergencyContact> contacts = contactRepo
                    .findByUserIdOrderByDisplayOrderAsc(ownerId)
                    .stream()
                    .filter(EmergencyContact::isVerified)
                    .collect(Collectors.toList());

                List<Map<String, String>> contactList = contacts.stream().map(c ->
                    Map.of(
                        "id",           c.getId().toString(),
                        "name",         c.getName(),
                        "relationship", c.getRelationship() != null ? c.getRelationship() : ""
                        // phone intentionally excluded
                    )
                ).collect(Collectors.toList());

                Map<String, Object> result = new LinkedHashMap<>();
                result.put("status",      "claimed");
                result.put("slugId",      qr.getId().toString());
                result.put("ownerName",   owner.getName());
                result.put("ownerId",     ownerId.toString());
                result.put("ownerOnline", online);
                result.put("contacts",    contactList);
                return ResponseEntity.ok(result);
            })
            .orElse(ResponseEntity.ok(Map.of("status", "invalid")));
    }
}