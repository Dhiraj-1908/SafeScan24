package com.safescan24.backend;

import com.safescan24.backend.websocket.SignalHandler;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.socket.config.annotation.*;

@SpringBootApplication
@EnableWebSocket
public class BackendApplication implements WebSocketConfigurer {

    private final SignalHandler signalHandler;

    public BackendApplication(SignalHandler signalHandler) {
        this.signalHandler = signalHandler;
    }

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(signalHandler, "/ws/signal")
                .setAllowedOrigins("*");
    }
}