package com.safescan24.backend.controller;

import com.safescan24.backend.entity.QrSlug;
import com.safescan24.backend.repository.QrSlugRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final QrSlugRepository slugRepo;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

    @Value("${app.admin-secret}")
    private String adminSecret;

    private String generateSlug(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++)
            sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
        return sb.toString();
    }

    @PostMapping("/generate")
    public ResponseEntity<?> generate(
            @RequestHeader("X-Admin-Secret") String secret,
            @RequestBody Map<String, Integer> body) {

        if (!adminSecret.equals(secret))
            return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));

        int count = body.getOrDefault("count", 1);
        if (count < 1 || count > 200)
            return ResponseEntity.badRequest().body(Map.of("error", "Count must be 1-200"));

        List<String> slugs = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            String slug;
            do {
                slug = generateSlug(8); // e.g. "k9xP2mRb"
            } while (slugRepo.findBySlug(slug).isPresent()); // ensure unique
            QrSlug qs = new QrSlug();
            qs.setSlug(slug);
            slugRepo.save(qs);
            slugs.add(slug);
        }

        return ResponseEntity.ok(Map.of("slugs", slugs, "count", count));
    }
}