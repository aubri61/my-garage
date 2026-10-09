package com.mygarage.backend.sharing;

import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class NotificationServiceTests {
    @Test void disconnectedServletCompletionCannotInterruptOtherSubscribers() throws Exception {
        var service=spy(new NotificationService());
        var disconnected=mock(SseEmitter.class);
        var connected=mock(SseEmitter.class);
        doReturn(disconnected,connected).when(service).newEmitter();
        var session=mock(HttpSession.class);
        when(session.getId()).thenReturn("test-session");
        service.subscribe("renter@example.com",session);
        service.subscribe("renter@example.com",session);
        doThrow(new IOException("disconnected")).when(disconnected).send(any(SseEmitter.SseEventBuilder.class));
        doThrow(new IllegalStateException("closed async context")).when(disconnected).complete();
        var event=new NotificationService.Change(Set.of("renter@example.com"),"UNLOCK_APPROVED",1L);
        assertThatCode(()->service.publish(event)).doesNotThrowAnyException();
        assertThatCode(()->service.publish(event)).doesNotThrowAnyException();
        verify(connected,times(3)).send(any(SseEmitter.SseEventBuilder.class));
        verify(disconnected,times(1)).complete();
    }
}
