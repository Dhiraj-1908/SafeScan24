package com.safescan24.backend.controller;

import com.safescan24.backend.repository.EmergencyContactRepository;
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
    private final ExotelService exotelService;

    @PostMapping("/initiate")
    public ResponseEntity<?> initiateCall(@RequestBody Map<String, String> body) {
        String contactId   = body.get("contactId");
        String scannerPhone = body.get("scannerPhone");

        if (contactId == null || scannerPhone == null || scannerPhone.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "contactId and scannerPhone are required"));
        }

        // Normalize scanner phone — ensure +91 prefix
        if (!scannerPhone.startsWith("+")) {
            scannerPhone = "+91" + scannerPhone.replaceAll("[^0-9]", "");
        }

        // Look up contact's private phone from DB — never sent to frontend
        var contact = contactRepo.findById(UUID.fromString(contactId)).orElse(null);
        if (contact == null) {
            return ResponseEntity.notFound().build();
        }

        String contactPhone = contact.getPhone();
        if (contactPhone == null || contactPhone.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Contact has no phone number"));
        }

        // Normalize contact phone
        if (!contactPhone.startsWith("+")) {
            contactPhone = "+91" + contactPhone.replaceAll("[^0-9]", "");
        }

        boolean success = exotelService.initiateCall(scannerPhone, contactPhone);

        if (success) {
            return ResponseEntity.ok(Map.of("status", "calling"));
        } else {
            return ResponseEntity.status(502)
                    .body(Map.of("error", "Failed to initiate call. Please try again."));
        }
    }
}