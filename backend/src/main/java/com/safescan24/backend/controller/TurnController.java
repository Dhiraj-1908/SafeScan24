package com.safescan24.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;
import java.util.Map;

@RestController
@RequestMapping("/api/turn")
public class TurnController {

    @Value("${app.turn-url:turns:placeholder.metered.live:443}")
    private String turnUrl;

    @Value("${app.turn-secret:placeholder}")
    private String turnSecret;

    @GetMapping("/credentials")
    public Map<String, String> getCredentials() {
        try {
            long timestamp = System.currentTimeMillis() / 1000 + 3600;
            String username = timestamp + ":safescan24";
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(turnSecret.getBytes(), "HmacSHA1"));
            String credential = Base64.getEncoder().encodeToString(mac.doFinal(username.getBytes()));
            return Map.of("urls", turnUrl, "username", username, "credential", credential);
        } catch (Exception e) {
            return Map.of("urls", turnUrl, "username", "user", "credential", "pass");
        }
    }
}