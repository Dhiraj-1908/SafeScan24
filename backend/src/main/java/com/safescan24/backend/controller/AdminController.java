package com.safescan24.backend.controller;

import com.safescan24.backend.entity.QrSlug;
import com.safescan24.backend.repository.QrSlugRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final QrSlugRepository slugRepo;

    @Value("${app.admin-secret}")
    private String adminSecret;

    @PostMapping("/generate")
    public ResponseEntity<?> generate(
            @RequestHeader("X-Admin-Secret") String secret,
            @RequestBody Map<String, Integer> body) {

        if (!adminSecret.equals(secret))
            return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));

        int count = body.getOrDefault("count", 1);
        if (count < 1 || count > 200)
            return ResponseEntity.badRequest().body(Map.of("error", "Count must be 1-200"));

        long next = slugRepo.findMaxNumericSlug().orElse(9999L) + 1;

        List<String> slugs = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            QrSlug qs = new QrSlug();
            qs.setSlug(String.valueOf(next + i));
            slugRepo.save(qs);
            slugs.add(String.valueOf(next + i));
        }

        return ResponseEntity.ok(Map.of("slugs", slugs, "count", count));
    }
}