package com.safescan24.backend.controller;

import com.safescan24.backend.entity.EmergencyContact;
import com.safescan24.backend.repository.EmergencyContactRepository;
import com.safescan24.backend.service.OtpService;
import com.safescan24.backend.service.OtpService.SendResult;
import com.safescan24.backend.service.OtpService.VerifyResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
public class ContactController {

    private final EmergencyContactRepository contactRepo;
    private final OtpService otpService;

    // ── GET /api/contacts ─────────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<?> getContacts(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        var contacts = contactRepo.findByUserIdOrderByDisplayOrderAsc(userId);
        return ResponseEntity.ok(contacts.stream()
            .map(this::ownerContact)
            .collect(java.util.stream.Collectors.toList()));
    }

    // ── POST /api/contacts/otp/send ───────────────────────────────────────────
    @PostMapping("/otp/send")
    public ResponseEntity<?> sendContactOtp(@RequestBody Map<String, String> body,
                                             Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        UUID userId = UUID.fromString((String) auth.getPrincipal());

        long count = contactRepo.countByUserIdAndVerifiedTrue(userId);
        if (count >= 3)
            return ResponseEntity.badRequest().body(Map.of("error", "Max 3 contacts allowed"));

        String contactPhone = body.get("phone");
        if (contactPhone == null || contactPhone.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "phone required"));

        // "internal" as IP since this is an authenticated owner action
        SendResult result = otpService.sendOtp(contactPhone, "CONTACT_VERIFY", "internal");
        if (result == SendResult.PHONE_RATE_LIMITED)
            return ResponseEntity.status(429).body(Map.of("error", "Too many OTP requests. Try again later."));

        return ResponseEntity.ok(Map.of("sent", true));
    }

    // ── POST /api/contacts — verify OTP + save new contact ───────────────────
    @PostMapping
    public ResponseEntity<?> addContact(@RequestBody Map<String, String> body,
                                         Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        UUID userId = UUID.fromString((String) auth.getPrincipal());

        long count = contactRepo.countByUserIdAndVerifiedTrue(userId);
        if (count >= 3)
            return ResponseEntity.badRequest().body(Map.of("error", "Max 3 contacts allowed"));

        String contactPhone = body.get("phone");
        String otp          = body.get("otp");
        String name         = body.get("name");
        String relationship = body.get("relationship");

        if (contactPhone == null || otp == null)
            return ResponseEntity.badRequest().body(Map.of("error", "phone and otp required"));

        VerifyResult result = otpService.verifyOtp(contactPhone, otp, "CONTACT_VERIFY");
        if (result != VerifyResult.SUCCESS) {
            String msg = switch (result) {
                case EXPIRED      -> "OTP expired. Please request a new one.";
                case MAX_ATTEMPTS -> "Too many wrong attempts. Request a new OTP.";
                default           -> "Invalid or expired OTP";
            };
            return ResponseEntity.status(401).body(Map.of("error", msg));
        }

        if (name == null || name.isBlank())
            name = "Emergency Contact " + (count + 1);

        EmergencyContact c = new EmergencyContact();
        c.setUserId(userId);
        c.setName(name);
        c.setPhone(contactPhone);
        c.setRelationship(relationship != null ? relationship : "");
        c.setVerified(true);
        c.setDisplayOrder((int) count);
        contactRepo.save(c);

        return ResponseEntity.ok(safeContact(c));
    }

    // ── PUT /api/contacts/{id} — edit name/relationship (no OTP) ─────────────
    @PutMapping("/{id}")
    public ResponseEntity<?> updateContact(@PathVariable UUID id,
                                            @RequestBody Map<String, String> body,
                                            Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        UUID userId = UUID.fromString((String) auth.getPrincipal());

        return contactRepo.findById(id).map(c -> {
            if (!c.getUserId().equals(userId))
                return ResponseEntity.status(403).<Object>build();
            if (body.containsKey("name") && !body.get("name").isBlank())
                c.setName(body.get("name"));
            if (body.containsKey("relationship"))
                c.setRelationship(body.get("relationship"));
            contactRepo.save(c);
            return ResponseEntity.ok(safeContact(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── POST /api/contacts/{id}/phone/send ───────────────────────────────────
    @PostMapping("/{id}/phone/send")
    public ResponseEntity<?> sendPhoneEditOtp(@PathVariable UUID id,
                                               @RequestBody Map<String, String> body,
                                               Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        UUID userId = UUID.fromString((String) auth.getPrincipal());

        return contactRepo.findById(id).map(c -> {
            if (!c.getUserId().equals(userId))
                return ResponseEntity.status(403).<Object>build();
            String newPhone = body.get("phone");
            if (newPhone == null || newPhone.isBlank())
                return ResponseEntity.badRequest().<Object>body(Map.of("error", "phone required"));
            otpService.sendOtp(newPhone, "CONTACT_PHONE_EDIT", "internal");
            return ResponseEntity.ok(Map.of("sent", true));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── PUT /api/contacts/{id}/phone ──────────────────────────────────────────
    @PutMapping("/{id}/phone")
    public ResponseEntity<?> updateContactPhone(@PathVariable UUID id,
                                                 @RequestBody Map<String, String> body,
                                                 Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        UUID userId = UUID.fromString((String) auth.getPrincipal());

        return contactRepo.findById(id).map(c -> {
            if (!c.getUserId().equals(userId))
                return ResponseEntity.status(403).<Object>build();
            String newPhone = body.get("phone");
            String otp      = body.get("otp");
            if (newPhone == null || otp == null)
                return ResponseEntity.badRequest().<Object>body(Map.of("error", "phone and otp required"));

            VerifyResult result = otpService.verifyOtp(newPhone, otp, "CONTACT_PHONE_EDIT");
            if (result != VerifyResult.SUCCESS) {
                String msg = switch (result) {
                    case EXPIRED      -> "OTP expired. Please request a new one.";
                    case MAX_ATTEMPTS -> "Too many wrong attempts. Request a new OTP.";
                    default           -> "Invalid or expired OTP";
                };
                return ResponseEntity.status(401).<Object>body(Map.of("error", msg));
            }

            c.setPhone(newPhone);
            contactRepo.save(c);
            return ResponseEntity.ok(safeContact(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── DELETE /api/contacts/{id} ─────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteContact(@PathVariable UUID id, Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        UUID userId = UUID.fromString((String) auth.getPrincipal());

        return contactRepo.findById(id).map(c -> {
            if (!c.getUserId().equals(userId))
                return ResponseEntity.status(403).<Object>build();
            contactRepo.deleteById(id);
            List<EmergencyContact> remaining =
                contactRepo.findByUserIdOrderByDisplayOrderAsc(userId);
            for (int i = 0; i < remaining.size(); i++) {
                remaining.get(i).setDisplayOrder(i);
            }
            contactRepo.saveAll(remaining);
            return ResponseEntity.ok(Map.of("deleted", true));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── POST /api/contacts/reorder ────────────────────────────────────────────
    @PostMapping("/reorder")
    public ResponseEntity<?> reorderContacts(@RequestBody Map<String, List<String>> body,
                                              Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        UUID userId = UUID.fromString((String) auth.getPrincipal());

        List<String> ids = body.get("ids");
        if (ids == null) return ResponseEntity.badRequest().body(Map.of("error", "ids required"));

        for (int i = 0; i < ids.size(); i++) {
            int finalI = i;
            contactRepo.findById(UUID.fromString(ids.get(i))).ifPresent(c -> {
                if (c.getUserId().equals(userId)) {
                    c.setDisplayOrder(finalI);
                    contactRepo.save(c);
                }
            });
        }
        return ResponseEntity.ok(Map.of("reordered", true));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private Map<String, Object> ownerContact(EmergencyContact c) {
        java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id",           c.getId().toString());
        m.put("name",         c.getName());
        m.put("relationship", c.getRelationship() != null ? c.getRelationship() : "");
        m.put("phone",        c.getPhone() != null ? c.getPhone() : "");
        m.put("verified",     c.isVerified());
        m.put("displayOrder", c.getDisplayOrder());
        return m;
    }

    private Map<String, Object> safeContact(EmergencyContact c) {
        return Map.of(
            "id",           c.getId().toString(),
            "name",         c.getName(),
            "relationship", c.getRelationship() != null ? c.getRelationship() : "",
            "verified",     c.isVerified(),
            "displayOrder", c.getDisplayOrder()
        );
    }
}