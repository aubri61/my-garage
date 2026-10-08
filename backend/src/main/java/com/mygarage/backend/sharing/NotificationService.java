package com.mygarage.backend.sharing;

import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.HttpSessionEvent;
import jakarta.servlet.http.HttpSessionListener;
import jakarta.servlet.http.HttpSessionIdListener;
import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.web.servlet.ServletListenerRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class NotificationService {
    public record Change(Set<String> recipients, String action, Long rentalId) {}
    private record Subscription(String email, String sessionId, SseEmitter emitter) {}
    private final Set<Subscription> subscriptions=ConcurrentHashMap.newKeySet();

    public SseEmitter subscribe(String email, HttpSession session) {
        var emitter=new SseEmitter(55_000L);
        var subscription=new Subscription(email, session.getId(), emitter);
        subscriptions.add(subscription);
        Runnable remove=() -> subscriptions.remove(subscription);
        emitter.onCompletion(remove);
        emitter.onTimeout(() -> { remove.run(); emitter.complete(); });
        emitter.onError(error -> remove.run());
        try { emitter.send(SseEmitter.event().name("ready").data("connected")); }
        catch (IOException | IllegalStateException error) { remove.run(); emitter.complete(); }
        return emitter;
    }

    // Events are hints, emitted only after the DB transaction commits. REST is authoritative.
    @TransactionalEventListener
    public void publish(Change event) {
        for (var subscription : subscriptions) {
            if (!event.recipients().contains(subscription.email())) continue;
            try { subscription.emitter().send(SseEmitter.event().id(UUID.randomUUID().toString())
                    .name("change").data(new Payload(event.action(), event.rentalId()))); }
            catch (IOException | IllegalStateException error) {
                subscriptions.remove(subscription); subscription.emitter().complete();
            }
        }
    }
    public record Payload(String action, Long rentalId) {}
    public void closeSession(String sessionId) {
        for (var subscription : subscriptions) if (subscription.sessionId().equals(sessionId)) {
            subscriptions.remove(subscription); subscription.emitter().complete();
        }
    }
    @Configuration
    static class SessionCleanup {
        @Bean ServletListenerRegistrationBean<SessionListener> sharingSessionListener(NotificationService service) {
            return new ServletListenerRegistrationBean<>(new SessionListener(service));
        }
    }
    static class SessionListener implements HttpSessionListener, HttpSessionIdListener {
        private final NotificationService service;
        SessionListener(NotificationService service) { this.service=service; }
        @Override public void sessionDestroyed(HttpSessionEvent event) { service.closeSession(event.getSession().getId()); }
        @Override public void sessionIdChanged(HttpSessionEvent event, String oldSessionId) { service.closeSession(oldSessionId); }
    }
}
