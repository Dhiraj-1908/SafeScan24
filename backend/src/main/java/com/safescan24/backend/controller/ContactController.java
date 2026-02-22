package com.safescan24.backend.controller;

import com.safescan24.backend.entity.EmergencyContact;
import com.safescan24.backend.repository.EmergencyContactRepository;
import com.safescan24.backend.service.OtpService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
public class ContactController {

    private final EmergencyContactRepository contactRepo;
    private final OtpService otpService;

    // Get contacts for a QR slug
    @GetMapping("/{slugId}")
    public ResponseEntity<?> getContacts(@PathVariable UUID slugId) {
        return ResponseEntity.ok(
                contactRepo.findByQrSlugIdOrderByDisplayOrderAsc(slugId));
    }

    // STEP 1: Send OTP to contact's phone
    @PostMapping("/{slugId}/otp/send")
    public ResponseEntity<?> sendContactOtp(@PathVariable UUID slugId,
                                             @RequestBody Map<String, String> body,
                                             Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();

        long count = contactRepo.countByQrSlugIdAndVerifiedTrue(slugId);
        if (count >= 5)
            return ResponseEntity.badRequest().body(Map.of("error", "Max 5 contacts per QR"));

        String contactPhone = body.get("phone");
        otpService.sendOtp(contactPhone, "CONTACT_VERIFY");
        return ResponseEntity.ok(Map.of("sent", true));
    }

    // STEP 2: Verify OTP + save contact
    @PostMapping("/{slugId}")
    public ResponseEntity<?> addContact(@PathVariable UUID slugId,
                                         @RequestBody Map<String, String> body,
                                         Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();

        String contactPhone = body.get("phone");
        String otp          = body.get("otp");

        if (contactPhone != null && otp != null) {
            if (!otpService.verifyOtp(contactPhone, otp, "CONTACT_VERIFY"))
                return ResponseEntity.status(401).body(Map.of("error", "Invalid or expired OTP"));
        }

        long order = contactRepo.countByQrSlugIdAndVerifiedTrue(slugId);

        EmergencyContact c = new EmergencyContact();
        c.setQrSlugId(slugId);
        c.setName(body.get("name"));
        c.setPhone(contactPhone);
        c.setRelationship(body.getOrDefault("relationship", "Emergency Contact " + (order + 1)));
        c.setVerified(contactPhone != null && otp != null);
        c.setDisplayOrder((int) order);
        contactRepo.save(c);

        return ResponseEntity.ok(c);
    }

    // Update contact name/relationship (no OTP)
    @PutMapping("/entry/{id}")
    public ResponseEntity<?> updateContact(@PathVariable UUID id,
                                            @RequestBody Map<String, String> body,
                                            Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        return contactRepo.findById(id).map(c -> {
            if (body.containsKey("name")) c.setName(body.get("name"));
            if (body.containsKey("relationship")) c.setRelationship(body.get("relationship"));
            contactRepo.save(c);
            return ResponseEntity.ok(c);
        }).orElse(ResponseEntity.notFound().build());
    }

    // Delete contact
    @DeleteMapping("/entry/{id}")
    public ResponseEntity<?> deleteContact(@PathVariable UUID id, Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        contactRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("deleted", true));
    }
}