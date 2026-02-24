package com.safescan24.backend.controller;

import com.safescan24.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class CheckPhoneController {

    private final UserRepository userRepo;

    /**
     * POST /api/auth/check-phone
     * Body: { phone: "+91XXXXXXXXXX" }
     * Response: { exists: true/false }
     *
     * Called BEFORE Firebase OTP is sent, so we can decide which path to take.
     * No auth required — just a phone existence check.
     */
    @PostMapping("/check-phone")
    public ResponseEntity<?> checkPhone(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");

        if (phone == null || phone.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "phone required"));

        boolean exists = userRepo.findByPhone(phone).isPresent();
        return ResponseEntity.ok(Map.of("exists", exists));
    }
}