package com.safescan24.backend.controller;

import com.safescan24.backend.repository.EmergencyContactRepository;
import com.safescan24.backend.repository.UserRepository;
import com.safescan24.backend.service.ExotelService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/call")
@RequiredArgsConstructor
public class CallController {

    private final EmergencyContactRepository contactRepo;
    private final UserRepository userRepo;
    private final ExotelService exotelService;

    @PostMapping("/initiate")
    public ResponseEntity<?> initiateCall(@RequestBody Map<String, String> body) {
        String contactId   = body.get("contactId");
        String ownerId     = body.get("ownerId");
        String scannerPhone = body.get("scannerPhone");

        if ((contactId == null && ownerId == null) || scannerPhone == null || scannerPhone.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "contactId or ownerId, and scannerPhone are required"));
        }

        // Normalize scanner phone
        if (!scannerPhone.startsWith("+")) {
            scannerPhone = "+91" + scannerPhone.replaceAll("[^0-9]", "");
        }

        // Resolve target phone — from contact OR owner
        String targetPhone;

        if (contactId != null) {
            // Existing flow — look up emergency contact
            var contact = contactRepo.findById(UUID.fromString(contactId)).orElse(null);
            if (contact == null)
                return ResponseEntity.notFound().build();
            targetPhone = contact.getPhone();
        } else {
            // New flow — look up owner directly
            var owner = userRepo.findById(UUID.fromString(ownerId)).orElse(null);
            if (owner == null)
                return ResponseEntity.notFound().build();
            targetPhone = owner.getPhone();
        }

        if (targetPhone == null || targetPhone.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "No phone number found"));
        }

        // Normalize target phone
        if (!targetPhone.startsWith("+")) {
            targetPhone = "+91" + targetPhone.replaceAll("[^0-9]", "");
        }

        boolean success = exotelService.initiateCall(scannerPhone, targetPhone);
        if (success) {
            return ResponseEntity.ok(Map.of("status", "calling"));
        } else {
            return ResponseEntity.status(502)
                    .body(Map.of("error", "Failed to initiate call. Please try again."));
        }
    }
}