package com.safescan24.backend.controller;

import com.safescan24.backend.repository.QrSlugRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final QrSlugRepository slugRepo;

    @PostMapping("/claim")
    public ResponseEntity<?> claim(@RequestBody Map<String, String> body,
                                   Authentication auth) {
        if (auth == null)
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        String userId = (String) auth.getPrincipal();
        String slug   = body.get("slug");

        return slugRepo.findBySlug(slug)
            .map(qr -> {
                if (qr.isClaimed())
                    return ResponseEntity.badRequest()
                        .body(Map.of("error", "Already claimed"));
                qr.setClaimed(true);
                qr.setClaimedBy(UUID.fromString(userId));
                qr.setClaimedAt(LocalDateTime.now());
                slugRepo.save(qr);
                return ResponseEntity.ok(Map.of("claimed", true, "slug", slug));
            })
            .orElse(ResponseEntity.badRequest().body(Map.of("error", "Invalid slug")));
    }
}