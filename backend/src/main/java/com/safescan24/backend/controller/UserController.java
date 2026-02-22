package com.safescan24.backend.controller;

import com.safescan24.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepo;

    @GetMapping("/me")
    public ResponseEntity<?> getMe(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        return userRepo.findById(UUID.fromString((String) auth.getPrincipal()))
                .map(u -> ResponseEntity.ok(Map.of(
                        "id",    u.getId(),
                        "name",  u.getName(),
                        "phone", u.getPhone()
                )))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateName(@RequestBody Map<String, String> body,
                                         Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        return userRepo.findById(UUID.fromString((String) auth.getPrincipal()))
                .map(u -> {
                    u.setName(body.get("name"));
                    userRepo.save(u);
                    return ResponseEntity.ok(Map.of("name", u.getName()));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}