package com.safescan24.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private String adminSecret;
    private String jwtSecret;
    private String frontendUrl;
    private String turnUrl;
    private String turnSecret;
    private String exotelAccountSid;
    private String exotelApiKey;
    private String exotelApiToken;
    private String exotelPhone;
}